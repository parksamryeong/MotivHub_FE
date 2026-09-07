import type { ReactElement, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { TaskStatus } from '../../api/types'

export function BoardColumn({
  status,
  label,
  count,
  creatable,
  onAddClick,
  children,
}: {
  status: TaskStatus
  label: string
  count: number
  creatable: boolean
  onAddClick: () => void
  children: ReactNode
}): ReactElement {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors ${
        isOver ? 'border-accent bg-accent-subtle/30' : 'border-card-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          {label} ({count})
        </h2>
        {creatable && (
          <button
            type="button"
            onClick={onAddClick}
            className="text-sm text-accent-subtle-text"
          >
            + 추가
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
