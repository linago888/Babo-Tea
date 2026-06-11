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

  // Step 4: 如果有 sg + id，嘗試 batchexecute
  if (markers["data-n-a-sg"] && markers["data-n-a-id"] && !result.resolvedUrl) {
    try {
      const sig = markers["data-n-a-sg"];
      const articleId = markers["data-n-a-id"];
      const ts = Math.floor(Date.now() / 1000);
      const innerArr = [
        "garturlreq",
        [
          ["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],
          "X","X",1,[1,1,1],1,1,null,0,0,null,0,
        ],
        sig, articleId, ts,
      ];
      const fReq = JSON.stringify([[["Fbv4je", JSON.stringify(innerArr), null, "generic"]]]);
      const reqId = Math.floor(100000 + Math.random() * 900000);
      const beUrl =
        "https://news.google.com/_/DotsSplashUi/data/batchexecute" +
        `?rpcids=Fbv4je&source-path=%2F&f.sid=-1&bl=boq_dotssplashuiserver&hl=en-US&gl=US&soc-app=139&soc-platform=1&soc-device=1&_reqid=${reqId}&rt=c`;
      const beRes = await fetch(beUrl, {
        method: "POST",
        headers: {
          "User-Agent": BROWSER_UA,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "*/*",
          Origin: "https://news.google.com",
          Referer: "https://news.google.com/",
        },
        body: `f.req=${encodeURIComponent(fReq)}`,
      });
      const beText = await beRes.text();
      // 抓第一個非 google https URL
      const urlMatches = beText.match(/"(https?:[^"\\]+)"/g) ?? [];
      const decoded = urlMatches.map((s) => s.slice(1, -1)).filter((u) => {
        try { return !isGoogleHost(new URL(u).hostname); } catch { return false; }
      });
      result.steps.push({
        name: "batchexecute",
        success: beRes.ok && decoded.length > 0,
        status: beRes.status,
        responseLength: beText.length,
        responseSample: beText.slice(0, 800),
        decodedCandidates: decoded.slice(0, 5),
      });
      if (decoded[0] && !result.resolvedUrl) {
        result.resolvedUrl = decoded[0];
        result.resolvedBy = "batchexecute";
      }
    } catch (err) {
      result.steps.push({
        name: "batchexecute",
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
