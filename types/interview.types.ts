// Interview types
export interface InterviewSession {
    id: string;
    room_id: string;
    recruiter_id: number;
    candidate_id: number;
    scheduled_at: string;
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    created_at: string;
    recruiter?: {
        id: number;
        full_name: string;
        email: string;
    };
    candidate?: {
        id: number;
        full_name: string;
        email: string;
    };
}

export interface ScheduleEventPayload {
    candidate_id: number;
    event_type: string;
    scheduled_at: string;
    notes?: string;
}

export interface ScheduledEvent {
    id: number;
    recruiter_id: number;
    candidate_id: number;
    event_type: string;
    scheduled_at: string;
    notes?: string;
    status: string;
    created_at: string;
}
