import { apiClient } from './client'
import type { WorkspaceResponse, WorkspaceDetailResponse } from './types'

export function createWorkspace(name: string): Promise<WorkspaceResponse> {
  return apiClient.post<WorkspaceResponse>('/api/workspaces', { name }).then((res) => res.data)
}

export function fetchWorkspaces(): Promise<WorkspaceResponse[]> {
  return apiClient.get<WorkspaceResponse[]>('/api/workspaces').then((res) => res.data)
}

export function fetchWorkspaceDetail(id: number): Promise<WorkspaceDetailResponse> {
  return apiClient
    .get<WorkspaceDetailResponse>(`/api/workspaces/${id}`)
    .then((res) => res.data)
}

export function renameWorkspace(id: number, name: string): Promise<WorkspaceResponse> {
  return apiClient
    .patch<WorkspaceResponse>(`/api/workspaces/${id}`, { name })
    .then((res) => res.data)
}

export function deleteWorkspace(id: number): Promise<void> {
  return apiClient.delete(`/api/workspaces/${id}`).then(() => undefined)
}

export function leaveWorkspace(id: number): Promise<void> {
  return apiClient.post(`/api/workspaces/${id}/leave`).then(() => undefined)
}

export function transferOwnership(id: number, newOwnerUserId: number): Promise<void> {
  return apiClient
    .post(`/api/workspaces/${id}/transfer-ownership`, { newOwnerUserId })
    .then(() => undefined)
}

export function kickMember(id: number, targetUserId: number): Promise<void> {
  return apiClient
    .delete(`/api/workspaces/${id}/members/${targetUserId}`)
    .then(() => undefined)
}
