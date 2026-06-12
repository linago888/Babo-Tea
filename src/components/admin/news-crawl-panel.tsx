"use client";

import { useState } from "react";

import { routing, type Locale } from "@/i18n/routing";

type LocaleMap = Record<string, string>;

export interface CrawlPayload {
  sourceUrl: string;
  domain: string;
  imageUrl: string | null;
  publishedAt: string | null;
  detectedLang: string | null;
  siteName: string | null;
  sourceId: string | null;
  sourceSuggestSlug: string | null;
  sourceSuggestName: string | null;
  rawTitle: string;
  rawDescription: string;
  rawBodyText: string;
}

export interface CrawlDrafts {
  titleI18n: LocaleMap;
  summaryI18n: LocaleMap;
  bodyI18n: LocaleMap;
}

export interface ApplyArgs {
  sourceUrl: string;
  publishedAt: string | null; // datetime-local format YYYY-MM-DDTHH:mm
  heroImageUrl: string | null;
  sourceId: string | null;
  titleI18n: LocaleMap;
  summaryI18n: LocaleMap;
  bodyI18n: LocaleMap;
  /** 若沒命中既有 source，提供建議讓編輯到 /admin/sources/new 建 */
  sourceSuggest: { slug: string; name: string; domain: string } | null;
}

type Props = {
  onApply: (args: ApplyArgs) => void;
};

function toDatetimeLocal(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export default function NewsCrawlPanel({ onApply }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crawl, setCrawl] = useState<CrawlPayload | null>(null);
  const [drafts, setDrafts] = useState<CrawlDrafts | null>(null);
  const [draftsSkippedReason, setDraftsSkippedReason] = useState<string | null>(null);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setCrawl(null);
    setDrafts(null);
    setDraftsSkippedReason(null);
    try {
      const res = await fetch("/api/admin/news/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), translate: true }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            crawl: CrawlPayload;
            drafts: CrawlDrafts | null;
            draftsSkippedReason?: string;
          }
        | { ok: false; error?: string; errors?: { path: string; message: string }[] };
      if (!data.ok) {
        const msg =
          "error" in data && data.error
            ? data.error
            : "errors" in data && data.errors && data.errors.length > 0
              ? `${data.errors[0].path}: ${data.errors[0].message}`
              : "Crawl failed";
        setError(msg);
        setLoading(false);
        return;
      }
      setCrawl(data.crawl);
      setDrafts(data.drafts);
      if (!data.drafts && data.draftsSkippedReason) setDraftsSkippedReason(data.draftsSkippedReason);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setLoading(false);
    }
  }

  function emptyLocaleMap(): LocaleMap {
    const out: LocaleMap = {};
    for (const lc of routing.locales as readonly Locale[]) out[lc] = "";
    return out;
  }

  function singleLocaleMap(locale: string | null | undefined, value: string): LocaleMap {
    const out = emptyLocaleMap();
    // 把抽到的內容塞到偵測到的 locale；如果偵測不到就丟到 defaultLocale
    const lc =
      locale && (routing.locales as readonly string[]).includes(locale)
        ? locale
        : routing.defaultLocale;
    out[lc] = value;
    return out;
  }

  function handleApply() {
    if (!crawl) return;
    onApply({
      sourceUrl: crawl.sourceUrl,
      publishedAt: toDatetimeLocal(crawl.publishedAt),
      heroImageUrl: crawl.imageUrl,
      sourceId: crawl.sourceId,
      titleI18n: drafts?.titleI18n ?? singleLocaleMap(crawl.detectedLang, crawl.rawTitle),
      summaryI18n:
        drafts?.summaryI18n ?? singleLocaleMap(crawl.detectedLang, crawl.rawDescription),
      bodyI18n: drafts?.bodyI18n ?? singleLocaleMap(crawl.detectedLang, crawl.rawBodyText),
      sourceSuggest:
        crawl.sourceId === null && crawl.sourceSuggestSlug && crawl.sourceSuggestName
          ? {
              slug: crawl.sourceSuggestSlug,
              name: crawl.sourceSuggestName,
              domain: crawl.domain,
            }
          : null,
    });
    // 清空，讓編輯可以接著編表單
    setCrawl(null);
    setDrafts(null);
    setUrl("");
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/40">
      <h2 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
        🔗 從 URL 匯入新聞
      </h2>
      <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
        貼上外部新聞文章連結 — 系統會抓取標題 / 摘要 / 內文，並用 AI 翻譯成 4 個 locale。會嘗試用 domain 自動配對既有來源。
      </p>

      <div className="mt-3 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article-url"
          className="flex-1 rounded-md border border-violet-300 bg-white px-3 py-1.5 text-sm focus:border-violet-600 focus:outline-none dark:border-violet-700 dark:bg-neutral-900 dark:focus:border-violet-400"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleFetch();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void handleFetch()}
          disabled={loading || !url.trim()}
          className="shrink-0 rounded-md bg-violet-700 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-violet-800 disabled:opacity-50 dark:bg-violet-700 dark:hover:bg-violet-600"
        >
          {loading ? "抓取中…" : "匯入"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">⚠ {error}</p>
      ) : null}

      {/* Preview */}
      {crawl ? (
        <div className="mt-4 rounded-lg border border-violet-200 bg-white p-3 dark:border-violet-900 dark:bg-neutral-900">
          <div className="flex gap-3">
            {crawl.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={crawl.imageUrl}
                alt="hero preview"
                referrerPolicy="no-referrer"
                className="size-20 shrink-0 rounded object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            ) : null}
            <div className="min-w-0 flex-1 space-y-1 text-xs">
              <p className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {drafts?.titleI18n[routing.defaultLocale] || crawl.rawTitle}
              </p>
              <p className="line-clamp-2 text-neutral-600 dark:text-neutral-400">
                {drafts?.summaryI18n[routing.defaultLocale] || crawl.rawDescription}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                <span>🌐 {crawl.domain}</span>
                {crawl.detectedLang ? <span>· lang: {crawl.detectedLang}</span> : null}
                {crawl.publishedAt ? (
                  <span>· {new Date(crawl.publishedAt).toLocaleDateString()}</span>
                ) : null}
                <span>
                  ·{" "}
                  {crawl.sourceId ? (
                    <span className="text-emerald-700 dark:text-emerald-400">✓ 來源已配對</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">
                      ⚠ 找不到 {crawl.domain} 的來源 — 套用後請先到 /admin/sources/new 建立
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {drafts ? (
            <p className="mt-3 text-[11px] text-emerald-700 dark:text-emerald-400">
              ✓ AI 已翻譯 4 個 locale（en / zh-TW / zh-CN / ja）— 套用後可在 i18n tab 各 locale 子分頁微調
            </p>
          ) : (
            <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400">
              ⚠ AI 翻譯未執行（{draftsSkippedReason ?? "AI 未啟用"}） — 套用時會把原文塞到偵測到的 locale，其他 locale 用編輯頁的「✨ AI 補完」按鈕補
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              套用到表單
            </button>
            <button
              type="button"
              onClick={() => {
                setCrawl(null);
                setDrafts(null);
              }}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
