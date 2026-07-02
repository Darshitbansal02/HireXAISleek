-- =====================================================
-- HireXAI Database Indexes for Performance
-- Run this in Supabase SQL Editor
-- =====================================================

-- Applications table indexes
CREATE INDEX IF NOT EXISTS ix_applications_job_id ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS ix_applications_candidate_id ON public.applications (candidate_id);
CREATE INDEX IF NOT EXISTS ix_applications_status ON public.applications (status);
CREATE INDEX IF NOT EXISTS ix_applications_job_status ON public.applications (job_id, status);

-- Jobs table indexes
CREATE INDEX IF NOT EXISTS ix_jobs_recruiter_id ON public.jobs (recruiter_id);
CREATE INDEX IF NOT EXISTS ix_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS ix_jobs_created_at ON public.jobs (created_at DESC);

-- Candidate profiles indexes
CREATE INDEX IF NOT EXISTS ix_candidate_profiles_user_id ON public.candidate_profiles (user_id);

-- Test assignments indexes
CREATE INDEX IF NOT EXISTS ix_test_assignments_test_id ON public.test_assignments (test_id);
CREATE INDEX IF NOT EXISTS ix_test_assignments_candidate_id ON public.test_assignments (candidate_id);
CREATE INDEX IF NOT EXISTS ix_test_assignments_status ON public.test_assignments (status);
CREATE INDEX IF NOT EXISTS ix_test_assignments_test_candidate ON public.test_assignments (test_id, candidate_id);

-- Proctor logs indexes
CREATE INDEX IF NOT EXISTS ix_proctor_logs_assignment_id ON public.proctor_logs (assignment_id);
CREATE INDEX IF NOT EXISTS ix_proctor_logs_severity ON public.proctor_logs (severity);
CREATE INDEX IF NOT EXISTS ix_proctor_logs_assignment_severity ON public.proctor_logs (assignment_id, severity);

-- Submissions indexes
CREATE INDEX IF NOT EXISTS ix_submissions_assignment_id ON public.submissions (assignment_id);
CREATE INDEX IF NOT EXISTS ix_submissions_question_id ON public.submissions (question_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_user_read ON public.notifications (user_id, is_read);

-- Saved jobs indexes
CREATE INDEX IF NOT EXISTS ix_saved_jobs_candidate_id ON public.saved_jobs (candidate_id);
CREATE INDEX IF NOT EXISTS ix_saved_jobs_job_id ON public.saved_jobs (job_id);

-- Shortlisted candidates indexes
CREATE INDEX IF NOT EXISTS ix_shortlisted_recruiter_id ON public.shortlisted_candidates (recruiter_id);
CREATE INDEX IF NOT EXISTS ix_shortlisted_candidate_id ON public.shortlisted_candidates (candidate_id);

-- Interview sessions indexes
CREATE INDEX IF NOT EXISTS ix_interview_sessions_recruiter_id ON public.interview_sessions (recruiter_id);
CREATE INDEX IF NOT EXISTS ix_interview_sessions_candidate_id ON public.interview_sessions (candidate_id);
CREATE INDEX IF NOT EXISTS ix_interview_sessions_status ON public.interview_sessions (status);

-- Tests indexes
CREATE INDEX IF NOT EXISTS ix_tests_recruiter_id ON public.tests (recruiter_id);

-- Test questions indexes
CREATE INDEX IF NOT EXISTS ix_test_questions_test_id ON public.test_questions (test_id);
