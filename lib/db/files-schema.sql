-- Processed Files Schema

-- Table to store uploaded/ingested files
CREATE TABLE IF NOT EXISTS processed_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    description TEXT,
    row_count INTEGER DEFAULT 0,
    file_size_bytes INTEGER,
    file_type TEXT, -- 'csv', 'xlsx', etc.
    status TEXT DEFAULT 'ingested', -- 'ingested', 'mapped', 'archived'
    
    -- Storing parsed data directly for MVP access
    -- WARNING: For very large files, this should be moved to Supabase Storage
    -- and only a URL stored here. For now, JSONB is fine for typical lead lists.
    file_data JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_processed_files_created_at ON processed_files(created_at DESC);

-- RLS
ALTER TABLE processed_files ENABLE ROW LEVEL SECURITY;

-- Service role access
CREATE POLICY "Service role full access files" ON processed_files
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated access (read-only for listing, insert for upload)
CREATE POLICY "Authenticated users view files" ON processed_files
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users upload files" ON processed_files
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
