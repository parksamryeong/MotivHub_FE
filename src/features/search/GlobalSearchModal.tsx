import { useEffect, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchIssues } from '../../api/issue'
import { searchMyTasks } from '../../api/task'

interface GlobalSearchModalProps {
  onClose: () => void
}

export function GlobalSearchModal({ onClose }: GlobalSearchModalProps): ReactElement {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  const issuesQuery = useQuery({
    queryKey: ['search', 'issues', query],
    queryFn: () => fetchIssues(query),
    enabled: query.length > 0,
  })

  const myTasksQuery = useQuery({
    queryKey: ['search', 'my-tasks', query],
    queryFn: () => searchMyTasks(query),
    enabled: query.length > 0,
  })

  function go(path: string) {
    onClose()
    navigate(path)
  }

  const hasResults = (issuesQuery.data?.length ?? 0) + (myTasksQuery.data?.length ?? 0) > 0
  const isLoading = issuesQuery.isFetching || myTasksQuery.isFetching

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label="통합 검색"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-full max-w-xl flex-col gap-4 rounded-xl border border-card-border bg-card-bg p-5 shadow-card"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
          }}
          placeholder="이슈, 내 태스크 검색..."
          className="rounded-lg border border-card-border bg-card-bg px-4 py-3 text-base text-text-primary"
        />

        {!query && (
          <p className="text-xs text-text-secondary">
            이슈 전체와 내가 담당한 태스크를 검색합니다. 워크스페이스의 다른 멤버 태스크와 댓글은
            검색되지 않아요.
          </p>
        )}

        {query && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {isLoading && !hasResults && <p className="text-sm text-text-secondary">검색 중...</p>}

            {issuesQuery.data && issuesQuery.data.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-text-secondary">이슈</h3>
                <ul className="flex flex-col gap-1">
                  {issuesQuery.data.map((issue) => (
                    <li key={issue.id}>
                      <button
                        type="button"
                        onClick={() => go(`/issues/${issue.id}`)}
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-accent-subtle"
                      >
                        <span className="text-sm font-medium text-text-primary">{issue.title}</span>
                        <span className="text-xs text-text-secondary">{issue.workspaceName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {myTasksQuery.data && myTasksQuery.data.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-text-secondary">내 태스크</h3>
                <ul className="flex flex-col gap-1">
                  {myTasksQuery.data.map((task) => (
                    <li key={task.taskId}>
                      <button
                        type="button"
                        onClick={() => go(`/tasks/${task.taskId}`)}
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-accent-subtle"
                      >
                        <span className="text-sm font-medium text-text-primary">{task.name}</span>
                        <span className="text-xs text-text-secondary">{task.workspaceName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!isLoading && !hasResults && (
              <p className="text-sm text-text-secondary">검색 결과가 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
