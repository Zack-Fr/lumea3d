/*
  Warnings:

  - You are about to drop the `assets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `compliance_checks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `feedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `invites` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `placement_adjustments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `placements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_categories_3d` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scene_items_3d` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scenes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scenes_3d` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."assets" DROP CONSTRAINT "assets_uploader_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."compliance_checks" DROP CONSTRAINT "compliance_checks_scene_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."feedback" DROP CONSTRAINT "feedback_scene_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."feedback" DROP CONSTRAINT "feedback_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."invites" DROP CONSTRAINT "invites_session_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."invites" DROP CONSTRAINT "invites_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."placement_adjustments" DROP CONSTRAINT "placement_adjustments_placement_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."placement_adjustments" DROP CONSTRAINT "placement_adjustments_scene_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."placements" DROP CONSTRAINT "placements_scene_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_categories_3d" DROP CONSTRAINT "project_categories_3d_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_categories_3d" DROP CONSTRAINT "project_categories_3d_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scene_items_3d" DROP CONSTRAINT "scene_items_3d_scene_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scenes" DROP CONSTRAINT "scenes_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scenes_3d" DROP CONSTRAINT "scenes_3d_navmesh_asset_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."scenes_3d" DROP CONSTRAINT "scenes_3d_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropTable
DROP TABLE "public"."assets";

-- DropTable
DROP TABLE "public"."compliance_checks";

-- DropTable
DROP TABLE "public"."feedback";

-- DropTable
DROP TABLE "public"."invites";

-- DropTable
DROP TABLE "public"."placement_adjustments";

-- DropTable
DROP TABLE "public"."placements";

-- DropTable
DROP TABLE "public"."project_categories_3d";

-- DropTable
DROP TABLE "public"."projects";

-- DropTable
DROP TABLE "public"."scene_items_3d";

-- DropTable
DROP TABLE "public"."scenes";

-- DropTable
DROP TABLE "public"."scenes_3d";

-- DropTable
DROP TABLE "public"."sessions";

-- DropTable
DROP TABLE "public"."users";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'DESIGNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "roomWCm" INTEGER NOT NULL DEFAULT 500,
    "roomHCm" INTEGER NOT NULL DEFAULT 400,
    "style" "public"."StyleKey" NOT NULL DEFAULT 'MODERN',
    "seed" INTEGER,
    "solverMs" INTEGER,
    "status" "public"."GenerationStatus" NOT NULL DEFAULT 'OK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rationale" JSONB,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Placement" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "assetKey" "public"."AssetKey" NOT NULL,
    "xCm" INTEGER NOT NULL,
    "yCm" INTEGER NOT NULL,
    "rotationDeg" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceCheck" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "tags" TEXT[],
    "comment" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invite" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlacementAdjustment" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "oldXCm" INTEGER NOT NULL,
    "oldYCm" INTEGER NOT NULL,
    "newXCm" INTEGER NOT NULL,
    "newYCm" INTEGER NOT NULL,
    "oldRotation" INTEGER NOT NULL,
    "newRotation" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalUrl" TEXT,
    "meshoptUrl" TEXT,
    "dracoUrl" TEXT,
    "navmeshUrl" TEXT,
    "reportJson" JSONB,
    "errorMessage" TEXT,
    "license" "public"."AssetLicense" DEFAULT 'PROPRIETARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectCategory3D" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "instancing" BOOLEAN NOT NULL DEFAULT false,
    "draco" BOOLEAN NOT NULL DEFAULT true,
    "meshopt" BOOLEAN NOT NULL DEFAULT true,
    "ktx2" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCategory3D_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Scene3D" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "scale" DOUBLE PRECISION DEFAULT 1.0,
    "exposure" DOUBLE PRECISION DEFAULT 1.0,
    "envHdriUrl" TEXT,
    "envIntensity" DOUBLE PRECISION DEFAULT 1.0,
    "spawnPositionX" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "spawnPositionY" DOUBLE PRECISION NOT NULL DEFAULT 1.7,
    "spawnPositionZ" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "spawnYawDeg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "navmeshAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene3D_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SceneItem3D" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "model" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "positionZ" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rotationX" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rotationY" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rotationZ" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "scaleX" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scaleY" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scaleZ" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "materialVariant" TEXT,
    "materialOverrides" JSONB,
    "selectable" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneItem3D_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "public"."Project"("userId");

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "public"."Scene"("projectId");

-- CreateIndex
CREATE INDEX "Scene_createdAt_idx" ON "public"."Scene"("createdAt");

-- CreateIndex
CREATE INDEX "Placement_sceneId_idx" ON "public"."Placement"("sceneId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_sceneId_idx" ON "public"."ComplianceCheck"("sceneId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_ruleKey_idx" ON "public"."ComplianceCheck"("ruleKey");

-- CreateIndex
CREATE INDEX "Feedback_sceneId_idx" ON "public"."Feedback"("sceneId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "public"."Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_rating_idx" ON "public"."Feedback"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "public"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "public"."Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_token_idx" ON "public"."Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_sessionId_idx" ON "public"."Invite"("sessionId");

-- CreateIndex
CREATE INDEX "PlacementAdjustment_sceneId_idx" ON "public"."PlacementAdjustment"("sceneId");

-- CreateIndex
CREATE INDEX "PlacementAdjustment_placementId_idx" ON "public"."PlacementAdjustment"("placementId");

-- CreateIndex
CREATE INDEX "Asset_uploaderId_idx" ON "public"."Asset"("uploaderId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "public"."Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_createdAt_idx" ON "public"."Asset"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectCategory3D_projectId_idx" ON "public"."ProjectCategory3D"("projectId");

-- CreateIndex
CREATE INDEX "ProjectCategory3D_categoryKey_idx" ON "public"."ProjectCategory3D"("categoryKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCategory3D_projectId_assetId_categoryKey_key" ON "public"."ProjectCategory3D"("projectId", "assetId", "categoryKey");

-- CreateIndex
CREATE INDEX "Scene3D_projectId_idx" ON "public"."Scene3D"("projectId");

-- CreateIndex
CREATE INDEX "Scene3D_createdAt_idx" ON "public"."Scene3D"("createdAt");

-- CreateIndex
CREATE INDEX "Scene3D_version_idx" ON "public"."Scene3D"("version");

-- CreateIndex
CREATE INDEX "SceneItem3D_sceneId_idx" ON "public"."SceneItem3D"("sceneId");

-- CreateIndex
CREATE INDEX "SceneItem3D_categoryKey_idx" ON "public"."SceneItem3D"("categoryKey");

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Placement" ADD CONSTRAINT "Placement_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceCheck" ADD CONSTRAINT "ComplianceCheck_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementAdjustment" ADD CONSTRAINT "PlacementAdjustment_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementAdjustment" ADD CONSTRAINT "PlacementAdjustment_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "public"."Placement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Asset" ADD CONSTRAINT "Asset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectCategory3D" ADD CONSTRAINT "ProjectCategory3D_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectCategory3D" ADD CONSTRAINT "ProjectCategory3D_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scene3D" ADD CONSTRAINT "Scene3D_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scene3D" ADD CONSTRAINT "Scene3D_navmeshAssetId_fkey" FOREIGN KEY ("navmeshAssetId") REFERENCES "public"."Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SceneItem3D" ADD CONSTRAINT "SceneItem3D_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;
