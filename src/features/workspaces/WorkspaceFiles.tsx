import { useState, type ChangeEvent, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmFileUpload,
  deleteWorkspaceFile,
  fetchWorkspaceFiles,
  getFileDownloadUrl,
  presignFileUpload,
  uploadFileToS3,
} from '../../api/workspaceFile'
import { getErrorMessage } from '../../api/errors'
import type { WorkspaceFileResponse } from '../../api/types'

const MAX_FILE_SIZE = 52_428_800

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function WorkspaceFiles({
  workspaceId,
  currentUserId,
  isWorkspaceOwner,
}: {
  workspaceId: number
  currentUserId: number | undefined
  isWorkspaceOwner: boolean
}): ReactElement {
  const queryClient = useQueryClient()
  const filesQueryKey = ['workspaces', workspaceId, 'files'] as const
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: filesQueryKey,
    queryFn: () => fetchWorkspaceFiles(workspaceId),
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => deleteWorkspaceFile(workspaceId, fileId),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: filesQueryKey })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setError('50MB를 초과하는 파일은 업로드할 수 없습니다.')
      return
    }

    setError(null)
    setIsUploading(true)
    try {
      const { uploadUrl, fileKey } = await presignFileUpload(workspaceId, {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      })
      await uploadFileToS3(uploadUrl, file)
      await confirmFileUpload(workspaceId, {
        fileKey,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
      })
      queryClient.invalidateQueries({ queryKey: filesQueryKey })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDownload(fileId: number) {
    try {
      const { downloadUrl } = await getFileDownloadUrl(workspaceId, fileId)
      window.open(downloadUrl, '_blank', 'noopener')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function handleDelete(fileId: number) {
    if (deleteMutation.isPending) return
    if (confirm('이 파일을 삭제하시겠습니까?')) {
      deleteMutation.mutate(fileId)
    }
  }

  function canDelete(file: WorkspaceFileResponse): boolean {
    return isWorkspaceOwner || file.uploadedBy.id === currentUserId
  }

  return (
    <div className="flex flex-col gap-2 border-t border-card-border pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">파일함</span>
        <label className="cursor-pointer text-xs text-accent-subtle-text">
          {isUploading ? '업로드 중...' : '+ 파일 추가'}
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {isLoading && <p className="text-xs text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-xs text-red-600">파일 목록을 불러오지 못했습니다.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {data?.map((file) => (
          <li key={file.id} className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleDownload(file.id)}
              className="flex-1 truncate text-left text-text-primary hover:underline"
              title={`${file.fileName}\n${file.uploadedBy.nickname} · ${new Date(file.createdAt).toLocaleString()}`}
            >
              {file.fileName}
            </button>
            <span className="text-text-secondary">{formatFileSize(file.fileSize)}</span>
            {canDelete(file) && (
              <button
                type="button"
                onClick={() => handleDelete(file.id)}
                disabled={deleteMutation.isPending}
                className="text-red-600"
              >
                삭제
              </button>
            )}
          </li>
        ))}
        {data && data.length === 0 && (
          <li className="text-xs text-text-secondary">업로드된 파일이 없습니다.</li>
        )}
      </ul>
    </div>
  )
}
