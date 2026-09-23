import { apiClient } from './client'
import type { NotificationPageResponse, NotificationSettingResponse, NotificationType } from './types'

export function fetchNotifications(
  page: number,
  size: number
): Promise<NotificationPageResponse> {
  return apiClient
    .get<NotificationPageResponse>('/api/notifications', { params: { page, size } })
    .then((res) => res.data)
}

export function fetchUnreadCount(): Promise<number> {
  return apiClient
    .get<{ count: number }>('/api/notifications/unread-count')
    .then((res) => res.data.count)
}

export function markNotificationRead(id: number): Promise<void> {
  return apiClient.patch(`/api/notifications/${id}/read`).then(() => undefined)
}

export function markAllNotificationsRead(): Promise<void> {
  return apiClient.patch('/api/notifications/read-all').then(() => undefined)
}

export function fetchNotificationSettings(): Promise<NotificationSettingResponse[]> {
  return apiClient
    .get<NotificationSettingResponse[]>('/api/notifications/settings')
    .then((res) => res.data)
}

export function updateNotificationSetting(
  type: NotificationType,
  enabled: boolean
): Promise<void> {
  return apiClient
    .patch(`/api/notifications/settings/${type}`, { enabled })
    .then(() => undefined)
}
