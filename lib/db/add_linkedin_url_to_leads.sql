-- Migration: Add linkedin_url column to leads table
-- Run this migration in your Supabase SQL editor

ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN leads.linkedin_url IS 'LinkedIn profile URL for the lead';
