// Core API types
export interface ApiError {
    status: number;
    message: string;
    detail?: unknown;
}

export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    skip: number;
    limit: number;
}
