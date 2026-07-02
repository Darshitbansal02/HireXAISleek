// Barrel export for all API modules
// This allows importing from '@/lib/api' or individual modules

export { baseClient } from "./client";
export { authApi } from "./auth.api";
export { jobsApi } from "./jobs.api";
export { candidatesApi } from "./candidates.api";
export { testsApi } from "./tests.api";
export { proctoringApi } from "./proctoring.api";
export { notificationsApi } from "./notifications.api";
export { interviewsApi } from "./interviews.api";
export { llmApi } from "./llm.api";

// Re-export types for convenience
export type { ApiError } from "@/types";
