-- CreateEnum
CREATE TYPE "venue_type" AS ENUM ('INDOOR', 'OUTDOOR', 'COVERED', 'WEATHER_DEPENDENT');

-- AlterTable
ALTER TABLE "alert_events" ADD COLUMN "venue_type" "venue_type",
ADD COLUMN "weather_score" DOUBLE PRECISION,
ADD COLUMN "is_weather_safe" BOOLEAN;
