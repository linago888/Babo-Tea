/**
 * Phase 4 — Admin auth
 *
 * 內部編輯儀表板用 HTTP Basic Auth：
 *   - 環境變數 ADMIN_USER + ADMIN_PASSWORD
 *   - 兩者都未設 → 鎖死（不允許任何訪問）
 *   - 設定後瀏覽器跳出原生 auth 對話框，輸入後存進 browser 直到 close
 *
 * 之後若上 Payload v3 admin，可改用 Payload 的 cookie session
 * 並把這層 wrapper 移除。
 */
import { headers } from "next/headers";

/**
 * 在 /admin/* 的 layout / page 內呼叫
 * 失敗會丟 Response（Next.js 接到後回 401 + WWW-Authenticate）
 */
export async function requireAdminAuth(): Promise<void> {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  // 兩個 env 都未設 → 完全鎖死，避免 production 意外暴露
  if (!user || !password) {
    throw unauthorized("Admin disabled — set ADMIN_USER / ADMIN_PASSWORD env vars");
  }

  const h = await headers();
  const authHeader = h.get("authorization") ?? "";
  const match = authHeader.match(/^Basic (.+)$/);
  if (!match) {
    throw unauthorized("Authentication required");
  }

  let decoded: string;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    throw unauthorized("Invalid credentials");
  }

  const idx = decoded.indexOf(":");
  if (idx === -1) {
    throw unauthorized("Invalid credentials");
  }
  const presentedUser = decoded.slice(0, idx);
  const presentedPass = decoded.slice(idx + 1);

  if (
    !timingSafeEqual(presentedUser, user) ||
    !timingSafeEqual(presentedPass, password)
  ) {
    throw unauthorized("Invalid credentials");
  }
}

/** Throws a Response that Next.js renders as 401 with WWW-Authenticate header */
function unauthorized(reason: string): Response {
  return new Response(reason, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Global Boba Graph Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

/** constant-time string comparison to mitigate timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
