import { useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInvite, fetchInvites, revokeInvite } from '../../api/invite'
import { getErrorMessage } from '../../api/errors'

export function InviteManagement({ workspaceId }: { workspaceId: number }): ReactElement {
  const queryClient = useQueryClient()
  const queryKey = ['workspaces', workspaceId, 'invites'] as const
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<{ id: number; ok: boolean } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchInvites(workspaceId),
  })

  const createMutation = useMutation({
    mutationFn: () => createInvite(workspaceId, email.trim() || null),
    onSuccess: () => {
      setEmail('')
      setError(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setError(getErrorMessage(error)),
  })

  const revokeMutation = useMutation({
    mutationFn: (inviteId: number) => revokeInvite(workspaceId, inviteId),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setError(getErrorMessage(error)),
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (createMutation.isPending) return
    createMutation.mutate()
  }

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

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일(선택, 비우면 링크형 초대)"
          className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-text-primary"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-lg bg-action px-4 py-2 text-action-text disabled:opacity-50"
        >
          {createMutation.isPending ? '생성 중...' : '초대 생성'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading && <p className="text-text-secondary">초대 목록 로딩 중...</p>}
      {isError && <p className="text-red-600">초대 목록을 불러오지 못했습니다.</p>}
      {data && data.length === 0 && <p className="text-text-secondary">활성화된 초대가 없습니다.</p>}

      <ul className="mt-2 flex flex-col gap-2">
        {data?.map((invite) => (
          <li
            key={invite.id}
            className="flex items-center justify-between rounded-xl bg-card-bg px-3 py-2 shadow-[0_1px_3px_rgba(17,24,39,0.08)]"
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
                className="text-sm text-accent-subtle-text"
              >
                복사
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
                className="text-sm text-red-600 disabled:opacity-50"
              >
                무효화
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
