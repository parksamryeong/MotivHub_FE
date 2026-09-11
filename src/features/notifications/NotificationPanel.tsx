import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../api/notification'
import { fetchTask } from '../../api/task'
import { getErrorMessage } from '../../api/errors'
import type { NotificationResponse } from '../../api/types'

const PAGE_SIZE = 20

export function NotificationPanel({ onClose }: { onClose: () => void }): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['notifications'],
      queryFn: ({ pageParam }) => fetchNotifications(pageParam, PAGE_SIZE),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
    })

  const notifications = data?.pages.flatMap((page) => page.content) ?? []

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

  async function handleNotificationClick(notification: NotificationResponse) {
    setError(null)
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id)
    }
    try {
      const task = await fetchTask(notification.targetId)
      onClose()
      navigate(`/workspaces/${task.workspaceId}?taskId=${notification.targetId}`)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="absolute left-full top-0 z-50 ml-2 flex w-80 flex-col gap-2 rounded-xl bg-card-bg p-3 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">알림</h3>
        <button
          type="button"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || notifications.length === 0}
          className="text-xs text-accent-subtle-text disabled:opacity-50"
        >
          전체 읽음 처리
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
        {isLoading && <p className="text-xs text-text-secondary">로딩 중...</p>}
        {isError && <p className="text-xs text-red-600">알림을 불러오지 못했습니다.</p>}
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleNotificationClick(notification)}
            className={`rounded-lg p-2 text-left text-xs hover:bg-content-bg ${
              notification.isRead ? 'text-text-secondary' : 'font-semibold text-text-primary'
            }`}
          >
            <p>{notification.message}</p>
            <span className="text-[10px] font-normal text-text-secondary">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
          </button>
        ))}
        {notifications.length === 0 && !isLoading && (
          <p className="text-xs text-text-secondary">알림이 없습니다.</p>
        )}
        {hasNextPage && (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-1 self-center text-xs text-accent-subtle-text disabled:opacity-50"
          >
            {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
          </button>
        )}
      </div>
    </div>
  )
}
