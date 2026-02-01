-- Migration: Add user delivery preferences for time-slot email system
-- This enables users to opt into/out of specific email times

-- Create user_delivery_preferences table
CREATE TABLE user_delivery_preferences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time slot preferences (null = use tier default)
    morning_enabled BOOLEAN DEFAULT true,
    noon_enabled BOOLEAN DEFAULT false,     -- Free users: false, Premium: can opt-in
    evening_enabled BOOLEAN DEFAULT false,  -- Free users: false, Premium: can opt-in
    
    -- Additional preferences
    quiet_hours_start INTEGER,              -- Hour (0-23) to stop sending
    quiet_hours_end INTEGER,                -- Hour (0-23) to resume sending
    timezone TEXT DEFAULT 'America/New_York',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Create index for quick lookups
CREATE INDEX idx_user_delivery_prefs_user_id ON user_delivery_preferences(user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_delivery_prefs_updated_at
    BEFORE UPDATE ON user_delivery_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default preferences for existing users
-- Free tier: morning only
-- Premium tier: all slots
INSERT INTO user_delivery_preferences (user_id, morning_enabled, noon_enabled, evening_enabled)
SELECT 
    id as user_id,
    true as morning_enabled,
    CASE WHEN tier = 'premium' THEN true ELSE false END as noon_enabled,
    CASE WHEN tier = 'premium' THEN true ELSE false END as evening_enabled
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE user_delivery_preferences IS 'User preferences for time-slot email delivery (9am/noon/7pm)';
