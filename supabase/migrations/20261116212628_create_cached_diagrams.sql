-- Migration: Create cached_diagrams table, triggers, and RLS policies
-- Follows Supabase and PostgreSQL best practices

-- 1. Create table cached_diagrams
CREATE TABLE IF NOT EXISTS public.cached_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_url TEXT NOT NULL UNIQUE,
    commit_hash TEXT,
    flow_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Database Trigger Function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cached_diagrams_updated_at ON public.cached_diagrams;
CREATE TRIGGER trigger_cached_diagrams_updated_at
    BEFORE UPDATE ON public.cached_diagrams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Row Level Security (RLS)
ALTER TABLE public.cached_diagrams ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Allow anonymous/public reads
DROP POLICY IF EXISTS "Allow public read access to cached diagrams" ON public.cached_diagrams;
CREATE POLICY "Allow public read access to cached diagrams"
    ON public.cached_diagrams
    FOR SELECT
    TO public
    USING (true);

-- INSERT policy: Restrict writing to service_role only
DROP POLICY IF EXISTS "Allow service role insert access" ON public.cached_diagrams;
CREATE POLICY "Allow service role insert access"
    ON public.cached_diagrams
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- UPDATE policy: Restrict updating to service_role only
DROP POLICY IF EXISTS "Allow service role update access" ON public.cached_diagrams;
CREATE POLICY "Allow service role update access"
    ON public.cached_diagrams
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Table API access grants
GRANT SELECT ON public.cached_diagrams TO anon, authenticated;
GRANT ALL ON public.cached_diagrams TO service_role;
