import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notification'
import { getErrorMessage } from '../../api/errors'
import { NOTIFICATION_ICONS, NOTIFICATION_LABELS, NOTIFICATION_TYPE_ORDER } from './notificationTypes'
import type { NotificationResponse, NotificationType } from '../../api/types'

const PAGE_SIZE = 20

type ReadFilter = 'ALL' | 'UNREAD'

export function NotificationsListPage(): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [readFilter, setReadFilter] = useState<ReadFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'ALL'>('ALL')

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['notifications'],
      queryFn: ({ pageParam }) => fetchNotifications(pageParam, PAGE_SIZE),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
    })

  const allNotifications = data?.pages.flatMap((page) => page.content) ?? []
  const notifications = allNotifications.filter((notification) => {
    if (readFilter === 'UNREAD' && notification.isRead) return false
    if (typeFilter !== 'ALL' && notification.type !== typeFilter) return false
    return true
  })

  function invalidateNotifications() {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
  }

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: invalidateNotifications,
    onError: (err) => setError(getErrorMessage(err)),
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidateNotifications,
    onError: (err) => setError(getErrorMessage(err)),
  })

  function handleClick(notification: NotificationResponse) {
    setError(null)
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id)
    }
    navigate(`/tasks/${notification.targetId}`)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">알림</h1>
        <button
          type="button"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || allNotifications.length === 0}
          className="text-sm text-accent-subtle-text disabled:opacity-50"
        >
          전체 읽음 처리
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-card-border bg-card-bg p-0.5">
          {(['ALL', 'UNREAD'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setReadFilter(key)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                readFilter === key
                  ? 'bg-action text-action-text'
                  : 'text-text-secondary hover:bg-content-bg'
              }`}
            >
              {key === 'ALL' ? '전체' : '안읽음'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              typeFilter === 'ALL'
                ? 'bg-sidebar text-white'
                : 'border border-card-border bg-card-bg text-text-secondary hover:bg-content-bg'
            }`}
          >
            All
          </button>
          {NOTIFICATION_TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                typeFilter === type
                  ? 'bg-sidebar text-white'
                  : 'border border-card-border bg-card-bg text-text-secondary hover:bg-content-bg'
              }`}
            >
              {NOTIFICATION_ICONS[type]} {NOTIFICATION_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-text-secondary">로딩 중...</p>}
        {isError && <p className="text-sm text-red-600">알림을 불러오지 못했습니다.</p>}
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleClick(notification)}
            className={`flex items-start gap-2 rounded-xl bg-card-bg p-3 text-left shadow-card hover:shadow-card-hover ${
              notification.isRead ? 'text-text-secondary' : 'text-text-primary'
            }`}
          >
            <span className="flex-shrink-0" aria-hidden="true">
              {NOTIFICATION_ICONS[notification.type]}
            </span>
            <div className="flex-1">
              <p className={`text-sm ${notification.isRead ? '' : 'font-semibold'}`}>
                {notification.message}
              </p>
              <span className="text-xs text-text-secondary">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </div>
            {!notification.isRead && (
              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
            )}
          </button>
        ))}
        {!isLoading && notifications.length === 0 && (
          <p className="py-8 text-center text-sm text-text-secondary">
            {readFilter === 'UNREAD' ? '안 읽은 알림이 없습니다.' : '알림이 없습니다.'}
          </p>
        )}
        {hasNextPage && (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="self-center text-sm text-accent-subtle-text disabled:opacity-50"
          >
            {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
          </button>
        )}
      </div>
    </div>
  )
}
