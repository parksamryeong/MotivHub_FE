import { apiClient } from './client'

export function fetchTaskYjsState(
  taskId: number,
  field: 'description' | 'note'
): Promise<{ state: string | null }> {
  return apiClient
    .get<{ state: string | null }>(`/api/tasks/${taskId}/${field}/yjs-state`)
    .then((res) => res.data)
}
