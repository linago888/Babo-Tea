/**
 * GET / POST /api/admin/news/cron-daily
 *
 * 每天定時跑：
 *   1. Google News 搜尋爬取（ingestAllEnabledQueries）
 *   2. RSS 來源拉取（ingestAllSources）
 *   3. AI 批次翻譯成 4 個 locale（translate-batch 直接呼叫，不走 HTTP）
 *
 * 結果都進 DRAFT，編輯到 /admin/news-inbox 審稿後發布。
 *
 * 認證：
 *   - Vercel Cron 來的請求帶 header `Authorization: Bearer <CRON_SECRET>`
 *   - 如果沒設 CRON_SECRET，也接受 admin Basic Auth（給 manual trigger 用）
 *
 * vercel.json 內 cron 設定：
 *   {
 *     "crons": [{ "path": "/api/admin/news/cron-daily", "schedule": "0 8 * * *" }]
 *   }
 *   時間是 UTC；08:00 UTC = 台北 16:00 / 東京 17:00。
 *
 * 容錯：
 *   - 任一階段失敗都不擋下一階段
 *   - 結果摘要回 JSON，可由 logs / 監控 / Vercel cron history 看
 */
import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { routing } from "@/i18n/routing";
import { scoreNews } from "@/lib/content-quality/completeness";
import { ingestAllSources } from "@/lib/rss-ingest";
import { ingestAllEnabledQueries } from "@/lib/news-search-ingest";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

function isCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${cronSecret}`;
}

type LocaleMap = Record<string, string>;

function hasLocale(field: unknown, locale: string): boolean {
  if (!field || typeof field !== "object") return false;
  const v = (field as Record<string, unknown>)[locale];
  return typeof v === "string" && v.trim().length > 0;
}

function pickFirstFilled(field: unknown): { locale: string; value: string } | null {
  if (!field || typeof field !== "object") return null;
  const map = field as Record<string, unknown>;
  for (const lc of routing.locales as readonly string[]) {
    const v = map[lc];
    if (typeof v === "string" && v.trim().length > 0) return { locale: lc, value: v.trim() };
  }
  return null;
}

/** 內部直呼，不走 HTTP — 避免 cold-start + auth 兩次 */
async function runTranslateBatch(limit: number): Promise<{ translated: number; errors: number }> {
  if (!process.env.OPENAI_API_KEY) {
    return { translated: 0, errors: 0 };
  }

  const candidates = await prisma.news.findMany({
    where: { status: "DRAFT" },
    select: {
      id: true,
      titleI18n: true,
      summaryI18n: true,
      bodyI18n: true,
      heroImageUrl: true,
      editorTags: true,
      sourceUrl: true,
      newsBrands: { select: { brandId: true } },
      newsCities: { select: { cityId: true } },
      newsDrinks: { select: { drinkId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
  });

  const targets = candidates
    .filter((n) => (routing.locales as readonly string[]).some((lc) => !hasLocale(n.titleI18n, lc)))
    .slice(0, limit);

  if (targets.length === 0) return { translated: 0, errors: 0 };

  const localeShape: Record<string, z.ZodString> = {};
  for (const lc of routing.locales as readonly string[]) localeShape[lc] = z.string();
  const localeSchema = z.object(localeShape);
  const draftsSchema = z.object({ titleI18n: localeSchema, summaryI18n: localeSchema });

  const systemPrompt = `You translate news for Global Boba Graph.
