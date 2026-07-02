// Authentication API methods
import { baseClient } from "./client";
import type { AuthUser, LoginPayload, RegisterPayload, AuthResponse } from "@/types";

class AuthApi {
    async register(payload: RegisterPayload): Promise<AuthUser> {
        try {
            const response = await baseClient.getAxiosInstance().post("/v1/auth/register", payload);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async login(payload: LoginPayload): Promise<AuthResponse> {
        try {
            const formData = new FormData();
            formData.append("username", payload.email);
            formData.append("password", payload.password);

            const response = await baseClient.getAxiosInstance().post("/v1/auth/login", formData, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            const { access_token } = response.data;
            baseClient.setToken(access_token);

            const userResponse = await baseClient.getAxiosInstance().get("/v1/auth/me");
            const user = userResponse.data;

            // Clear any old user data from localStorage
            if (typeof window !== "undefined") {
                try {
                    const oldUser = localStorage.getItem("user");
                    if (oldUser) {
                        localStorage.removeItem("user");
                    }
                } catch (e) { }
            }
            return { access_token, user };
        } catch (error) {
            throw error;
        }
    }

    async getCurrentUser(): Promise<AuthUser> {
        try {
            const response = await baseClient.getAxiosInstance().get("/v1/auth/me");
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    logout(): void {
        baseClient.clearAuth();
    }

    isAuthenticated(): boolean {
        return baseClient.isAuthenticated();
    }

    setToken(token: string): void {
        baseClient.setToken(token);
    }

    getToken(): string | null {
        return baseClient.getToken();
    }
}

export const authApi = new AuthApi();
