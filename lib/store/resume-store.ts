import { create } from "zustand";
import { apiClient } from "@/lib/api-client";

// --- Types ---

export interface PersonalInfo {
    full_name: string;
    title?: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    summary?: string;
}

export interface ExperienceItem {
    id: string;
    title: string;
    company: string;
    location?: string;
    start_date: string;
    end_date?: string;
    current: boolean;
    description: string;
}

export interface EducationItem {
    id: string;
    degree: string;
    school: string;
    location?: string;
    year: string;
    field: string;
}

export interface ProjectItem {
    id: string;
    name: string;
    description: string;
    link?: string;
    technologies: string[];
}

export interface SkillItem {
    category: string;
    skills: string[];
}

export interface ResumeStructure {
    personal_info: PersonalInfo;
    experience: ExperienceItem[];
    education: EducationItem[];
    projects: ProjectItem[];
    skills: SkillItem[];
    custom_sections: any[];
}

interface ResumeState {
    resume: ResumeStructure;
    isLoading: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    isDirty: boolean;

    fetchResume: () => Promise<void>;
    saveResume: (isDraft?: boolean) => Promise<void>;

    updatePersonalInfo: (info: Partial<PersonalInfo>) => void;

    addExperience: (item: ExperienceItem) => void;
    updateExperience: (id: string, item: Partial<ExperienceItem>) => void;
    removeExperience: (id: string) => void;

    addEducation: (item: EducationItem) => void;
    updateEducation: (id: string, item: Partial<EducationItem>) => void;
    removeEducation: (id: string) => void;

    addProject: (item: ProjectItem) => void;
    updateProject: (id: string, item: Partial<ProjectItem>) => void;
    removeProject: (id: string) => void;

    updateSkills: (skills: SkillItem[]) => void;
}

// Initial Empty State
const initialResumeState: ResumeStructure = {
    personal_info: {
        full_name: "",
        email: "",
        title: "",
        summary: ""
    },
    experience: [],
    education: [],
    projects: [],
    skills: [],
    custom_sections: []
};

export const useResumeStore = create<ResumeState>((set, get) => ({
    resume: initialResumeState,
    isLoading: false,
    isSaving: false,
    lastSaved: null,
    isDirty: false,

    // Fetch resume
    fetchResume: async () => {
        set({ isLoading: true });
        try {
            const data = await apiClient.fetchResume();
            if (data && data.structured_content) {
                set({
                    resume: data.structured_content,
                    isLoading: false,
                    isDirty: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error("❌ Failed to fetch resume:", error);
            set({ isLoading: false });
        }
    },

    // Save resume
    saveResume: async (isDraft = true) => {
        const { resume } = get();
        set({ isSaving: true });

        try {
            await apiClient.saveResume({
                title: resume.personal_info.full_name
                    ? `${resume.personal_info.full_name}'s Resume`
                    : "My Resume",
                structured_content: resume,
                is_draft: isDraft,
            });

            set({
                isSaving: false,
                lastSaved: new Date(),
                isDirty: false,
            });
        } catch (error: any) {
            console.error("❌ Failed to save resume:", {
                raw: error,
                message: error?.message,
                status: error?.status,
                detail: error?.detail,
            });

            set({ isSaving: false });
        }
    },

    // Updaters
    updatePersonalInfo: (info) =>
        set((state) => ({
            resume: {
                ...state.resume,
                personal_info: { ...state.resume.personal_info, ...info },
            },
            isDirty: true,
        })),

    addExperience: (item) =>
        set((state) => ({
            resume: { ...state.resume, experience: [...state.resume.experience, item] },
            isDirty: true,
        })),

    updateExperience: (id, item) =>
        set((state) => ({
            resume: {
                ...state.resume,
                experience: state.resume.experience.map((exp) =>
                    exp.id === id ? { ...exp, ...item } : exp
                ),
            },
            isDirty: true,
        })),

    removeExperience: (id) =>
        set((state) => ({
            resume: {
                ...state.resume,
                experience: state.resume.experience.filter((exp) => exp.id !== id),
            },
            isDirty: true,
        })),

    addEducation: (item) =>
        set((state) => ({
            resume: { ...state.resume, education: [...state.resume.education, item] },
            isDirty: true,
        })),

    updateEducation: (id, item) =>
        set((state) => ({
            resume: {
                ...state.resume,
                education: state.resume.education.map((edu) =>
                    edu.id === id ? { ...edu, ...item } : edu
                ),
            },
            isDirty: true,
        })),

    removeEducation: (id) =>
        set((state) => ({
            resume: {
                ...state.resume,
                education: state.resume.education.filter((edu) => edu.id !== id),
            },
            isDirty: true,
        })),

    addProject: (item) =>
        set((state) => ({
            resume: { ...state.resume, projects: [...state.resume.projects, item] },
            isDirty: true,
        })),

    updateProject: (id, item) =>
        set((state) => ({
            resume: {
                ...state.resume,
                projects: state.resume.projects.map((proj) =>
                    proj.id === id ? { ...proj, ...item } : proj
                ),
            },
            isDirty: true,
        })),

    removeProject: (id) =>
        set((state) => ({
            resume: {
                ...state.resume,
                projects: state.resume.projects.filter((proj) => proj.id !== id),
            },
            isDirty: true,
        })),

    updateSkills: (skills) =>
        set((state) => ({
            resume: { ...state.resume, skills },
            isDirty: true,
        })),
}));