For each item produce title (30-80 chars) + summary (40-80 words) in 4 locales (en, zh-TW, zh-CN, ja).
Locale style: en neutral wire-service, zh-TW Taiwan idiom, zh-CN mainland idiom, ja natural news Japanese.
Translate faithfully, don't invent.`;

  let translated = 0;
  let errors = 0;

  const results = await Promise.allSettled(
    targets.map(async (n) => {
      const sourceTitle = pickFirstFilled(n.titleI18n);
      const sourceSummary = pickFirstFilled(n.summaryI18n);
      if (!sourceTitle) throw new Error("No source title");

      const userPrompt = `TITLE (${sourceTitle.locale}): ${sourceTitle.value}\n\nSUMMARY: ${sourceSummary?.value ?? "(none)"}\n\nSOURCE: ${n.sourceUrl}\n\nGenerate translations for all 4 locales.`;

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: draftsSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.4,
      });

      const newTitle: LocaleMap = {
        ...(n.titleI18n as LocaleMap),
        ...(object.titleI18n as LocaleMap),
      };
      const newSummary: LocaleMap = {
        ...(n.summaryI18n as LocaleMap),
        ...(object.summaryI18n as LocaleMap),
      };

      const { score } = scoreNews({
        titleI18n: newTitle,
        summaryI18n: newSummary,
        bodyI18n: (n.bodyI18n as LocaleMap | null) ?? {},
        seoI18n: null,
        heroImageUrl: n.heroImageUrl,
        editorTags: n.editorTags,
        sourceUrl: n.sourceUrl,
        newsBrands: n.newsBrands,
        newsCities: n.newsCities,
        newsDrinks: n.newsDrinks,
      });

      await prisma.news.update({
        where: { id: n.id },
        data: {
          titleI18n: newTitle as never,
          summaryI18n: newSummary as never,
          completenessScore: score,
        },
      });
      return n.id;
    }),
  );

  for (const r of results) {
    if (r.status === "fulfilled") translated += 1;
    else errors += 1;
  }
  return { translated, errors };
}

async function handle(req: Request) {
  const isCron = isCronAuthorized(req);
  if (!isCron && !(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const startMs = Date.now();
  // eslint-disable-next-line no-console
  console.log("[cron-daily] start", startedAt.toISOString());

  const summary = {
    startedAt: startedAt.toISOString(),
    triggeredBy: isCron ? "vercel-cron" : "admin",
    googleNews: {
      ran: false,
      queries: 0,
      created: 0,
      skipped: 0,
      sourcesAutoCreated: 0,
      errors: 0,
    },
    rss: { ran: false, sources: 0, created: 0, skipped: 0, errors: 0 },
    translate: { ran: false, translated: 0, errors: 0 },
    durationMs: 0,
    stageErrors: [] as Array<{ stage: string; message: string }>,
  };

  // 1. Google News 搜尋爬取
  try {
    const googleSummaries = await ingestAllEnabledQueries();
    summary.googleNews = {
      ran: true,
      queries: googleSummaries.length,
      created: googleSummaries.reduce((s, x) => s + x.created, 0),
      skipped: googleSummaries.reduce((s, x) => s + x.skipped, 0),
      sourcesAutoCreated: googleSummaries.reduce((s, x) => s + x.sourcesAutoCreated, 0),
      errors: googleSummaries.reduce((s, x) => s + x.errors.length, 0),
    };
  } catch (err) {
    summary.stageErrors.push({
      stage: "googleNews",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. RSS 來源拉取（如果有設）— 預算用得差不多就跳過
  if (Date.now() - startMs < 40_000) {
    try {
      const rssSummaries = await ingestAllSources();
      summary.rss = {
        ran: true,
        sources: rssSummaries.length,
        created: rssSummaries.reduce((s, x) => s + x.created, 0),
        skipped: rssSummaries.reduce((s, x) => s + x.skipped, 0),
        errors: rssSummaries.reduce((s, x) => s + x.errors.length, 0),
      };
    } catch (err) {
      summary.stageErrors.push({
        stage: "rss",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    summary.stageErrors.push({ stage: "rss", message: "Skipped: time budget" });
  }

  // 3. AI 批次翻譯（只當前還有時間時跑；最多 5 篇避免時間用爆）
  if (Date.now() - startMs < 50_000) {
    try {
      const r = await runTranslateBatch(5);
      summary.translate = { ran: true, translated: r.translated, errors: r.errors };
    } catch (err) {
      summary.stageErrors.push({
        stage: "translate",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    summary.stageErrors.push({ stage: "translate", message: "Skipped: time budget" });
  }

  summary.durationMs = Date.now() - startMs;
  // eslint-disable-next-line no-console
  console.log("[cron-daily] done", summary);

  return Response.json({ ok: true, summary });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
