import { useState, type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardStats } from '../../api/dashboard'
import { fetchWorkspaces } from '../../api/workspace'
import { StatusDonutChart } from './StatusDonutChart'
import { PriorityBarChart } from './PriorityBarChart'
import { MemberWorkloadChart } from './MemberWorkloadChart'
import { CompletionTrendChart } from './CompletionTrendChart'

export function DashboardPage(): ReactElement {
  const [workspaceId, setWorkspaceId] = useState<number | null>(null)

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats', workspaceId],
    queryFn: () => fetchDashboardStats(workspaceId ?? undefined),
  })

  if (statsQuery.isLoading) {
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (statsQuery.isError || !statsQuery.data) {
    return <p className="text-red-600">대시보드 정보를 불러오지 못했습니다.</p>
  }

  const stats = statsQuery.data
  const expiredCount = stats.statusCounts.find((item) => item.status === 'EXPIRED')?.count ?? 0
  const inProgressCount =
    stats.statusCounts.find((item) => item.status === 'IN_PROGRESS')?.count ?? 0
  const doneCount = stats.statusCounts.find((item) => item.status === 'DONE')?.count ?? 0

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">대시보드</h1>
        <select
          value={workspaceId ?? ''}
          onChange={(e) => setWorkspaceId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
        >
          <option value="">전체</option>
          {workspacesQuery.data?.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
          <p
            className={`text-2xl font-bold ${
              stats.dueSoonCount > 0 ? 'text-orange-500' : 'text-text-muted'
            }`}
          >
            {stats.dueSoonCount}
          </p>
          <p className="text-xs text-text-secondary">마감 임박</p>
        </div>
        <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
          <p className={`text-2xl font-bold ${expiredCount > 0 ? 'text-red-600' : 'text-text-muted'}`}>
            {expiredCount}
          </p>
          <p className="text-xs text-text-secondary">마감 초과</p>
        </div>
        <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-text-primary">{inProgressCount}</p>
          <p className="text-xs text-text-secondary">진행 중</p>
        </div>
        <div className="rounded-xl bg-card-bg p-4 text-center shadow-card">
          <p className="text-2xl font-bold text-text-primary">{doneCount}</p>
          <p className="text-xs text-text-secondary">완료</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatusDonutChart data={stats.statusCounts} />
        <PriorityBarChart data={stats.priorityCounts} />
        <MemberWorkloadChart data={stats.memberWorkload} />
        <CompletionTrendChart data={stats.completionTrend} />
      </div>
    </div>
  )
}
