import type { ReactElement } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import {
  STATUS_CHART_COLORS,
  STATUS_CHART_LABELS,
  STATUS_CHART_ORDER,
} from './dashboardColors'
import type { DashboardStatusCount } from '../../api/types'

function renderSliceLabel(props: PieLabelRenderProps): ReactElement | null {
  const value = Number(props.value)
  if (!value) return null
  const cx = Number(props.cx)
  const cy = Number(props.cy)
  const innerRadius = Number(props.innerRadius)
  const outerRadius = Number(props.outerRadius)
  const radian = (Math.PI / 180) * Number(props.midAngle)
  const radius = innerRadius + (outerRadius - innerRadius) / 2
  const x = cx + radius * Math.cos(-radian)
  const y = cy + radius * Math.sin(-radian)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {value}
    </text>
  )
}

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
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={4}
            cornerRadius={8}
            stroke="none"
            animationDuration={500}
            animationEasing="ease-out"
            label={renderSliceLabel}
            labelLine={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${value}개`}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--color-card-border)' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
