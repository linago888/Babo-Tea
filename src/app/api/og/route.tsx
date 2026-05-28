/* eslint-disable @next/next/no-img-element */
/**
 * Dynamic Open Graph image — Phase 3
 *
 * GET /api/og?kind=brand&slug=gong-cha&locale=zh-TW
 * GET /api/og?kind=city&slug=tokyo
 * GET /api/og?kind=drink&slug=brown-sugar-pearl-milk-tea
 * GET /api/og?kind=news&slug=chagee-flagship-los-angeles-2026
 * GET /api/og  (站台 default)
 *
 * 用 next/og ImageResponse，1200×630 標準 OG 規格。
 * 注意：edge runtime + 限制：不能用一般 fetch 拿 fonts；用 Vercel CDN.
 */
import { ImageResponse } from "next/og";

import { routing, type Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n-text";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // 使用 Prisma 所以走 node runtime
export const revalidate = 86400;

type Kind = "brand" | "city" | "drink" | "news";

function isLocale(value: string | null): value is Locale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

async function fetchSubject(
  kind: Kind | null,
  slug: string | null,
  locale: Locale,
): Promise<{ eyebrow: string; title: string; subtitle?: string } | null> {
  if (!kind || !slug) return null;
  if (kind === "brand") {
    const b = await prisma.brand.findUnique({
      where: { slug, status: "PUBLISHED" },
      select: { nameI18n: true, countryCode: true, foundedYear: true },
    });
    if (!b) return null;
    return {
      eyebrow: "BRAND",
      title: pickI18n(b.nameI18n, locale),
      subtitle: `${b.countryCode}${b.foundedYear ? ` · est. ${b.foundedYear}` : ""}`,
    };
  }
  if (kind === "city") {
    const c = await prisma.city.findUnique({
      where: { slug, status: "PUBLISHED" },
      select: { nameI18n: true, countryCode: true },
    });
    if (!c) return null;
    return {
      eyebrow: "CITY",
      title: pickI18n(c.nameI18n, locale),
      subtitle: c.countryCode,
    };
  }
  if (kind === "drink") {
    const d = await prisma.drink.findUnique({
      where: { slug, status: "PUBLISHED" },
      select: { nameI18n: true, category: true },
    });
    if (!d) return null;
    return {
      eyebrow: "DRINK",
      title: pickI18n(d.nameI18n, locale),
      subtitle: d.category.toLowerCase().replace("_", " "),
    };
  }
  if (kind === "news") {
    const n = await prisma.news.findUnique({
      where: { slug, status: "PUBLISHED" },
      select: { titleI18n: true, category: true, source: { select: { nameI18n: true } } },
    });
    if (!n) return null;
    return {
      eyebrow: "NEWS · " + n.category.toLowerCase().replace("_", " "),
      title: pickI18n(n.titleI18n, locale),
      subtitle: pickI18n(n.source.nameI18n, locale),
    };
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as Kind | null;
  const slug = url.searchParams.get("slug");
  const localeParam = url.searchParams.get("locale");
  const locale = isLocale(localeParam) ? localeParam : routing.defaultLocale;

  const subject = await fetchSubject(kind, slug, locale);

  const eyebrow = subject?.eyebrow ?? "GLOBAL BOBA GRAPH";
  const title =
    subject?.title ??
    "A structured data platform for bubble tea brands, cities, drinks and news worldwide.";
  const subtitle = subject?.subtitle ?? "babo-tea.vercel.app";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 70px",
          background:
            "linear-gradient(135deg, #fef3c7 0%, #ffffff 50%, #fef3c7 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* top: site mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "#b45309",
            }}
          />
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#171717",
              letterSpacing: "0.5px",
            }}
          >
            Global Boba Graph
          </span>
        </div>

        {/* middle: subject */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#b45309",
              letterSpacing: "3px",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </span>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#171717",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <span style={{ fontSize: 26, color: "#525252", marginTop: "8px" }}>
              {subtitle}
            </span>
          ) : null}
        </div>

        {/* bottom: tagline */}
        <span style={{ fontSize: 18, color: "#737373" }}>
          Structured data on global bubble tea brands, cities, drinks and news.
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
