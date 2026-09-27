import type { ReactElement } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SINGLE_SERIES_COLOR } from './dashboardColors'
import type { DashboardCompletionTrendPoint } from '../../api/types'

function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function CompletionTrendChart({
  data,
}: {
  data: DashboardCompletionTrendPoint[]
}): ReactElement {
  const chartData = data.map((point) => ({ ...point, label: formatShortDate(point.date) }))

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card-bg p-4 shadow-card">
      <h2 className="text-sm font-semibold text-text-primary">최근 7일 완료 추이</h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ left: -16, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="completionTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SINGLE_SERIES_COLOR} stopOpacity={0.35} />
              <stop offset="100%" stopColor={SINGLE_SERIES_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-card-border)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} width={32} />
          <Tooltip
            formatter={(value) => `${value}개`}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--color-card-border)' }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={SINGLE_SERIES_COLOR}
            strokeWidth={2.5}
            fill="url(#completionTrendFill)"
            dot={{ r: 3, strokeWidth: 0, fill: SINGLE_SERIES_COLOR }}
            activeDot={{ r: 5 }}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
