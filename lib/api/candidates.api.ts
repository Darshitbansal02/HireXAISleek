// Candidates API methods
import { baseClient } from "./client";
import type { Candidate, CandidateProfile, CandidateStats, RecruiterStats } from "@/types";

class CandidatesApi {
    async getCandidateDetails(candidateId: number): Promise<Candidate> {
        const response = await baseClient.getAxiosInstance().get(`/v1/recruiter/candidate/${candidateId}`);
        return response.data;
    }

    async searchCandidates(query: string): Promise<Candidate[]> {
        const response = await baseClient.getAxiosInstance().post("/v1/search/candidates", { query, limit: 10 });
        return response.data;
    }

    async shortlistCandidate(candidateId: number, jobId?: number): Promise<void> {
        await baseClient.getAxiosInstance().post("/v1/recruiter/shortlist", { candidate_id: candidateId, job_id: jobId });
    }

    async getShortlistedCandidates(): Promise<Candidate[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/recruiter/shortlisted");
        return response.data;
    }

    async removeShortlist(candidateId: number): Promise<void> {
        await baseClient.getAxiosInstance().delete(`/v1/recruiter/shortlist/${candidateId}`);
    }

    async getProfile(): Promise<CandidateProfile> {
        const response = await baseClient.getAxiosInstance().get("/v1/candidate/profile");
        return response.data;
    }

    async updateProfile(profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
        const response = await baseClient.getAxiosInstance().put("/v1/candidate/profile", profileData);
        return response.data;
    }

    async updateProfileEmbedding(): Promise<void> {
        await baseClient.getAxiosInstance().post("/v1/candidate/profile/update-embedding");
    }

    async getCandidateStats(): Promise<CandidateStats> {
        const response = await baseClient.getAxiosInstance().get("/v1/dashboard/candidate/stats");
        return response.data;
    }

    async getRecruiterStats(): Promise<RecruiterStats> {
        const response = await baseClient.getAxiosInstance().get("/v1/dashboard/recruiter/stats");
        return response.data;
    }

    // Resume methods
    async uploadResume(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append("file", file);
        const response = await baseClient.getAxiosInstance().post("/v1/candidate/resume/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    }

    async deleteResume(): Promise<void> {
        await baseClient.getAxiosInstance().delete("/v1/candidate/resume");
    }

    async extractResumeText(): Promise<{ text: string }> {
        const response = await baseClient.getAxiosInstance().post("/v1/candidate/resume/extract");
        return response.data;
    }

    getResumeFileUrl(): string {
        return `${baseClient.getBaseURL()}/v1/candidate/resume/file?t=${Date.now()}`;
    }

    getRecruiterResumeUrl(candidateId: number): string {
        return `${baseClient.getBaseURL()}/v1/recruiter/candidate/${candidateId}/resume?t=${Date.now()}`;
    }

    async fetchResumeFileBlob(): Promise<Blob> {
        const response = await baseClient.getAxiosInstance().get("/v1/candidate/resume/file", {
            responseType: 'blob'
        });
        return response.data;
    }

    async fetchRecruiterResumeBlob(candidateId: number): Promise<Blob> {
        const response = await baseClient.getAxiosInstance().get(`/v1/recruiter/candidate/${candidateId}/resume`, {
            responseType: 'blob'
        });
        return response.data;
    }

    async analyzeResume(resumeText: string): Promise<{ analysis: string }> {
        const response = await baseClient.getAxiosInstance().post("/v1/llm/analyze-resume", {
            resume_text: resumeText,
        });
        return response.data;
    }
}

export const candidatesApi = new CandidatesApi();
