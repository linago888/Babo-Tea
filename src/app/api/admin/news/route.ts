/**
 * POST /api/admin/news — 建立新聞
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { scoreNews } from "@/lib/content-quality/completeness";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  titleI18n: z.record(z.string(), z.string()),
  summaryI18n: z.record(z.string(), z.string()),
  bodyI18n: z.record(z.string(), z.string()),
  aiSummaryI18n: z.record(z.string(), z.string()).optional().nullable(),
  aiSummaryReviewedAt: z.string().datetime().optional().nullable(),
  category: z.enum([
    "EXPANSION",
    "LAUNCH",
    "FRANCHISE_INVESTMENT",
    "CITY_MARKET",
    "TREND",
    "SUPPLY_CHAIN",
    "CULTURE",
  ]),
  sourceId: z.string().uuid(),
  sourceUrl: z.string().default(""),
  publishedAt: z.string().datetime(),
  heroImageUrl: z.string().url().optional().or(z.literal("")).nullable(),
  editorTags: z.array(z.string()).default([]),
  seoI18n: z.unknown().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
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

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  const data = parsed.data;

  const dup = await prisma.news.findUnique({ where: { slug: data.slug } });
  if (dup) {
    return Response.json(
      { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
      { status: 409 },
    );
  }

  // 驗 sourceId
  const source = await prisma.source.findUnique({ where: { id: data.sourceId }, select: { id: true } });
  if (!source) {
    return Response.json(
      { ok: false, errors: [{ path: "sourceId", message: "source not found" }] },
      { status: 422 },
    );
  }

  const { score } = scoreNews({
    titleI18n: data.titleI18n,
    summaryI18n: data.summaryI18n,
    bodyI18n: data.bodyI18n,
    seoI18n: data.seoI18n ?? null,
    heroImageUrl: data.heroImageUrl || null,
    editorTags: data.editorTags,
    sourceUrl: data.sourceUrl,
    newsBrands: [],
    newsCities: [],
    newsDrinks: [],
  });

  const news = await prisma.news.create({
    data: {
      slug: data.slug,
      titleI18n: data.titleI18n as never,
      summaryI18n: data.summaryI18n as never,
      bodyI18n: data.bodyI18n as never,
      aiSummaryI18n: (data.aiSummaryI18n ?? null) as never,
      aiSummaryReviewedAt: data.aiSummaryReviewedAt ? new Date(data.aiSummaryReviewedAt) : null,
      category: data.category,
      sourceId: data.sourceId,
      sourceUrl: data.sourceUrl ?? "",
      publishedAt: new Date(data.publishedAt),
      heroImageUrl: data.heroImageUrl || null,
      editorTags: data.editorTags,
      seoI18n: (data.seoI18n ?? null) as never,
      status: data.status,
      completenessScore: score,
      lastHumanEditAt: new Date(),
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/[locale]/news", "layout");
  revalidatePath(`/[locale]/news/${news.slug}`, "layout");

  return Response.json({ ok: true, news });
}
