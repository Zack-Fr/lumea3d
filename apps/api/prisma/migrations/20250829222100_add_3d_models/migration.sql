-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AssetLicense" AS ENUM ('CC0', 'ROYALTY_FREE', 'PROPRIETARY');

-- CreateTable
CREATE TABLE "public"."assets" (
    "id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'UPLOADED',
    "original_url" TEXT,
    "meshopt_url" TEXT,
    "draco_url" TEXT,
    "navmesh_url" TEXT,
    "report_json" JSONB,
    "error_message" TEXT,
    "license" "public"."AssetLicense" DEFAULT 'PROPRIETARY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_categories_3d" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "category_key" TEXT NOT NULL,
    "instancing" BOOLEAN NOT NULL DEFAULT false,
    "draco" BOOLEAN NOT NULL DEFAULT true,
    "meshopt" BOOLEAN NOT NULL DEFAULT true,
    "ktx2" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_categories_3d_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scenes_3d" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "scale" DOUBLE PRECISION DEFAULT 1.0,
    "exposure" DOUBLE PRECISION DEFAULT 1.0,
    "env_hdri_url" TEXT,
    "env_intensity" DOUBLE PRECISION DEFAULT 1.0,
    "spawn_position_x" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "spawn_position_y" DOUBLE PRECISION NOT NULL DEFAULT 1.7,
    "spawn_position_z" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "spawn_yaw_deg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "navmesh_asset_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenes_3d_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scene_items_3d" (
    "id" TEXT NOT NULL,
    "scene_id" TEXT NOT NULL,
    "category_key" TEXT NOT NULL,
    "model" TEXT,
    "position_x" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "position_y" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "position_z" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rotation_x" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rotation_y" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rotation_z" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "scale_x" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scale_y" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scale_z" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "material_variant" TEXT,
    "material_overrides" JSONB,
    "selectable" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_items_3d_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_uploader_id_idx" ON "public"."assets"("uploader_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "public"."assets"("status");

-- CreateIndex
CREATE INDEX "assets_created_at_idx" ON "public"."assets"("created_at");

-- CreateIndex
CREATE INDEX "project_categories_3d_project_id_idx" ON "public"."project_categories_3d"("project_id");

-- CreateIndex
CREATE INDEX "project_categories_3d_category_key_idx" ON "public"."project_categories_3d"("category_key");

-- CreateIndex
CREATE UNIQUE INDEX "project_categories_3d_project_id_asset_id_category_key_key" ON "public"."project_categories_3d"("project_id", "asset_id", "category_key");

-- CreateIndex
CREATE INDEX "scenes_3d_project_id_idx" ON "public"."scenes_3d"("project_id");

-- CreateIndex
CREATE INDEX "scenes_3d_created_at_idx" ON "public"."scenes_3d"("created_at");

-- CreateIndex
CREATE INDEX "scenes_3d_version_idx" ON "public"."scenes_3d"("version");

-- CreateIndex
CREATE INDEX "scene_items_3d_scene_id_idx" ON "public"."scene_items_3d"("scene_id");

-- CreateIndex
CREATE INDEX "scene_items_3d_category_key_idx" ON "public"."scene_items_3d"("category_key");

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_categories_3d" ADD CONSTRAINT "project_categories_3d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_categories_3d" ADD CONSTRAINT "project_categories_3d_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenes_3d" ADD CONSTRAINT "scenes_3d_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scenes_3d" ADD CONSTRAINT "scenes_3d_navmesh_asset_id_fkey" FOREIGN KEY ("navmesh_asset_id") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scene_items_3d" ADD CONSTRAINT "scene_items_3d_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes_3d"("id") ON DELETE CASCADE ON UPDATE CASCADE;
