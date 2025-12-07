import axios, { AxiosInstance } from "axios";

interface AuthUser {
    id: number;
    email: string;
    role: "candidate" | "recruiter" | "admin";
    full_name?: string;
}

interface ApiError {
    status: number;
    message: string;
    detail?: any;
}

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

class ApiClient {
    private client: AxiosInstance;
    private baseURL: string;

    constructor() {
        if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
            console.error("Missing NEXT_PUBLIC_API_BASE_URL");
        }
        this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
            },
        });

        this.client.interceptors.request.use((config) => {
            const token = this.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    this.clearAuth();
                    if (typeof window !== "undefined") {
                        window.location.href = "/login";
                    }
                }
                throw error;
            }
        );
    }

    private inMemoryToken: string | null = null;

    setToken(token: string) {
        // Store in memory only (not in localStorage for security)
        this.inMemoryToken = token;
        // DEPRECATED: Clear any old localStorage usage for backward compat
        if (typeof window !== "undefined") {
            try {
                const oldToken = localStorage.getItem("auth_token");
                if (oldToken) {
                    console.warn("[DEPRECATED] Removing auth_token from localStorage. Use in-memory session instead.");
                    localStorage.removeItem("auth_token");
                }
            } catch (e) { }
        }
    }

    getToken(): string | null {
        // Try in-memory token first
        if (this.inMemoryToken) {
            return this.inMemoryToken;
        }
        // Fallback: attempt to read from localStorage (deprecated; log warning)
        if (typeof window !== "undefined") {
            try {
                const token = localStorage.getItem("auth_token");
                if (token) {
                    console.warn("[DEPRECATED] Auth token read from localStorage. Session will be lost on refresh.");
                    return token;
                }
            } catch (e) { }
        }
        return null;
    }

    clearAuth() {
        // Clear in-memory token
        this.inMemoryToken = null;
        // Clear localStorage (backward compat)
        if (typeof window !== "undefined") {
            try {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("user");
            } catch (e) { }
        }
    }

    isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    async register(payload: {
        email: string;
        password: string;
        full_name: string;
        role: "candidate" | "recruiter";
    }) {
        try {
            const response = await this.client.post("/v1/auth/register", payload);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async login(payload: { email: string; password: string }) {
        try {
            const formData = new FormData();
            formData.append("username", payload.email);
            formData.append("password", payload.password);

            const response = await this.client.post("/v1/auth/login", formData, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            const { access_token } = response.data;
            this.setToken(access_token);

            const userResponse = await this.client.get("/v1/auth/me");
            const user = userResponse.data;
            console.log("[DEBUG] Login response user:", user);

            // DO NOT store user in localStorage (use in-memory state in auth context)
            // Clear any old user data from localStorage
            if (typeof window !== "undefined") {
                try {
                    const oldUser = localStorage.getItem("user");
                    if (oldUser) {
                        console.warn("[DEPRECATED] Removing user from localStorage. Use auth context instead.");
                        localStorage.removeItem("user");
                    }
                } catch (e) { }
            }
            return { access_token, user };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async postJob(payload: {
        title: string;
        description: string;
        location: string;
        min_experience: number;
        skills: string;
        company?: string;
        type?: string;
    }) {
        try {
            const response = await this.client.post("/v1/recruiter/post-job", payload);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getMyJobs() {
        try {
            const response = await this.client.get("/v1/recruiter/my-posts");
            if (Array.isArray(response.data)) {
                return response.data;
            }
            return response.data.jobs || [];
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getRecruiterJobs() {
        return this.getMyJobs();
    }

    async getJobApplications(jobId: number) {
        try {
            const response = await this.client.get(`/v1/recruiter/applications/${jobId}`);
            if (Array.isArray(response.data)) {
                return response.data;
            }
            return response.data.applications || [];
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async deleteJob(jobId: number) {
        try {
            const response = await this.client.delete(`/v1/recruiter/job/${jobId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateApplicationStatus(applicationId: number, status: string) {
        try {
            const response = await this.client.put(`/v1/recruiter/applications/${applicationId}/status`, { status });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getCandidateApplications() {
        try {
            const response = await this.client.get("/v1/candidate/applications");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getJobs(skip = 0, limit = 100) {
        try {
            const response = await this.client.get(`/v1/candidate/jobs?skip=${skip}&limit=${limit}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getSavedJobs() {
        try {
            const response = await this.client.get("/v1/candidate/jobs/saved");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async saveJob(jobId: number) {
        try {
            const response = await this.client.post(`/v1/candidate/jobs/save/${jobId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async applyForJob(jobId: number) {
        try {
            const response = await this.client.post(`/v1/candidate/apply/${jobId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getCandidateDetails(candidateId: number) {
        try {
            const response = await this.client.get(`/v1/recruiter/candidate/${candidateId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getRecommendedJobs() {
        try {
            const response = await this.client.get("/v1/candidate/jobs/recommended");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateProfileEmbedding() {
        try {
            const response = await this.client.post("/v1/candidate/profile/update-embedding");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getCandidateStats() {
        try {
            const response = await this.client.get("/v1/dashboard/candidate/stats");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getRecruiterStats() {
        try {
            const response = await this.client.get("/v1/dashboard/recruiter/stats");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async searchCandidates(query: string) {
        try {
            const response = await this.client.post("/v1/search/candidates", { query, limit: 10 });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async shortlistCandidate(candidateId: number, jobId?: number) {
        try {
            const response = await this.client.post("/v1/recruiter/shortlist", { candidate_id: candidateId, job_id: jobId });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getShortlistedCandidates() {
        try {
            const response = await this.client.get("/v1/recruiter/shortlisted");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async removeShortlist(candidateId: number) {
        try {
            const response = await this.client.delete(`/v1/recruiter/shortlist/${candidateId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async scheduleEvent(data: any) {
        try {
            const response = await this.client.post("/v1/recruiter/schedule", data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getScheduledEvents() {
        try {
            const response = await this.client.get("/v1/recruiter/schedules");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getNotifications() {
        try {
            const response = await this.client.get("/v1/notifications/");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getUnreadNotificationCount() {
        try {
            const response = await this.client.get("/v1/notifications/unread-count");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async markNotificationRead(id: number) {
        try {
            const response = await this.client.put(`/v1/notifications/${id}/read`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async markAllNotificationsRead() {
        try {
            const response = await this.client.put("/v1/notifications/mark-all-read");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async searchJobs(query: string) {
        try {
            const response = await this.client.post("/v1/search/jobs", { query });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async optimizeResume(resumeText: string) {
        try {
            const response = await this.client.post("/v1/llm/analyze-resume", {
                resume_text: resumeText,
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async analyzeResume(resumeText: string) {
        try {
            const response = await this.client.post("/v1/llm/analyze-resume", {
                resume_text: resumeText,
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getProfile() {
        try {
            const response = await this.client.get("/v1/candidate/profile");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async updateProfile(profileData: any) {
        try {
            const response = await this.client.put("/v1/candidate/profile", profileData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async uploadResume(file: File) {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await this.client.post("/v1/candidate/resume/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async deleteResume() {
        try {
            const response = await this.client.delete("/v1/candidate/resume");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async extractResumeText() {
        try {
            const response = await this.client.post("/v1/candidate/resume/extract");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    getResumeFileUrl() {
        return `${this.baseURL}/v1/candidate/resume/file?t=${Date.now()}`;
    }

    getRecruiterResumeUrl(candidateId: number) {
        return `${this.baseURL}/v1/recruiter/candidate/${candidateId}/resume?t=${Date.now()}`;
    }

    async fetchRecruiterResumeBlob(candidateId: number) {
        try {
            const response = await this.client.get(`/v1/recruiter/candidate/${candidateId}/resume`, {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async fetchResumeFileBlob() {
        try {
            const response = await this.client.get("/v1/candidate/resume/file", {
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async buildResume(payload: {
        name: string;
        email: string;
        education: string;
        experience: string;
        skills: string;
    }) {
        try {
            const prompt = `Create a professional, well-formatted resume.\n\nName: ${payload.name}\nEmail: ${payload.email}\nEducation: ${payload.education || 'Not provided'}\nExperience: ${payload.experience || 'Not provided'}\nSkills: ${payload.skills}\n\nFormat this as a complete resume with clear sections for Summary, Education, Experience, and Skills.`;

            const response = await this.client.post("/v1/llm/generate", {
                prompt: prompt,
                system_prompt: "You are an expert resume writer with 10+ years of experience. Create professional, ATS-friendly resumes that highlight candidate strengths."
            });
            return { resume_text: response.data.text };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private parseAIJson(text: string): any {
        try {
            // 1. Remove markdown code blocks
            let cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            // 2. Remove generic markdown blocks if json tag missing
            cleanText = cleanText.replace(/```\n?|\n?```/g, "").trim();

            // 3. Locate JSON object if there's extra text
            const firstBrace = cleanText.indexOf("{");
            const lastBrace = cleanText.lastIndexOf("}");

            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanText = cleanText.substring(firstBrace, lastBrace + 1);
            }

            return JSON.parse(cleanText);
        } catch (error) {
            console.error("JSON Parse Error:", error);
            // Fallback: return text wrapped in object if parse fails
            return { message: text, description: text };
        }
    }

    async chat(message: string) {
        try {
            const response = await this.client.post("/v1/llm/generate", {
                prompt: message,
                system_prompt: `You are the HireXAI Platform Assistant. Help users navigate and use HireXAI's AI-powered features.

STRICT FORMATTING RULES:
1. NO Markdown (no bold, no italic, no headers, no bullets).
2. NO Emojis.
3. NO JSON (unless explicitly asked).
4. Use simple plain text with clear spacing.
5. Use "Step 1:", "Step 2:" for instructions.
6. Use simple hyphens "-" for lists.

FORMAT TEMPLATE:
Title or heading
A short, clear explanation.

Step 1: First action
Description.

Step 2: Second action
Description.

Final note.

**For Candidates:**
- Search jobs with AI Semantic Search
- Build AI-optimized resumes
- Apply to jobs
- Track applications

**For Recruiters:**
- Post jobs with AI descriptions
- Find candidates with Semantic Search
- Manage applications
- View analytics

**Important**: Only answer questions about HireXAI platform features. Be concise, professional, and friendly.`
            });

            return { response: response.data.text };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async generateJobDescription(payload: {
        title: string;
        company?: string;
        location?: string;
        experience?: string;
        skills?: string;
        type?: string;
    }) {
        try {
            const prompt = `Generate a professional job description for:
Job Title: ${payload.title}
Company: ${payload.company || 'Our Company'}
Location: ${payload.location || 'Not specified'}
Experience Required: ${payload.experience || '0'} years
Required Skills: ${payload.skills || 'Not specified'}
Employment Type: ${payload.type || 'Full-time'}

STRICTLY RETURN ONLY A VALID JSON OBJECT. NO MARKDOWN. NO EXPLANATION.
Use this exact schema:
{
  "title": "Job Title",
  "company": "Company Name",
  "location": "Location",
  "employment_type": "Full-time/Contract/etc",
  "experience_required": "X years",
  "overview": "Compelling role overview...",
  "responsibilities": ["Responsibility 1", "Responsibility 2"],
  "required_qualifications": ["Qualification 1", "Qualification 2"],
  "preferred_qualifications": ["Qualification 1", "Qualification 2"],
  "benefits": ["Benefit 1", "Benefit 2"],
  "company_statement": "Brief company culture statement"
}`;

            const response = await this.client.post("/v1/llm/generate", {
                prompt: prompt,
                system_prompt: "You are an expert technical recruiter. You MUST output strictly valid JSON matching the requested schema. Do not use Markdown formatting.",
                max_tokens: 1500,
                temperature: 0.3
            });

            const parsed = this.parseAIJson(response.data.text);
            return parsed;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async saveResume(data: any) {
        try {
            const response = await this.client.post("/v1/resume_builder/save", data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async fetchResume() {
        try {
            const response = await this.client.get("/v1/resume_builder/fetch");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async polishText(text: string, sectionType: string) {
        try {
            const response = await this.client.post("/v1/resume_builder/ai-polish", {
                text,
                section_type: sectionType
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async generateResumeSummary(resumeData: any) {
        try {
            const response = await this.client.post("/v1/resume_builder/ai-generate-summary", resumeData);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async health() {
        try {
            const response = await this.client.get("/health");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getMyInterviews() {
        try {
            const response = await this.client.get("/v1/interview/my-interviews");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getInterviewDetails(roomId: string) {
        try {
            const response = await this.client.get(`/v1/interview/${roomId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async delete(url: string) {
        try {
            const response = await this.client.delete(url);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    private handleError(error: any): ApiError {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 500;
            let message = "An error occurred";

            if (error.response?.data) {
                const data = error.response.data;
                if (typeof data.detail === 'string') {
                    message = data.detail;
                } else if (data.message) {
                    message = data.message;
                } else if (typeof data === 'string') {
                    message = data;
                } else {
                    message = JSON.stringify(data);
                }
            } else {
                message = error.message || "Network error";
            }

            return { status, message, detail: error.response?.data };
        }
        return { status: 500, message: error.message || "An unexpected error occurred" };
    }
    // --- Test System Methods ---

    async createTest(data: any) {
        try {
            const response = await this.client.post("/v1/recruiter/tests/", data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getTests() {
        try {
            const response = await this.client.get("/v1/recruiter/tests/");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getTest(testId: string) {
        try {
            const response = await this.client.get(`/v1/recruiter/tests/${testId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async deleteTest(testId: string) {
        try {
            const response = await this.client.delete(`/v1/recruiter/tests/${testId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async generateQuestion(testId: string, params: { topic: string; difficulty: string; language: string; type?: string; sample_count?: number; hidden_count?: number; count?: number }) {
        try {
            const response = await this.client.post(`/v1/recruiter/tests/${testId}/generate-question`, null, { params });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async addQuestion(testId: string, data: any) {
        try {
            const response = await this.client.post(`/v1/recruiter/tests/${testId}/questions`, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async assignTest(testId: string, candidateIds: number[], expiresAt?: string, scheduledAt?: string) {
        try {
            const response = await this.client.post(`/v1/recruiter/tests/${testId}/assign`, {
                test_id: testId, // Redundant but safe
                candidate_ids: candidateIds,
                expires_at: expiresAt,
                scheduled_at: scheduledAt
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getTestAssignments(testId: string) {
        try {
            const response = await this.client.get(`/v1/recruiter/tests/${testId}/assignments`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async runTest(assignmentId: string, payload: { question_id: string; code: string; language: string }) {
        try {
            const response = await this.client.post(`/v1/candidate/assignments/${assignmentId}/run`, payload);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }


    async getAssignmentDetailRecruiter(assignmentId: string) {
        try {
            const response = await this.client.get(`/v1/recruiter/assignments/${assignmentId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async listAssignments() {
        try {
            const response = await this.client.get("/v1/candidate/assignments/");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async getAssignment(assignmentId: string) {
        try {
            const response = await this.client.get(`/v1/candidate/assignments/${assignmentId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async startTest(assignmentId: string) {
        try {
            const response = await this.client.post(`/v1/candidate/assignments/${assignmentId}/start`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async saveDraft(assignmentId: string, data: { question_id: string; code: string; language: string }) {
        try {
            const response = await this.client.patch(`/v1/candidate/assignments/${assignmentId}/draft`, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async finishTest(assignmentId: string) {
        try {
            const response = await this.client.post(`/v1/candidate/assignments/${assignmentId}/finish`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async submitTest(assignmentId: string, data: { question_id: string; code: string; language: string }) {
        try {
            const response = await this.client.post(`/v1/candidate/assignments/${assignmentId}/submit`, data);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async logProctorEvent(assignmentId: string, eventType: string, payload: any = {}) {
        try {
            const response = await this.client.post("/v1/proctoring/log", {
                event_type: eventType,
                payload: payload
            }, {
                params: { assignment_id: assignmentId }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async uploadSnapshot(assignmentId: string, file: File) {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await this.client.post(`/v1/proctoring/upload-snapshot`, formData, {
                params: { assignment_id: assignmentId },
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }


}

export const apiClient = new ApiClient();
