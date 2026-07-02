// Notification types
export interface Notification {
    id: number;
    user_id: number;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    is_read: boolean;
    created_at: string;
    link?: string;
}

export interface NotificationCount {
    unread_count: number;
}
