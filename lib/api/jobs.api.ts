// Jobs API methods
import { baseClient } from "./client";
import type { Job, Application, CreateJobPayload, GeneratedJobDescription, JobDescriptionPayload } from "@/types";

class JobsApi {
    async postJob(payload: CreateJobPayload): Promise<Job> {
        const response = await baseClient.getAxiosInstance().post("/v1/recruiter/post-job", payload);
        return response.data;
    }

    async getMyJobs(): Promise<Job[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/recruiter/my-posts");
        if (Array.isArray(response.data)) {
            return response.data;
        }
        return response.data.jobs || [];
    }

    async getRecruiterJobs(): Promise<Job[]> {
        return this.getMyJobs();
    }

    async getJobApplications(jobId: number): Promise<Application[]> {
        const response = await baseClient.getAxiosInstance().get(`/v1/recruiter/applications/${jobId}`);
        if (Array.isArray(response.data)) {
            return response.data;
        }
        return response.data.applications || [];
    }

    async deleteJob(jobId: number): Promise<void> {
        await baseClient.getAxiosInstance().delete(`/v1/recruiter/job/${jobId}`);
    }

    async updateApplicationStatus(applicationId: number, status: string): Promise<Application> {
        const response = await baseClient.getAxiosInstance().put(`/v1/recruiter/applications/${applicationId}/status`, { status });
        return response.data;
    }

    async getJobs(skip = 0, limit = 100): Promise<Job[]> {
        const response = await baseClient.getAxiosInstance().get(`/v1/candidate/jobs?skip=${skip}&limit=${limit}`);
        return response.data;
    }

    async getSavedJobs(): Promise<Job[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/candidate/jobs/saved");
        return response.data;
    }

    async saveJob(jobId: number): Promise<void> {
        await baseClient.getAxiosInstance().post(`/v1/candidate/jobs/save/${jobId}`);
    }

    async applyForJob(jobId: number): Promise<Application> {
        const response = await baseClient.getAxiosInstance().post(`/v1/candidate/apply/${jobId}`);
        return response.data;
    }

    async getCandidateApplications(): Promise<Application[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/candidate/applications");
        return response.data;
    }

    async getRecommendedJobs(): Promise<Job[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/candidate/jobs/recommended");
        return response.data;
    }

    async searchJobs(query: string): Promise<Job[]> {
        const response = await baseClient.getAxiosInstance().post("/v1/search/jobs", { query });
        return response.data;
    }

    async generateJobDescription(payload: JobDescriptionPayload): Promise<GeneratedJobDescription> {
        const prompt = `Generate a professional job description for:
Job Title: ${payload.title}
Company: ${payload.company || 'Our Company'}
Location: ${payload.location || 'Not specified'}
Experience Required: ${payload.experience || '0'} years
Required Skills: ${payload.skills || 'Not specified'}
Employment Type: ${payload.type || 'Full-time'}

STRICTLY RETURN ONLY A VALID JSON OBJECT. NO MARKDOWN. NO EXPLANATION.`;

        const response = await baseClient.getAxiosInstance().post("/v1/llm/generate", {
            prompt: prompt,
            system_prompt: "You are an expert technical recruiter. You MUST output strictly valid JSON matching the requested schema.",
            max_tokens: 1500,
            temperature: 0.3
        });

        return this.parseAIJson(response.data.text);
    }

    private parseAIJson(text: string): GeneratedJobDescription {
        try {
            let cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            cleanText = cleanText.replace(/```\n?|\n?```/g, "").trim();
            const firstBrace = cleanText.indexOf("{");
            const lastBrace = cleanText.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanText = cleanText.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(cleanText);
        } catch (error) {
            console.error("JSON Parse Error:", error);
            return {
                title: "", company: "", location: "", employment_type: "",
                experience_required: "", overview: text, responsibilities: [],
                required_qualifications: [], preferred_qualifications: [],
                benefits: [], company_statement: ""
            };
        }
    }
}

export const jobsApi = new JobsApi();
