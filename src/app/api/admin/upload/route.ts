/**
 * POST /api/admin/upload — 圖片上傳（Vercel Blob）
 *
 * 接收 multipart/form-data，欄位 file。回傳 { url }。
 *
 * 設定：Vercel 專案需有 BLOB_READ_WRITE_TOKEN env var
 * 未設定時回 503 + 友善訊息（不會 crash）。
 *
 * 安全：
 * - 只接受 image/* MIME
 * - 限制 5 MB
 * - 檔名 sanitize + UUID prefix 避免覆蓋
 * - 需通過 admin auth
 */
import { put } from "@vercel/blob";

import { isAdminAuthorized } from "@/lib/admin-auth-check";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
];

function safeName(name: string): string {
  // 移除路徑分隔符 + 不安全字元，保留 ascii + 數字 + 連字號 + 點
  return name
    .replace(/[\\/]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        ok: false,
        error: "Image upload not configured. Set BLOB_READ_WRITE_TOKEN in Vercel environment variables (create a Blob store from the Vercel dashboard → Storage tab).",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const prefix = (formData.get("prefix") as string | null) ?? "uploads";

  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return Response.json(
      { ok: false, error: `Unsupported MIME type: ${file.type}` },
      { status: 415 },
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { ok: false, error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const safePrefix = prefix.replace(/[^a-zA-Z0-9-_/]/g, "");
  const filename = safeName(file.name) || "upload.bin";
  const pathname = `${safePrefix}/${Date.now()}-${filename}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    return Response.json({ ok: true, url: blob.url, pathname: blob.pathname });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
