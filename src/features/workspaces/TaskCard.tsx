import { useState, type ReactElement } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDraggable } from '@dnd-kit/core'
import { updateTaskStatus } from '../../api/task'
import { getErrorMessage } from '../../api/errors'
import type { TaskResponse, TaskStatus } from '../../api/types'

const STATUS_OPTIONS: { value: Exclude<TaskStatus, 'EXPIRED'>; label: string }[] = [
  { value: 'WAITING', label: '할 일' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'DONE', label: '완료' },
]

export function TaskCard({
  task,
  workspaceId,
  currentUserId,
  isWorkspaceOwner,
  onClick,
}: {
  task: TaskResponse
  workspaceId: number
  currentUserId: number | undefined
  isWorkspaceOwner: boolean
  onClick: () => void
}): ReactElement {
  const queryClient = useQueryClient()
  const isAssignee = task.assignees.some((assignee) => assignee.id === currentUserId)
  const canChangeStatus = task.status !== 'EXPIRED' && (isWorkspaceOwner || isAssignee)
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canChangeStatus,
  })

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const statusMutation = useMutation({
    mutationFn: (status: Exclude<TaskStatus, 'EXPIRED'>) => updateTaskStatus(task.id, status),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'tasks'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...(canChangeStatus ? { ...listeners, ...attributes } : {})}
      className={`flex flex-col gap-2 rounded-xl bg-card-bg p-3 shadow-card ${
        canChangeStatus ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClick}
          className="flex-1 text-left text-sm font-medium text-text-primary"
        >
          {task.name}
        </button>
        {task.status === 'EXPIRED' && (
          <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
            만료
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {task.assignees.map((assignee) =>
          assignee.profileImageUrl ? (
            <img
              key={assignee.id}
              src={assignee.profileImageUrl}
              alt={assignee.nickname}
              title={assignee.nickname}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div
              key={assignee.id}
              title={assignee.nickname}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white"
            >
              {assignee.nickname.slice(0, 1)}
            </div>
          )
        )}
      </div>
      <span className="text-xs text-text-secondary">
        마감 {new Date(task.dueDate).toLocaleDateString()}
      </span>
      {canChangeStatus && (
        <select
          value={task.status as Exclude<TaskStatus, 'EXPIRED'>}
          onChange={(e) => statusMutation.mutate(e.target.value as Exclude<TaskStatus, 'EXPIRED'>)}
          disabled={statusMutation.isPending}
          className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-xs text-text-primary"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
