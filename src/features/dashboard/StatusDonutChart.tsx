import type { ReactElement } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  STATUS_CHART_COLORS,
  STATUS_CHART_LABELS,
  STATUS_CHART_ORDER,
} from './dashboardColors'
import type { DashboardStatusCount } from '../../api/types'

export function StatusDonutChart({ data }: { data: DashboardStatusCount[] }): ReactElement {
  const countByStatus = new Map(data.map((item) => [item.status, item.count]))
  const chartData = STATUS_CHART_ORDER.map((status) => ({
    status,
    label: STATUS_CHART_LABELS[status],
    count: countByStatus.get(status) ?? 0,
  }))

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card-bg p-4 shadow-card">
      <h2 className="text-sm font-semibold text-text-primary">상태별 태스크</h2>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            label={({ name, value }) => (Number(value) > 0 ? `${name} ${value}` : '')}
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}개`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
