import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteTask,
  fetchTask,
  updateTask,
  updateTaskPeriod,
  updateTaskStatus,
} from '../../api/task'
import { getErrorMessage } from '../../api/errors'
import type { TaskStatus, UserSummary } from '../../api/types'
import { TaskAssigneeList } from './TaskAssigneeList'
import { TaskComments } from './TaskComments'

const STATUS_OPTIONS: { value: Exclude<TaskStatus, 'EXPIRED'>; label: string }[] = [
  { value: 'WAITING', label: '할 일' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'DONE', label: '완료' },
]

export function TaskDetailModal({
  taskId,
  workspaceId,
  members,
  currentUserId,
  isWorkspaceOwner,
  onClose,
}: {
  taskId: number
  workspaceId: number
  members: UserSummary[]
  currentUserId: number | undefined
  isWorkspaceOwner: boolean
  onClose: () => void
}): ReactElement {
  const queryClient = useQueryClient()
  const taskQueryKey = ['tasks', taskId] as const
  const tasksQueryKey = ['workspaces', workspaceId, 'tasks'] as const

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: taskQueryKey,
    queryFn: () => fetchTask(taskId),
  })

  const [isEditingContent, setIsEditingContent] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [isEditingPeriod, setIsEditingPeriod] = useState(false)
  const [startDateDraft, setStartDateDraft] = useState('')
  const [dueDateDraft, setDueDateDraft] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setNameDraft(task.name)
      setDescriptionDraft(task.description ?? '')
      setStartDateDraft(task.startDate)
      setDueDateDraft(task.dueDate)
    }
  }, [task])

  function invalidateTask() {
    queryClient.invalidateQueries({ queryKey: taskQueryKey })
    queryClient.invalidateQueries({ queryKey: tasksQueryKey })
  }

  const contentMutation = useMutation({
    mutationFn: (body: { name: string; description?: string }) => updateTask(taskId, body),
    onSuccess: () => {
      setActionError(null)
      setIsEditingContent(false)
      invalidateTask()
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const periodMutation = useMutation({
    mutationFn: (body: { startDate: string; dueDate: string }) => updateTaskPeriod(taskId, body),
    onSuccess: () => {
      setActionError(null)
      setIsEditingPeriod(false)
      invalidateTask()
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const statusMutation = useMutation({
    mutationFn: (status: Exclude<TaskStatus, 'EXPIRED'>) => updateTaskStatus(taskId, status),
    onSuccess: () => {
      setActionError(null)
      invalidateTask()
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      onClose()
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  function handleContentSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nameDraft.trim() || contentMutation.isPending) return
    contentMutation.mutate({
      name: nameDraft.trim(),
      description: descriptionDraft.trim() || undefined,
    })
  }

  function handlePeriodSubmit(e: FormEvent) {
    e.preventDefault()
    if (!startDateDraft || !dueDateDraft || periodMutation.isPending) return
    periodMutation.mutate({ startDate: startDateDraft, dueDate: dueDateDraft })
  }

  function handleDelete() {
    if (deleteMutation.isPending) return
    if (confirm('이 태스크를 삭제하시겠습니까?')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
        <div className="rounded-xl bg-card-bg p-6 text-text-secondary shadow-card">
          로딩 중...
        </div>
      </div>
    )
  }
  if (isError || !task) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
        <div className="rounded-xl bg-card-bg p-6 text-red-600 shadow-card">
          태스크를 불러오지 못했습니다.
          <button type="button" onClick={onClose} className="ml-3 text-sm text-accent-subtle-text">
            닫기
          </button>
        </div>
      </div>
    )
  }

  const isAssignee = task.assignees.some((assignee) => assignee.id === currentUserId)
  const canEditContent = isWorkspaceOwner || isAssignee
  const canEditPeriod = isWorkspaceOwner
  const canDelete =
    isWorkspaceOwner || (task.createdBy.id === currentUserId && task.status !== 'EXPIRED')

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-card-bg p-6 shadow-card">
        <div className="flex items-start justify-between">
          {isEditingContent ? (
            <form onSubmit={handleContentSubmit} className="flex flex-1 flex-col gap-2">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={100}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
              />
              <textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                maxLength={2000}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!nameDraft.trim() || contentMutation.isPending}
                  className="rounded-lg bg-action px-3 py-2 text-action-text disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingContent(false)}
                  className="rounded-lg px-3 py-2 text-text-primary"
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-text-primary">{task.name}</h2>
              {task.description && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                  {task.description}
                </p>
              )}
              {canEditContent && (
                <button
                  type="button"
                  onClick={() => setIsEditingContent(true)}
                  className="mt-1 text-sm text-accent-subtle-text"
                >
                  수정
                </button>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} className="ml-3 text-text-secondary">
            ✕
          </button>
        </div>

        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        <div>
          <span className="text-sm text-text-secondary">기간</span>
          {isEditingPeriod ? (
            <form onSubmit={handlePeriodSubmit} className="mt-1 flex items-center gap-2">
              <input
                type="date"
                value={startDateDraft}
                onChange={(e) => setStartDateDraft(e.target.value)}
                className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-sm text-text-primary"
              />
              <input
                type="date"
                value={dueDateDraft}
                onChange={(e) => setDueDateDraft(e.target.value)}
                className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-sm text-text-primary"
              />
              <button
                type="submit"
                disabled={!startDateDraft || !dueDateDraft || periodMutation.isPending}
                className="rounded-lg bg-action px-2 py-1 text-xs text-action-text disabled:opacity-50"
              >
                저장
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPeriod(false)}
                className="text-xs text-text-primary"
              >
                취소
              </button>
            </form>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-text-primary">
                {task.startDate} ~ {task.dueDate}
              </p>
              {canEditPeriod && (
                <button
                  type="button"
                  onClick={() => setIsEditingPeriod(true)}
                  className="text-sm text-accent-subtle-text"
                >
                  수정
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <span className="text-sm text-text-secondary">상태</span>
          <div className="mt-1">
            {task.status === 'EXPIRED' ? (
              <p className="text-sm text-text-primary">
                기한이 지나 자동으로 만료되었습니다. 마감일을 연장하면 자동으로 복귀됩니다.
              </p>
            ) : canEditContent ? (
              <select
                value={task.status}
                onChange={(e) =>
                  statusMutation.mutate(e.target.value as Exclude<TaskStatus, 'EXPIRED'>)
                }
                disabled={statusMutation.isPending}
                className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-sm text-text-primary"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-text-primary">
                {STATUS_OPTIONS.find((option) => option.value === task.status)?.label}
              </p>
            )}
          </div>
        </div>

        <TaskAssigneeList task={task} members={members} canManage={canEditContent} />

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="self-start text-sm text-red-600"
          >
            태스크 삭제
          </button>
        )}

        <TaskComments taskId={taskId} />
      </div>
    </div>
  )
}
