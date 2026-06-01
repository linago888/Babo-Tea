/**
 * POST /api/admin/news/crawl
 *
 * 接受一個外部新聞文章 URL，後端 fetch + 抽取 OG meta + 內文，
 * 並（若啟用 AI）翻譯成 4 個 locale。
 *
 * Request body:
 *   {
 *     url: string,
 *     translate?: boolean   // 預設 true：呼叫 OpenAI 翻譯/改寫成 4 locale
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     crawl: {
 *       sourceUrl, domain, imageUrl, publishedAt, detectedLang, siteName,
 *       sourceId,                       // 用 domain 自動配對；找不到回 null
 *       sourceSuggestSlug,              // 找不到時建議的 slug
 *       sourceSuggestName,              // 用 og:site_name
 *     },
 *     drafts: {                          // 若 translate=true 才有
 *       titleI18n: { en, zh-TW, zh-CN, ja },
 *       summaryI18n: { ... },
 *       bodyI18n:   { ... }
 *     }
 *   }
 *
 * 安全 / 失敗：
 *   - 未通過 admin auth → 401
 *   - URL 無效 / 拒絕 (SSRF) / fetch 失敗 → 422 + 具體錯誤
 *   - OpenAI 未設定 → 還是 ok：回 crawl 結果但 drafts 為 null + reason
 */
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { routing } from "@/i18n/routing";
import { crawlUrl } from "@/lib/news-crawler";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  url: z.string().url(),
  translate: z.boolean().default(true),
});

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  const { url, translate } = parsed.data;

  // Crawl
  let crawl;
  try {
    crawl = await crawlUrl(url);
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Crawl failed" },
      { status: 422 },
    );
  }

  // Auto-match source by domain（不分大小寫，不含 www.）
  const existingSource = await prisma.source.findUnique({
    where: { domain: crawl.domain.toLowerCase() },
    select: { id: true, slug: true, nameI18n: true },
  });

  // 建議的 source slug / name（當編輯需要新建 source 時用）
  const sourceSuggestSlug = crawl.domain
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const crawlPayload = {
    sourceUrl: crawl.finalUrl,
    domain: crawl.domain,
    imageUrl: crawl.imageUrl,
    publishedAt: crawl.publishedAt,
    detectedLang: crawl.detectedLang,
    siteName: crawl.siteName,
    sourceId: existingSource?.id ?? null,
    sourceSuggestSlug: existingSource ? null : sourceSuggestSlug,
    sourceSuggestName: existingSource ? null : crawl.siteName ?? crawl.domain,
    // 原始抽取結果（讓 client 可選擇直接用而不走 AI）
    rawTitle: crawl.title,
    rawDescription: crawl.description,
    rawBodyText: crawl.bodyText,
  };

  // 不需要 AI 翻譯時直接回
  if (!translate) {
    return Response.json({ ok: true, crawl: crawlPayload, drafts: null });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({
      ok: true,
      crawl: crawlPayload,
      drafts: null,
      draftsSkippedReason: "OPENAI_API_KEY not set",
    });
  }

  // 建立 dynamic schema：{ titleI18n: { en, zh-TW, zh-CN, ja }, summaryI18n: {...}, bodyI18n: {...} }
  const locales = routing.locales as readonly string[];
  const localeShape: Record<string, z.ZodString> = {};
  for (const lc of locales) localeShape[lc] = z.string();
  const localeSchema = z.object(localeShape);

  const draftsSchema = z.object({
    titleI18n: localeSchema,
    summaryI18n: localeSchema,
    bodyI18n: localeSchema,
  });

  const systemPrompt = `You are an editorial assistant for "Global Boba Graph", a multilingual encyclopedic database of bubble tea brands, cities, drinks, and news.

You will receive a crawled news article (raw text from a foreign-language source). Your job:
1. Identify the WHO / WHAT / WHERE / WHEN — the key facts.
2. Generate clean, faithful versions in 4 locales (en, zh-TW, zh-CN, ja).

For EACH locale produce:
- **title**: 30–80 chars. Newsroom style, no clickbait, no editorial opinion.
- **summary**: 40–80 words / 60–120 字. Lead with the key fact.
- **body**: 200–400 words / 400–800 字, Markdown. 3–5 paragraphs. First paragraph = lead. Use ## subheadings if useful.

Locale style:
- en: neutral international English, AP/Reuters tone
- zh-TW: 繁體中文，台灣新聞編輯室的用詞（例「展店」「飲品」）
- zh-CN: 简体中文，大陆新闻媒体的用词（例「门店」「饮品」）
- ja: 自然な日本語、新聞記事スタイル、敬体は使わない

Critical rules:
- DO NOT invent facts not present in the source text.
- DO NOT include quotes that aren't in the source.
- DO NOT add editorial opinion or speculation.
- Translate facts faithfully; adapt cultural references (e.g. brand names) to what each locale recognises.
- If the source is missing a fact in one language, omit it in the translations — never fabricate.`;

  const userPrompt = `Source URL: ${crawl.finalUrl}
Site name: ${crawl.siteName ?? "(unknown)"}
Original language: ${crawl.detectedLang ?? "(unknown)"}
Published: ${crawl.publishedAt ?? "(unknown)"}

ORIGINAL TITLE:
${crawl.title}

ORIGINAL DESCRIPTION / META:
${crawl.description}

ORIGINAL BODY (cleaned plain text, may be truncated):
${crawl.bodyText}`;

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: draftsSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
    });
    return Response.json({ ok: true, crawl: crawlPayload, drafts: object });
  } catch (err) {
    // AI 失敗也回 crawl 結果，讓使用者至少有原文可用
    const message = err instanceof Error ? err.message : "AI translation failed";
    return Response.json({
      ok: true,
      crawl: crawlPayload,
      drafts: null,
      draftsSkippedReason: message,
    });
  }
}
