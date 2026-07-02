// Tests API methods
import { baseClient } from "./client";
import type { Test, TestAssignment, Submission, RunTestPayload, GenerateQuestionParams } from "@/types";

class TestsApi {
    // Recruiter methods
    async createTest(data: Partial<Test>): Promise<Test> {
        const response = await baseClient.getAxiosInstance().post("/v1/recruiter/tests/", data);
        return response.data;
    }

    async getTests(): Promise<Test[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/recruiter/tests/");
        return response.data;
    }

    async getTest(testId: string): Promise<Test> {
        const response = await baseClient.getAxiosInstance().get(`/v1/recruiter/tests/${testId}`);
        return response.data;
    }

    async deleteTest(testId: string): Promise<void> {
        await baseClient.getAxiosInstance().delete(`/v1/recruiter/tests/${testId}`);
    }

    async generateQuestion(testId: string, params: GenerateQuestionParams): Promise<unknown> {
        const response = await baseClient.getAxiosInstance().post(`/v1/recruiter/tests/${testId}/generate-question`, null, { params });
        return response.data;
    }

    async addQuestion(testId: string, data: unknown): Promise<unknown> {
        const response = await baseClient.getAxiosInstance().post(`/v1/recruiter/tests/${testId}/questions`, data);
        return response.data;
    }

    async assignTest(testId: string, candidateIds: number[], expiresAt?: string, scheduledAt?: string): Promise<void> {
        await baseClient.getAxiosInstance().post(`/v1/recruiter/tests/${testId}/assign`, {
            test_id: testId,
            candidate_ids: candidateIds,
            expires_at: expiresAt,
            scheduled_at: scheduledAt
        });
    }

    async getTestAssignments(testId: string): Promise<TestAssignment[]> {
        const response = await baseClient.getAxiosInstance().get(`/v1/recruiter/tests/${testId}/assignments`);
        return response.data;
    }

    async getAssignmentDetailRecruiter(assignmentId: string): Promise<TestAssignment> {
        const response = await baseClient.getAxiosInstance().get(`/v1/recruiter/assignments/${assignmentId}`);
        return response.data;
    }

    // Candidate methods
    async listAssignments(): Promise<TestAssignment[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/candidate/assignments/");
        return response.data;
    }

    async getAssignment(assignmentId: string): Promise<TestAssignment> {
        const response = await baseClient.getAxiosInstance().get(`/v1/candidate/assignments/${assignmentId}`);
        return response.data;
    }

    async startTest(assignmentId: string): Promise<TestAssignment> {
        const response = await baseClient.getAxiosInstance().post(`/v1/candidate/assignments/${assignmentId}/start`);
        return response.data;
    }

    async runTest(assignmentId: string, payload: RunTestPayload): Promise<Submission> {
        const response = await baseClient.getAxiosInstance().post(`/v1/candidate/assignments/${assignmentId}/run`, payload);
        return response.data;
    }

    async saveDraft(assignmentId: string, data: RunTestPayload): Promise<void> {
        await baseClient.getAxiosInstance().patch(`/v1/candidate/assignments/${assignmentId}/draft`, data);
    }

    async submitTest(assignmentId: string, data: RunTestPayload): Promise<Submission> {
        const response = await baseClient.getAxiosInstance().post(`/v1/candidate/assignments/${assignmentId}/submit`, data);
        return response.data;
    }

    async finishTest(assignmentId: string): Promise<TestAssignment> {
        const response = await baseClient.getAxiosInstance().post(`/v1/candidate/assignments/${assignmentId}/finish`);
        return response.data;
    }
}

export const testsApi = new TestsApi();
