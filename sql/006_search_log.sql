-- Phase 5D — search_log
-- 公開站搜尋紀錄表。每次有人在 /search 查詢就寫一筆。
-- 用途：給編輯團隊看 top queries / zero-result gaps / 趨勢。

-- CreateTable
CREATE TABLE IF NOT EXISTS "search_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "result_count" INTEGER NOT NULL,
    "country_code" CHAR(2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_log_created_at_idx" ON "search_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_log_query_idx" ON "search_log"("query");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_log_result_count_idx" ON "search_log"("result_count");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_log_locale_idx" ON "search_log"("locale");
