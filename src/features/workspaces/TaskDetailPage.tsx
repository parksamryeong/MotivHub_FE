import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteTask,
  fetchTask,
  taskActivitiesQueryKey,
  updateTask,
  updateTaskPeriod,
  updateTaskStatus,
} from '../../api/task'
import { fetchWorkspaceDetail } from '../../api/workspace'
import { getErrorCode, getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { useTopic } from '../../realtime/useTopic'
import { useYjsField } from '../../realtime/useYjsField'
import type { TaskChangedMessage, TaskPresenceMessage, TaskStatus, UserSummary } from '../../api/types'
import { TaskAssigneeList } from './TaskAssigneeList'
import { TaskComments } from './TaskComments'
import { TaskChecklist } from './TaskChecklist'
import { TaskActivityLog } from './TaskActivityLog'
import { TaskPresenceRow } from './TaskPresenceRow'
import { EDITABLE_TASK_STATUS_OPTIONS as STATUS_OPTIONS } from './taskStatusLabels'

export function TaskDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)
  const isValidTaskId = Number.isFinite(taskId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const taskQueryKey = ['tasks', taskId] as const
  const workspaceIdRef = useRef<number | null>(null)

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: taskQueryKey,
    queryFn: () => fetchTask(taskId),
    enabled: isValidTaskId,
  })

  useEffect(() => {
    if (task) {
      workspaceIdRef.current = task.workspaceId
    }
  }, [task])

  const workspaceQuery = useQuery({
    queryKey: ['workspaces', task?.workspaceId],
    queryFn: () => fetchWorkspaceDetail(task!.workspaceId),
    enabled: !!task,
    refetchInterval: 60_000,
  })

  const [isKicked, setIsKicked] = useState(false)

  useEffect(() => {
    const code = getErrorCode(workspaceQuery.error)
    if (code === 'NOT_WORKSPACE_MEMBER' || code === 'WORKSPACE_NOT_FOUND') {
      setIsKicked(true)
      navigate('/workspaces', { replace: true })
    }
  }, [workspaceQuery.error, navigate])

  const canEditContent =
    workspaceQuery.data?.myRole === 'OWNER' ||
    (task?.assignees.some((assignee) => assignee.id === currentUserId) ?? false)

  useTopic<TaskChangedMessage>(task ? `/topic/tasks/${taskId}` : null, () => {
    queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true })
  })

  const [viewers, setViewers] = useState<UserSummary[]>([])

  useTopic<TaskPresenceMessage>(task ? `/topic/tasks/${taskId}/presence` : null, (message) => {
    setViewers(message.viewers.filter((viewer) => viewer.id !== currentUserId))
  })

  const { text: descriptionText, handleChange: handleDescriptionChange } = useYjsField({
    taskId,
    field: 'description',
    canEdit: canEditContent && !isKicked,
    initialContent: task ? (task.description ?? '') : undefined,
  })

  const [isEditingContent, setIsEditingContent] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [isEditingPeriod, setIsEditingPeriod] = useState(false)
  const [startDateDraft, setStartDateDraft] = useState('')
  const [dueDateDraft, setDueDateDraft] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setIsEditingContent(false)
    setIsEditingPeriod(false)
    setActionError(null)
    workspaceIdRef.current = null
    setViewers([])
  }, [taskId])

  function goBackToBoard() {
    const workspaceId = workspaceIdRef.current
    navigate(workspaceId !== null ? `/workspaces/${workspaceId}` : '/workspaces', {
      replace: true,
    })
  }

  function invalidateTask() {
    queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true })
    if (workspaceIdRef.current !== null) {
      queryClient.invalidateQueries({
        queryKey: ['workspaces', workspaceIdRef.current, 'tasks'],
      })
    }
    queryClient.invalidateQueries({ queryKey: taskActivitiesQueryKey(taskId) })
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
      if (workspaceIdRef.current !== null) {
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceIdRef.current, 'tasks'],
        })
      }
      queryClient.removeQueries({ queryKey: taskQueryKey })
      goBackToBoard()
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  function handleContentSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nameDraft.trim() || contentMutation.isPending) return
    contentMutation.mutate({
      name: nameDraft.trim(),
      description: descriptionText || undefined,
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
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (isError || !task) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-3">
        <p className="text-red-600">이 태스크는 삭제되었거나 더 이상 존재하지 않습니다.</p>
        <button
          type="button"
          onClick={goBackToBoard}
          className="rounded-lg bg-action px-3 py-2 text-sm text-action-text"
        >
          보드로 돌아가기
        </button>
      </div>
    )
  }

  if (workspaceQuery.isLoading) {
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (workspaceQuery.isError || !workspaceQuery.data) {
    const code = getErrorCode(workspaceQuery.error)
    if (code === 'NOT_WORKSPACE_MEMBER' || code === 'WORKSPACE_NOT_FOUND') {
      return (
        <p className="text-red-600">
          이 워크스페이스에 더 이상 접근할 수 없습니다. 목록으로 이동합니다...
        </p>
      )
    }
    return <p className="text-red-600">워크스페이스 정보를 불러오지 못했습니다.</p>
  }

  const workspace = workspaceQuery.data
  const members = workspace.members.map((member) => member.user)
  const isWorkspaceOwner = workspace.myRole === 'OWNER'
  const canEditPeriod = isWorkspaceOwner
  const canDelete =
    isWorkspaceOwner || (task.createdBy.id === currentUserId && task.status !== 'EXPIRED')

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link to={`/workspaces/${task.workspaceId}`} className="text-sm text-accent-subtle-text">
        ← 보드로 돌아가기
      </Link>
      <TaskPresenceRow viewers={viewers} />

      <div className="flex items-start justify-between">
        {isEditingContent ? (
          <form onSubmit={handleContentSubmit} className="flex flex-1 flex-col gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={100}
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
            <h1 className="text-lg font-bold text-text-primary">{task.name}</h1>
            {canEditContent ? (
              <textarea
                value={descriptionText}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                maxLength={2000}
                placeholder="설명을 입력하세요"
                className="mt-1 w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
              />
            ) : (
              descriptionText && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                  {descriptionText}
                </p>
              )
            )}
            {canEditContent && (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(task.name)
                  setIsEditingContent(true)
                }}
                className="mt-1 text-sm text-accent-subtle-text"
              >
                이름 수정
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <TaskChecklist taskId={taskId} items={task.checklistItems} canManage={canEditContent} />
          <TaskActivityLog taskId={taskId} />
          <TaskComments
            taskId={taskId}
            workspaceId={task.workspaceId}
            currentUserId={currentUserId}
            isWorkspaceOwner={isWorkspaceOwner}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-card-border pt-4 md:w-64 md:flex-shrink-0 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div>
            <span className="text-sm text-text-secondary">기간</span>
            {isEditingPeriod ? (
              <form onSubmit={handlePeriodSubmit} className="mt-1 flex flex-col gap-2">
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
                <div className="flex gap-2">
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
                </div>
              </form>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm text-text-primary">
                  {task.startDate} ~ {task.dueDate}
                </p>
                {canEditPeriod && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDateDraft(task.startDate)
                      setDueDateDraft(task.dueDate)
                      setIsEditingPeriod(true)
                    }}
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

          <TaskAssigneeList
            task={task}
            workspaceId={task.workspaceId}
            members={members}
            canManage={canEditContent}
          />

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
        </div>
      </div>
    </div>
  )
}
