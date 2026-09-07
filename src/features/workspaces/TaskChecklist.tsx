import { useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createChecklistItem, deleteChecklistItem, updateChecklistItem } from '../../api/task'
import { getErrorMessage } from '../../api/errors'
import type { ChecklistItemResponse } from '../../api/types'

export function TaskChecklist({
  taskId,
  workspaceId,
  items,
  canManage,
}: {
  taskId: number
  workspaceId: number
  items: ChecklistItemResponse[]
  canManage: boolean
}): ReactElement {
  const queryClient = useQueryClient()
  const taskQueryKey = ['tasks', taskId] as const
  const tasksQueryKey = ['workspaces', workspaceId, 'tasks'] as const
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: taskQueryKey, exact: true })
    queryClient.invalidateQueries({ queryKey: tasksQueryKey })
  }

  const createMutation = useMutation({
    mutationFn: (value: string) => createChecklistItem(taskId, value),
    onSuccess: () => {
      setError(null)
      setContent('')
      invalidate()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: number; isDone: boolean }) =>
      updateChecklistItem(taskId, itemId, { isDone }),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (itemId: number) => deleteChecklistItem(taskId, itemId),
    onSuccess: () => {
      setError(null)
      invalidate()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() || createMutation.isPending) return
    createMutation.mutate(content.trim())
  }

  const doneCount = items.filter((item) => item.isDone).length

  return (
    <div className="border-t border-card-border pt-3">
      <h3 className="mb-2 text-sm font-semibold text-text-primary">
        체크리스트 ({doneCount}/{items.length})
      </h3>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.isDone}
              disabled={!canManage || toggleMutation.isPending}
              onChange={(e) =>
                toggleMutation.mutate({ itemId: item.id, isDone: e.target.checked })
              }
            />
            <span
              className={`flex-1 text-sm ${
                item.isDone ? 'text-text-secondary line-through' : 'text-text-primary'
              }`}
            >
              {item.content}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={deleteMutation.isPending}
                className="text-xs text-red-600"
              >
                삭제
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-text-secondary">체크리스트 항목이 없습니다.</li>
        )}
      </ul>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {canManage && (
        <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="체크리스트 항목 추가..."
            maxLength={200}
            className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
          />
          <button
            type="submit"
            disabled={!content.trim() || createMutation.isPending}
            className="rounded-lg bg-action px-3 py-2 text-sm text-action-text disabled:opacity-50"
          >
            추가
          </button>
        </form>
      )}
    </div>
  )
}
