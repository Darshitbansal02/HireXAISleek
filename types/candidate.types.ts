// Candidate and Profile types
export interface Candidate {
    id: number;
    full_name: string;
    email: string;
    headline?: string;
    location?: string;
    experience_years?: number;
    skills?: string | string[];
    similarity?: number;
}

export interface CandidateProfile {
    id: number;
    user_id: number;
    headline?: string;
    bio?: string;
    location?: string;
    experience_years?: number;
    skills?: string[];
    education?: string;
    resume_url?: string;
    resume_preview?: string;
    embedding?: number[];
    created_at: string;
    updated_at: string;
}

export interface CandidateStats {
    applications_count: number;
    saved_jobs_count: number;
    interviews_scheduled: number;
    profile_views: number;
}

export interface RecruiterStats {
    jobs_posted: number;
    total_applications: number;
    shortlisted_count: number;
    interviews_scheduled: number;
}
