import { useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTaskStatus } from '../../api/task'
import { getErrorMessage } from '../../api/errors'
import { parseDateOnly, dateOnlyTime } from './myTasksBuckets'
import type { MyTaskResponse } from '../../api/types'
import { PRIORITY_STRIPE_CLASSES, PriorityBadge } from '../workspaces/taskPriority'

export function MyTaskRow({
  task,
  isOverdue,
}: {
  task: MyTaskResponse
  isOverdue: boolean
}): ReactElement {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const completeMutation = useMutation({
    mutationFn: () => updateTaskStatus(task.taskId, 'DONE'),
    onSuccess: () => {
      setError(null)
      queryClient.setQueryData<MyTaskResponse[]>(['my-tasks'], (old) =>
        old?.filter((t) => t.taskId !== task.taskId)
      )
      queryClient.invalidateQueries({ queryKey: ['my-tasks', 'DONE'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const overdueDays = isOverdue
    ? Math.max(
        1,
        Math.round(
          (dateOnlyTime(new Date()) - dateOnlyTime(parseDateOnly(task.dueDate))) / 86_400_000
        )
      )
    : 0

  return (
    <li
      className={`flex flex-col gap-1 rounded-lg border border-l-4 border-card-border bg-card-bg p-3 shadow-card ${PRIORITY_STRIPE_CLASSES[task.priority]}`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={false}
          onChange={(e) => {
            if (e.target.checked) completeMutation.mutate()
          }}
          disabled={completeMutation.isPending}
          aria-label={`${task.name} 완료 처리`}
          className="h-4 w-4 flex-shrink-0 accent-action"
        />
        <Link
          to={`/tasks/${task.taskId}`}
          className="flex-1 truncate text-sm text-text-primary hover:underline"
        >
          {task.name}
        </Link>
        <PriorityBadge priority={task.priority} />
        <span className="flex-shrink-0 rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-subtle-text">
          {task.workspaceName}
        </span>
        {task.hasComments && (
          <span className="flex-shrink-0 text-xs" title="댓글 있음">
            💬
          </span>
        )}
        {isOverdue ? (
          <span className="flex-shrink-0 rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
            {overdueDays}일 지남
          </span>
        ) : (
          <span className="flex-shrink-0 text-xs text-text-secondary">{task.dueDate}</span>
        )}
      </div>
      {task.checklistTotal > 0 && (
        <div className="ml-7 flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-content-bg">
            <div
              className="h-1.5 rounded-full bg-accent transition-[width]"
              style={{ width: `${(task.checklistCompleted / task.checklistTotal) * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-secondary">
            {task.checklistCompleted}/{task.checklistTotal}
          </span>
        </div>
      )}
      {error && <p className="ml-7 text-xs text-red-600">{error}</p>}
    </li>
  )
}
