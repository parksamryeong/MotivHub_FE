import type { ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNotificationSettings, updateNotificationSetting } from '../../api/notification'
import { getErrorMessage } from '../../api/errors'
import { NOTIFICATION_ICONS, NOTIFICATION_LABELS, NOTIFICATION_TYPE_ORDER } from './notificationTypes'
import type { NotificationType } from '../../api/types'

const settingsQueryKey = ['notifications', 'settings'] as const

export function NotificationSettings(): ReactElement {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchNotificationSettings,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationType; enabled: boolean }) =>
      updateNotificationSetting(type, enabled),
    onMutate: async ({ type, enabled }) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKey })
      const previous = queryClient.getQueryData(settingsQueryKey)
      queryClient.setQueryData<typeof data>(settingsQueryKey, (old) =>
        old?.map((setting) => (setting.type === type ? { ...setting, enabled } : setting))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsQueryKey, context.previous)
      }
    },
  })

  if (isLoading) return <p className="text-sm text-text-secondary">로딩 중...</p>
  if (isError || !data) {
    return <p className="text-sm text-red-600">알림 설정을 불러오지 못했습니다.</p>
  }

  const enabledByType = new Map(data.map((setting) => [setting.type, setting.enabled]))

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card-bg p-6 shadow-card">
      <h2 className="text-sm font-semibold text-text-primary">알림 설정</h2>
      {toggleMutation.isError && (
        <p className="text-xs text-red-600">{getErrorMessage(toggleMutation.error)}</p>
      )}
      <ul className="flex flex-col gap-1">
        {NOTIFICATION_TYPE_ORDER.map((type) => {
          const enabled = enabledByType.get(type) ?? true
          return (
            <li key={type} className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <span aria-hidden="true">{NOTIFICATION_ICONS[type]}</span>
                {NOTIFICATION_LABELS[type]}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggleMutation.mutate({ type, enabled: !enabled })}
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  enabled ? 'bg-accent' : 'bg-card-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
