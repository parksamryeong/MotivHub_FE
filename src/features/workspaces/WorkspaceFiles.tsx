import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmFileUpload,
  deleteWorkspaceFile,
  fetchWorkspaceFiles,
  getFileDownloadUrl,
  presignFileUpload,
  updateFileCategory,
  uploadFileToS3,
} from '../../api/workspaceFile'
import { getErrorMessage } from '../../api/errors'
import { PencilIcon, TrashIcon } from '../../components/icons'
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
  const [isAddingFile, setIsAddingFile] = useState(false)
  const [categoryDraft, setCategoryDraft] = useState('')
  const [editingCategoryFor, setEditingCategoryFor] = useState<number | null>(null)
  const [categoryEditDraft, setCategoryEditDraft] = useState('')

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

  const updateCategoryMutation = useMutation({
    mutationFn: ({ fileId, category }: { fileId: number; category: string | null }) =>
      updateFileCategory(workspaceId, fileId, category),
    onSuccess: () => {
      setError(null)
      setEditingCategoryFor(null)
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
      setIsAddingFile(false)
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

  function startEditCategory(file: WorkspaceFileResponse) {
    setError(null)
    setCategoryEditDraft(file.category ?? '')
    setEditingCategoryFor(file.id)
  }

  function handleCategoryEditSubmit(e: FormEvent, fileId: number) {
    e.preventDefault()
    if (updateCategoryMutation.isPending) return
    updateCategoryMutation.mutate({ fileId, category: categoryEditDraft.trim() || null })
  }

  function canDelete(file: WorkspaceFileResponse): boolean {
    return isWorkspaceOwner || file.uploadedBy.id === currentUserId
  }

  const groups = groupFilesByCategory(data ?? [])

  return (
    <div className="flex flex-col gap-2 border-t border-card-border pt-3">
      <span className="text-xs font-medium text-text-secondary">파일함</span>

      <datalist id="workspace-file-categories">
        {existingCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {isAddingFile ? (
        <div className="flex flex-col gap-1">
          <input
            value={categoryDraft}
            onChange={(e) => setCategoryDraft(e.target.value)}
            list="workspace-file-categories"
            placeholder="카테고리 입력 (선택, 예: DB)"
            maxLength={50}
            disabled={isUploading}
            autoFocus
            className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-xs text-text-primary"
          />
          <div className="flex items-center gap-2">
            <label className="w-fit cursor-pointer rounded-lg border border-action px-2 py-1 text-xs font-medium text-action hover:bg-action/10">
              {isUploading ? '업로드 중...' : '파일 선택'}
              <input
                type="file"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setIsAddingFile(false)
                setCategoryDraft('')
              }}
              disabled={isUploading}
              className="text-xs text-text-secondary disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingFile(true)}
          className="w-fit rounded-lg border border-action px-2 py-1 text-xs font-medium text-action hover:bg-action/10"
        >
          + 파일 추가
        </button>
      )}

      {isLoading && <p className="text-xs text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-xs text-red-600">파일 목록을 불러오지 못했습니다.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
        {groups.map(({ category, files }) => (
          <div key={category ?? '__uncategorized__'}>
            <span className="mb-1 inline-block rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-semibold text-accent-subtle-text">
              {category ?? '미분류'}
            </span>
            <ul className="flex flex-col gap-1">
              {files.map((file) => (
                <li key={file.id} className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDownload(file.id)}
                      className="flex-1 truncate text-left text-text-primary hover:underline"
                      title={`${file.fileName}\n${file.uploadedBy.nickname} · ${new Date(file.createdAt).toLocaleString()}`}
                    >
                      {file.fileName}
                    </button>
                    <span className="text-text-secondary">{formatFileSize(file.fileSize)}</span>
                    <button
                      type="button"
                      onClick={() => startEditCategory(file)}
                      aria-label="카테고리 수정"
                      title="카테고리 수정"
                      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-content-bg hover:text-text-primary"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    {canDelete(file) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(file.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="삭제"
                        title="삭제"
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {editingCategoryFor === file.id && (
                    <form
                      onSubmit={(e) => handleCategoryEditSubmit(e, file.id)}
                      className="flex flex-col gap-1"
                    >
                      <input
                        value={categoryEditDraft}
                        onChange={(e) => setCategoryEditDraft(e.target.value)}
                        list="workspace-file-categories"
                        placeholder="비워두면 미분류"
                        maxLength={50}
                        autoFocus
                        className="w-full min-w-0 rounded-lg border border-card-border bg-card-bg px-2 py-1 text-xs text-text-primary"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={updateCategoryMutation.isPending}
                          className="flex-shrink-0 whitespace-nowrap rounded-lg bg-action px-2 py-1 text-xs text-action-text disabled:opacity-50"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryFor(null)}
                          className="flex-shrink-0 whitespace-nowrap text-xs text-text-primary"
                        >
                          취소
                        </button>
                      </div>
                    </form>
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
