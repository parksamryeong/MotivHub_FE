import { TASK_PRIORITY_LABELS } from '../workspaces/taskPriority'
import { TASK_STATUS_LABELS } from '../workspaces/taskStatusLabels'
import type { TaskPriority, TaskStatus } from '../../api/types'

// 4개 조각이 동시에 화면에 나오는 카테고리 차트라, 단일 상태 배지에 쓰던 뱃지 색을
// 그대로 재사용하지 않고 dataviz 스킬의 validate_palette.js로 상호 구분 가능성을
// 검증한 색만 썼다. WAITING/EXPIRED는 각각 보드 전반에서 쓰는 파랑/빨강 톤을 최대한
// 살리되, 4개를 한 세트로 놓고 검증을 통과하는 정확한 hex로 맞췄다.
export const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  WAITING: '#2a78d6',
  IN_PROGRESS: '#1baf7a',
  DONE: '#008300',
  EXPIRED: '#e34948',
}

export const STATUS_CHART_ORDER: TaskStatus[] = ['WAITING', 'IN_PROGRESS', 'DONE', 'EXPIRED']

export const STATUS_CHART_LABELS = TASK_STATUS_LABELS

// URGENT/LOW은 기존 우선순위 배지와 동일한 색(빨강/파랑)을 그대로 썼다. HIGH(주황)와
// MEDIUM(회색)은 배지 색을 그대로 쓰면 validate_palette.js에서 실패해서(주황·빨강
// 구분 어려움, 회색은 채도 미달) 앰버/틸로 바꿨다 — 상세 페이지의 개별 배지는 항상
// 하나만 보여서 문제없지만, 4개가 동시에 보이는 차트에서는 구분이 안 됐다.
export const PRIORITY_CHART_COLORS: Record<TaskPriority, string> = {
  URGENT: '#DC2626',
  HIGH: '#eda100',
  MEDIUM: '#1baf7a',
  LOW: '#2563EB',
}

export const PRIORITY_CHART_ORDER: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']

export const PRIORITY_CHART_LABELS = TASK_PRIORITY_LABELS

// 완료 추이 · 멤버 업무량은 카테고리 구분이 아니라 단일 값의 크기를 보여주는
// 차트라, 진행률 바 등 앱 전역에서 이미 쓰는 accent 색 하나로 통일한다.
export const SINGLE_SERIES_COLOR = '#14B8A6'
