import type { MyTaskResponse } from '../../api/types'

export type MyTaskBucketKey = 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING'

export interface MyTaskBucket {
  key: MyTaskBucketKey
  label: string
  tasks: MyTaskResponse[]
}

const BUCKET_ORDER: MyTaskBucketKey[] = ['OVERDUE', 'TODAY', 'THIS_WEEK', 'UPCOMING']

const BUCKET_LABELS: Record<MyTaskBucketKey, string> = {
  OVERDUE: '지연됨',
  TODAY: '오늘 마감',
  THIS_WEEK: '이번 주 마감',
  UPCOMING: '예정',
}

// "2026-09-20" 같은 날짜 전용 문자열을 new Date()로 바로 파싱하면 UTC 자정으로
// 해석되어, 로컬 타임존에 따라 하루가 밀리는 버그가 생길 수 있다. 연/월/일을
// 직접 분해해서 로컬 타임존 기준 Date를 만들어 이 문제를 피한다.
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function dateOnlyTime(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function endOfWeekTime(today: Date): number {
  const day = today.getDay() // 0(일) ~ 6(토)
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysUntilSunday
  ).getTime()
}

export function groupMyTasksByUrgency(tasks: MyTaskResponse[], today: Date): MyTaskBucket[] {
  const todayTime = dateOnlyTime(today)
  const weekEndTime = endOfWeekTime(today)

  const grouped: Record<MyTaskBucketKey, MyTaskResponse[]> = {
    OVERDUE: [],
    TODAY: [],
    THIS_WEEK: [],
    UPCOMING: [],
  }

  for (const task of tasks) {
    if (task.status === 'EXPIRED') {
      grouped.OVERDUE.push(task)
      continue
    }
    const dueTime = dateOnlyTime(parseDateOnly(task.dueDate))
    if (dueTime === todayTime) {
      grouped.TODAY.push(task)
    } else if (dueTime > todayTime && dueTime <= weekEndTime) {
      grouped.THIS_WEEK.push(task)
    } else {
      grouped.UPCOMING.push(task)
    }
  }

  return BUCKET_ORDER.map((key) => ({
    key,
    label: BUCKET_LABELS[key],
    tasks: grouped[key],
  }))
}
