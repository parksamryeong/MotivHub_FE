import { useEffect, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchMyIssues } from '../../api/issue'
import { fetchWorkspaces } from '../../api/workspace'

type SortOrder = 'newest' | 'oldest'

export function MyIssuesPage(): ReactElement {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null)
  const [sort, setSort] = useState<SortOrder>('newest')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['issues', 'mine', workspaceId, sort, query],
    queryFn: () =>
      fetchMyIssues({
        workspaceId: workspaceId ?? undefined,
        sort,
        q: query || undefined,
      }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">이슈관리</h1>
        <Link
          to="/issues/new"
          className="rounded-lg bg-action px-3 py-2 text-sm text-action-text hover:bg-action/90"
        >
          새 이슈 등록
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={workspaceId ?? ''}
          onChange={(e) => setWorkspaceId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">전체 워크스페이스</option>
          {workspacesQuery.data?.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-card-border p-0.5">
          <button
            type="button"
            onClick={() => setSort('newest')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              sort === 'newest'
                ? 'bg-action text-action-text'
                : 'text-text-secondary hover:bg-content-bg'
            }`}
          >
            최신순
          </button>
          <button
            type="button"
            onClick={() => setSort('oldest')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              sort === 'oldest'
                ? 'bg-action text-action-text'
                : 'text-text-secondary hover:bg-content-bg'
            }`}
          >
            오래된순
          </button>
        </div>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="제목, 문제상황, 해결방법 검색..."
          className="min-w-48 flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
        />
      </div>

      {isLoading && <p className="text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-red-600">이슈 목록을 불러오지 못했습니다.</p>}

      <ul className="flex flex-col gap-2">
        {data?.map((issue) => (
          <li key={issue.id}>
            <Link
              to={`/issues/${issue.id}`}
              className="flex flex-col gap-1 rounded-xl bg-card-bg p-4 shadow-card hover:shadow-card-hover"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-subtle-text">
                  {issue.workspaceName}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    issue.solution
                      ? 'bg-accent-subtle text-accent-subtle-text'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {issue.solution ? '해결됨' : '미해결'}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-text-primary">{issue.title}</h2>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">
                  작성 {new Date(issue.createdAt).toLocaleDateString()} · 최근 활동{' '}
                  {new Date(issue.updatedAt).toLocaleDateString()}
                </span>
                <span className="text-xs text-text-secondary">💬 {issue.commentCount}</span>
              </div>
            </Link>
          </li>
        ))}
        {data && data.length === 0 && (
          <li className="text-sm text-text-secondary">
            {query || workspaceId ? '조건에 맞는 이슈가 없습니다.' : '아직 작성한 이슈가 없습니다.'}
          </li>
        )}
      </ul>
    </div>
  )
}
