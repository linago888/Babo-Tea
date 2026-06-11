/**
 * POST /api/admin/news/debug-resolve
 *
 * Body: { url: string }  Google News article URL
 *
 * 對指定 URL 跑每個 resolve 步驟 + 完整紀錄，回傳：
 *   - decode (base64) — 路徑 base64 是否能挖出 publisher URL
 *   - http fetch — 中介頁回應狀態 / final URL / HTML 長度
 *   - 6 個 fallback 通道各別找到什麼
 *   - 若有 publisher URL，再呼叫 crawler 抓內文，回傳 title / body 前 500 字
 *
 * 純診斷用途；不寫 DB。
 */
import { GoogleDecoder } from "google-news-url-decoder";

import { isAdminAuthorized } from "@/lib/admin-auth-check";
import { decodeGoogleNewsUrl } from "@/lib/google-news";
import { crawlUrl } from "@/lib/news-crawler";

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isGoogleHost(host: string): boolean {
  return /(?:^|\.)google\.com$/i.test(host) || /(?:^|\.)goo\.gl$/i.test(host);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) return Response.json({ ok: false, error: "Missing url" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = { input: url, steps: [] };

  // Step 1: base64 decode
  try {
    const decoded = decodeGoogleNewsUrl(url);
    result.steps.push({
      name: "decodeGoogleNewsUrl",
      success: decoded !== null,
      result: decoded,
    });
    if (decoded) {
      result.resolvedUrl = decoded;
      result.resolvedBy = "base64-decode";
    }
  } catch (err) {
    result.steps.push({
      name: "decodeGoogleNewsUrl",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 2: HTTP fetch — get intermediate page
  let html = "";
  let resStatus = 0;
  let resFinalUrl = "";
  let resContentType = "";
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10_000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
      signal: ac.signal,
    });
    clearTimeout(t);
    resStatus = res.status;
    resFinalUrl = res.url;
    resContentType = res.headers.get("content-type") ?? "";
    html = await res.text();
    result.steps.push({
      name: "fetch-intermediate-page",
      success: res.ok,
      status: resStatus,
      finalUrl: resFinalUrl,
      contentType: resContentType,
      htmlLength: html.length,
      htmlSample: html.slice(0, 800),
    });

    // 如果 final URL 已經離開 google.com
    try {
      const finalHost = new URL(resFinalUrl).hostname;
      if (!isGoogleHost(finalHost) && !result.resolvedUrl) {
        result.resolvedUrl = resFinalUrl;
        result.resolvedBy = "follow-redirect";
      }
    } catch { /* noop */ }
  } catch (err) {
    result.steps.push({
      name: "fetch-intermediate-page",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ ok: true, result });
  }

  // Step 3: 掃 HTML 看有沒有各種已知 marker
  const markers = {
    "data-n-a-sg": /data-n-a-sg=["']([^"']+)["']/.exec(html)?.[1] ?? null,
    "data-n-a-ts": /data-n-a-ts=["']([^"']+)["']/.exec(html)?.[1] ?? null,
    "data-n-a-id": /data-n-a-id=["']([^"']+)["']/.exec(html)?.[1] ?? null,
    "data-n-au": /data-n-au=["']([^"']*)["']/.exec(html)?.[1] ?? null,
    "canonical-link": /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1] ?? null,
    "og:url": /<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i.exec(html)?.[1] ?? null,
    "meta-refresh": /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?[^"';]*?url=([^"';\s]+)/i.exec(html)?.[1] ?? null,
    "window-location": /window\.location(?:\.href|\.replace\(|\.assign\(|\s*=\s*)["']([^"']+)["']/.exec(html)?.[1] ?? null,
    "consent-page": /consent\.google\.com|Before you continue|Sign in to confirm|CONSENT/i.test(html),
    "blocked-page": /unusual traffic|automated queries|captcha|denied/i.test(html),
  };
  result.steps.push({ name: "html-markers", markers });

  // Step 4: 用 google-news-url-decoder 套件解碼（與 production 同一條路）
  if (!result.resolvedUrl) {
    try {
      const decoder = new GoogleDecoder();
      const dec = await decoder.decode(url);
      result.steps.push({
        name: "package-decode",
        success: dec.status === true,
        result: dec.status ? dec.decoded_url : null,
        message: dec.status ? undefined : dec.message,
      });
      if (dec.status && dec.decoded_url) {
        try {
          const u = new URL(dec.decoded_url);
          if (!isGoogleHost(u.hostname)) {
            result.resolvedUrl = dec.decoded_url;
            result.resolvedBy = "package-decode";
          }
        } catch { /* noop */ }
      }
    } catch (err) {
      result.steps.push({
        name: "package-decode",
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Step 5: 如果有 resolvedUrl，嘗試 crawl
  if (result.resolvedUrl) {
    try {
      const crawl = await crawlUrl(result.resolvedUrl);
      result.crawl = {
        success: true,
        finalUrl: crawl.finalUrl,
        domain: crawl.domain,
        title: crawl.title,
        descriptionLength: crawl.description.length,
        bodyTextLength: crawl.bodyText.length,
        bodyTextSample: crawl.bodyText.slice(0, 500),
        hasImage: !!crawl.imageUrl,
      };
    } catch (err) {
      result.crawl = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return Response.json({ ok: true, result });
}
