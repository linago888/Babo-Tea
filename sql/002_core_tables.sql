-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "entity_status" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "business_model" AS ENUM ('direct', 'franchise', 'hybrid', 'licensed');

-- CreateEnum
CREATE TYPE "price_tier" AS ENUM ('value', 'mid', 'premium', 'luxury');

-- CreateEnum
CREATE TYPE "market_maturity" AS ENUM ('emerging', 'growing', 'mature', 'saturated');

-- CreateEnum
CREATE TYPE "drink_category" AS ENUM ('milk_tea', 'fruit_tea', 'pure_tea', 'cheese_tea', 'coffee_tea', 'smoothie', 'other');

-- CreateEnum
CREATE TYPE "drink_temperature" AS ENUM ('hot', 'iced', 'blended');

-- CreateEnum
CREATE TYPE "news_category" AS ENUM ('expansion', 'launch', 'franchise_investment', 'city_market', 'trend', 'supply_chain', 'culture');

-- CreateEnum
CREATE TYPE "source_kind" AS ENUM ('mainstream_media', 'trade_press', 'corporate_pr', 'blog', 'social', 'aggregator');

-- CreateEnum
CREATE TYPE "taxonomy_kind" AS ENUM ('tea_base', 'milk_type', 'topping', 'sweetener', 'flavor_tag', 'positioning_tag');

-- CreateTable (Day 2 baseline 已存在，加 IF NOT EXISTS 讓 SQL 可重複跑)
CREATE TABLE IF NOT EXISTS "health_check" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "taxonomy_kind" NOT NULL,
    "code" TEXT NOT NULL,
    "label_i18n" JSONB NOT NULL,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "entity_status" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "taxonomies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "domain" TEXT NOT NULL,
    "country_code" CHAR(2),
    "primary_language" TEXT NOT NULL,
    "kind" "source_kind" NOT NULL,
    "credibility_score" INTEGER,
    "paywall" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" "entity_status" NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "founded_year" SMALLINT,
    "headquarters_city_id" UUID,
    "store_count" INTEGER,
    "business_model" "business_model" NOT NULL,
    "price_tier" "price_tier" NOT NULL,
    "positioning_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "official_website" TEXT,
    "social_handles" JSONB,
    "logo_url" TEXT,
    "hero_image_url" TEXT,
    "description_i18n" JSONB,
    "seo_i18n" JSONB,
    "claimed_by_user_id" UUID,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "entity_status" NOT NULL DEFAULT 'draft',
    "completeness_score" INTEGER,
    "last_human_edit_at" TIMESTAMPTZ(6),
    "content_owner_id" UUID,
    "review_due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "admin_region" TEXT,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "timezone" TEXT NOT NULL,
    "population" INTEGER,
    "avg_price_local" DECIMAL(10,2),
    "avg_price_currency" CHAR(3),
    "market_maturity" "market_maturity",
    "description_i18n" JSONB,
    "seo_i18n" JSONB,
    "status" "entity_status" NOT NULL DEFAULT 'draft',
    "completeness_score" INTEGER,
    "last_human_edit_at" TIMESTAMPTZ(6),
    "content_owner_id" UUID,
    "review_due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drinks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "category" "drink_category" NOT NULL,
    "tea_base" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "milk_type" TEXT,
    "toppings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sweetener" TEXT,
    "temperature" "drink_temperature"[] DEFAULT ARRAY[]::"drink_temperature"[],
    "typical_sugar_levels" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "calories_kcal_min" SMALLINT,
    "calories_kcal_max" SMALLINT,
    "caffeine_mg_min" SMALLINT,
    "caffeine_mg_max" SMALLINT,
    "flavor_profile" JSONB,
    "description_i18n" JSONB,
    "seo_i18n" JSONB,
    "status" "entity_status" NOT NULL DEFAULT 'draft',
    "completeness_score" INTEGER,
    "last_human_edit_at" TIMESTAMPTZ(6),
    "content_owner_id" UUID,
    "review_due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title_i18n" JSONB NOT NULL,
    "summary_i18n" JSONB NOT NULL,
    "body_i18n" JSONB NOT NULL,
    "ai_summary_i18n" JSONB,
    "ai_summary_reviewed_by" UUID,
    "ai_summary_reviewed_at" TIMESTAMPTZ(6),
    "category" "news_category" NOT NULL,
    "source_id" UUID NOT NULL,
    "source_url" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6) NOT NULL,
    "hero_image_url" TEXT,
    "editor_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_i18n" JSONB,
    "status" "entity_status" NOT NULL DEFAULT 'draft',
    "completeness_score" INTEGER,
    "last_human_edit_at" TIMESTAMPTZ(6),
    "content_owner_id" UUID,
    "review_due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taxonomies_kind_idx" ON "taxonomies"("kind");

-- CreateIndex
CREATE INDEX "taxonomies_parent_id_idx" ON "taxonomies"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomies_kind_code_key" ON "taxonomies"("kind", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sources_slug_key" ON "sources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sources_domain_key" ON "sources"("domain");

-- CreateIndex
CREATE INDEX "sources_kind_idx" ON "sources"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_country_code_idx" ON "brands"("country_code");

-- CreateIndex
CREATE INDEX "brands_status_idx" ON "brands"("status");

-- CreateIndex
CREATE INDEX "brands_price_tier_idx" ON "brands"("price_tier");

-- CreateIndex
CREATE INDEX "brands_business_model_idx" ON "brands"("business_model");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "cities_country_code_idx" ON "cities"("country_code");

-- CreateIndex
CREATE INDEX "cities_status_idx" ON "cities"("status");

-- CreateIndex
CREATE INDEX "cities_market_maturity_idx" ON "cities"("market_maturity");

-- CreateIndex
CREATE UNIQUE INDEX "drinks_slug_key" ON "drinks"("slug");

-- CreateIndex
CREATE INDEX "drinks_category_idx" ON "drinks"("category");

-- CreateIndex
CREATE INDEX "drinks_status_idx" ON "drinks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "news_slug_key" ON "news"("slug");

-- CreateIndex
CREATE INDEX "news_source_id_idx" ON "news"("source_id");

-- CreateIndex
CREATE INDEX "news_category_idx" ON "news"("category");

-- CreateIndex
CREATE INDEX "news_status_idx" ON "news"("status");

-- CreateIndex
CREATE INDEX "news_published_at_idx" ON "news"("published_at" DESC);

-- AddForeignKey
ALTER TABLE "taxonomies" ADD CONSTRAINT "taxonomies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "taxonomies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_headquarters_city_id_fkey" FOREIGN KEY ("headquarters_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
