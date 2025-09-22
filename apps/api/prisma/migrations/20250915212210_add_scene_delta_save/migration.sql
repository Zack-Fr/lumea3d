-- AlterTable
ALTER TABLE "public"."Scene3D" ADD COLUMN     "props" JSONB;

-- CreateTable
CREATE TABLE "public"."SceneSnapshot" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceneSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SceneSnapshot_sceneId_idx" ON "public"."SceneSnapshot"("sceneId");

-- CreateIndex
CREATE INDEX "SceneSnapshot_createdAt_idx" ON "public"."SceneSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."SceneSnapshot" ADD CONSTRAINT "SceneSnapshot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene3D"("id") ON DELETE CASCADE ON UPDATE CASCADE;
