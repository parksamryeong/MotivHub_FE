import { apiClient } from './client'
import type { WorkspaceResponse, WorkspaceInviteResponse } from './types'

export function createInvite(
  workspaceId: number,
  email: string | null
): Promise<WorkspaceInviteResponse> {
  return apiClient
    .post<WorkspaceInviteResponse>(`/api/workspaces/${workspaceId}/invites`, { email })
    .then((res) => res.data)
}

export function fetchInvites(workspaceId: number): Promise<WorkspaceInviteResponse[]> {
  return apiClient
    .get<WorkspaceInviteResponse[]>(`/api/workspaces/${workspaceId}/invites`)
    .then((res) => res.data)
}

export function revokeInvite(workspaceId: number, inviteId: number): Promise<void> {
  return apiClient
    .delete(`/api/workspaces/${workspaceId}/invites/${inviteId}`)
    .then(() => undefined)
}

export function acceptInvite(token: string): Promise<WorkspaceResponse> {
  return apiClient
    .post<WorkspaceResponse>(`/api/invites/${token}/accept`)
    .then((res) => res.data)
}
