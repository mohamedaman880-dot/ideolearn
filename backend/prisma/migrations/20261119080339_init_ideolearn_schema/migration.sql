-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(180) NOT NULL,
    "name_en" VARCHAR(200) NOT NULL,
    "name_ar" VARCHAR(200) NOT NULL,
    "short_desc_en" TEXT NOT NULL,
    "short_desc_ar" TEXT NOT NULL,
    "full_desc_en" TEXT NOT NULL,
    "full_desc_ar" TEXT NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "country" VARCHAR(120) NOT NULL DEFAULT 'Rwanda',
    "official_website_url" VARCHAR(500),
    "logo_url" VARCHAR(500),
    "gallery_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faculties_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faculties_ar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "general_admission_en" TEXT,
    "general_admission_ar" TEXT,
    "reference_links" JSONB NOT NULL DEFAULT '[]',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "university_id" UUID NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "name_en" VARCHAR(220) NOT NULL,
    "name_ar" VARCHAR(220) NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_ar" TEXT NOT NULL,
    "faculty_en" VARCHAR(160) NOT NULL,
    "faculty_ar" VARCHAR(160) NOT NULL,
    "duration_years" DECIMAL(3,1) NOT NULL,
    "annual_tuition_usd" DECIMAL(10,2),
    "total_tuition_usd" DECIMAL(10,2),
    "admission_req_en" TEXT NOT NULL,
    "admission_req_ar" TEXT NOT NULL,
    "required_docs_en" TEXT NOT NULL,
    "required_docs_ar" TEXT NOT NULL,
    "app_open_date" DATE,
    "app_close_date" DATE,
    "confirmation_note_en" TEXT,
    "confirmation_note_ar" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title_en" VARCHAR(180) NOT NULL,
    "title_ar" VARCHAR(180) NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_ar" TEXT NOT NULL,
    "image_url" VARCHAR(500),
    "whatsapp_message_en" VARCHAR(500) NOT NULL,
    "whatsapp_message_ar" VARCHAR(500) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_en" VARCHAR(400) NOT NULL,
    "question_ar" VARCHAR(400) NOT NULL,
    "answer_en" TEXT NOT NULL,
    "answer_ar" TEXT NOT NULL,
    "category_en" VARCHAR(100),
    "category_ar" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(200) NOT NULL,
    "title_en" VARCHAR(250) NOT NULL,
    "title_ar" VARCHAR(250) NOT NULL,
    "excerpt_en" TEXT NOT NULL,
    "excerpt_ar" TEXT NOT NULL,
    "content_en" TEXT NOT NULL,
    "content_ar" TEXT NOT NULL,
    "category_en" VARCHAR(120) NOT NULL,
    "category_ar" VARCHAR(120) NOT NULL,
    "cover_image_url" VARCHAR(500),
    "seo_title_en" VARCHAR(160),
    "seo_title_ar" VARCHAR(160),
    "seo_description_en" VARCHAR(320),
    "seo_description_ar" VARCHAR(320),
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "page_key" VARCHAR(50) NOT NULL,
    "section_key" VARCHAR(80) NOT NULL,
    "title_en" VARCHAR(250),
    "title_ar" VARCHAR(250),
    "subtitle_en" TEXT,
    "subtitle_ar" TEXT,
    "body_en" TEXT,
    "body_ar" TEXT,
    "image_url" VARCHAR(500),
    "extra_data" JSONB NOT NULL DEFAULT '{}',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'default',
    "whatsapp_number" VARCHAR(30),
    "phone_number" VARCHAR(30),
    "email" VARCHAR(255),
    "address_en" VARCHAR(300),
    "address_ar" VARCHAR(300),
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "accuracy_notice_en" TEXT NOT NULL,
    "accuracy_notice_ar" TEXT NOT NULL,
    "legal_notice_en" TEXT,
    "legal_notice_ar" TEXT,
    "faqs_enabled" BOOLEAN NOT NULL DEFAULT true,
    "articles_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storage_bucket" VARCHAR(80) NOT NULL DEFAULT 'ideolearn-media',
    "storage_path" VARCHAR(400) NOT NULL,
    "public_url" VARCHAR(600) NOT NULL,
    "mime_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "alt_text_en" VARCHAR(250),
    "alt_text_ar" VARCHAR(250),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(60) NOT NULL,
    "entity_id" VARCHAR(100),
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

-- CreateIndex
CREATE INDEX "idx_universities_status_featured" ON "universities"("status", "is_featured");

-- CreateIndex
CREATE INDEX "idx_universities_status_city" ON "universities"("status", "city");

-- CreateIndex
CREATE UNIQUE INDEX "programs_slug_key" ON "programs"("slug");

-- CreateIndex
CREATE INDEX "idx_programs_status_university" ON "programs"("status", "university_id");

-- CreateIndex
CREATE INDEX "idx_programs_status_faculty" ON "programs"("status", "faculty_en");

-- CreateIndex
CREATE INDEX "idx_programs_status_duration" ON "programs"("status", "duration_years");

-- CreateIndex
CREATE INDEX "idx_programs_status_tuition" ON "programs"("status", "annual_tuition_usd");

-- CreateIndex
CREATE INDEX "idx_services_status_order" ON "services"("status", "display_order");

-- CreateIndex
CREATE INDEX "idx_faqs_status_order" ON "faqs"("status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "idx_articles_status_published" ON "articles"("status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "idx_articles_status_category" ON "articles"("status", "category_en");

-- CreateIndex
CREATE INDEX "idx_page_sections_lookup" ON "page_sections"("page_key", "status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "page_sections_page_key_section_key_key" ON "page_sections"("page_key", "section_key");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_path_key" ON "media_assets"("storage_path");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Custom SQL Check Constraints
ALTER TABLE "programs"
  ADD CONSTRAINT "chk_programs_duration_positive" CHECK ("duration_years" > 0),
  ADD CONSTRAINT "chk_programs_annual_tuition_nonneg" CHECK ("annual_tuition_usd" IS NULL OR "annual_tuition_usd" >= 0),
  ADD CONSTRAINT "chk_programs_total_tuition_nonneg" CHECK ("total_tuition_usd" IS NULL OR "total_tuition_usd" >= 0),
  ADD CONSTRAINT "chk_programs_app_dates_order" CHECK ("app_close_date" IS NULL OR "app_open_date" IS NULL OR "app_close_date" >= "app_open_date");

ALTER TABLE "media_assets"
  ADD CONSTRAINT "chk_media_size_positive" CHECK ("size_bytes" > 0 AND "size_bytes" <= 2097152);