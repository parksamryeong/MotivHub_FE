import { apiClient } from './client'
import type {
  ChecklistItemResponse,
  TaskActivityResponse,
  TaskDetailResponse,
  TaskResponse,
  TaskStatus,
} from './types'

export interface CreateTaskRequest {
  name: string
  description?: string
  startDate: string
  dueDate: string
  assigneeIds?: number[]
}

export function createTask(workspaceId: number, body: CreateTaskRequest): Promise<TaskResponse> {
  return apiClient
    .post<TaskResponse>(`/api/workspaces/${workspaceId}/tasks`, body)
    .then((res) => res.data)
}

export function fetchTasks(workspaceId: number): Promise<TaskResponse[]> {
  return apiClient
    .get<TaskResponse[]>(`/api/workspaces/${workspaceId}/tasks`)
    .then((res) => res.data)
}

export function fetchTask(taskId: number): Promise<TaskDetailResponse> {
  return apiClient.get<TaskDetailResponse>(`/api/tasks/${taskId}`).then((res) => res.data)
}

export function updateTask(
  taskId: number,
  body: { name: string; description?: string }
): Promise<TaskResponse> {
  return apiClient.patch<TaskResponse>(`/api/tasks/${taskId}`, body).then((res) => res.data)
}

export function updateTaskPeriod(
  taskId: number,
  body: { startDate: string; dueDate: string }
): Promise<TaskResponse> {
  return apiClient
    .patch<TaskResponse>(`/api/tasks/${taskId}/period`, body)
    .then((res) => res.data)
}

export function updateTaskStatus(
  taskId: number,
  status: Exclude<TaskStatus, 'EXPIRED'>
): Promise<TaskResponse> {
  return apiClient
    .patch<TaskResponse>(`/api/tasks/${taskId}/status`, { status })
    .then((res) => res.data)
}

export function deleteTask(taskId: number): Promise<void> {
  return apiClient.delete(`/api/tasks/${taskId}`).then(() => undefined)
}

export function addAssignee(taskId: number, userId: number): Promise<void> {
  return apiClient.post(`/api/tasks/${taskId}/assignees`, { userId }).then(() => undefined)
}

export function removeAssignee(taskId: number, targetUserId: number): Promise<void> {
  return apiClient
    .delete(`/api/tasks/${taskId}/assignees/${targetUserId}`)
    .then(() => undefined)
}

export function createChecklistItem(
  taskId: number,
  content: string
): Promise<ChecklistItemResponse> {
  return apiClient
    .post<ChecklistItemResponse>(`/api/tasks/${taskId}/checklist-items`, { content })
    .then((res) => res.data)
}

export function updateChecklistItem(
  taskId: number,
  itemId: number,
  body: { content?: string; isDone?: boolean }
): Promise<ChecklistItemResponse> {
  return apiClient
    .patch<ChecklistItemResponse>(`/api/tasks/${taskId}/checklist-items/${itemId}`, body)
    .then((res) => res.data)
}

export function deleteChecklistItem(taskId: number, itemId: number): Promise<void> {
  return apiClient.delete(`/api/tasks/${taskId}/checklist-items/${itemId}`).then(() => undefined)
}

export function fetchTaskActivities(taskId: number): Promise<TaskActivityResponse[]> {
  return apiClient
    .get<TaskActivityResponse[]>(`/api/tasks/${taskId}/activities`)
    .then((res) => res.data)
}
