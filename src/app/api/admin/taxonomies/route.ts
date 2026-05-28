/**
 * POST /api/admin/taxonomies — 建立受控詞彙
 */
import { z } from "zod";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { prisma } from "@/lib/prisma";

const KINDS = ["TEA_BASE", "MILK_TYPE", "TOPPING", "SWEETENER", "FLAVOR_TAG", "POSITIONING_TAG"] as const;

const CreateSchema = z.object({
  kind: z.enum(KINDS),
  code: z.string().min(1).regex(/^[a-z0-9-]+$/),
  labelI18n: z.record(z.string(), z.string()),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().default(0),
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

  // (kind, code) 唯一性
  const dup = await prisma.taxonomy.findUnique({
    where: { kind_code: { kind: data.kind, code: data.code } },
  });
  if (dup) {
    return Response.json(
      { ok: false, errors: [{ path: "code", message: "code already in use for this kind" }] },
      { status: 409 },
    );
  }

  const tx = await prisma.taxonomy.create({
    data: {
      kind: data.kind,
      code: data.code,
      labelI18n: data.labelI18n as never,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder,
      status: data.status,
    },
    select: { id: true, code: true, kind: true },
  });

  return Response.json({ ok: true, taxonomy: tx });
}
