import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchIssues } from '../../api/issue'

export function IssueListPage(): ReactElement {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['issues'],
    queryFn: fetchIssues,
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">이슈 게시판</h1>
        <Link
          to="/issues/new"
          className="rounded-lg bg-action px-3 py-2 text-sm text-action-text"
        >
          새 이슈 등록
        </Link>
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
              <span className="text-xs text-text-secondary">
                {issue.author.nickname} · {new Date(issue.createdAt).toLocaleDateString()}
              </span>
            </Link>
          </li>
        ))}
        {data && data.length === 0 && (
          <li className="text-sm text-text-secondary">아직 등록된 이슈가 없습니다.</li>
        )}
      </ul>
    </div>
  )
}
