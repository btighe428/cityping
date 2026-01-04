-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('PENDING', 'CONVERTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referee_id" TEXT,
    "referee_email" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "status" "referral_status" NOT NULL DEFAULT 'PENDING',
    "stripe_coupon_id" TEXT,
    "converted_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_code_key" ON "referrals"("referral_code");

-- CreateIndex
CREATE INDEX "referrals_referral_code_idx" ON "referrals"("referral_code");

-- CreateIndex
CREATE INDEX "referrals_referee_email_idx" ON "referrals"("referee_email");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
