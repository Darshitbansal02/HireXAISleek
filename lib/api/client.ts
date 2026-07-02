// Base API client with axios configuration and interceptors
import axios, { AxiosInstance } from "axios";
import type { ApiError } from "@/types";

class BaseApiClient {
    protected client: AxiosInstance;
    protected baseURL: string;
    private inMemoryToken: string | null = null;

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

    setToken(token: string) {
        this.inMemoryToken = token;
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem("auth_token", token);
            } catch (e) {
                console.error("Failed to save token", e);
            }
        }
    }

    getToken(): string | null {
        if (this.inMemoryToken) {
            return this.inMemoryToken;
        }
        if (typeof window !== "undefined") {
            try {
                return localStorage.getItem("auth_token");
            } catch (e) { }
        }
        return null;
    }

    clearAuth() {
        this.inMemoryToken = null;
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

    getBaseURL(): string {
        return this.baseURL;
    }

    getAxiosInstance(): AxiosInstance {
        return this.client;
    }

    protected handleError(error: unknown): ApiError {
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
        return { status: 500, message: (error as Error).message || "An unexpected error occurred" };
    }
}

// Singleton instance
export const baseClient = new BaseApiClient();
export type { BaseApiClient };
