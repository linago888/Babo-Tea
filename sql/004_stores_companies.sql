-- CreateEnum
CREATE TYPE "company_relation" AS ENUM ('owner', 'parent', 'licensor', 'franchisor', 'investor', 'former_owner');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "founded_year" SMALLINT,
    "stock_ticker" TEXT,
    "website" TEXT,
    "description_i18n" JSONB,
    "status" "entity_status" NOT NULL DEFAULT 'draft',
    "completeness_score" INTEGER,
    "last_human_edit_at" TIMESTAMPTZ(6),
    "content_owner_id" UUID,
    "review_due_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_company" (
    "brand_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "relation" "company_relation" NOT NULL,
    "since" DATE NOT NULL,
    "until" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_company_pkey" PRIMARY KEY ("brand_id","company_id","relation","since")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "name_i18n" JSONB,
    "address_i18n" JSONB NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "phone" TEXT,
    "opening_hours" JSONB,
    "is_flagship" BOOLEAN NOT NULL DEFAULT false,
    "opened_at" DATE,
    "closed_at" DATE,
    "franchise" BOOLEAN NOT NULL DEFAULT false,
    "external_ids" JSONB,
    "status" "entity_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_country_code_idx" ON "companies"("country_code");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "brand_company_company_id_idx" ON "brand_company"("company_id");

-- CreateIndex
CREATE INDEX "brand_company_relation_idx" ON "brand_company"("relation");

-- CreateIndex
CREATE INDEX "stores_brand_id_city_id_idx" ON "stores"("brand_id", "city_id");

-- CreateIndex
CREATE INDEX "stores_city_id_opened_at_idx" ON "stores"("city_id", "opened_at");

-- CreateIndex
CREATE INDEX "stores_status_idx" ON "stores"("status");

-- CreateIndex
CREATE INDEX "stores_is_flagship_idx" ON "stores"("is_flagship");

-- CreateIndex
CREATE INDEX "stores_lat_lng_idx" ON "stores"("lat", "lng");

-- AddForeignKey
ALTER TABLE "brand_company" ADD CONSTRAINT "brand_company_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_company" ADD CONSTRAINT "brand_company_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
