// Notifications API methods
import { baseClient } from "./client";
import type { Notification, NotificationCount } from "@/types";

class NotificationsApi {
    async getNotifications(): Promise<Notification[]> {
        const response = await baseClient.getAxiosInstance().get("/v1/notifications/");
        return response.data;
    }

    async getUnreadNotificationCount(): Promise<NotificationCount> {
        const response = await baseClient.getAxiosInstance().get("/v1/notifications/unread-count");
        return response.data;
    }

    async markNotificationRead(id: number): Promise<void> {
        await baseClient.getAxiosInstance().put(`/v1/notifications/${id}/read`);
    }

    async markAllNotificationsRead(): Promise<void> {
        await baseClient.getAxiosInstance().put("/v1/notifications/mark-all-read");
    }
}

export const notificationsApi = new NotificationsApi();
