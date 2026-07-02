// Test System types
export interface Test {
    id: string;
    title: string;
    description?: string;
    duration_minutes: number;
    recruiter_id: number;
    created_at: string;
    questions?: TestQuestion[];
}

export interface TestQuestion {
    id: string;
    test_id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    type: "coding" | "mcq";
    language?: string;
    test_cases?: TestCase[];
    options?: MCQOption[];
    correct_option?: string;
    max_score: number;
}

export interface TestCase {
    input: string;
    expected_output: string;
    is_hidden: boolean;
}

export interface MCQOption {
    id: string;
    text: string;
}

export interface TestAssignment {
    id: string;
    test_id: string;
    candidate_id: number;
    status: "pending" | "started" | "completed" | "expired" | "terminated_fraud";
    started_at?: string;
    completed_at?: string;
    expires_at?: string;
    scheduled_at?: string;
    score?: number;
    attempt_count: number;
    meta?: Record<string, unknown>;
    test?: Test;
    candidate?: Candidate;
}

export interface Submission {
    id: string;
    assignment_id: string;
    question_id: string;
    code: string;
    language: string;
    status: "pending" | "running" | "passed" | "failed" | "error";
    score?: number;
    results?: SubmissionResult[];
    submitted_at: string;
}

export interface SubmissionResult {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    is_hidden: boolean;
}

export interface RunTestPayload {
    question_id: string;
    code: string;
    language: string;
}

export interface GenerateQuestionParams {
    topic: string;
    difficulty: string;
    language: string;
    type?: string;
    sample_count?: number;
    hidden_count?: number;
    count?: number;
}

// Import Candidate type for use
import type { Candidate } from "./candidate.types";
