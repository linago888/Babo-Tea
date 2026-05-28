import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { countryToLocale, type Locale, routing } from "./i18n/routing";

/**
 * Locale routing proxy（Next.js 16 命名 proxy.ts）
 *
 * 流程：
 * 1. 若 path 已有 locale 前綴（/en/..., /zh-TW/..., ...）→ 交給 next-intl middleware
 * 2. 沒前綴的 path（含 root /）：偵測最適 locale 後 308 redirect 到 /<locale><path>
 *
 * 偵測 fallback chain（高→低）：
 *   a. NEXT_LOCALE cookie（使用者明確切換過的）
 *   b. x-vercel-ip-country（Vercel 自動注入的 IP geo）→ 透過 countryToLocale 對應
 *   c. accept-language header → 第一個 routing.locales 中支援的
 *   d. routing.defaultLocale（en）
 */

const SUPPORTED_LOCALES = new Set<Locale>(routing.locales);
const LOCALE_COOKIE = "NEXT_LOCALE";

function isLocale(value: string | undefined): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.has(value as Locale);
}

/** 解析 Accept-Language header，回第一個支援的 locale，找不到回 null */
function pickFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  // header 格式: "zh-TW,zh;q=0.9,en;q=0.8"
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q = "q=1"] = part.trim().split(";");
      const quality = Number(q.replace("q=", "")) || 0;
      return { tag: tag.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // 直接對應（zh-TW → zh-TW）
  for (const { tag } of tags) {
    const exact = routing.locales.find((l) => l.toLowerCase() === tag);
    if (exact) return exact;
  }

  // 語系前綴對應
  for (const { tag } of tags) {
    const lang = tag.split("-")[0];
    if (lang === "zh") {
      // 區分繁簡：zh-HK / zh-TW / zh-MO → zh-TW；其他 → zh-CN
      const region = tag.split("-")[1]?.toUpperCase();
      if (region && ["HK", "TW", "MO"].includes(region)) return "zh-TW";
      return "zh-CN";
    }
    const match = routing.locales.find((l) => l.startsWith(`${lang}-`) || l === lang);
    if (match) return match;
  }

  return null;
}

function pickPreferredLocale(req: NextRequest): Locale {
  // a. 使用者明確選過的 cookie
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  // b. Vercel IP geo
  const country = req.headers.get("x-vercel-ip-country");
  if (country && countryToLocale[country]) return countryToLocale[country];

  // c. Accept-Language
  const fromAccept = pickFromAcceptLanguage(req.headers.get("accept-language"));
  if (fromAccept) return fromAccept;

  // d. 預設
  return routing.defaultLocale;
}

const intlMiddleware = createIntlMiddleware(routing);

/**
 * HTTP Basic Auth for /admin/*
 * 邏輯與 src/lib/admin-auth.ts 對齊，但放在 middleware 才能正確輸出 401 + WWW-Authenticate
 */
function checkAdminAuth(req: NextRequest): NextResponse | null {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!user || !password) {
    return new NextResponse("Admin disabled — set ADMIN_USER / ADMIN_PASSWORD env vars", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Global Boba Graph Admin", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Basic (.+)$/);
  if (!match) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Global Boba Graph Admin", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }

  let decoded: string;
  try {
    decoded = atob(match[1]);
  } catch {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Global Boba Graph Admin"' },
    });
  }

  const idx = decoded.indexOf(":");
  if (idx === -1) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Global Boba Graph Admin"' },
    });
  }

  // Constant-time compare to mitigate timing attacks
  const presentedUser = decoded.slice(0, idx);
  const presentedPass = decoded.slice(idx + 1);
  if (presentedUser.length !== user.length || presentedPass.length !== password.length) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Global Boba Graph Admin"' },
    });
  }
  let diff = 0;
  for (let i = 0; i < user.length; i++) {
    diff |= presentedUser.charCodeAt(i) ^ user.charCodeAt(i);
  }
  for (let i = 0; i < password.length; i++) {
    diff |= presentedPass.charCodeAt(i) ^ password.charCodeAt(i);
  }
  if (diff !== 0) {
    return new NextResponse("Invalid credentials", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Global Boba Graph Admin"' },
    });
  }

  return null; // 通過驗證
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/* 走獨立 HTTP Basic Auth（不做 locale routing）
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return checkAdminAuth(req) ?? NextResponse.next();
  }

  // 若 path 已帶 locale，交給 next-intl middleware（會處理 i18n 內部邏輯）
  const hasLocalePrefix = routing.locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLocalePrefix) {
    return intlMiddleware(req);
  }

  // 無 locale 前綴 → 偵測後 redirect
  const locale = pickPreferredLocale(req);
  const target = req.nextUrl.clone();
  target.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.redirect(target, 308);
  // 把判定結果寫回 cookie，下次直接走 a. 分支（也讓使用者後續切換器可覆蓋）
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 年
    sameSite: "lax",
  });
  return response;
}

export const config = {
  // 注意：matcher 移除 `admin|` 排除，因 admin 現在需要 middleware 做 auth
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
