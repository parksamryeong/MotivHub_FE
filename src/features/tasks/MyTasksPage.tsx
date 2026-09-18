import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMyTasks } from '../../api/task'
import { groupMyTasksByUrgency } from './myTasksBuckets'
import { MyTaskRow } from './MyTaskRow'

export function MyTasksPage(): ReactElement {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: fetchMyTasks,
  })

  if (isLoading) {
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (isError) {
    return <p className="text-red-600">불러오지 못했습니다.</p>
  }

  const buckets = groupMyTasksByUrgency(data ?? [], new Date())
  const isEmpty = buckets.every((bucket) => bucket.tasks.length === 0)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-text-primary">내 할 일</h1>

      {isEmpty && <p className="text-sm text-text-secondary">처리할 일이 없어요 🎉</p>}

      {!isEmpty &&
        buckets.map((bucket) => (
          <section key={bucket.key} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              {bucket.label}
              <span className="rounded-full bg-content-bg px-2 py-0.5 text-xs font-medium text-text-secondary">
                {bucket.tasks.length}
              </span>
            </h2>
            {bucket.tasks.length === 0 ? (
              <p className="text-xs text-text-secondary">없음</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bucket.tasks.map((task) => (
                  <MyTaskRow key={task.taskId} task={task} isOverdue={bucket.key === 'OVERDUE'} />
                ))}
              </ul>
            )}
          </section>
        ))}
    </div>
  )
}
