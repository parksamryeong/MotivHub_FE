import type { NotificationType } from '../../api/types'

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  DUE_DATE_APPROACHING: '⏰',
  TASK_OVERDUE: '🔴',
  ASSIGNEE_ADDED: '👤',
  TASK_COMMENT_ADDED: '💬',
  CHECKLIST_COMPLETED: '✅',
  MENTIONED: '@',
}

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  DUE_DATE_APPROACHING: '마감 임박 (D-2)',
  TASK_OVERDUE: '마감일 초과',
  ASSIGNEE_ADDED: '담당자 지정',
  TASK_COMMENT_ADDED: '새 댓글',
  CHECKLIST_COMPLETED: '체크리스트 완료',
  MENTIONED: '멘션',
}

export const NOTIFICATION_TYPE_ORDER: NotificationType[] = [
  'DUE_DATE_APPROACHING',
  'TASK_OVERDUE',
  'ASSIGNEE_ADDED',
  'TASK_COMMENT_ADDED',
  'CHECKLIST_COMPLETED',
  'MENTIONED',
]
