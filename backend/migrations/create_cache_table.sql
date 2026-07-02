-- =====================================================
-- HireXAI Cache Table (Supabase-based caching)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create cache table for storing temporary data (LLM responses, embeddings, etc.)
CREATE TABLE IF NOT EXISTS public.cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS ix_cache_expires ON public.cache (expires_at);

-- Enable RLS
ALTER TABLE public.cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend only)
CREATE POLICY "service_role_only" ON public.cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Block client access (anon and authenticated users can't access cache)
CREATE POLICY "deny_clients" ON public.cache
    FOR ALL
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

-- Function to clean expired cache entries (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a pg_cron job to run cleanup every hour
-- Requires pg_cron extension enabled in Supabase
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache()');
