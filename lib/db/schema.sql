-- Instantly Email Analytics Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Immutable event log: every webhook payload from Instantly is appended here
-- email is nullable because workspace-level events (account_error, campaign_completed)
-- arrive without a lead_email field.
CREATE TABLE IF NOT EXISTS instantly_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    email TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    workspace_id TEXT,
    email_account TEXT,
    step INTEGER,
    variant INTEGER,
    is_first BOOLEAN,
    occurred_at TIMESTAMPTZ NOT NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_event_type CHECK (length(event_type) > 0)
);

CREATE INDEX IF NOT EXISTS idx_instantly_events_occurred_at ON instantly_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_instantly_events_campaign ON instantly_events(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instantly_events_email ON instantly_events(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instantly_events_type_occurred ON instantly_events(event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_instantly_events_campaign_email ON instantly_events(campaign_id, email) WHERE campaign_id IS NOT NULL AND email IS NOT NULL;

-- Snapshot of every (campaign_id, lead_email) pair's lifecycle. Webhook events
-- update this table; the dashboard reads it for per-prospect status views.
CREATE TABLE IF NOT EXISTS instantly_messages (
    campaign_id TEXT NOT NULL,
    lead_email TEXT NOT NULL,

    -- Email lifecycle (first-occurrence timestamps)
    sent_at TIMESTAMPTZ,
    first_opened_at TIMESTAMPTZ,
    first_clicked_at TIMESTAMPTZ,
    first_replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,

    -- Counters (incremented on each event)
    open_count INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,

    -- Lead status
    interest_status TEXT,                          -- interested | not_interested | neutral
    meeting_booked_at TIMESTAMPTZ,
    meeting_completed_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    is_out_of_office BOOLEAN NOT NULL DEFAULT FALSE,
    is_wrong_person BOOLEAN NOT NULL DEFAULT FALSE,

    -- Last applied custom workspace label (if any)
    custom_label TEXT,

    -- Last event tracking
    last_event_type TEXT,
    last_event_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (campaign_id, lead_email)
);

CREATE INDEX IF NOT EXISTS idx_instantly_messages_email ON instantly_messages(lead_email);
CREATE INDEX IF NOT EXISTS idx_instantly_messages_interest ON instantly_messages(interest_status) WHERE interest_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_instantly_messages_meeting_booked ON instantly_messages(meeting_booked_at) WHERE meeting_booked_at IS NOT NULL;

-- Service role gets full access; authenticated dashboard reads are allowed.
ALTER TABLE instantly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE instantly_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access events" ON instantly_events
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access messages" ON instantly_messages
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Trace each draft back to the campaign + lead it was sent under
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS instantly_campaign_id TEXT;
ALTER TABLE email_drafts ADD COLUMN IF NOT EXISTS instantly_lead_id TEXT;
CREATE INDEX IF NOT EXISTS idx_email_drafts_instantly_campaign ON email_drafts(instantly_campaign_id) WHERE instantly_campaign_id IS NOT NULL;
