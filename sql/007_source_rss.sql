-- Phase 5F — sources RSS auto-ingest 欄位
-- rss_feed_url：RSS / Atom 訂閱網址（可選；有設才會被 ingest job 拉）
-- last_crawled_at：最後一次成功跑完 ingest 的時間，用於監控與「最後抓取於」UI 顯示

ALTER TABLE "sources"
  ADD COLUMN IF NOT EXISTS "rss_feed_url" TEXT,
  ADD COLUMN IF NOT EXISTS "last_crawled_at" TIMESTAMPTZ(6);
