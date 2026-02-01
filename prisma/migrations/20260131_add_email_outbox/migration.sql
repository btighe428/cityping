-- Migration: Add EmailOutbox and JobLock tables for idempotency
-- Created: 2026-01-31
-- Purpose: Prevent duplicate email sends and concurrent job runs

-- Create EmailType enum
CREATE TYPE "email_type" AS ENUM (
  'daily_digest',
  'daily_pulse', 
  'weekly_digest',
  'day_ahead',
  'reminder',
  'monthly_recap',
  'welcome',
  'system'
);

-- Create EmailStatus enum
CREATE TYPE "email_status" AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

-- Create EmailOutbox table for idempotent email tracking
CREATE TABLE "email_outbox" (
  "id" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "email_type" "email_type" NOT NULL,
  "target_date" DATE NOT NULL,
  "subject" TEXT NOT NULL,
  "resend_id" TEXT,
  "status" "email_status" NOT NULL DEFAULT 'pending',
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMPTZ,

  CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint to prevent duplicate emails
CREATE UNIQUE INDEX "recipient_emailType_targetDate" 
  ON "email_outbox" ("recipient", "email_type", "target_date");

-- Create indexes for common queries
CREATE INDEX "email_outbox_status_targetDate_idx" 
  ON "email_outbox" ("status", "target_date");

CREATE INDEX "email_outbox_emailType_targetDate_idx" 
  ON "email_outbox" ("email_type", "target_date");

-- Create JobLock table for distributed locking
CREATE TABLE "job_locks" (
  "job_name" TEXT NOT NULL,
  "lock_id" TEXT NOT NULL,
  "acquired_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "job_locks_pkey" PRIMARY KEY ("job_name")
);

-- Create index for lock expiration queries
CREATE INDEX "job_locks_expiresAt_idx" 
  ON "job_locks" ("expires_at");

-- Add comments for documentation
COMMENT ON TABLE "email_outbox" IS 'Transactional outbox for reliable email delivery with idempotency';
COMMENT ON TABLE "job_locks" IS 'Distributed locks to prevent concurrent cron job execution';
COMMENT ON COLUMN "email_outbox"."target_date" IS 'The date this email is for (not when it was sent). Used for deduplication.';
COMMENT ON COLUMN "email_outbox"."recipient" IS 'Normalized to lowercase for consistent deduplication';
