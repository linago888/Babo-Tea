-- Phase 5H — Google News 搜尋查詢設定表
-- 後台可建多個查詢（label / query / locale / country），ingest job 對每個查詢拉 Google News RSS

CREATE TABLE IF NOT EXISTS "news_search_queries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "country_code" CHAR(2),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_crawled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_search_queries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "news_search_queries_enabled_idx" ON "news_search_queries"("enabled");

-- Auto-update updated_at trigger（與其他表慣例一致）
CREATE OR REPLACE FUNCTION update_news_search_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS news_search_queries_updated_at ON news_search_queries;
CREATE TRIGGER news_search_queries_updated_at
  BEFORE UPDATE ON news_search_queries
  FOR EACH ROW EXECUTE FUNCTION update_news_search_queries_updated_at();
