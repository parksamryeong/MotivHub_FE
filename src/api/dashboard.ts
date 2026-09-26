import { apiClient } from './client'
import type { DashboardStatsResponse } from './types'

export function fetchDashboardStats(workspaceId?: number): Promise<DashboardStatsResponse> {
  return apiClient
    .get<DashboardStatsResponse>('/api/dashboard/stats', {
      params: workspaceId ? { workspaceId } : undefined,
    })
    .then((res) => res.data)
}
