import { useState, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInvite, fetchInvites, revokeInvite } from '../../api/invite'
import { getErrorMessage } from '../../api/errors'
import { getEmailFormatError } from '../auth/signupPassword'
import { CopyIcon, TrashIcon } from '../../components/icons'

export function InviteManagement({ workspaceId }: { workspaceId: number }): ReactElement {
  const queryClient = useQueryClient()
  const queryKey = ['workspaces', workspaceId, 'invites'] as const
  const [isCreating, setIsCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<{ id: number; ok: boolean } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchInvites(workspaceId),
  })

  const createMutation = useMutation({
    mutationFn: (emailToSend: string | null) => createInvite(workspaceId, emailToSend),
    onSuccess: (_data, emailToSend) => {
      setEmail('')
      setError(null)
      setSuccessMessage(emailToSend ? '초대 메일을 보냈어요.' : '초대 링크를 생성했어요.')
      setTimeout(() => setSuccessMessage(null), 3000)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setError(getErrorMessage(error)),
  })

  const emailFormatError = email.trim() ? getEmailFormatError(email.trim()) : null

  const revokeMutation = useMutation({
    mutationFn: (inviteId: number) => revokeInvite(workspaceId, inviteId),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setError(getErrorMessage(error)),
  })

  async function handleCopy(inviteId: number, token: string) {
    const url = `${window.location.origin}/invites/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus({ id: inviteId, ok: true })
    } catch {
      setCopyStatus({ id: inviteId, ok: false })
    }
    setTimeout(() => setCopyStatus(null), 2000)
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-text-primary">초대</h2>

      {!isCreating ? (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-lg bg-action px-4 py-2 text-action-text hover:bg-action/90"
        >
          초대 생성
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-card-border p-3">
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="메일로 보낼 이메일 입력"
              autoFocus
              className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
            />
            <button
              type="button"
              onClick={() => createMutation.mutate(email.trim())}
              disabled={!email.trim() || !!emailFormatError || createMutation.isPending}
              className="flex-shrink-0 whitespace-nowrap rounded-lg bg-action px-3 py-2 text-sm font-medium text-action-text hover:bg-action/90 disabled:opacity-50"
            >
              {createMutation.isPending ? '처리 중...' : '메일로 보내기'}
            </button>
          </div>
          {emailFormatError && <span className="text-xs text-red-600">{emailFormatError}</span>}

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-card-border" />
            <span className="text-xs text-text-secondary">또는</span>
            <div className="h-px flex-1 bg-card-border" />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => createMutation.mutate(null)}
              disabled={createMutation.isPending}
              className="rounded-lg border border-action px-3 py-1.5 text-sm font-medium text-action hover:bg-action/10 disabled:opacity-50"
            >
              {createMutation.isPending ? '처리 중...' : '이메일 없이 링크만 생성'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false)
                setEmail('')
                setError(null)
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-text-primary hover:bg-content-bg"
            >
              취소
            </button>
          </div>
        </div>
      )}
      {successMessage && <p className="text-sm text-accent-subtle-text">{successMessage}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading && <p className="text-text-secondary">초대 목록 로딩 중...</p>}
      {isError && <p className="text-red-600">초대 목록을 불러오지 못했습니다.</p>}
      {data && data.length === 0 && <p className="text-text-secondary">활성화된 초대가 없습니다.</p>}

      <ul className="mt-2 flex flex-col gap-2">
        {data?.map((invite) => (
          <li
            key={invite.id}
            className="flex items-center justify-between rounded-xl bg-card-bg px-3 py-2 shadow-card"
          >
            <div className="flex flex-col text-sm">
              <span className="text-text-primary">{`${window.location.origin}/invites/${invite.token}`}</span>
              {invite.email && <span className="text-text-secondary">받는 사람: {invite.email}</span>}
              <span className="text-text-secondary">
                만료: {new Date(invite.expiresAt).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(invite.id, invite.token)}
                aria-label="링크 복사"
                title="링크 복사"
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-content-bg hover:text-text-primary"
              >
                <CopyIcon />
              </button>
              {copyStatus?.id === invite.id && (
                <span className={copyStatus.ok ? 'text-xs text-green-600' : 'text-xs text-red-600'}>
                  {copyStatus.ok ? '복사됨' : '복사 실패'}
                </span>
              )}
              <button
                type="button"
                onClick={() => revokeMutation.mutate(invite.id)}
                disabled={revokeMutation.isPending}
                aria-label="초대 무효화"
                title="무효화"
                className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <TrashIcon />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
