// Proctoring API methods
import { baseClient } from "./client";
import type { ProctorStatus, ProctorEventsConfig, ProctorEventType } from "@/types";

class ProctoringApi {
    async logProctorEvent(assignmentId: string, eventType: ProctorEventType | string, payload: Record<string, unknown> = {}): Promise<ProctorStatus> {
        const response = await baseClient.getAxiosInstance().post("/v1/proctoring/log", {
            event_type: eventType,
            payload: payload
        }, {
            params: { assignment_id: assignmentId }
        });
        return response.data;
    }

    async uploadSnapshot(assignmentId: string, file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append("file", file);
        const response = await baseClient.getAxiosInstance().post(`/v1/proctoring/upload-snapshot`, formData, {
            params: { assignment_id: assignmentId },
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }

    async getProctoringEventsConfig(): Promise<ProctorEventsConfig> {
        const response = await baseClient.getAxiosInstance().get("/v1/proctoring/events-config");
        return response.data;
    }

    async getProctorStatus(assignmentId: string): Promise<ProctorStatus> {
        const response = await baseClient.getAxiosInstance().get("/v1/proctoring/status", {
            params: { assignment_id: assignmentId }
        });
        return response.data;
    }
}

export const proctoringApi = new ProctoringApi();
