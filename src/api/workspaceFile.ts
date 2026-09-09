import { apiClient } from './client'
import type { FileDownloadResponse, FilePresignResponse, WorkspaceFileResponse } from './types'

export function presignFileUpload(
  workspaceId: number,
  body: { fileName: string; contentType: string; fileSize: number }
): Promise<FilePresignResponse> {
  return apiClient
    .post<FilePresignResponse>(`/api/workspaces/${workspaceId}/files/presign`, body)
    .then((res) => res.data)
}

export function confirmFileUpload(
  workspaceId: number,
  body: { fileKey: string; fileName: string; fileSize: number; contentType: string; category?: string }
): Promise<WorkspaceFileResponse> {
  return apiClient
    .post<WorkspaceFileResponse>(`/api/workspaces/${workspaceId}/files`, body)
    .then((res) => res.data)
}

export function fetchWorkspaceFiles(workspaceId: number): Promise<WorkspaceFileResponse[]> {
  return apiClient
    .get<WorkspaceFileResponse[]>(`/api/workspaces/${workspaceId}/files`)
    .then((res) => res.data)
}

export function getFileDownloadUrl(
  workspaceId: number,
  fileId: number
): Promise<FileDownloadResponse> {
  return apiClient
    .get<FileDownloadResponse>(`/api/workspaces/${workspaceId}/files/${fileId}/download`)
    .then((res) => res.data)
}

export function deleteWorkspaceFile(workspaceId: number, fileId: number): Promise<void> {
  return apiClient.delete(`/api/workspaces/${workspaceId}/files/${fileId}`).then(() => undefined)
}

export function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  return fetch(uploadUrl, { method: 'PUT', body: file }).then((res) => {
    if (!res.ok) {
      throw new Error(`S3 업로드 실패: ${res.status}`)
    }
  })
}
