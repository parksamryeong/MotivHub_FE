import { useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createComment, deleteComment, fetchComments, updateComment } from '../../api/taskComment'
import { getErrorMessage } from '../../api/errors'
import { LightbulbIcon, PencilIcon, TrashIcon } from '../../components/icons'
import type { TaskCommentResponse } from '../../api/types'

export function TaskComments({
  taskId,
  workspaceId,
  currentUserId,
  isWorkspaceOwner,
}: {
  taskId: number
  workspaceId: number
  currentUserId: number | undefined
  isWorkspaceOwner: boolean
}): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const commentsQueryKey = ['tasks', taskId, 'comments'] as const
  const [commentText, setCommentText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => fetchComments(taskId),
  })

  function upsertComment(comment: TaskCommentResponse) {
    queryClient.setQueryData<TaskCommentResponse[]>(commentsQueryKey, (old) => {
      if (!old) return [comment]
      const exists = old.some((c) => c.id === comment.id)
      return exists ? old.map((c) => (c.id === comment.id ? comment : c)) : [...old, comment]
    })
  }

  const createMutation = useMutation({
    mutationFn: (content: string) => createComment(taskId, content),
    onSuccess: (comment) => {
      setError(null)
      setCommentText('')
      upsertComment(comment)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateComment(taskId, commentId, content),
    onSuccess: (comment) => {
      setError(null)
      setEditingCommentId(null)
      upsertComment(comment)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(taskId, commentId),
    onSuccess: (_data, commentId) => {
      setError(null)
      queryClient.setQueryData<TaskCommentResponse[]>(commentsQueryKey, (old) =>
        old?.filter((c) => c.id !== commentId)
      )
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || createMutation.isPending) return
    createMutation.mutate(commentText.trim())
  }

  function handleEditSubmit(e: FormEvent, commentId: number) {
    e.preventDefault()
    if (!editDraft.trim() || updateMutation.isPending) return
    updateMutation.mutate({ commentId, content: editDraft.trim() })
  }

  function handleDelete(commentId: number) {
    if (deleteMutation.isPending) return
    if (confirm('이 댓글을 삭제하시겠습니까?')) {
      deleteMutation.mutate(commentId)
    }
  }

  return (
    <div className="border-t border-card-border pt-3">
      <h3 className="mb-2 text-sm font-semibold text-text-primary">댓글</h3>
      {isLoading && <p className="text-sm text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-sm text-red-600">댓글을 불러오지 못했습니다.</p>}
      <ul className="flex flex-col gap-2">
        {data?.map((comment) => {
          const isAuthor = comment.author.id === currentUserId
          const canEdit = isAuthor
          const canDelete = isAuthor || isWorkspaceOwner
          const isEditing = editingCommentId === comment.id

          return (
            <li
              key={comment.id}
              className="rounded-lg border border-card-border bg-card-bg p-3 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {comment.author.nickname}
                </span>
                <span className="text-xs text-text-secondary">
                  {new Date(comment.createdAt).toLocaleString()}
                  {comment.updatedAt !== comment.createdAt && ' (수정됨)'}
                </span>
              </div>
              {isEditing ? (
                <form
                  onSubmit={(e) => handleEditSubmit(e, comment.id)}
                  className="mt-1 flex flex-col gap-2"
                >
                  <input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    maxLength={1000}
                    className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-sm text-text-primary"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!editDraft.trim() || updateMutation.isPending}
                      className="rounded-lg bg-action px-2 py-1 text-xs text-action-text disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(null)}
                      className="text-xs text-text-primary"
                    >
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="mt-2 flex-1 text-sm text-text-primary">{comment.content}</p>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        navigate('/issues/new', {
                          state: { workspaceId, problemDescription: comment.content },
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-accent-subtle px-2 py-1 text-xs font-medium text-accent-subtle-text hover:opacity-80"
                    >
                      <LightbulbIcon />
                      이슈 등록
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditDraft(comment.content)
                          setEditingCommentId(comment.id)
                        }}
                        aria-label="수정"
                        title="수정"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-content-bg hover:text-text-primary"
                      >
                        <PencilIcon />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="삭제"
                        title="삭제"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
        {data && data.length === 0 && (
          <li className="text-sm text-text-secondary">아직 댓글이 없습니다.</li>
        )}
      </ul>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글 작성..."
          maxLength={1000}
          className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
        />
        <button
          type="submit"
          disabled={!commentText.trim() || createMutation.isPending}
          className="rounded-lg bg-action px-3 py-2 text-sm text-action-text disabled:opacity-50"
        >
          등록
        </button>
      </form>
    </div>
  )
}
