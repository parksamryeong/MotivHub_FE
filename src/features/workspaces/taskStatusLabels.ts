import type { TaskStatus } from '../../api/types'

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  WAITING: '할 일',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
  EXPIRED: '만료',
}

export const EDITABLE_TASK_STATUS_OPTIONS: {
  value: Exclude<TaskStatus, 'EXPIRED'>
  label: string
}[] = [
  { value: 'WAITING', label: TASK_STATUS_LABELS.WAITING },
  { value: 'IN_PROGRESS', label: TASK_STATUS_LABELS.IN_PROGRESS },
  { value: 'DONE', label: TASK_STATUS_LABELS.DONE },
]
