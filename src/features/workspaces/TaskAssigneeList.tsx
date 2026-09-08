import { useState, type ReactElement } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addAssignee, removeAssignee, taskActivitiesQueryKey } from '../../api/task'
import { getErrorMessage } from '../../api/errors'
import type { TaskResponse, UserSummary } from '../../api/types'

export function TaskAssigneeList({
  task,
  workspaceId,
  members,
  canManage,
}: {
  task: TaskResponse
  workspaceId: number
  members: UserSummary[]
  canManage: boolean
}): ReactElement {
  const queryClient = useQueryClient()
  const taskQueryKey = ['tasks', task.id] as const
  const tasksQueryKey = ['workspaces', workspaceId, 'tasks'] as const
  const [newAssigneeId, setNewAssigneeId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addMutation = useMutation({
    mutationFn: (userId: number) => addAssignee(task.id, userId),
    onSuccess: () => {
      setError(null)
      setNewAssigneeId('')
      queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true })
      queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      queryClient.invalidateQueries({ queryKey: taskActivitiesQueryKey(task.id) })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (targetUserId: number) => removeAssignee(task.id, targetUserId),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true })
      queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      queryClient.invalidateQueries({ queryKey: taskActivitiesQueryKey(task.id) })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const assignableMembers = members.filter(
    (member) => !task.assignees.some((assignee) => assignee.id === member.id)
  )

  return (
    <div>
      <span className="text-sm text-text-secondary">담당자</span>
      <ul className="mt-1 flex flex-col gap-1">
        {task.assignees.map((assignee) => (
          <li
            key={assignee.id}
            className="flex items-center justify-between text-sm text-text-primary"
          >
            {assignee.nickname}
            {canManage && (
              <button
                type="button"
                onClick={() => removeMutation.mutate(assignee.id)}
                disabled={removeMutation.isPending}
                className="text-xs text-red-600"
              >
                제거
              </button>
            )}
          </li>
        ))}
        {task.assignees.length === 0 && (
          <li className="text-sm text-text-secondary">담당자가 없습니다.</li>
        )}
      </ul>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {canManage && assignableMembers.length > 0 && (
        <div className="mt-2 flex gap-2">
          <select
            value={newAssigneeId}
            onChange={(e) => setNewAssigneeId(e.target.value)}
            className="flex-1 rounded-lg border border-card-border bg-card-bg px-2 py-1 text-sm text-text-primary"
          >
            <option value="">담당자 추가...</option>
            {assignableMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.nickname}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => newAssigneeId && addMutation.mutate(Number(newAssigneeId))}
            disabled={!newAssigneeId || addMutation.isPending}
            className="rounded-lg bg-action px-3 py-1 text-xs text-action-text disabled:opacity-50"
          >
            추가
          </button>
        </div>
      )}
    </div>
  )
}
