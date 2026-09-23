import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { fetchWorkspaceDetail } from '../../api/workspace'
import { fetchTasks, updateTaskStatus } from '../../api/task'
import { getErrorCode, getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { useTopic } from '../../realtime/useTopic'
import type { TaskBoardChangeMessage, TaskResponse, TaskStatus } from '../../api/types'
import { BoardColumn } from './BoardColumn'
import { WorkspaceFiles } from './WorkspaceFiles'
import { TaskCard } from './TaskCard'
import { TaskFormModal } from './TaskFormModal'
import { TaskCalendar } from './TaskCalendar'
import { recordRecentWorkspace } from './recentWorkspaces'

type BoardView = 'BOARD' | 'CALENDAR'

const COLUMNS: { status: Exclude<TaskStatus, 'EXPIRED'>; label: string; creatable: boolean }[] = [
  { status: 'WAITING', label: '할 일', creatable: true },
  { status: 'IN_PROGRESS', label: '진행 중', creatable: true },
  { status: 'DONE', label: '완료', creatable: false },
]

const MEMBER_PANEL_COLLAPSED_KEY = 'motivhub-member-panel-collapsed'
const GHOST_GUARD_MS = 10_000

export function WorkspaceBoardPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const workspaceId = Number(id)
  const isValidWorkspaceId = Number.isFinite(workspaceId)
  const currentUserId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null)
  const [dragError, setDragError] = useState<string | null>(null)
  const [view, setView] = useState<BoardView>('BOARD')

  useEffect(() => {
    if (isValidWorkspaceId) {
      recordRecentWorkspace(workspaceId)
    }
  }, [isValidWorkspaceId, workspaceId])

  const [isMemberPanelCollapsed, setIsMemberPanelCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MEMBER_PANEL_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  function toggleMemberPanel() {
    setIsMemberPanelCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(MEMBER_PANEL_COLLAPSED_KEY, String(next))
      } catch {
        // localStorage 접근 불가 시 조용히 무시 — 접힘 상태가 다음 방문까지 기억되지 않을 뿐 기능엔 영향 없음
      }
      return next
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const workspaceQuery = useQuery({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => fetchWorkspaceDetail(workspaceId),
    enabled: isValidWorkspaceId,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    const code = getErrorCode(workspaceQuery.error)
    if (code === 'NOT_WORKSPACE_MEMBER' || code === 'WORKSPACE_NOT_FOUND') {
      navigate('/workspaces', { replace: true })
    }
  }, [workspaceQuery.error, navigate])

  const tasksQueryKey = ['workspaces', workspaceId, 'tasks'] as const

  const tasksQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => fetchTasks(workspaceId),
    enabled: isValidWorkspaceId,
  })

  const recentlyDeletedRef = useRef<Map<number, number>>(new Map())

  useTopic<TaskBoardChangeMessage>(
    workspaceQuery.data ? `/topic/workspaces/${workspaceId}/tasks` : null,
    (message) => {
      const recentlyDeleted = recentlyDeletedRef.current
      const now = Date.now()
      for (const [id, deletedAt] of recentlyDeleted) {
        if (now - deletedAt > GHOST_GUARD_MS) {
          recentlyDeleted.delete(id)
        }
      }

      if (message.changeType === 'DELETED') {
        recentlyDeleted.set(message.taskId, now)
        queryClient.setQueryData<TaskResponse[]>(tasksQueryKey, (old) =>
          old?.filter((t) => t.id !== message.taskId)
        )
        return
      }

      // 삭제 직후 늦게 도착한 UPDATED는 무시한다(백엔드가 감수하기로 한,
      // 근접한 타이밍의 UPDATED/DELETED 순서 역전 경합에 대한 방어).
      if (recentlyDeleted.has(message.taskId)) return

      const updatedTask = message.task
      if (!updatedTask) return
      queryClient.setQueryData<TaskResponse[]>(tasksQueryKey, (old) => {
        if (!old) return old
        const exists = old.some((t) => t.id === updatedTask.id)
        return exists
          ? old.map((t) => (t.id === updatedTask.id ? updatedTask : t))
          : [...old, updatedTask]
      })
    }
  )

  if (workspaceQuery.isLoading || tasksQuery.isLoading) {
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
    return <p className="text-red-600">찾을 수 없거나 접근 권한이 없습니다.</p>
  }
  if (tasksQuery.isError || !tasksQuery.data) {
    return <p className="text-red-600">태스크 목록을 불러오지 못했습니다.</p>
  }

  const workspace = workspaceQuery.data
  const tasks = tasksQuery.data
  const isWorkspaceOwner = workspace.myRole === 'OWNER'
  const members = workspace.members.map((member) => member.user)

  function tasksFor(status: TaskStatus): TaskResponse[] {
    if (status === 'IN_PROGRESS') {
      // 별도 컬럼을 두지 않고, 기한이 지나 자동 만료된(EXPIRED) 태스크도 진행 중에 함께 묶어 보여준다.
      return tasks.filter((task) => task.status === 'IN_PROGRESS' || task.status === 'EXPIRED')
    }
    return tasks.filter((task) => task.status === status)
  }

  const completionPercent =
    tasks.length === 0 ? 0 : Math.round((tasksFor('DONE').length / tasks.length) * 100)

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const targetColumn = COLUMNS.find((c) => c.status === over.id)
    if (!targetColumn) return
    const newStatus = targetColumn.status

    const taskId = active.id as number
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    const previousStatus = task.status

    await queryClient.cancelQueries({ queryKey: tasksQueryKey })
    queryClient.setQueryData<TaskResponse[]>(tasksQueryKey, (old) =>
      old?.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    setDragError(null)

    updateTaskStatus(taskId, newStatus)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: tasksQueryKey })
      })
      .catch((err: unknown) => {
        queryClient.setQueryData<TaskResponse[]>(tasksQueryKey, (old) =>
          old?.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
        )
        setDragError(getErrorMessage(err))
      })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{workspace.name}</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-lg border border-card-border bg-card-bg p-0.5">
            <button
              type="button"
              onClick={() => setView('BOARD')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                view === 'BOARD'
                  ? 'bg-action text-action-text'
                  : 'text-text-secondary hover:bg-content-bg'
              }`}
            >
              보드
            </button>
            <button
              type="button"
              onClick={() => setView('CALENDAR')}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                view === 'CALENDAR'
                  ? 'bg-action text-action-text'
                  : 'text-text-secondary hover:bg-content-bg'
              }`}
            >
              캘린더
            </button>
          </div>
          <Link
            to={`/workspaces/${workspaceId}/settings`}
            className="text-sm text-accent-subtle-text"
          >
            ⚙ 설정
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-card-bg px-4 py-3 shadow-card">
        <p className="text-sm text-text-secondary">
          할 일 <b className="font-semibold text-text-primary">{tasksFor('WAITING').length}</b>
          <span className="mx-2 text-text-muted">·</span>
          진행 중 <b className="font-semibold text-text-primary">{tasksFor('IN_PROGRESS').length}</b>
          <span className="mx-2 text-text-muted">·</span>
          완료 <b className="font-semibold text-text-primary">{tasksFor('DONE').length}</b>
        </p>
        <div className="flex min-w-48 flex-1 items-center gap-2">
          <div className="h-2 min-w-0 flex-1 rounded-full bg-content-bg">
            <div
              className="h-2 rounded-full transition-[width,background-color]"
              style={{
                width: `${completionPercent}%`,
                backgroundColor: `hsl(${completionPercent * 1.2}, 75%, 45%)`,
              }}
            />
          </div>
          <span className="flex-shrink-0 text-sm font-semibold text-text-primary">
            {completionPercent}%
          </span>
        </div>
      </div>

      {dragError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{dragError}</p>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr_200px]">
          {view === 'CALENDAR' ? (
            <div className="md:col-span-3">
              <TaskCalendar tasks={tasks} onTaskClick={(taskId) => navigate(`/tasks/${taskId}`)} />
            </div>
          ) : (
            COLUMNS.map((column) => (
              <BoardColumn
                key={column.status}
                status={column.status}
                label={column.label}
                count={tasksFor(column.status).length}
                creatable={column.creatable}
                onAddClick={() => setCreateStatus(column.status)}
              >
                {tasksFor(column.status).length === 0 ? (
                  <p className="text-xs text-text-secondary">아직 태스크가 없습니다.</p>
                ) : (
                  tasksFor(column.status).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      workspaceId={workspaceId}
                      currentUserId={currentUserId}
                      isWorkspaceOwner={isWorkspaceOwner}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    />
                  ))
                )}
              </BoardColumn>
            ))
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-card-border p-3">
            <div>
              <button
                type="button"
                onClick={toggleMemberPanel}
                aria-expanded={!isMemberPanelCollapsed}
                aria-label={isMemberPanelCollapsed ? '팀원 목록 펼치기' : '팀원 목록 접기'}
                className="flex w-full items-center justify-between text-xs font-medium text-text-secondary"
              >
                <span>팀원 ({workspace.members.length}명)</span>
                <span>{isMemberPanelCollapsed ? '▸' : '▾'}</span>
              </button>
              {!isMemberPanelCollapsed && (
                <ul className="mt-2 flex flex-col gap-2">
                  {workspace.members.map((member) => (
                    <li key={member.user.id} className="flex items-center gap-2">
                      {member.user.profileImageUrl ? (
                        <img
                          src={member.user.profileImageUrl}
                          alt={member.user.nickname}
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
                          {member.user.nickname.slice(0, 1)}
                        </div>
                      )}
                      <span className="flex-1 truncate text-sm text-text-primary">
                        {member.user.nickname}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {member.role === 'OWNER' ? '오너' : '멤버'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <WorkspaceFiles
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              isWorkspaceOwner={isWorkspaceOwner}
            />
          </div>
        </div>
      </DndContext>

      {createStatus && (
        <TaskFormModal
          workspaceId={workspaceId}
          defaultStatus={createStatus}
          members={members}
          isWorkspaceOwner={isWorkspaceOwner}
          currentUserId={currentUserId}
          onClose={() => setCreateStatus(null)}
        />
      )}
    </div>
  )
}
