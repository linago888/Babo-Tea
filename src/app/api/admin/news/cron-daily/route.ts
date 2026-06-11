/**
 * GET / POST /api/admin/news/cron-daily
 *
 * 每天定時跑 + 也接後台手動觸發。
 *
 * 兩種輸出模式：
 *   - 預設（cron / curl）：等所有 stage 跑完，回單一 JSON
 *   - ?stream=true：邊跑邊串 NDJSON 進度事件 — 給後台 UI 進度條用
 *
 * 認證：
 *   - Bearer <CRON_SECRET>（給 Vercel Cron）
 *   - admin Basic Auth（給 admin 手動觸發）
 */
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { routing } from "@/i18n/routing";
import { scoreNews } from "@/lib/content-quality/completeness";
import { ingestSource } from "@/lib/rss-ingest";
import { ingestSearchQuery } from "@/lib/news-search-ingest";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const GLOBAL_BUDGET_MS = 55_000;
const GOOGLE_BUDGET_MS = 40_000;
const RSS_BUDGET_MS = 50_000;

function isCronAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return (req.headers.get("authorization") ?? "") === `Bearer ${cronSecret}`;
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

interface ProgressTotals {
  googleCreated: number;
  googleSourcesAuto: number;
  googleErrors: number;
  rssCreated: number;
  rssErrors: number;
  translated: number;
  translateErrors: number;
  stageErrors: Array<{ stage: string; message: string }>;
}

async function runTranslate(
  limit: number,
  emit?: (event: object) => void,
): Promise<{ translated: number; errors: number }> {
  if (!process.env.OPENAI_API_KEY) return { translated: 0, errors: 0 };

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
    .filter((n) =>
      (routing.locales as readonly string[]).some((lc) => !hasLocale(n.titleI18n, lc)),
    )
    .slice(0, limit);
  if (targets.length === 0) return { translated: 0, errors: 0 };

  emit?.({ stage: "translate", status: "progress", done: 0, total: targets.length });

  const localeShape: Record<string, z.ZodString> = {};
  for (const lc of routing.locales as readonly string[]) localeShape[lc] = z.string();
  const localeSchema = z.object(localeShape);
  const draftsSchema = z.object({ titleI18n: localeSchema, summaryI18n: localeSchema });

  const systemPrompt = `You translate news for Global Boba Graph.
Title 30-80 chars, summary 40-80 words, in 4 locales (en, zh-TW, zh-CN, ja).
Locale style: en wire-service neutral, zh-TW Taiwan idiom, zh-CN mainland idiom, ja natural news Japanese.
Translate faithfully; don't invent.`;

  let translated = 0;
  let errors = 0;
  let doneCount = 0;

  const tasks = targets.map(async (n) => {
    const sourceTitle = pickFirstFilled(n.titleI18n);
    const sourceSummary = pickFirstFilled(n.summaryI18n);
    if (!sourceTitle) throw new Error("No source title");

    const userPrompt = `TITLE (${sourceTitle.locale}): ${sourceTitle.value}\n\nSUMMARY: ${sourceSummary?.value ?? "(none)"}\n\nGenerate translations for all 4 locales.`;

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
  });

  const results = await Promise.allSettled(
    tasks.map(async (p) => {
      await p;
      doneCount += 1;
      emit?.({ stage: "translate", status: "progress", done: doneCount, total: targets.length });
    }),
  );
  for (const r of results) {
    if (r.status === "fulfilled") translated += 1;
    else errors += 1;
  }
  return { translated, errors };
}

