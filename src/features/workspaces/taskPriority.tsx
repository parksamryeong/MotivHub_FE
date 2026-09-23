import type { ReactElement } from 'react'
import type { TaskPriority } from '../../api/types'

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
}

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'URGENT', label: TASK_PRIORITY_LABELS.URGENT },
  { value: 'HIGH', label: TASK_PRIORITY_LABELS.HIGH },
  { value: 'MEDIUM', label: TASK_PRIORITY_LABELS.MEDIUM },
  { value: 'LOW', label: TASK_PRIORITY_LABELS.LOW },
]

export const PRIORITY_BADGE_CLASSES: Record<TaskPriority, string> = {
  URGENT: 'bg-red-100 text-red-600',
  HIGH: 'bg-orange-100 text-orange-600',
  MEDIUM: 'bg-content-bg text-text-secondary',
  LOW: 'bg-blue-50 text-blue-600',
}

export const PRIORITY_STRIPE_CLASSES: Record<TaskPriority, string> = {
  URGENT: 'border-l-red-500',
  HIGH: 'border-l-orange-400',
  MEDIUM: 'border-l-card-border',
  LOW: 'border-l-blue-300',
}

// 대부분이 '보통'이라 매번 띄우면 오히려 시선이 분산되어, 기본값인 보통은 배지를 생략한다.
export function PriorityBadge({ priority }: { priority: TaskPriority }): ReactElement | null {
  if (priority === 'MEDIUM') return null
  return (
    <span
      className={`flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[priority]}`}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  )
}
