/**
 * Phase 5F — RSS / Atom 解析（不裝 npm 套件）
 *
 * 支援格式：
 *   - RSS 2.0：<item><link>...</link><title>...</title><pubDate>...</pubDate></item>
 *   - Atom 1.0：<entry><link href="..."/><title>...</title><published>...</published></entry>
 *
 * 設計重點：
 *   - 純 regex，無依賴
 *   - 對畸形 XML 寬容（很多 source 的 RSS 不嚴格遵守規範）
 *   - 抓不到 link 的 item 直接跳過（不 throw）
 *   - 限制每次最多回 50 個 item，避免 ingest 一次跑爆
 */

const MAX_ITEMS = 50;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5 * 1024 * 1024;
const USER_AGENT =
  "Global Boba Graph Bot/1.0 (+https://babo-tea.vercel.app/about/bot)";

export interface RssItem {
  link: string;
  title?: string;
  publishedAt?: string; // ISO 8601 if parseable
  guid?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .trim();
}

function pickTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

/** Atom 的 <link href="..." rel="alternate"/>（可能有多個 link） */
function pickAtomLink(block: string): string | null {
  // 偏好 rel="alternate" 或無 rel；避免 rel="self" / "enclosure"
  const links = [...block.matchAll(/<link\s+([^/>]*?)\/?>/gi)];
  const candidates: Array<{ href: string; rel: string; type: string }> = [];
  for (const m of links) {
    const attrs = m[1];
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const rel = attrs.match(/rel=["']([^"']+)["']/i)?.[1] ?? "";
    const type = attrs.match(/type=["']([^"']+)["']/i)?.[1] ?? "";
    candidates.push({ href, rel, type });
  }
  // 優先：rel="" 或 rel="alternate" 且 type=text/html
  const alternate = candidates.find(
    (c) => (c.rel === "" || c.rel === "alternate") && (c.type === "" || c.type.includes("html")),
  );
  if (alternate) return alternate.href;
  // 次選：任一 rel=""
  const noRel = candidates.find((c) => c.rel === "");
  if (noRel) return noRel.href;
  // 任意第一個
  return candidates[0]?.href ?? null;
}

function parseDate(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];

  // RSS 2.0: <item>...</item>
  const rssItems = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  for (const m of rssItems) {
    if (items.length >= MAX_ITEMS) break;
    const block = m[1];
    const link =
      pickTag(block, "link") ??
      // 有些 feed 把 link 寫在 guid，且 isPermaLink="true"
      (pickTag(block, "guid") || null);
    if (!link || !/^https?:\/\//i.test(link.trim())) continue;
    items.push({
      link: link.trim(),
      title: pickTag(block, "title") ?? undefined,
      publishedAt:
        parseDate(pickTag(block, "pubDate")) ?? parseDate(pickTag(block, "dc:date")),
      guid: pickTag(block, "guid") ?? undefined,
    });
  }

  if (items.length > 0) return items;

  // Atom: <entry>...</entry>
  const atomEntries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  for (const m of atomEntries) {
    if (items.length >= MAX_ITEMS) break;
    const block = m[1];
    const link = pickAtomLink(block);
    if (!link || !/^https?:\/\//i.test(link.trim())) continue;
    items.push({
      link: link.trim(),
      title: pickTag(block, "title") ?? undefined,
      publishedAt:
        parseDate(pickTag(block, "published")) ?? parseDate(pickTag(block, "updated")),
      guid: pickTag(block, "id") ?? undefined,
    });
  }

  return items;
}

export async function fetchRssFeed(feedUrl: string): Promise<RssItem[]> {
  const url = new URL(feedUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*;q=0.5",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Feed fetch timeout (15s)");
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Feed returned HTTP ${res.status}`);
  }

  // Size-capped read
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        try { await reader.cancel(); } catch { /* noop */ }
        throw new Error(`Feed too large (> ${MAX_BYTES / 1024 / 1024} MB)`);
      }
      chunks.push(value);
    }
  }
  const xml = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));

  return parseRssXml(xml);
}
