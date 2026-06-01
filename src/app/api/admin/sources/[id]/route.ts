/**
 * PUT    /api/admin/sources/[id]  — 更新來源
 * DELETE /api/admin/sources/[id]  — 封存（status=ARCHIVED）
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
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

  const existing = await prisma.source.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ ok: false, error: "Source not found" }, { status: 404 });
  }

  if (data.slug !== existing.slug) {
    const dup = await prisma.source.findUnique({ where: { slug: data.slug } });
    if (dup) {
      return Response.json(
        { ok: false, errors: [{ path: "slug", message: "slug already in use" }] },
        { status: 409 },
      );
    }
  }
  if (data.domain.toLowerCase() !== existing.domain) {
    const dup = await prisma.source.findUnique({ where: { domain: data.domain.toLowerCase() } });
    if (dup) {
      return Response.json(
        { ok: false, errors: [{ path: "domain", message: "domain already in use" }] },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.source.update({
    where: { id },
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

  return Response.json({ ok: true, source: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.source.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ ok: false, error: "Source not found" }, { status: 404 });
  }

  await prisma.source.update({ where: { id }, data: { status: "ARCHIVED" } });

  return Response.json({ ok: true });
}
