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

function groupFilesByCategory(
  files: WorkspaceFileResponse[]
): { category: string | null; files: WorkspaceFileResponse[] }[] {
  const groups = new Map<string | null, WorkspaceFileResponse[]>()
  for (const file of files) {
    const key = file.category
    const existing = groups.get(key)
    if (existing) {
      existing.push(file)
    } else {
      groups.set(key, [file])
    }
  }
  const entries = Array.from(groups.entries())
  // 미분류(null)만 항상 맨 뒤로 보내고, 나머지 카테고리는 Map의 삽입 순서(= 최초 등장 순서)를 그대로 유지한다
  // (Array.sort는 ES2019+ 명세상 stable sort가 보장되므로 비교값 0을 반환해도 순서가 섞이지 않는다)
  entries.sort((a, b) => {
    if (a[0] === null) return 1
    if (b[0] === null) return -1
    return 0
  })
  return entries.map(([category, categoryFiles]) => ({ category, files: categoryFiles }))
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
  const [categoryDraft, setCategoryDraft] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: filesQueryKey,
    queryFn: () => fetchWorkspaceFiles(workspaceId),
  })

  const existingCategories = Array.from(
    new Set((data ?? []).map((file) => file.category).filter((c): c is string => Boolean(c)))
  )

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
        category: categoryDraft.trim() || undefined,
      })
      setCategoryDraft('')
      queryClient.invalidateQueries({ queryKey: filesQueryKey })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDownload(fileId: number) {
    setError(null)
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

  const groups = groupFilesByCategory(data ?? [])

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

      <input
        value={categoryDraft}
        onChange={(e) => setCategoryDraft(e.target.value)}
        list="workspace-file-categories"
        placeholder="카테고리 (선택, 예: DB)"
        maxLength={50}
        disabled={isUploading}
        className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-xs text-text-primary"
      />
      <datalist id="workspace-file-categories">
        {existingCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {isLoading && <p className="text-xs text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-xs text-red-600">파일 목록을 불러오지 못했습니다.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
        {groups.map(({ category, files }) => (
          <div key={category ?? '__uncategorized__'}>
            <h4 className="mb-1 text-xs font-semibold text-text-secondary">
              {category ?? '미분류'}
            </h4>
            <ul className="flex flex-col gap-1">
              {files.map((file) => (
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
            </ul>
          </div>
        ))}
        {data && data.length === 0 && (
          <p className="text-xs text-text-secondary">업로드된 파일이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
