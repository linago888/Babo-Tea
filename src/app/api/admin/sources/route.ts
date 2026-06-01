/**
 * POST /api/admin/sources — 建立新聞來源
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  nameI18n: z.record(z.string(), z.string()),
  domain: z.string().min(3),
  countryCode: z.string().length(2).optional().nullable(),
  primaryLanguage: z.string().min(2),
  kind: z.enum(["MAINSTREAM_MEDIA", "TRADE_PRESS", "CORPORATE_PR", "BLOG", "SOCIAL", "AGGREGATOR"]),
  credibilityScore: z.number().int().min(0).max(100).optional().nullable(),
  paywall: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  rssFeedUrl: z.string().url().optional().or(z.literal("")).nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
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

  // slug / domain 唯一性
  const dupSlug = await prisma.source.findUnique({ where: { slug: data.slug } });
  if (dupSlug) {
    return Response.json(
      { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
      { status: 409 },
    );
  }
  const dupDomain = await prisma.source.findUnique({ where: { domain: data.domain } });
  if (dupDomain) {
    return Response.json(
      { ok: false, errors: [{ path: "domain", message: "domain already in use" }] },
      { status: 409 },
    );
  }

  const source = await prisma.source.create({
    data: {
      slug: data.slug,
      nameI18n: data.nameI18n as never,
      domain: data.domain.toLowerCase(),
      countryCode: data.countryCode ? data.countryCode.toUpperCase() : null,
      primaryLanguage: data.primaryLanguage,
      kind: data.kind,
      credibilityScore: data.credibilityScore ?? null,
      paywall: data.paywall,
      notes: data.notes || null,
      rssFeedUrl: data.rssFeedUrl || null,
      status: data.status,
    },
    select: { id: true, slug: true },
  });

  return Response.json({ ok: true, source });
}
