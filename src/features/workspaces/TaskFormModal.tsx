import { useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTask, updateTaskStatus } from '../../api/task'
import { getErrorMessage } from '../../api/errors'
import type { TaskStatus, UserSummary } from '../../api/types'

export function TaskFormModal({
  workspaceId,
  defaultStatus,
  members,
  isWorkspaceOwner,
  currentUserId,
  onClose,
}: {
  workspaceId: number
  defaultStatus: TaskStatus
  members: UserSummary[]
  isWorkspaceOwner: boolean
  currentUserId: number | undefined
  onClose: () => void
}): ReactElement {
  const queryClient = useQueryClient()
  const mustIncludeSelf = defaultStatus !== 'WAITING' && !isWorkspaceOwner

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    mustIncludeSelf && currentUserId !== undefined ? [currentUserId] : []
  )
  const [error, setError] = useState<string | null>(null)
  const [statusWarning, setStatusWarning] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      const task = await createTask(workspaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
        startDate,
        dueDate,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      })
      if (defaultStatus === 'WAITING') {
        return { statusWarning: null as string | null }
      }
      try {
        await updateTaskStatus(task.id, defaultStatus as Exclude<TaskStatus, 'EXPIRED'>)
        return { statusWarning: null as string | null }
      } catch (statusError) {
        return {
          statusWarning: `태스크는 생성되었지만 상태 변경에 실패했습니다: ${getErrorMessage(
            statusError
          )}. 할 일 목록에서 확인해주세요.`,
        }
      }
    },
    onSuccess: (result) => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'tasks'] })
      if (result.statusWarning) {
        setStatusWarning(result.statusWarning)
      } else {
        onClose()
      }
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  function toggleAssignee(userId: number) {
    if (mustIncludeSelf && userId === currentUserId) return
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !startDate || !dueDate || createMutation.isPending) return
    createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-xl bg-card-bg p-6 shadow-card">
        <h2 className="text-lg font-bold text-text-primary">태스크 생성</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="태스크 이름"
            maxLength={100}
            className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명(선택)"
            maxLength={2000}
            className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <span className="text-sm text-text-secondary">담당자</span>
            <div className="mt-1 flex flex-col gap-1">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 text-sm text-text-primary"
                >
                  <input
                    type="checkbox"
                    checked={assigneeIds.includes(member.id)}
                    disabled={mustIncludeSelf && member.id === currentUserId}
                    onChange={() => toggleAssignee(member.id)}
                  />
                  {member.nickname}
                </label>
              ))}
            </div>
            {mustIncludeSelf && (
              <p className="mt-1 text-xs text-text-secondary">
                이 컬럼에 바로 만들려면 본인이 담당자로 지정되어야 해요.
              </p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {statusWarning && <p className="text-sm text-red-600">{statusWarning}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-text-primary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={
                !name.trim() ||
                !startDate ||
                !dueDate ||
                createMutation.isPending ||
                statusWarning !== null
              }
              className="rounded-lg bg-action px-4 py-2 text-action-text disabled:opacity-50"
            >
              {createMutation.isPending ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
