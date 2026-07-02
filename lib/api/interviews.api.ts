// Interviews API methods
import { baseClient } from "./client";
import type { InterviewSession, ScheduledEvent, ScheduleEventPayload } from "@/types";

class InterviewsApi {
    async getMyInterviews(): Promise<InterviewSession[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/interview/my-interviews");
        return response.data;
    }

    async getInterviewDetails(roomId: string): Promise<InterviewSession> {
        const response = await baseClient.getAxiosInstance().get(`/v1/interview/${roomId}`);
        return response.data;
    }

    async scheduleEvent(data: ScheduleEventPayload): Promise<ScheduledEvent> {
        const response = await baseClient.getAxiosInstance().post("/v1/recruiter/schedule", data);
        return response.data;
    }

    async getScheduledEvents(): Promise<ScheduledEvent[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/recruiter/schedules");
        return response.data;
    }

    async deleteInterview(roomId: string): Promise<void> {
        await baseClient.getAxiosInstance().delete(`/v1/interview/${roomId}`);
    }
}

export const interviewsApi = new InterviewsApi();
