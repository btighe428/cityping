-- NYCPing Multi-Module Schema Migration
-- This migration adds new tables for the multi-module architecture while preserving
-- existing legacy tables (accounts, phones, subscriptions, cities, etc.)
--
-- Safe to run on existing database - uses IF NOT EXISTS for idempotency

-- ============================================================================
-- NEW ENUMS (for multi-module system)
-- ============================================================================

-- User tier (free vs premium)
DO $$ BEGIN
    CREATE TYPE "user_tier" AS ENUM ('free', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Source polling frequency
DO $$ BEGIN
    CREATE TYPE "source_frequency" AS ENUM ('realtime', 'hourly', 'daily');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification delivery channel
DO $$ BEGIN
    CREATE TYPE "notification_channel" AS ENUM ('sms', 'email');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification lifecycle status
DO $$ BEGIN
    CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- NEW TABLES: User Model (Unified)
-- ============================================================================

-- Unified user model for NYCPing multi-module architecture
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "tier" "user_tier" NOT NULL DEFAULT 'free',
    "stripe_customer_id" TEXT,
    "inferred_neighborhood" TEXT,
    "inferred_subway_lines" TEXT[],
    "inferred_has_parking" BOOLEAN NOT NULL DEFAULT false,
    "sms_opt_in_status" "sms_opt_in_status" NOT NULL DEFAULT 'pending',
    "sms_opt_in_at" TIMESTAMPTZ,
    "email_opt_in_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- NEW TABLES: Module System
-- ============================================================================

-- Feature modules (parking, transit, events, housing, food, deals)
CREATE TABLE IF NOT EXISTS "modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- User-module preferences junction table
CREATE TABLE IF NOT EXISTS "user_module_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_inferred" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_module_preferences_pkey" PRIMARY KEY ("id")
);

-- Alert sources within modules
CREATE TABLE IF NOT EXISTS "alert_sources" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "source_frequency" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "last_polled_at" TIMESTAMPTZ,
    "last_event_at" TIMESTAMPTZ,

    CONSTRAINT "alert_sources_pkey" PRIMARY KEY ("id")
);

-- Alert events from sources
CREATE TABLE IF NOT EXISTS "alert_events" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "neighborhoods" TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- NEW TABLES: Notification Outbox
-- ============================================================================

-- Transactional outbox for reliable notification delivery
CREATE TABLE IF NOT EXISTS "notification_outbox" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "scheduled_for" TIMESTAMPTZ NOT NULL,
    "sent_at" TIMESTAMPTZ,
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES (Unique Constraints)
-- ============================================================================

-- Users indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- User module preferences
CREATE UNIQUE INDEX IF NOT EXISTS "user_module_preferences_user_id_module_id_key"
    ON "user_module_preferences"("user_id", "module_id");

-- Alert sources
CREATE UNIQUE INDEX IF NOT EXISTS "alert_sources_slug_key" ON "alert_sources"("slug");

-- Alert events
CREATE INDEX IF NOT EXISTS "alert_events_source_id_created_at_idx"
    ON "alert_events"("source_id", "created_at");
CREATE INDEX IF NOT EXISTS "alert_events_starts_at_idx" ON "alert_events"("starts_at");
CREATE UNIQUE INDEX IF NOT EXISTS "alert_events_source_id_external_id_key"
    ON "alert_events"("source_id", "external_id");

-- Notification outbox
CREATE INDEX IF NOT EXISTS "notification_outbox_status_scheduled_for_idx"
    ON "notification_outbox"("status", "scheduled_for");
CREATE UNIQUE INDEX IF NOT EXISTS "notification_outbox_user_id_event_id_channel_key"
    ON "notification_outbox"("user_id", "event_id", "channel");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- User module preferences -> Users
DO $$ BEGIN
    ALTER TABLE "user_module_preferences"
    ADD CONSTRAINT "user_module_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User module preferences -> Modules
