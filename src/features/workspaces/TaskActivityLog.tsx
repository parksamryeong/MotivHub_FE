import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTaskActivities, taskActivitiesQueryKey } from '../../api/task'
import type { TaskActivityResponse, TaskStatus } from '../../api/types'
import { TASK_STATUS_LABELS as STATUS_LABELS } from './taskStatusLabels'

function statusLabel(value: string | null): string {
  if (!value) return ''
  return STATUS_LABELS[value as TaskStatus] ?? value
}

function formatActivity(activity: TaskActivityResponse): string {
  const actor = activity.actor.nickname
  switch (activity.action) {
    case 'CREATE':
      return `${actor}님이 태스크를 생성했습니다.`
    case 'UPDATE_CONTENT':
      return activity.field === 'name'
        ? `${actor}님이 이름을 "${activity.newValue}"(으)로 변경했습니다.`
        : `${actor}님이 설명을 수정했습니다.`
    case 'UPDATE_PERIOD':
      return `${actor}님이 기간을 ${activity.oldValue} → ${activity.newValue}(으)로 변경했습니다.`
    case 'CHANGE_STATUS':
      return `${actor}님이 상태를 ${statusLabel(activity.oldValue)} → ${statusLabel(
        activity.newValue
      )}(으)로 변경했습니다.`
    case 'ADD_ASSIGNEE':
      return `${actor}님이 담당자로 ${activity.newValue}님을 추가했습니다.`
    case 'REMOVE_ASSIGNEE':
      return `${actor}님이 담당자에서 ${activity.oldValue}님을 제거했습니다.`
    default:
      return `${actor}님이 태스크를 변경했습니다.`
  }
}

export function TaskActivityLog({ taskId }: { taskId: number }): ReactElement {
  const { data, isLoading, isError } = useQuery({
    queryKey: taskActivitiesQueryKey(taskId),
    queryFn: () => fetchTaskActivities(taskId),
  })

  return (
    <div className="border-t border-card-border pt-3">
      <h3 className="mb-2 text-sm font-semibold text-text-primary">활동 로그</h3>
      {isLoading && <p className="text-sm text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-sm text-red-600">활동 내역을 불러오지 못했습니다.</p>}
      <ul className="flex flex-col gap-1">
        {data?.map((activity) => (
          <li key={activity.id} className="text-xs text-text-secondary">
            {formatActivity(activity)}{' '}
            <span className="opacity-70">{new Date(activity.createdAt).toLocaleString()}</span>
          </li>
        ))}
        {data && data.length === 0 && (
          <li className="text-sm text-text-secondary">활동 내역이 없습니다.</li>
        )}
      </ul>
    </div>
  )
}
