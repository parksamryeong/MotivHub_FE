import { useState, type FormEvent, type ReactElement } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteIssue,
  fetchIssue,
  createIssueComment,
  fetchIssueComments,
  updateIssueComment,
  deleteIssueComment,
} from '../../api/issue'
import { getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { PencilIcon, TrashIcon } from '../../components/icons'
import type { IssueCommentResponse } from '../../api/types'

export function IssueDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const issueId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')

  const issueQuery = useQuery({
    queryKey: ['issues', issueId],
    queryFn: () => fetchIssue(issueId),
  })

  const commentsQueryKey = ['issues', issueId, 'comments'] as const
  const commentsQuery = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => fetchIssueComments(issueId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteIssue(issueId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['issues', issueId], exact: true })
      queryClient.invalidateQueries({ queryKey: ['issues'], exact: true })
      navigate('/issues', { replace: true })
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  })

  const commentMutation = useMutation({
    mutationFn: (content: string) => createIssueComment(issueId, content),
    onSuccess: (comment) => {
      setCommentError(null)
      setCommentText('')
      queryClient.setQueryData<IssueCommentResponse[]>(commentsQueryKey, (old) =>
        old ? [...old, comment] : [comment]
      )
    },
    onError: (err) => setCommentError(getErrorMessage(err)),
  })

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateIssueComment(issueId, commentId, content),
    onSuccess: (comment) => {
      setCommentError(null)
      setEditingCommentId(null)
      queryClient.setQueryData<IssueCommentResponse[]>(commentsQueryKey, (old) =>
        old?.map((c) => (c.id === comment.id ? comment : c))
      )
    },
    onError: (err) => setCommentError(getErrorMessage(err)),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteIssueComment(issueId, commentId),
    onSuccess: (_data, commentId) => {
      setCommentError(null)
      queryClient.setQueryData<IssueCommentResponse[]>(commentsQueryKey, (old) =>
        old?.filter((c) => c.id !== commentId)
      )
    },
    onError: (err) => setCommentError(getErrorMessage(err)),
  })

  function handleDelete() {
    if (deleteMutation.isPending) return
    if (confirm('이 이슈를 삭제하시겠습니까?')) {
      deleteMutation.mutate()
    }
  }

  function handleCommentSubmit(e: FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || commentMutation.isPending) return
    commentMutation.mutate(commentText.trim())
  }

  function handleCommentEditSubmit(e: FormEvent, commentId: number) {
    e.preventDefault()
    if (!editDraft.trim() || updateCommentMutation.isPending) return
    updateCommentMutation.mutate({ commentId, content: editDraft.trim() })
  }

  function handleCommentDelete(commentId: number) {
    if (deleteCommentMutation.isPending) return
    if (confirm('이 댓글을 삭제하시겠습니까?')) {
      deleteCommentMutation.mutate(commentId)
    }
  }

  if (issueQuery.isLoading) {
    return <p className="text-text-secondary">로딩 중...</p>
  }
  if (issueQuery.isError || !issueQuery.data) {
    return <p className="text-red-600">이슈를 불러오지 못했습니다.</p>
  }

  const issue = issueQuery.data
  const isAuthor = issue.author.id === currentUserId

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link to="/issues" className="text-sm text-accent-subtle-text">
        ← 이슈 게시판
      </Link>

      <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-bg p-6 shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-subtle-text">
              {issue.workspaceName}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                issue.solution
                  ? 'bg-accent-subtle text-accent-subtle-text'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {issue.solution ? '해결됨' : '미해결'}
            </span>
          </div>

          {isAuthor && (
            <div className="flex items-center gap-1">
              <Link
                to={`/issues/${issueId}/edit`}
                aria-label="수정"
                title="수정"
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-content-bg hover:text-text-primary"
              >
                <PencilIcon />
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                aria-label="삭제"
                title="삭제"
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-text-primary">{issue.title}</h1>
        <div className="text-right">
          <span className="text-xs text-text-secondary">
            {issue.author.nickname} · {new Date(issue.createdAt).toLocaleString()}
            {issue.updatedAt !== issue.createdAt && ' (수정됨)'}
          </span>
        </div>

        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        <div>
          <h2 className="mb-1 text-sm font-semibold text-text-primary">문제상황/원인</h2>
          <p className="whitespace-pre-wrap text-sm text-text-primary">
            {issue.problemDescription}
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-sm font-semibold text-text-primary">해결방법</h2>
          {issue.solution ? (
            <p className="whitespace-pre-wrap text-sm text-text-primary">{issue.solution}</p>
          ) : (
            <p className="text-sm text-text-secondary">아직 해결되지 않았습니다.</p>
          )}
        </div>
      </div>

      <div className="pt-1">
        <h3 className="mb-2 text-sm font-semibold text-text-primary">댓글</h3>
        {commentsQuery.isLoading && <p className="text-sm text-text-secondary">로딩 중...</p>}
        {commentsQuery.isError && (
          <p className="text-sm text-red-600">댓글을 불러오지 못했습니다.</p>
        )}
        <ul className="flex flex-col gap-2">
          {commentsQuery.data?.map((comment) => {
            const canManageComment = comment.author.id === currentUserId
            const isEditingComment = editingCommentId === comment.id

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
                {isEditingComment ? (
                  <form
                    onSubmit={(e) => handleCommentEditSubmit(e, comment.id)}
                    className="mt-2 flex flex-col gap-2"
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
                        disabled={!editDraft.trim() || updateCommentMutation.isPending}
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
                    {canManageComment && (
                      <div className="flex flex-shrink-0 items-center gap-1">
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
                        <button
                          type="button"
                          onClick={() => handleCommentDelete(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                          aria-label="삭제"
                          title="삭제"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
          {commentsQuery.data && commentsQuery.data.length === 0 && (
            <li className="text-sm text-text-secondary">아직 댓글이 없습니다.</li>
          )}
        </ul>
        {commentError && <p className="mt-2 text-sm text-red-600">{commentError}</p>}
        <form onSubmit={handleCommentSubmit} className="mt-2 flex gap-2">
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
    </div>
  )
}
