import { useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createIssue, fetchIssue, updateIssue } from '../../api/issue'
import { fetchWorkspaces } from '../../api/workspace'
import { getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'

interface PrefillState {
  workspaceId?: number
  problemDescription?: string
}

export function IssueFormPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const isEditMode = id !== undefined
  const issueId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const prefill = (location.state ?? {}) as PrefillState

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
    enabled: !isEditMode,
  })

  const issueQuery = useQuery({
    queryKey: ['issues', issueId],
    queryFn: () => fetchIssue(issueId),
    enabled: isEditMode,
  })

  const [title, setTitle] = useState('')
  const [workspaceId, setWorkspaceId] = useState<string>(
    prefill.workspaceId ? String(prefill.workspaceId) : ''
  )
  const [problemDescription, setProblemDescription] = useState(prefill.problemDescription ?? '')
  const [solution, setSolution] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isEditMode && issueQuery.data && !initialized) {
    setTitle(issueQuery.data.title)
    setProblemDescription(issueQuery.data.problemDescription)
    setSolution(issueQuery.data.solution ?? '')
    setInitialized(true)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createIssue({
        workspaceId: Number(workspaceId),
        title: title.trim(),
        problemDescription: problemDescription.trim(),
        solution: solution.trim() || undefined,
      }),
    onSuccess: (issue) => {
      navigate(`/issues/${issue.id}`, { replace: true })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updateIssue(issueId, {
        title: title.trim(),
        problemDescription: problemDescription.trim(),
        solution: solution.trim(),
      }),
    onSuccess: (issue) => {
      navigate(`/issues/${issue.id}`, { replace: true })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !problemDescription.trim()) return
    if (isEditMode) {
      updateMutation.mutate()
    } else {
      if (!workspaceId) return
      createMutation.mutate()
    }
  }

  if (isEditMode && issueQuery.isLoading) {
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (isEditMode && (issueQuery.isError || !issueQuery.data)) {
    return <p className="text-red-600">이슈를 불러오지 못했습니다.</p>
  }
  if (isEditMode && issueQuery.data && issueQuery.data.author.id !== currentUserId) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-red-600">작성자 본인만 수정할 수 있습니다.</p>
        <Link to={`/issues/${issueId}`} className="text-sm text-accent-subtle-text">
          이슈로 돌아가기
        </Link>
      </div>
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold text-text-primary">
        {isEditMode ? '이슈 수정' : '새 이슈 등록'}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-text-secondary">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className="mt-1 w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
          />
        </div>

        {isEditMode ? (
          <div>
            <span className="text-sm text-text-secondary">워크스페이스</span>
            <p className="mt-1 text-sm text-text-primary">{issueQuery.data?.workspaceName}</p>
          </div>
        ) : (
          <div>
            <label className="text-sm text-text-secondary">워크스페이스</label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
            >
              <option value="">선택...</option>
              {workspacesQuery.data?.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm text-text-secondary">문제상황/원인</label>
          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            maxLength={2000}
            rows={5}
            className="mt-1 w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">해결방법 (선택 — 비워두면 미해결 질문으로 등록)</label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            maxLength={2000}
            rows={5}
            className="mt-1 w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={
              !title.trim() ||
              !problemDescription.trim() ||
              (!isEditMode && !workspaceId) ||
              isPending
            }
            className="rounded-lg bg-action px-4 py-2 text-action-text disabled:opacity-50"
          >
            {isEditMode ? '저장' : '등록'}
          </button>
          <Link
            to={isEditMode ? `/issues/${issueId}` : '/issues'}
            className="rounded-lg px-4 py-2 text-text-primary"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
