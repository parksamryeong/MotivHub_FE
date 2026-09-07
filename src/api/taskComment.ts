import { apiClient } from './client'
import type { TaskCommentResponse } from './types'

export function fetchComments(taskId: number): Promise<TaskCommentResponse[]> {
  return apiClient
    .get<TaskCommentResponse[]>(`/api/tasks/${taskId}/comments`)
    .then((res) => res.data)
}

export function createComment(taskId: number, content: string): Promise<TaskCommentResponse> {
  return apiClient
    .post<TaskCommentResponse>(`/api/tasks/${taskId}/comments`, { content })
    .then((res) => res.data)
}

export function updateComment(
  taskId: number,
  commentId: number,
  content: string
): Promise<TaskCommentResponse> {
  return apiClient
    .patch<TaskCommentResponse>(`/api/tasks/${taskId}/comments/${commentId}`, { content })
    .then((res) => res.data)
}

export function deleteComment(taskId: number, commentId: number): Promise<void> {
  return apiClient.delete(`/api/tasks/${taskId}/comments/${commentId}`).then(() => undefined)
}
