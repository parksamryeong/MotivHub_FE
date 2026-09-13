import { apiClient } from './client'
import type { TaskNoteResponse } from './types'

export function fetchTaskNote(taskId: number): Promise<TaskNoteResponse> {
  return apiClient.get<TaskNoteResponse>(`/api/tasks/${taskId}/note`).then((res) => res.data)
}
