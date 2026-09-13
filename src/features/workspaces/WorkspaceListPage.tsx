import { useMemo, useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWorkspace, fetchWorkspaces } from '../../api/workspace'
import { getErrorMessage } from '../../api/errors'
import { getRecentWorkspaceIds } from './recentWorkspaces'
import type { WorkspaceResponse } from '../../api/types'

type RoleFilter = 'all' | 'owner' | 'member'

function WorkspaceCard({
  workspace,
  onClick,
}: {
  workspace: WorkspaceResponse
  onClick: () => void
}): ReactElement {
  const { waiting, inProgress, done, expired } = workspace.taskCounts
  const total = waiting + inProgress + done + expired
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2 rounded-xl bg-card-bg px-4 py-3 text-left shadow-card hover:shadow-card-hover"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-text-primary">{workspace.name}</span>
        <span className="rounded-md bg-accent-subtle px-2 py-1 text-xs font-medium text-accent-subtle-text">
          {workspace.myRole === 'OWNER' ? '오너' : '멤버'}
        </span>
      </div>
      <span className="text-xs text-text-secondary">👥 {workspace.memberCount}명</span>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>
          완료 {done} / 전체 {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-content-bg">
        <div
          className="h-1.5 rounded-full bg-accent transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </button>
  )
}

export function WorkspaceListPage(): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      setName('')
      setCreateError(null)
      setIsCreateFormOpen(false)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => {
      setCreateError(getErrorMessage(error))
    },
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || createMutation.isPending) return
    createMutation.mutate(name.trim())
  }

  function goToWorkspace(workspaceId: number) {
    navigate(`/workspaces/${workspaceId}`)
  }

  const summary = useMemo(() => {
    if (!data) return { total: 0, waiting: 0, inProgress: 0, done: 0 }
    return data.reduce(
      (acc, workspace) => ({
        total: acc.total + 1,
        waiting: acc.waiting + workspace.taskCounts.waiting,
        inProgress: acc.inProgress + workspace.taskCounts.inProgress + workspace.taskCounts.expired,
        done: acc.done + workspace.taskCounts.done,
      }),
      { total: 0, waiting: 0, inProgress: 0, done: 0 }
    )
  }, [data])

  const recentWorkspaces = useMemo(() => {
    if (!data) return []
    const recentIds = getRecentWorkspaceIds()
    return recentIds
      .map((id) => data.find((workspace) => workspace.id === id))
      .filter((workspace): workspace is WorkspaceResponse => workspace !== undefined)
  }, [data])

  const filteredWorkspaces = useMemo(() => {
    if (!data) return []
    if (roleFilter === 'all') return data
    if (roleFilter === 'owner') return data.filter((workspace) => workspace.myRole === 'OWNER')
    return data.filter((workspace) => workspace.myRole === 'MEMBER')
  }, [data, roleFilter])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <h1 className="text-2xl font-bold text-text-primary">워크스페이스</h1>

      {isLoading && <p className="text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-red-600">워크스페이스 목록을 불러오지 못했습니다.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
              <p className="text-2xl font-bold text-text-primary">{summary.total}</p>
              <p className="text-xs text-text-secondary">워크스페이스</p>
            </div>
            <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
              <p className="text-2xl font-bold text-text-primary">{summary.waiting}</p>
              <p className="text-xs text-text-secondary">예정</p>
            </div>
            <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
              <p className="text-2xl font-bold text-text-primary">{summary.inProgress}</p>
              <p className="text-xs text-text-secondary">진행 중</p>
            </div>
            <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
              <p className="text-2xl font-bold text-text-primary">{summary.done}</p>
              <p className="text-xs text-text-secondary">완료</p>
            </div>
          </div>

          {recentWorkspaces.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary">최근 접근한 워크스페이스</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {recentWorkspaces.map((workspace) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onClick={() => goToWorkspace(workspace.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">내 워크스페이스</h2>
              <button
                type="button"
                onClick={() => setIsCreateFormOpen((prev) => !prev)}
                className="rounded-lg bg-action px-3 py-2 text-sm text-action-text"
              >
                + 새 워크스페이스
              </button>
            </div>

            {isCreateFormOpen && (
              <form onSubmit={handleCreate} className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="워크스페이스 이름"
                  maxLength={50}
                  autoFocus
                  className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
                />
                <button
                  type="submit"
                  disabled={!name.trim() || createMutation.isPending}
                  className="rounded-lg bg-action px-4 py-2 text-action-text disabled:opacity-50"
                >
                  {createMutation.isPending ? '생성 중...' : '생성'}
                </button>
              </form>
            )}
            {createError && <p className="text-sm text-red-600">{createError}</p>}

            <div className="flex gap-2">
              {(
                [
                  { key: 'all', label: '전체' },
                  { key: 'owner', label: '관리자' },
                  { key: 'member', label: '멤버' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setRoleFilter(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    roleFilter === tab.key
                      ? 'bg-accent text-white'
                      : 'bg-card-bg text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredWorkspaces.length === 0 && (
              <p className="text-text-secondary">해당하는 워크스페이스가 없습니다.</p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => goToWorkspace(workspace.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
