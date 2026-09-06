import { useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWorkspace, fetchWorkspaces } from '../../api/workspace'
import { getErrorMessage } from '../../api/errors'

export function WorkspaceListPage(): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      setName('')
      setCreateError(null)
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-text-primary">워크스페이스</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="워크스페이스 이름"
          maxLength={50}
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
      {createError && <p className="text-sm text-red-600">{createError}</p>}

      {isLoading && <p className="text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-red-600">워크스페이스 목록을 불러오지 못했습니다.</p>}
      {data && data.length === 0 && (
        <p className="text-text-secondary">아직 속한 워크스페이스가 없습니다.</p>
      )}

      <ul className="flex flex-col gap-2">
        {data?.map((workspace) => (
          <li key={workspace.id}>
            <button
              type="button"
              onClick={() => navigate(`/workspaces/${workspace.id}`)}
              className="flex w-full items-center justify-between rounded-xl bg-card-bg px-4 py-3 text-left shadow-card hover:shadow-card-hover"
            >
              <span className="text-text-primary">{workspace.name}</span>
              <span className="rounded-md bg-accent-subtle px-2 py-1 text-xs font-medium text-accent-subtle-text">
                {workspace.myRole === 'OWNER' ? '오너' : '멤버'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
