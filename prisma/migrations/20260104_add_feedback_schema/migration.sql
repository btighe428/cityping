-- Add Feedback Loop Schema
-- UserEventFeedback: Tracks user thumbs up/down on alert events
-- ZipCodeInferenceWeight: Aggregated feedback weights per zip code and module

-- ============================================================================
-- NEW ENUMS
-- ============================================================================

-- Feedback type enum for user event ratings
CREATE TYPE "feedback_type" AS ENUM ('THUMBS_UP', 'THUMBS_DOWN');

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- User feedback on alert events for relevance scoring
-- Token-based verification enables email link clicks without login
CREATE TABLE "user_event_feedback" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "feedback_type" "feedback_type" NOT NULL,
    "feedback_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_event_feedback_pkey" PRIMARY KEY ("id")
);

-- Aggregated inference weights per zip code and module
-- Used to boost/suppress event relevance for specific neighborhoods
CREATE TABLE "zip_code_inference_weights" (
    "id" UUID NOT NULL,
    "zip_code" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "positive_count" INTEGER NOT NULL DEFAULT 0,
    "negative_count" INTEGER NOT NULL DEFAULT 0,
    "adjustment_factor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "zip_code_inference_weights_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- UserEventFeedback indexes
CREATE UNIQUE INDEX "user_event_feedback_feedback_token_key" ON "user_event_feedback"("feedback_token");
CREATE INDEX "user_event_feedback_feedback_token_idx" ON "user_event_feedback"("feedback_token");
CREATE UNIQUE INDEX "user_event_feedback_user_id_event_id_key" ON "user_event_feedback"("user_id", "event_id");

-- ZipCodeInferenceWeight indexes
CREATE INDEX "zip_code_inference_weights_zip_code_idx" ON "zip_code_inference_weights"("zip_code");
CREATE UNIQUE INDEX "zip_code_inference_weights_zip_code_module_id_key" ON "zip_code_inference_weights"("zip_code", "module_id");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- UserEventFeedback -> Users
ALTER TABLE "user_event_feedback" ADD CONSTRAINT "user_event_feedback_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserEventFeedback -> AlertEvents
ALTER TABLE "user_event_feedback" ADD CONSTRAINT "user_event_feedback_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "alert_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ZipCodeInferenceWeight -> Modules
ALTER TABLE "zip_code_inference_weights" ADD CONSTRAINT "zip_code_inference_weights_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
