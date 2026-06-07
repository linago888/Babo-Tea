/**
 * POST /api/admin/news/translate-batch
 *
 * 把收件匣裡缺翻譯的 DRAFT 新聞 batch AI 翻譯成 4 個 locale。
 * 只翻 title + summary（短文本、快、便宜），不翻 body（編輯之後在編輯頁用 ✨ AI 補完）。
 *
 * Body: { limit?: 10, sourceId?: string, fillBody?: false }
 * Response: { ok: true, summary: { translated, skipped, errors: [] } }
 *
 * 設計重點：
 * - 平行跑（Promise.allSettled）— N 個 item 約等同單一 OpenAI latency
 * - 失敗的 item 收集到 errors[] 但不擋整批
 * - Vercel maxDuration 60s；單批 10 件、平均 2-3s/件 = 完得了
 * - 預設只挑 zh-TW 缺失的；過完一輪後缺其他 locale 的也會被選到
 */
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { routing } from "@/i18n/routing";
import { scoreNews } from "@/lib/content-quality/completeness";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  limit: z.number().int().min(1).max(30).default(10),
  sourceId: z.string().uuid().optional(),
  fillBody: z.boolean().default(false),
});

export const maxDuration = 60;

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

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { ok: false, error: "AI not configured. Set OPENAI_API_KEY." },
      { status: 503 },
    );
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 422 },
    );
  }
  const { limit, sourceId, fillBody } = parsed.data;

  // 挑候選 — 撈一批 DRAFT，app-side filter「至少缺一個 locale」
  const candidates = await prisma.news.findMany({
    where: { status: "DRAFT", ...(sourceId ? { sourceId } : {}) },
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
    take: limit * 4, // overscan — 之後 app-side 過濾
  });

  const targets = candidates
    .filter((n) => {
      // 至少缺一個 locale 的 title 才需要翻譯
      return (routing.locales as readonly string[]).some((lc) => !hasLocale(n.titleI18n, lc));
    })
    .slice(0, limit);

  if (targets.length === 0) {
    return Response.json({
      ok: true,
      summary: { translated: 0, skipped: candidates.length, errors: [] },
    });
  }

  // 動態 schema：{ titleI18n: { en, zh-TW, zh-CN, ja }, summaryI18n: {...}, bodyI18n?: {...} }
  const localeShape: Record<string, z.ZodString> = {};
  for (const lc of routing.locales as readonly string[]) localeShape[lc] = z.string();
  const localeSchema = z.object(localeShape);

  const draftsSchema = fillBody
    ? z.object({ titleI18n: localeSchema, summaryI18n: localeSchema, bodyI18n: localeSchema })
    : z.object({ titleI18n: localeSchema, summaryI18n: localeSchema });

  const systemPrompt = `You translate news articles for Global Boba Graph (a multilingual bubble tea industry database).

For each item, produce title (30–80 chars) and summary (40–80 words) in 4 locales:
- en: neutral international English, AP/Reuters style
- zh-TW: 繁體中文，台灣新聞編輯室用詞（「展店」「飲品」）
- zh-CN: 简体中文，大陆新闻媒体用词（「门店」「饮品」）
- ja: 自然な日本語、新聞記事スタイル

Rules:
- Translate faithfully — adapt cultural references but don't invent facts.
- Don't add editorial opinion.
- Title: clean, factual, no clickbait.
- Summary: lead with WHO/WHAT/WHERE/WHEN.${fillBody ? "\n- Body: 200-400 words / 400-800 字, Markdown, 3-5 paragraphs." : ""}`;

  const errors: Array<{ id: string; message: string }> = [];
  let translated = 0;

  // 平行跑，settled 模式 — 個別失敗不擋整批
  const results = await Promise.allSettled(
    targets.map(async (n) => {
      const sourceTitle = pickFirstFilled(n.titleI18n);
      const sourceSummary = pickFirstFilled(n.summaryI18n);
      const sourceBody = pickFirstFilled(n.bodyI18n);
      if (!sourceTitle) {
        throw new Error("No source title in any locale");
      }

      const userPrompt = `Source article (in ${sourceTitle.locale}):

TITLE: ${sourceTitle.value}

SUMMARY: ${sourceSummary?.value ?? "(not provided)"}${
        fillBody && sourceBody ? `\n\nBODY (truncated):\n${sourceBody.value.slice(0, 4000)}` : ""
      }

Source URL: ${n.sourceUrl}

Generate translations for all 4 locales.`;

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: draftsSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.4,
      });

      const newTitle: LocaleMap = { ...(n.titleI18n as LocaleMap), ...(object.titleI18n as LocaleMap) };
      const newSummary: LocaleMap = { ...(n.summaryI18n as LocaleMap), ...(object.summaryI18n as LocaleMap) };
      let newBody: LocaleMap = (n.bodyI18n as LocaleMap | null) ?? {};
      if (fillBody && "bodyI18n" in object) {
        newBody = { ...newBody, ...(object.bodyI18n as LocaleMap) };
      }

      const { score } = scoreNews({
        titleI18n: newTitle,
        summaryI18n: newSummary,
        bodyI18n: newBody,
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
          ...(fillBody ? { bodyI18n: newBody as never } : {}),
          completenessScore: score,
        },
      });
      return n.id;
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      translated += 1;
    } else {
      errors.push({
        id: targets[i].id,
        message: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  }

  return Response.json({
    ok: true,
    summary: {
      translated,
      skipped: candidates.length - targets.length,
      remaining: Math.max(0, candidates.length - targets.length),
      errors,
    },
  });
}
