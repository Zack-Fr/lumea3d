-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "customThumbnailUrl" TEXT,
ADD COLUMN     "thumbnailUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "thumbnailUrl" TEXT;
