// Job and Application types
export interface Job {
    id: number;
    title: string;
    description: string;
    location: string;
    min_experience: number;
    skills: string;
    company: string;
    type: string;
    recruiter_id: number;
    created_at: string;
    status: string;
    applications?: Application[];
}

export interface Application {
    id: number;
    job_id: number;
    candidate_id: number;
    status: string;
    cover_letter?: string;
    applied_at: string;
}

export interface CreateJobPayload {
    title: string;
    description: string;
    location: string;
    min_experience: number;
    skills: string;
    company?: string;
    type?: string;
}

export interface JobDescriptionPayload {
    title: string;
    company?: string;
    location?: string;
    experience?: string;
    skills?: string;
    type?: string;
}

export interface GeneratedJobDescription {
    title: string;
    company: string;
    location: string;
    employment_type: string;
    experience_required: string;
    overview: string;
    responsibilities: string[];
    required_qualifications: string[];
    preferred_qualifications: string[];
    benefits: string[];
    company_statement: string;
}
