import type { ReactElement } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  PRIORITY_CHART_COLORS,
  PRIORITY_CHART_LABELS,
  PRIORITY_CHART_ORDER,
} from './dashboardColors'
import type { DashboardPriorityCount } from '../../api/types'

export function PriorityBarChart({ data }: { data: DashboardPriorityCount[] }): ReactElement {
  const countByPriority = new Map(data.map((item) => [item.priority, item.count]))
  const chartData = PRIORITY_CHART_ORDER.map((priority) => ({
    priority,
    label: PRIORITY_CHART_LABELS[priority],
    count: countByPriority.get(priority) ?? 0,
  }))

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card-bg p-4 shadow-card">
      <h2 className="text-sm font-semibold text-text-primary">우선순위 분포</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }} barSize={22}>
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
          <YAxis
            type="category"
            dataKey="label"
            width={48}
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
            radius={[0, 10, 10, 0]}
            label={{ position: 'right', fontSize: 12, fill: 'var(--color-text-secondary)' }}
            animationDuration={500}
            animationEasing="ease-out"
          >
            {chartData.map((entry) => (
              <Cell key={entry.priority} fill={PRIORITY_CHART_COLORS[entry.priority]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
