-- Stores the prior subject/body of an email_drafts row each time it is
-- regenerated. The current content lives on email_drafts; this table is
-- append-only history (capped to MAX_DRAFT_VERSIONS via application logic).

CREATE TABLE IF NOT EXISTS email_draft_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID NOT NULL REFERENCES email_drafts(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    research_summary TEXT,
    -- generated_at is the createdAt of the version when it was current; this
    -- is what the UI shows ("Generated 6:04 PM"). created_at is when the row
    -- was archived (which is now).
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_draft_versions_draft_generated
    ON email_draft_versions(draft_id, generated_at DESC);

ALTER TABLE email_draft_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'email_draft_versions'
          AND policyname = 'Service role full access draft versions'
    ) THEN
        CREATE POLICY "Service role full access draft versions" ON email_draft_versions
            FOR ALL TO service_role
            USING (true) WITH CHECK (true);
    END IF;
END
$$;
