import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import type { MyTaskResponse } from '../../api/types'

function formatCompletedAt(completedAt: string | null): string {
  if (!completedAt) return ''
  const date = new Date(completedAt)
  return `${date.getMonth() + 1}월 ${date.getDate()}일 완료`
}

export function MyDoneRow({ task }: { task: MyTaskResponse }): ReactElement {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-card-border bg-card-bg p-3 shadow-card">
      <span
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-accent text-[10px] font-bold text-white"
        aria-hidden="true"
      >
        ✓
      </span>
      <Link
        to={`/tasks/${task.taskId}`}
        className="flex-1 truncate text-sm text-text-secondary line-through hover:underline"
      >
        {task.name}
      </Link>
      <span className="flex-shrink-0 rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-subtle-text">
        {task.workspaceName}
      </span>
      <span className="flex-shrink-0 text-xs text-text-secondary">
        {formatCompletedAt(task.completedAt)}
      </span>
    </li>
  )
}
