/**
 * POST /api/admin/ai/draft
 *
 * 通用 AI 草稿生成端點。給定 instruction + context + 要產的 fields，
 * 回傳每個 field × 每個 locale 的草稿。
 *
 * 使用 Vercel AI SDK + OpenAI gpt-4o-mini。
 * 若 OPENAI_API_KEY 未設定，回 503 + 友善訊息（不會 crash）。
 *
 * Request body:
 *   {
 *     instruction: "Write a 50-80 word marketing description for this brand.",
 *     context: "Brand: Gong Cha\nCountry: TW\n...",
 *     fields: ["text"]              // 單欄位
 *     fields: ["title", "description"]  // SEO 場景：多欄位
 *     locales?: ["en", "zh-TW", ...]  // 預設全部
 *     maxChars?: { title: 60, description: 160 }  // 每欄字數上限提示
 *   }
 *
 * Response:
 *   { ok: true, drafts: { fieldName: { en: "...", "zh-TW": "...", ... } } }
 */
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { routing } from "@/i18n/routing";

const BodySchema = z.object({
  instruction: z.string().min(1).max(500),
  context: z.string().max(4000).optional(),
  fields: z.array(z.string().min(1).max(40)).min(1).max(5),
  locales: z.array(z.string()).optional(),
  maxChars: z.record(z.string(), z.number().int().positive()).optional(),
});

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        ok: false,
        error: "AI not configured. Set OPENAI_API_KEY in Vercel environment variables.",
      },
      { status: 503 },
    );
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
  const { instruction, context, fields, locales, maxChars } = parsed.data;

  const targetLocales = (locales && locales.length > 0
    ? locales
    : (routing.locales as readonly string[]).slice()) as string[];

  // 動態組 schema：{ [field]: { [locale]: string } }
  const localeShape: Record<string, z.ZodString> = {};
  for (const lc of targetLocales) localeShape[lc] = z.string();
  const localeSchema = z.object(localeShape);

  const fieldShape: Record<string, typeof localeSchema> = {};
  for (const f of fields) fieldShape[f] = localeSchema;
  const fullSchema = z.object(fieldShape);

  const systemPrompt = `You are a senior bilingual content writer for "Global Boba Graph", an encyclopedic database of bubble tea brands, cities, drinks, and news worldwide.

Write naturally for each locale — do NOT translate word-for-word. Adapt tone and idiom to what readers in that market actually expect:

- en: Neutral international English. Clean, factual, lightly engaging. Avoid US slang.
- zh-TW: 繁體中文，使用台灣讀者熟悉的詞彙和語感。避免大陸用語（例：用「珍珠奶茶」而不是「珍珠奶茶飲料」、「店家」而不是「门店」）。
- zh-CN: 简体中文，使用中国大陆读者熟悉的表达。用「奶茶店」「门店」等大陆习惯词。
- ja: 自然で丁寧な日本語。カタカナを過度に使わず、読みやすい文体で。

Output ONLY the requested fields. Do not add explanations, markdown formatting, or quotation marks.

Be concise. Follow any length limits exactly. Use facts from the context — do NOT invent numbers, dates, store counts, or claims that aren't supported.`;

  const charLimits = maxChars
    ? `\n\nLength limits (characters per field, applies to every locale):\n${Object.entries(maxChars)
        .map(([k, v]) => `- ${k}: max ${v} characters`)
        .join("\n")}`
    : "";

  const userPrompt = [
    `Task: ${instruction}`,
    context ? `Context (facts you may use; do not invent beyond these):\n${context}` : null,
    `Fields to generate: ${fields.join(", ")}`,
    `Locales: ${targetLocales.join(", ")}`,
    charLimits,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: fullSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    return Response.json({ ok: true, drafts: object });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
