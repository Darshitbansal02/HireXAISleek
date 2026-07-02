// Authentication types
export interface AuthUser {
    id: number;
    email: string;
    role: "candidate" | "recruiter" | "admin";
    full_name?: string;
}

export interface LoginPayload {
    email: string;
    password: string;
}

export interface RegisterPayload {
    email: string;
    password: string;
    full_name: string;
    role: "candidate" | "recruiter";
}

export interface AuthResponse {
    access_token: string;
    user: AuthUser;
}
