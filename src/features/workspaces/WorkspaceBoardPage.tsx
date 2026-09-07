import { useState, type ReactElement } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaceDetail } from '../../api/workspace'
import { fetchTasks } from '../../api/task'
import { useAuthStore } from '../../stores/authStore'
import type { TaskResponse, TaskStatus } from '../../api/types'
import { TaskCard } from './TaskCard'
import { TaskFormModal } from './TaskFormModal'
import { TaskDetailModal } from './TaskDetailModal'

const COLUMNS: { status: TaskStatus; label: string; creatable: boolean }[] = [
  { status: 'WAITING', label: '할 일', creatable: true },
  { status: 'IN_PROGRESS', label: '진행 중', creatable: true },
  { status: 'DONE', label: '완료', creatable: true },
  { status: 'EXPIRED', label: '기한만료', creatable: false },
]

export function WorkspaceBoardPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const workspaceId = Number(id)
  const currentUserId = useAuthStore((state) => state.user?.id)

  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  const workspaceQuery = useQuery({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => fetchWorkspaceDetail(workspaceId),
    enabled: Number.isFinite(workspaceId),
  })

  const tasksQuery = useQuery({
    queryKey: ['workspaces', workspaceId, 'tasks'],
    queryFn: () => fetchTasks(workspaceId),
    enabled: Number.isFinite(workspaceId),
  })

  if (workspaceQuery.isLoading || tasksQuery.isLoading) {
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (workspaceQuery.isError || !workspaceQuery.data) {
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
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{workspace.name}</h1>
          <div className="mt-2 flex items-center gap-1">
            {workspace.members.map((member) =>
              member.user.profileImageUrl ? (
                <img
                  key={member.user.id}
                  src={member.user.profileImageUrl}
                  alt={member.user.nickname}
                  title={member.user.nickname}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div
                  key={member.user.id}
                  title={member.user.nickname}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
                >
                  {member.user.nickname.slice(0, 1)}
                </div>
              )
            )}
          </div>
        </div>
        <Link
          to={`/workspaces/${workspaceId}/settings`}
          className="text-sm text-accent-subtle-text"
        >
          ⚙ 설정
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.status} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                {column.label} ({tasksFor(column.status).length})
              </h2>
              {column.creatable && (
                <button
                  type="button"
                  onClick={() => setCreateStatus(column.status)}
                  className="text-sm text-accent-subtle-text"
                >
                  + 추가
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {tasksFor(column.status).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  workspaceId={workspaceId}
                  currentUserId={currentUserId}
                  isWorkspaceOwner={isWorkspaceOwner}
                  onClick={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

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

      {selectedTaskId !== null && (
        <TaskDetailModal
          taskId={selectedTaskId}
          workspaceId={workspaceId}
          members={members}
          currentUserId={currentUserId}
          isWorkspaceOwner={isWorkspaceOwner}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  )
}
