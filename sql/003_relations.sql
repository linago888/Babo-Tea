-- CreateEnum
CREATE TYPE "relevance_level" AS ENUM ('primary', 'secondary', 'mentioned');

-- CreateEnum
CREATE TYPE "brand_city_status" AS ENUM ('active', 'exited', 'rumored');

-- CreateTable
CREATE TABLE "brand_drinks" (
    "brand_id" UUID NOT NULL,
    "drink_id" UUID NOT NULL,
    "is_signature" BOOLEAN NOT NULL DEFAULT false,
    "local_name_i18n" JSONB,
    "price_local" DECIMAL(10,2),
    "price_currency" CHAR(3),
    "calories_kcal" SMALLINT,
    "caffeine_mg" SMALLINT,
    "available_markets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "since" DATE,
    "until" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brand_drinks_pkey" PRIMARY KEY ("brand_id","drink_id")
);

-- CreateTable
CREATE TABLE "brand_cities" (
    "brand_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "entered_at" DATE,
    "store_count_cached" INTEGER,
    "status" "brand_city_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brand_cities_pkey" PRIMARY KEY ("brand_id","city_id")
);

-- CreateTable
CREATE TABLE "news_brands" (
    "news_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "relevance" "relevance_level" NOT NULL DEFAULT 'mentioned',
    "auto_tagged" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by_user_id" UUID,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_brands_pkey" PRIMARY KEY ("news_id","brand_id")
);

-- CreateTable
CREATE TABLE "news_cities" (
    "news_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "relevance" "relevance_level" NOT NULL DEFAULT 'mentioned',
    "auto_tagged" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by_user_id" UUID,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_cities_pkey" PRIMARY KEY ("news_id","city_id")
);

-- CreateTable
CREATE TABLE "news_drinks" (
    "news_id" UUID NOT NULL,
    "drink_id" UUID NOT NULL,
    "relevance" "relevance_level" NOT NULL DEFAULT 'mentioned',
    "auto_tagged" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_by_user_id" UUID,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_drinks_pkey" PRIMARY KEY ("news_id","drink_id")
);

-- CreateTable
CREATE TABLE "drink_cities" (
    "drink_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "popularity_score" DOUBLE PRECISION,
    "seasonality" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drink_cities_pkey" PRIMARY KEY ("drink_id","city_id")
);

-- CreateTable
CREATE TABLE "brand_similarities" (
    "brand_a_id" UUID NOT NULL,
    "brand_b_id" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "factors" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brand_similarities_pkey" PRIMARY KEY ("brand_a_id","brand_b_id")
);

-- CreateIndex
CREATE INDEX "brand_drinks_drink_id_idx" ON "brand_drinks"("drink_id");

-- CreateIndex
CREATE INDEX "brand_drinks_is_signature_idx" ON "brand_drinks"("is_signature");

-- CreateIndex
CREATE INDEX "brand_cities_city_id_idx" ON "brand_cities"("city_id");

-- CreateIndex
CREATE INDEX "brand_cities_status_idx" ON "brand_cities"("status");

-- CreateIndex
CREATE INDEX "news_brands_brand_id_idx" ON "news_brands"("brand_id");

-- CreateIndex
CREATE INDEX "news_brands_relevance_idx" ON "news_brands"("relevance");

-- CreateIndex
CREATE INDEX "news_cities_city_id_idx" ON "news_cities"("city_id");

-- CreateIndex
CREATE INDEX "news_cities_relevance_idx" ON "news_cities"("relevance");

-- CreateIndex
CREATE INDEX "news_drinks_drink_id_idx" ON "news_drinks"("drink_id");

-- CreateIndex
CREATE INDEX "news_drinks_relevance_idx" ON "news_drinks"("relevance");

-- CreateIndex
CREATE INDEX "drink_cities_city_id_idx" ON "drink_cities"("city_id");

-- CreateIndex
CREATE INDEX "drink_cities_popularity_score_idx" ON "drink_cities"("popularity_score" DESC);

-- CreateIndex
CREATE INDEX "brand_similarities_brand_b_id_idx" ON "brand_similarities"("brand_b_id");

-- CreateIndex
CREATE INDEX "brand_similarities_score_idx" ON "brand_similarities"("score" DESC);

-- AddForeignKey
ALTER TABLE "brand_drinks" ADD CONSTRAINT "brand_drinks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_drinks" ADD CONSTRAINT "brand_drinks_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_cities" ADD CONSTRAINT "brand_cities_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_cities" ADD CONSTRAINT "brand_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_brands" ADD CONSTRAINT "news_brands_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_brands" ADD CONSTRAINT "news_brands_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_cities" ADD CONSTRAINT "news_cities_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_cities" ADD CONSTRAINT "news_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_drinks" ADD CONSTRAINT "news_drinks_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_drinks" ADD CONSTRAINT "news_drinks_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_cities" ADD CONSTRAINT "drink_cities_drink_id_fkey" FOREIGN KEY ("drink_id") REFERENCES "drinks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_cities" ADD CONSTRAINT "drink_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_similarities" ADD CONSTRAINT "brand_similarities_brand_a_id_fkey" FOREIGN KEY ("brand_a_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_similarities" ADD CONSTRAINT "brand_similarities_brand_b_id_fkey" FOREIGN KEY ("brand_b_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 強制 brand_a_id < brand_b_id，避免 (A,B) 與 (B,A) 重複收錄
ALTER TABLE "brand_similarities" ADD CONSTRAINT "brand_similarities_ordered_pair_check" CHECK ("brand_a_id" < "brand_b_id");
