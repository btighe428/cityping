-- Add hype scoring fields to alert_events table
-- hype_score: 0-100 composite score for event prioritization
-- hype_factors: JSON breakdown of scoring components { brandTier, scarcity, aiAdj }

ALTER TABLE "alert_events" ADD COLUMN IF NOT EXISTS "hype_score" INTEGER;
ALTER TABLE "alert_events" ADD COLUMN IF NOT EXISTS "hype_factors" JSONB;
