import { useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteWorkspace,
  fetchWorkspaceDetail,
  kickMember,
  leaveWorkspace,
  renameWorkspace,
  transferOwnership,
} from '../../api/workspace'
import { getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { InviteManagement } from './InviteManagement'

export function WorkspaceDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const workspaceId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const queryKey = ['workspaces', workspaceId] as const

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchWorkspaceDetail(workspaceId),
    enabled: Number.isFinite(workspaceId),
  })

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameWorkspace(workspaceId, name),
    onSuccess: () => {
      setActionError(null)
      setIsEditingName(false)
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const kickMutation = useMutation({
    mutationFn: (targetUserId: number) => kickMember(workspaceId, targetUserId),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const transferMutation = useMutation({
    mutationFn: (newOwnerUserId: number) => transferOwnership(workspaceId, newOwnerUserId),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const leaveMutation = useMutation({
    mutationFn: () => leaveWorkspace(workspaceId),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      navigate('/workspaces', { replace: true })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(workspaceId),
    onSuccess: () => {
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.removeQueries({ queryKey })
      navigate('/workspaces', { replace: true })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  function handleRenameSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nameDraft.trim() || renameMutation.isPending) return
    renameMutation.mutate(nameDraft.trim())
  }

  if (isLoading) return <p className="text-text-secondary">로딩 중...</p>
  if (isError || !data) {
    return <p className="text-red-600">찾을 수 없거나 접근 권한이 없습니다.</p>
  }

  const isOwner = data.myRole === 'OWNER'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <form onSubmit={handleRenameSubmit} className="flex flex-1 gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={50}
              className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
              autoFocus
            />
            <button
              type="submit"
              disabled={!nameDraft.trim() || renameMutation.isPending}
              className="rounded-lg bg-action px-3 py-2 text-action-text disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="rounded-lg px-3 py-2 text-text-primary"
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-text-primary">{data.name}</h1>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(data.name)
                  setIsEditingName(true)
                }}
                className="text-sm text-accent-subtle-text"
              >
                수정
              </button>
            )}
          </>
        )}
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <div>
        <h2 className="mb-2 text-lg font-semibold text-text-primary">멤버</h2>
        <ul className="flex flex-col gap-2">
          {data.members.map((member) => (
            <li
              key={member.user.id}
              className="flex items-center justify-between rounded-xl bg-card-bg px-3 py-2 shadow-card"
            >
              <div className="flex items-center gap-2">
                {member.user.profileImageUrl && (
                  <img
                    src={member.user.profileImageUrl}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-text-primary">{member.user.nickname}</span>
                <span className="rounded-md bg-accent-subtle px-2 py-1 text-xs font-medium text-accent-subtle-text">
                  {member.role === 'OWNER' ? '오너' : '멤버'}
                </span>
                <span className="text-xs text-text-secondary">
                  가입일 {new Date(member.joinedAt).toLocaleDateString()}
                </span>
              </div>
              {isOwner && member.user.id !== currentUserId && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`${member.user.nickname}님을 오너로 지정할까요?`)) {
                        transferMutation.mutate(member.user.id)
                      }
                    }}
                    className="text-sm text-accent-subtle-text"
                  >
                    오너십 이전
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`${member.user.nickname}님을 추방할까요?`)) {
                        kickMutation.mutate(member.user.id)
                      }
                    }}
                    className="text-sm text-red-600"
                  >
                    추방
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isOwner && <InviteManagement workspaceId={workspaceId} />}

      <div className="flex flex-col gap-2 border-t border-card-border pt-4">
        <button
          type="button"
          onClick={() => {
            if (confirm('워크스페이스에서 나가시겠습니까?')) {
              leaveMutation.mutate()
            }
          }}
          disabled={leaveMutation.isPending}
          className="self-start rounded-lg border border-card-border px-4 py-2 text-text-primary disabled:opacity-50"
        >
          나가기
        </button>

        {isOwner &&
          (showDeleteConfirm ? (
            <div className="rounded-lg border border-red-300 p-3">
              <p className="mb-2 text-sm text-text-primary">
                정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-3 py-1 text-white disabled:opacity-50"
                >
                  {deleteMutation.isPending ? '처리 중...' : '삭제하기'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg px-3 py-1 text-text-primary"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="self-start text-sm text-red-600"
            >
              워크스페이스 삭제
            </button>
          ))}
      </div>
    </div>
  )
}
