-- Email Analytics Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Email Events Table (Immutable Log)
-- Stores every raw webhook event for audit trail and reprocessing
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,           -- 'everlytic', 'mailgun', etc.
    event_type TEXT NOT NULL,         -- 'sent', 'delivered', 'open', 'click', 'bounce', 'failed'
    email TEXT NOT NULL,
    message_id TEXT NOT NULL,
    campaign_id TEXT,
    template_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    idempotency_key TEXT UNIQUE,      -- Prevents duplicate webhook processing
    
    -- Constraint to ensure provider is valid (optional, but good for data quality)
    CONSTRAINT check_provider CHECK (length(provider) > 0),
    CONSTRAINT check_event_type CHECK (length(event_type) > 0)
);

-- Indexes for Email Events
-- Optimize for common analytical queries and alerting
CREATE INDEX IF NOT EXISTS idx_email_events_occurred_at ON email_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_provider_msgid ON email_events(provider, message_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_events_type_occurred ON email_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);


-- 2. Email Messages Table (Mutable State)
-- Current state of each message for quick lookups (e.g. "Did this lead get the email?")
CREATE TABLE IF NOT EXISTS email_messages (
    message_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    email TEXT NOT NULL,
    campaign_id TEXT,
    template_id TEXT,
    sent_at TIMESTAMPTZ,
    last_event_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Email Messages
CREATE INDEX IF NOT EXISTS idx_email_messages_campaign ON email_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_email ON email_messages(email);


-- 3. Row Level Security (RLS)
-- Secure tables so they can strictly be accessed by service role or specific flows
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

-- Allow Service Role full access (internal backend usage)
-- Note: Supabase implementation details might require explicit policies depending on config,
-- but usually service_role bypasses RLS. We add these for completeness if using authenticated client.
CREATE POLICY "Service role full access events" ON email_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access messages" ON email_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users read-only access to analytics (if dashboard requires it)
CREATE POLICY "Authenticated users read events" ON email_events
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users read messages" ON email_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Comments
COMMENT ON TABLE email_events IS 'Immutable log of all email provider webhooks and events';
COMMENT ON TABLE email_messages IS 'Current state of sent emails for quick status lookups';
