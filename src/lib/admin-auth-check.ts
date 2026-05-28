/**
 * Admin API auth helper — 與 proxy.ts 的 middleware 邏輯保持一致。
 * 用在 /api/admin/* route handler 內，多一層校驗：middleware 已經攔過，
 * 但 API route 補檢查更安全（防 middleware 沒生效的邊緣情況）。
 */
import { headers } from "next/headers";

export async function isAdminAuthorized(): Promise<boolean> {
  const user = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;
  if (!user || !password) return false;

  const h = await headers();
  const authHeader = h.get("authorization") ?? "";
  const match = authHeader.match(/^Basic (.+)$/);
  if (!match) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) return false;
  const presentedUser = decoded.slice(0, idx);
  const presentedPass = decoded.slice(idx + 1);
  if (presentedUser.length !== user.length || presentedPass.length !== password.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < user.length; i++) diff |= presentedUser.charCodeAt(i) ^ user.charCodeAt(i);
  for (let i = 0; i < password.length; i++) diff |= presentedPass.charCodeAt(i) ^ password.charCodeAt(i);
  return diff === 0;
}
