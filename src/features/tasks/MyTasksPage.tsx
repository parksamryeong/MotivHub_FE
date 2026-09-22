import { useState, type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMyTasks } from '../../api/task'
import { useAuthStore } from '../../stores/authStore'
import { groupMyTasksByUrgency, type MyTaskBucketKey } from './myTasksBuckets'
import { MyTaskRow } from './MyTaskRow'
import { MyDoneRow } from './MyDoneRow'

type StatusTab = 'ALL' | 'WAITING' | 'IN_PROGRESS' | 'DONE'

const TAB_LABELS: Record<StatusTab, string> = {
  ALL: '전체',
  WAITING: '할 일',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
}

const TAB_ORDER: StatusTab[] = ['ALL', 'WAITING', 'IN_PROGRESS', 'DONE']

const BUCKET_COUNT_COLORS: Record<MyTaskBucketKey, string> = {
  OVERDUE: 'text-red-600',
  TODAY: 'text-orange-500',
  THIS_WEEK: 'text-accent-subtle-text',
  UPCOMING: 'text-text-primary',
}

const EMPTY_MESSAGES: Record<StatusTab, string> = {
  ALL: '담당자로 지정된 태스크가 여기에 모입니다.',
  WAITING: '아직 시작하지 않은 태스크가 없어요.',
  IN_PROGRESS: '진행 중인 태스크가 없어요.',
  DONE: '완료한 태스크가 여기에 쌓입니다.',
}

export function MyTasksPage(): ReactElement {
  const nickname = useAuthStore((state) => state.user?.nickname)
  const [tab, setTab] = useState<StatusTab>('ALL')

  const openQuery = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => fetchMyTasks(),
  })
  const doneQuery = useQuery({
    queryKey: ['my-tasks', 'DONE'],
    queryFn: () => fetchMyTasks('DONE'),
    enabled: tab === 'DONE',
  })

  const activeQuery = tab === 'DONE' ? doneQuery : openQuery

  if (activeQuery.isLoading) {
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (activeQuery.isError) {
    return <p className="text-red-600">불러오지 못했습니다.</p>
  }

  const openTasks = openQuery.data ?? []
  const waitingTasks = openTasks.filter((task) => task.status === 'WAITING')
  // 보드와 동일하게, 기한이 지나 만료된 태스크는 진행 중으로 함께 묶는다.
  const inProgressTasks = openTasks.filter(
    (task) => task.status === 'IN_PROGRESS' || task.status === 'EXPIRED'
  )
  const tabCounts: Partial<Record<StatusTab, number>> = {
    ALL: openTasks.length,
    WAITING: waitingTasks.length,
    IN_PROGRESS: inProgressTasks.length,
  }

  const visibleOpenTasks =
    tab === 'WAITING' ? waitingTasks : tab === 'IN_PROGRESS' ? inProgressTasks : openTasks
  const buckets = groupMyTasksByUrgency(visibleOpenTasks, new Date())
  const isEmpty =
    tab === 'DONE'
      ? (doneQuery.data ?? []).length === 0
      : buckets.every((bucket) => bucket.tasks.length === 0)

  const overdueCount = buckets.find((bucket) => bucket.key === 'OVERDUE')?.tasks.length ?? 0
  const todayCount = buckets.find((bucket) => bucket.key === 'TODAY')?.tasks.length ?? 0
  const urgentParts = [
    overdueCount > 0 ? `지연 ${overdueCount}개` : null,
    todayCount > 0 ? `오늘 마감 ${todayCount}개` : null,
  ].filter((part): part is string => part !== null)
  const urgencySentence =
    urgentParts.length > 0
      ? `${urgentParts.join(', ')}가 있어요. 먼저 처리해보세요.`
      : '급한 일은 없어요. 여유 있게 진행해보세요.'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text-primary">
          {nickname ? `${nickname}님의 할 일` : '내 할 일'}
        </h1>
        <p className="text-sm text-text-secondary">
          여러 워크스페이스에서 맡은 태스크를 한곳에서 관리해요.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-action text-action-text'
                : 'border border-card-border bg-card-bg text-text-secondary hover:bg-content-bg'
            }`}
          >
            {TAB_LABELS[key]}
            {tabCounts[key] !== undefined && (
              <span className={`ml-1.5 text-xs ${tab === key ? 'opacity-80' : 'text-text-muted'}`}>
                {tabCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab !== 'DONE' && !isEmpty && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-text-primary">{urgencySentence}</p>
          <div className="flex flex-wrap gap-2">
            {buckets.map((bucket) => {
              const hasTasks = bucket.tasks.length > 0
              return (
                <button
                  key={bucket.key}
                  type="button"
                  disabled={!hasTasks}
                  onClick={() =>
                    document
                      .getElementById(`my-tasks-${bucket.key}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  className="rounded-full border border-card-border bg-card-bg px-3 py-1 text-xs text-text-secondary enabled:hover:bg-content-bg disabled:opacity-50"
                >
                  {bucket.label}{' '}
                  <b
                    className={`font-semibold ${
                      hasTasks ? BUCKET_COUNT_COLORS[bucket.key] : 'text-text-muted'
                    }`}
                  >
                    {bucket.tasks.length}
                  </b>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-card-border py-16 text-center">
          <p className="text-3xl">{tab === 'DONE' ? '📭' : '🎉'}</p>
          <p className="text-sm font-medium text-text-primary">
            {tab === 'DONE' ? '아직 완료한 태스크가 없어요' : '처리할 일이 없어요'}
          </p>
          <p className="text-xs text-text-secondary">{EMPTY_MESSAGES[tab]}</p>
        </div>
      )}

      {tab === 'DONE' && !isEmpty && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            최근 완료
            <span className="text-xs font-normal text-text-secondary">최근 50건까지 보여줘요</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {(doneQuery.data ?? []).map((task) => (
              <MyDoneRow key={task.taskId} task={task} />
            ))}
          </ul>
        </section>
      )}

      {tab !== 'DONE' &&
        buckets
          .filter((bucket) => bucket.tasks.length > 0)
          .map((bucket) => (
            <section
              key={bucket.key}
              id={`my-tasks-${bucket.key}`}
              className="flex scroll-mt-4 flex-col gap-2"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                {bucket.label}
                <span className="rounded-full bg-content-bg px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {bucket.tasks.length}
                </span>
              </h2>
              <ul className="flex flex-col gap-2">
                {bucket.tasks.map((task) => (
                  <MyTaskRow key={task.taskId} task={task} isOverdue={bucket.key === 'OVERDUE'} />
                ))}
              </ul>
            </section>
          ))}
    </div>
  )
}
