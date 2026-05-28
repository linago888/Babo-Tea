-- CreateEnum
CREATE TYPE "metric_entity_kind" AS ENUM ('brand', 'city', 'drink');

-- CreateEnum
CREATE TYPE "metric_kind" AS ENUM ('trending_score', 'market_maturity', 'popularity_score', 'news_count_30d', 'new_store_count_30d', 'new_store_count_90d', 'social_mention_30d', 'search_volume_30d', 'active_store_count', 'distinct_brand_count');

-- CreateTable
CREATE TABLE "metrics_daily" (
    "entity_kind" "metric_entity_kind" NOT NULL,
    "entity_id" UUID NOT NULL,
    "metric" "metric_kind" NOT NULL,
    "date" DATE NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "inputs" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_daily_pkey" PRIMARY KEY ("entity_kind","entity_id","metric","date")
);

-- CreateIndex
CREATE INDEX "metrics_daily_metric_date_value_idx" ON "metrics_daily"("metric", "date", "value" DESC);

-- CreateIndex
CREATE INDEX "metrics_daily_entity_kind_entity_id_metric_date_idx" ON "metrics_daily"("entity_kind", "entity_id", "metric", "date" DESC);

-- CreateIndex
CREATE INDEX "metrics_daily_date_idx" ON "metrics_daily"("date");
