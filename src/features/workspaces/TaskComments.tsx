import { useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createComment, fetchComments } from '../../api/taskComment'
import { getErrorMessage } from '../../api/errors'

export function TaskComments({ taskId }: { taskId: number }): ReactElement {
  const queryClient = useQueryClient()
  const commentsQueryKey = ['tasks', taskId, 'comments'] as const
  const [commentText, setCommentText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => fetchComments(taskId),
  })

  const commentMutation = useMutation({
    mutationFn: (content: string) => createComment(taskId, content),
    onSuccess: (comments) => {
      setError(null)
      setCommentText('')
      queryClient.setQueryData(commentsQueryKey, comments)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || commentMutation.isPending) return
    commentMutation.mutate(commentText.trim())
  }

  return (
    <div className="border-t border-card-border pt-3">
      <h3 className="mb-2 text-sm font-semibold text-text-primary">댓글</h3>
      {isLoading && <p className="text-sm text-text-secondary">로딩 중...</p>}
      {isError && <p className="text-sm text-red-600">댓글을 불러오지 못했습니다.</p>}
      <ul className="flex flex-col gap-2">
        {data?.map((comment) => (
          <li key={comment.id} className="rounded-lg bg-content-bg p-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                {comment.author.nickname}
              </span>
              <span className="text-xs text-text-secondary">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-text-primary">{comment.content}</p>
          </li>
        ))}
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
          disabled={!commentText.trim() || commentMutation.isPending}
          className="rounded-lg bg-action px-3 py-2 text-sm text-action-text disabled:opacity-50"
        >
          등록
        </button>
      </form>
    </div>
  )
}
