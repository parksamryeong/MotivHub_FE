import type { ReactElement } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SINGLE_SERIES_COLOR } from './dashboardColors'
import type { DashboardMemberWorkload } from '../../api/types'

export function MemberWorkloadChart({ data }: { data: DashboardMemberWorkload[] }): ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card-bg p-4 shadow-card">
      <h2 className="text-sm font-semibold text-text-primary">멤버별 업무량</h2>
      {data.length === 0 ? (
        <p className="flex h-40 items-center justify-center text-sm text-text-secondary">
          진행 중인 담당 태스크가 없습니다.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="nickname" width={64} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => `${value}개`} />
            <Bar
              dataKey="count"
              fill={SINGLE_SERIES_COLOR}
              radius={[0, 4, 4, 0]}
              label={{ position: 'right', fontSize: 12 }}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