async function runPipeline(emit: (event: object) => void): Promise<ProgressTotals> {
  const startMs = Date.now();
  const totals: ProgressTotals = {
    googleCreated: 0,
    googleSourcesAuto: 0,
    googleErrors: 0,
    rssCreated: 0,
    rssErrors: 0,
    translated: 0,
    translateErrors: 0,
    stageErrors: [],
  };

  // ── Stage 1: Google News ───────────────────────────────
  try {
    const queries = await prisma.newsSearchQuery.findMany({
      where: { enabled: true },
      select: { id: true, label: true },
    });
    emit({ stage: "google", status: "start", total: queries.length });

    for (let i = 0; i < queries.length; i++) {
      if (Date.now() - startMs > GOOGLE_BUDGET_MS) {
        emit({
          stage: "google",
          status: "skip-rest",
          done: i,
          total: queries.length,
          reason: "time budget",
        });
        break;
      }
      try {
        const s = await ingestSearchQuery(queries[i].id, { startedAt: startMs });
        totals.googleCreated += s.created;
        totals.googleSourcesAuto += s.sourcesAutoCreated;
        totals.googleErrors += s.errors.length;
        emit({
          stage: "google",
          status: "progress",
          done: i + 1,
          total: queries.length,
          query: queries[i].label,
          created: s.created,
          skipped: s.skipped,
          totalCreated: totals.googleCreated,
        });
      } catch (err) {
        totals.googleErrors += 1;
        emit({
          stage: "google",
          status: "query-error",
          query: queries[i].label,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    emit({
      stage: "google",
      status: "done",
      created: totals.googleCreated,
      sourcesAutoCreated: totals.googleSourcesAuto,
      errors: totals.googleErrors,
    });
  } catch (err) {
    totals.stageErrors.push({
      stage: "google",
      message: err instanceof Error ? err.message : String(err),
    });
    emit({
      stage: "google",
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Stage 2: RSS ───────────────────────────────────────
  if (Date.now() - startMs < RSS_BUDGET_MS) {
    try {
      const sources = await prisma.source.findMany({
        where: { rssFeedUrl: { not: null }, status: { not: "ARCHIVED" } },
        select: { id: true, slug: true },
      });
      emit({ stage: "rss", status: "start", total: sources.length });

      for (let i = 0; i < sources.length; i++) {
        if (Date.now() - startMs > RSS_BUDGET_MS) {
          emit({
            stage: "rss",
            status: "skip-rest",
            done: i,
            total: sources.length,
            reason: "time budget",
          });
          break;
        }
        try {
          const s = await ingestSource(sources[i].id);
          totals.rssCreated += s.created;
          totals.rssErrors += s.errors.length;
          emit({
            stage: "rss",
            status: "progress",
            done: i + 1,
            total: sources.length,
            source: sources[i].slug,
            created: s.created,
            skipped: s.skipped,
            totalCreated: totals.rssCreated,
          });
        } catch (err) {
          totals.rssErrors += 1;
          emit({
            stage: "rss",
            status: "source-error",
            source: sources[i].slug,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      emit({ stage: "rss", status: "done", created: totals.rssCreated, errors: totals.rssErrors });
    } catch (err) {
      totals.stageErrors.push({
        stage: "rss",
        message: err instanceof Error ? err.message : String(err),
      });
      emit({
        stage: "rss",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    emit({ stage: "rss", status: "skip", reason: "time budget" });
  }

  // ── Stage 3: Translate ─────────────────────────────────
  if (Date.now() - startMs < GLOBAL_BUDGET_MS) {
    try {
      emit({ stage: "translate", status: "start" });
      const r = await runTranslate(5, emit);
      totals.translated = r.translated;
      totals.translateErrors = r.errors;
      emit({
        stage: "translate",
        status: "done",
        translated: r.translated,
        errors: r.errors,
      });
    } catch (err) {
      totals.stageErrors.push({
        stage: "translate",
        message: err instanceof Error ? err.message : String(err),
      });
      emit({
        stage: "translate",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    emit({ stage: "translate", status: "skip", reason: "time budget" });
  }

  emit({ stage: "complete", durationMs: Date.now() - startMs, totals });
  return totals;
}

async function handle(req: Request) {
  const isCron = isCronAuthorized(req);
  if (!isCron && !(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const streaming = url.searchParams.get("stream") === "true";

  if (streaming) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: object) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            /* client disconnected */
          }
        };
        try {
          await runPipeline(emit);
        } catch (err) {
          emit({ stage: "error", error: err instanceof Error ? err.message : String(err) });
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // 非串流模式 — 蒐集事件後一次回 JSON（給 Vercel Cron / curl）
  const events: object[] = [];
  const totals = await runPipeline((e) => events.push(e));
  return Response.json({
    ok: true,
    summary: {
      googleNews: {
        created: totals.googleCreated,
        sourcesAutoCreated: totals.googleSourcesAuto,
        errors: totals.googleErrors,
      },
      rss: { created: totals.rssCreated, errors: totals.rssErrors },
      translate: { translated: totals.translated, errors: totals.translateErrors },
      stageErrors: totals.stageErrors,
      eventCount: events.length,
    },
  });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
