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
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }} barSize={20}>
            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
            <YAxis
              type="category"
              dataKey="nickname"
              width={64}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            />
            <Tooltip
              formatter={(value) => `${value}개`}
              cursor={{ fill: 'var(--color-content-bg)' }}
              contentStyle={{ borderRadius: 10, border: '1px solid var(--color-card-border)' }}
            />
            <Bar
              dataKey="count"
              fill={SINGLE_SERIES_COLOR}
              radius={[0, 10, 10, 0]}
              label={{ position: 'right', fontSize: 12, fill: 'var(--color-text-secondary)' }}
              animationDuration={500}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
