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

// solution을 빈 문자열로 보내면 백엔드가 명시적으로 미해결 상태로 되돌린다(null 저장) — 반면 createIssue는
// 값이 없으면 필드 자체를 아예 생략한다. 이건 의도된 두 엔드포인트의 계약 차이이지 실수가 아니다.
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
