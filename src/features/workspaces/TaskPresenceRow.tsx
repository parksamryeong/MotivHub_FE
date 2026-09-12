import type { ReactElement } from 'react'
import type { UserSummary } from '../../api/types'

export function TaskPresenceRow({ viewers }: { viewers: UserSummary[] }): ReactElement | null {
  if (viewers.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary">지금 같이 보는 중</span>
      <div className="flex -space-x-1">
        {viewers.map((viewer) =>
          viewer.profileImageUrl ? (
            <img
              key={viewer.id}
              src={viewer.profileImageUrl}
              alt={viewer.nickname}
              title={viewer.nickname}
              className="h-6 w-6 rounded-full border-2 border-card-bg"
            />
          ) : (
            <div
              key={viewer.id}
              title={viewer.nickname}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card-bg bg-accent text-[10px] font-semibold text-white"
            >
              {viewer.nickname.slice(0, 1)}
            </div>
          )
        )}
      </div>
    </div>
  )
}
