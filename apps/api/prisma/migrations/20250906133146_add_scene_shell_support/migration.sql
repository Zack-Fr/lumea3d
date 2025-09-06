-- AlterTable
ALTER TABLE "public"."Scene3D" ADD COLUMN     "shellAssetId" TEXT,
ADD COLUMN     "shellCastShadow" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shellReceiveShadow" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "public"."Scene3D" ADD CONSTRAINT "Scene3D_shellAssetId_fkey" FOREIGN KEY ("shellAssetId") REFERENCES "public"."Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
