-- Add VibePreset enum and field to User model
-- Task 5.1: Personality tuner for AI-generated notification tone

-- Create the vibe_preset enum
DO $$ BEGIN
    CREATE TYPE "vibe_preset" AS ENUM ('TRANSPLANT', 'REGULAR', 'LOCAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add vibe_preset column to users table with default value
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vibe_preset" "vibe_preset" NOT NULL DEFAULT 'REGULAR';
