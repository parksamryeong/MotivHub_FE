import { useState, type ReactElement } from 'react'
import { dateOnlyTime, parseDateOnly } from '../tasks/myTasksBuckets'
import { PRIORITY_BADGE_CLASSES } from './taskPriority'
import type { TaskPriority } from '../../api/types'

// 보드/내 할 일 캘린더가 공통으로 쓸 수 있도록, 각 화면의 응답 타입(TaskResponse,
// MyTaskResponse)이 구조적으로 만족하는 최소 필드만 요구한다.
export interface CalendarTask {
  id: number
  name: string
  startDate: string
  dueDate: string
  priority: TaskPriority
  completedAt: string | null
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MAX_VISIBLE_PER_DAY = 3

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function buildGridDays(monthAnchor: Date): Date[] {
  const monthStart = startOfMonth(monthAnchor)
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - monthStart.getDay())

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    return day
  })
}

export function TaskCalendar({
  tasks,
  onTaskClick,
}: {
  tasks: CalendarTask[]
  onTaskClick: (taskId: number) => void
}): ReactElement {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))

  const days = buildGridDays(monthAnchor)
  const todayTime = dateOnlyTime(new Date())
  const currentMonth = monthAnchor.getMonth()

  function tasksOn(day: Date): CalendarTask[] {
    const dayTime = dateOnlyTime(day)
    return tasks.filter((task) => {
      const startTime = dateOnlyTime(parseDateOnly(task.startDate))
      const dueTime = dateOnlyTime(parseDateOnly(task.dueDate))
      return startTime <= dayTime && dayTime <= dueTime
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card-bg p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          {monthAnchor.getFullYear()}년 {monthAnchor.getMonth() + 1}월
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            aria-label="이전 달"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-content-bg hover:text-text-primary"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setMonthAnchor(startOfMonth(new Date()))}
            className="rounded-md px-2 py-1 text-xs text-text-secondary hover:bg-content-bg hover:text-text-primary"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() =>
              setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            aria-label="다음 달"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-content-bg hover:text-text-primary"
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-lg border border-card-border bg-card-border text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-content-bg py-1.5 text-center font-medium text-text-secondary"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const dayTasks = tasksOn(day)
          const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_PER_DAY)
          const hiddenCount = dayTasks.length - visibleTasks.length
          const isToday = dateOnlyTime(day) === todayTime
          const isCurrentMonth = day.getMonth() === currentMonth

          return (
            <div
              key={day.toISOString()}
              className={`flex min-h-24 flex-col gap-1 bg-card-bg p-1 ${
                isCurrentMonth ? '' : 'opacity-40'
              }`}
            >
              <span
                className={`self-start rounded-full px-1.5 text-[11px] ${
                  isToday ? 'bg-action font-semibold text-action-text' : 'text-text-secondary'
                }`}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {visibleTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskClick(task.id)}
                    title={task.name}
                    className={`truncate rounded px-1 py-0.5 text-left text-[11px] font-medium hover:opacity-80 ${
                      PRIORITY_BADGE_CLASSES[task.priority]
                    } ${task.completedAt ? 'opacity-50 line-through' : ''}`}
                  >
                    {task.name}
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <span className="px-1 text-[11px] text-text-secondary">+{hiddenCount}개</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
