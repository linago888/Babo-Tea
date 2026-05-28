/**
 * Newsletter subscribe — D-2 stub
 *
 * 暫不接 Resend / Buttondown / ConvertKit；只做：
 *  - email 驗證
 *  - 寫 console log（Vercel function log 看得到）
 *  - 回 200 + { ok: true }
 *
 * Phase 5+ 換成正式服務時，這個 endpoint 內部換掉就好，前端不動。
 */
import { z } from "zod";

const Schema = z.object({
  email: z.string().email().max(254),
  locale: z.string().max(10).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      },
      { status: 400 },
    );
  }

  // Phase 5+ 換成 await resend.contacts.create({ ... }) 或 fetch buttondown API
  console.log(
    `[newsletter] subscribe email=${parsed.data.email} locale=${parsed.data.locale ?? "?"}`,
  );

  return Response.json({ ok: true });
}
