/**
 * POST /api/admin/search-queries — 建立 Google News 搜尋查詢
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  label: z.string().min(1).max(120),
  query: z.string().min(1).max(500),
  locale: z.enum(routing.locales as unknown as [string, ...string[]]),
  countryCode: z.string().length(2).optional().nullable(),
  enabled: z.boolean().default(true),
});

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  const data = parsed.data;
  const created = await prisma.newsSearchQuery.create({
    data: {
      label: data.label,
      query: data.query,
      locale: data.locale,
      countryCode: data.countryCode ? data.countryCode.toUpperCase() : null,
      enabled: data.enabled,
    },
    select: { id: true },
  });
  return Response.json({ ok: true, searchQuery: created });
}
