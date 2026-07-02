-- =====================================================
-- HireXAI RLS (Row Level Security) Setup
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlisted_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

-- Skip alembic_version (internal migration table)
-- ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. Create policies for service role (backend access)
-- Your FastAPI backend uses direct PostgreSQL connection,
-- which bypasses RLS by default (uses postgres role).
-- These policies allow authenticated Supabase clients.
-- =====================================================

-- USERS TABLE
CREATE POLICY "Service role full access" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- RESUMES TABLE  
CREATE POLICY "Service role full access" ON public.resumes
    FOR ALL USING (true) WITH CHECK (true);

-- CANDIDATE_PROFILES TABLE
CREATE POLICY "Service role full access" ON public.candidate_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- NOTIFICATIONS TABLE
CREATE POLICY "Service role full access" ON public.notifications
    FOR ALL USING (true) WITH CHECK (true);

-- JOBS TABLE
CREATE POLICY "Service role full access" ON public.jobs
    FOR ALL USING (true) WITH CHECK (true);

-- APPLICATIONS TABLE
CREATE POLICY "Service role full access" ON public.applications
    FOR ALL USING (true) WITH CHECK (true);

-- SAVED_JOBS TABLE
CREATE POLICY "Service role full access" ON public.saved_jobs
    FOR ALL USING (true) WITH CHECK (true);

-- SCHEDULED_EVENTS TABLE
CREATE POLICY "Service role full access" ON public.scheduled_events
    FOR ALL USING (true) WITH CHECK (true);

-- SHORTLISTED_CANDIDATES TABLE
CREATE POLICY "Service role full access" ON public.shortlisted_candidates
    FOR ALL USING (true) WITH CHECK (true);

-- INTERVIEW_SESSIONS TABLE
CREATE POLICY "Service role full access" ON public.interview_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- SUBMISSIONS TABLE
CREATE POLICY "Service role full access" ON public.submissions
    FOR ALL USING (true) WITH CHECK (true);

-- TESTS TABLE
CREATE POLICY "Service role full access" ON public.tests
    FOR ALL USING (true) WITH CHECK (true);

-- TEST_QUESTIONS TABLE
CREATE POLICY "Service role full access" ON public.test_questions
    FOR ALL USING (true) WITH CHECK (true);

-- PROCTOR_LOGS TABLE
CREATE POLICY "Service role full access" ON public.proctor_logs
    FOR ALL USING (true) WITH CHECK (true);

-- TEST_ASSIGNMENTS TABLE
CREATE POLICY "Service role full access" ON public.test_assignments
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 3. Verify RLS is enabled
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
