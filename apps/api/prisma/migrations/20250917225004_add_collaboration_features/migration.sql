-- CreateEnum
CREATE TYPE "public"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "public"."CollabSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollabSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollabParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CollabParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollabInvite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserEmail" TEXT NOT NULL,
    "sessionId" TEXT,
    "token" TEXT NOT NULL,
    "message" TEXT,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollabInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollabSession_projectId_idx" ON "public"."CollabSession"("projectId");

-- CreateIndex
CREATE INDEX "CollabSession_ownerId_idx" ON "public"."CollabSession"("ownerId");

-- CreateIndex
CREATE INDEX "CollabSession_status_idx" ON "public"."CollabSession"("status");

-- CreateIndex
CREATE INDEX "CollabParticipant_sessionId_idx" ON "public"."CollabParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "CollabParticipant_userId_idx" ON "public"."CollabParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollabParticipant_sessionId_userId_key" ON "public"."CollabParticipant"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollabInvite_token_key" ON "public"."CollabInvite"("token");

-- CreateIndex
CREATE INDEX "CollabInvite_projectId_idx" ON "public"."CollabInvite"("projectId");

-- CreateIndex
CREATE INDEX "CollabInvite_fromUserId_idx" ON "public"."CollabInvite"("fromUserId");

-- CreateIndex
CREATE INDEX "CollabInvite_toUserEmail_idx" ON "public"."CollabInvite"("toUserEmail");

-- CreateIndex
CREATE INDEX "CollabInvite_token_idx" ON "public"."CollabInvite"("token");

-- CreateIndex
CREATE INDEX "CollabInvite_status_idx" ON "public"."CollabInvite"("status");

-- AddForeignKey
ALTER TABLE "public"."CollabSession" ADD CONSTRAINT "CollabSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollabSession" ADD CONSTRAINT "CollabSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollabParticipant" ADD CONSTRAINT "CollabParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."CollabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollabParticipant" ADD CONSTRAINT "CollabParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollabInvite" ADD CONSTRAINT "CollabInvite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollabInvite" ADD CONSTRAINT "CollabInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollabInvite" ADD CONSTRAINT "CollabInvite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."CollabSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
