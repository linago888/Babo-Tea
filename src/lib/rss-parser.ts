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
  /** Google News RSS 帶的 <source url="..."></source>：原始發布者資訊 */
  publisherName?: string;
  publisherUrl?: string;
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

    // Google News：<source url="https://publisher.com">Publisher</source>
    let publisherName: string | undefined;
    let publisherUrl: string | undefined;
    const srcMatch = block.match(/<source\s+url=["']([^"']+)["'][^>]*>([^<]*)<\/source>/i);
    if (srcMatch) {
      publisherUrl = srcMatch[1].trim();
      publisherName = decodeEntities(srcMatch[2]).trim() || undefined;
    }

    items.push({
      link: link.trim(),
      title: pickTag(block, "title") ?? undefined,
      publishedAt:
        parseDate(pickTag(block, "pubDate")) ?? parseDate(pickTag(block, "dc:date")),
      guid: pickTag(block, "guid") ?? undefined,
      publisherName,
      publisherUrl,
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

/**
 * 自動探查網站的 RSS / Atom feed URL。
 *
 * 步驟：
 *   1. fetch 該頁面 HTML
 *   2. 從 <head> 抓 <link rel="alternate" type="application/rss+xml" href="..."> 或
 *      type="application/atom+xml"。優先 rss > atom。
 *   3. 若 HTML 沒宣告，試常見路徑：/feed、/rss、/feed.xml、/atom.xml、/index.xml、/?feed=rss2
 *   4. 對每個候選做輕量驗證（HEAD 或 GET 看 content-type）
 *
 * 回傳第一個有效 feed URL，或 null。
 */
export async function discoverRssUrl(siteUrl: string): Promise<{
  feedUrl: string;
  via: "html-link" | "guess";
} | null> {
  const url = new URL(siteUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // Step 1: fetch homepage HTML
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html = "";
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*;q=0.5" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.ok) {
      html = (await res.text()).slice(0, 200_000); // 只看前 200 KB
    }
  } catch {
    /* swallow — continue to guesses */
  } finally {
    clearTimeout(timeout);
  }

  // Step 2: parse <link rel="alternate" type="application/rss+xml" href="...">
  if (html) {
    // 允許屬性順序顛倒（rel/href/type 任何順序）
    const linkRegex = /<link\b([^>]*?)\/?>/gi;
    type Candidate = { href: string; type: string; title: string };
    const candidates: Candidate[] = [];
    for (const m of html.matchAll(linkRegex)) {
      const attrs = m[1];
      const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1] ?? "";
      if (!rel.includes("alternate")) continue;
      const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1] ?? "";
      if (!/rss|atom|xml/i.test(type)) continue;
      const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
      if (!href) continue;
      const title = attrs.match(/\btitle=["']([^"']+)["']/i)?.[1] ?? "";
      candidates.push({ href, type, title });
    }
    // 優先 rss > atom；同層內保留宣告順序
    candidates.sort((a, b) => {
      const score = (t: string) => (/rss/i.test(t) ? 0 : /atom/i.test(t) ? 1 : 2);
      return score(a.type) - score(b.type);
    });
    if (candidates.length > 0) {
      try {
        const feedUrl = new URL(candidates[0].href, url).toString();
        return { feedUrl, via: "html-link" };
      } catch { /* invalid href, fall through */ }
    }
  }

  // Step 3: try common patterns
  const guesses = ["/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml", "/index.xml", "/?feed=rss2"];
  for (const path of guesses) {
    let candidate: string;
    try {
      candidate = new URL(path, url).toString();
    } catch {
      continue;
    }
    try {
      const probe = await fetch(candidate, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml,application/atom+xml,application/xml,*/*;q=0.5" },
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!probe.ok) continue;
      const ct = probe.headers.get("content-type") ?? "";
      // 接受 xml / rss / atom；HTML 就不算
      if (!/xml|rss|atom/i.test(ct)) {
        // 偶有伺服器回 text/plain，就看實際內容前 200 字
        const snippet = (await probe.text()).slice(0, 500).toLowerCase();
        if (!/<rss\b|<feed\b|<channel\b/.test(snippet)) continue;
      }
      return { feedUrl: candidate, via: "guess" };
    } catch {
      continue;
    }
  }

  return null;
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