DO $$ BEGIN
    ALTER TABLE "user_module_preferences"
    ADD CONSTRAINT "user_module_preferences_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alert sources -> Modules
DO $$ BEGIN
    ALTER TABLE "alert_sources"
    ADD CONSTRAINT "alert_sources_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alert events -> Alert sources
DO $$ BEGIN
    ALTER TABLE "alert_events"
    ADD CONSTRAINT "alert_events_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "alert_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification outbox -> Users
DO $$ BEGIN
    ALTER TABLE "notification_outbox"
    ADD CONSTRAINT "notification_outbox_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification outbox -> Alert events
DO $$ BEGIN
    ALTER TABLE "notification_outbox"
    ADD CONSTRAINT "notification_outbox_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "alert_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- SEED DATA: Default Modules
-- ============================================================================

INSERT INTO "modules" ("id", "name", "description", "icon", "sort_order") VALUES
    ('parking', 'Parking & Driving', 'Alternate side parking, street cleaning, and traffic alerts', 'P', 1),
    ('transit', 'Transit', 'Subway delays, bus alerts, and service changes', 'T', 2),
    ('events', 'Events & Culture', 'Free events, museum hours, and cultural happenings', 'E', 3),
    ('housing', 'Housing & Utilities', 'Rent stabilization, utility outages, and building notices', 'H', 4),
    ('food', 'Food & Dining', 'Restaurant week, food assistance, and farmers markets', 'F', 5),
    ('deals', 'Deals & Savings', 'City discounts, free programs, and seasonal offers', 'D', 6)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "icon" = EXCLUDED."icon",
    "sort_order" = EXCLUDED."sort_order";

-- ============================================================================
-- SEED DATA: Initial Alert Sources
-- ============================================================================

INSERT INTO "alert_sources" ("id", "module_id", "slug", "name", "frequency", "enabled", "config") VALUES
    -- Parking module sources
    ('asp-calendar', 'parking', 'asp-calendar', 'Alternate Side Parking Calendar', 'daily', true, '{"url": "https://www.nyc.gov/assets/dsny/downloads/ics/asp-rules-calendar.ics"}'),
    ('dot-street-closures', 'parking', 'dot-street-closures', 'DOT Street Closures', 'hourly', true, '{}'),

    -- Transit module sources
    ('mta-subway', 'transit', 'mta-subway', 'MTA Subway Status', 'realtime', true, '{}'),
    ('mta-bus', 'transit', 'mta-bus', 'MTA Bus Status', 'realtime', true, '{}'),
    ('mta-service-alerts', 'transit', 'mta-service-alerts', 'MTA Service Alerts', 'realtime', true, '{}'),

    -- Events module sources
    ('nyc-parks-events', 'events', 'nyc-parks-events', 'NYC Parks Events', 'daily', true, '{}'),
    ('museum-free-days', 'events', 'museum-free-days', 'Museum Free Days', 'daily', true, '{}'),

    -- Housing module sources
    ('con-ed-outages', 'housing', 'con-ed-outages', 'Con Edison Outages', 'hourly', true, '{}'),
    ('hpd-violations', 'housing', 'hpd-violations', 'HPD Housing Violations', 'daily', true, '{}'),

    -- Food module sources
    ('snap-benefits', 'food', 'snap-benefits', 'SNAP Benefits Updates', 'daily', true, '{}'),
    ('farmers-markets', 'food', 'farmers-markets', 'Farmers Markets Schedule', 'daily', true, '{}'),

    -- Deals module sources
    ('idnyc-discounts', 'deals', 'idnyc-discounts', 'IDNYC Discounts', 'daily', true, '{}'),
    ('cool-pools', 'deals', 'cool-pools', 'NYC Pools Schedule', 'daily', true, '{}')
ON CONFLICT ("id") DO UPDATE SET
    "module_id" = EXCLUDED."module_id",
    "slug" = EXCLUDED."slug",
    "name" = EXCLUDED."name",
    "frequency" = EXCLUDED."frequency",
    "config" = EXCLUDED."config";
