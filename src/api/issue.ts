import { apiClient } from './client'
import type { IssueCommentResponse, IssueResponse } from './types'

export function createIssue(body: {
  workspaceId: number
  title: string
  problemDescription: string
  solution?: string
}): Promise<IssueResponse> {
  return apiClient.post<IssueResponse>('/api/issues', body).then((res) => res.data)
}

export function fetchIssues(): Promise<IssueResponse[]> {
  return apiClient.get<IssueResponse[]>('/api/issues').then((res) => res.data)
}

export function fetchIssue(issueId: number): Promise<IssueResponse> {
  return apiClient.get<IssueResponse>(`/api/issues/${issueId}`).then((res) => res.data)
}

export function updateIssue(
  issueId: number,
  body: { title?: string; problemDescription?: string; solution?: string }
): Promise<IssueResponse> {
  return apiClient.patch<IssueResponse>(`/api/issues/${issueId}`, body).then((res) => res.data)
}

export function deleteIssue(issueId: number): Promise<void> {
  return apiClient.delete(`/api/issues/${issueId}`).then(() => undefined)
}

export function createIssueComment(
  issueId: number,
  content: string
): Promise<IssueCommentResponse> {
  return apiClient
    .post<IssueCommentResponse>(`/api/issues/${issueId}/comments`, { content })
    .then((res) => res.data)
}

export function fetchIssueComments(issueId: number): Promise<IssueCommentResponse[]> {
  return apiClient
    .get<IssueCommentResponse[]>(`/api/issues/${issueId}/comments`)
    .then((res) => res.data)
}
