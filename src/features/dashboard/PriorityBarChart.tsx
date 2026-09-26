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
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="label" width={48} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => `${value}개`} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12 }}>
            {chartData.map((entry) => (
              <Cell key={entry.priority} fill={PRIORITY_CHART_COLORS[entry.priority]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
