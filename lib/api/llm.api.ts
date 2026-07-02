// LLM/AI API methods
import { baseClient } from "./client";

class LLMApi {
    async chat(message: string): Promise<{ response: string }> {
        const response = await baseClient.getAxiosInstance().post("/v1/llm/generate", {
            prompt: message,
            system_prompt: `You are the HireXAI Platform Assistant. Help users navigate and use HireXAI's AI-powered features.

STRICT FORMATTING RULES:
1. NO Markdown (no bold, no italic, no headers, no bullets).
2. NO Emojis.
3. NO JSON (unless explicitly asked).
4. Use simple plain text with clear spacing.
5. Use "Step 1:", "Step 2:" for instructions.
6. Use simple hyphens "-" for lists.`
        });
        return { response: response.data.text };
    }

    async buildResume(payload: {
        name: string;
        email: string;
        education: string;
        experience: string;
        skills: string;
    }): Promise<{ resume_text: string }> {
        const prompt = `Create a professional, well-formatted resume.\n\nName: ${payload.name}\nEmail: ${payload.email}\nEducation: ${payload.education || 'Not provided'}\nExperience: ${payload.experience || 'Not provided'}\nSkills: ${payload.skills}\n\nFormat this as a complete resume with clear sections.`;

        const response = await baseClient.getAxiosInstance().post("/v1/llm/generate", {
            prompt: prompt,
            system_prompt: "You are an expert resume writer. Create professional, ATS-friendly resumes."
        });
        return { resume_text: response.data.text };
    }

    async saveResume(data: unknown): Promise<unknown> {
        const response = await baseClient.getAxiosInstance().post("/v1/resume_builder/save", data);
        return response.data;
    }

    async fetchResume(): Promise<unknown> {
        const response = await baseClient.getAxiosInstance().get("/v1/resume_builder/fetch");
        return response.data;
    }

    async polishText(text: string, sectionType: string): Promise<{ text: string }> {
        const response = await baseClient.getAxiosInstance().post("/v1/resume_builder/ai-polish", {
            text,
            section_type: sectionType
        });
        return response.data;
    }

    async generateResumeSummary(resumeData: unknown): Promise<{ summary: string }> {
        const response = await baseClient.getAxiosInstance().post("/v1/resume_builder/ai-generate-summary", resumeData);
        return response.data;
    }
}

export const llmApi = new LLMApi();
