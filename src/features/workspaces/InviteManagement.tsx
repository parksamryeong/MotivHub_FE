import { useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInvite, fetchInvites, revokeInvite } from '../../api/invite'
import { getErrorMessage } from '../../api/errors'

export function InviteManagement({ workspaceId }: { workspaceId: number }): ReactElement {
  const queryClient = useQueryClient()
  const queryKey = ['workspaces', workspaceId, 'invites'] as const
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => setError(getErrorMessage(error)),
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (createMutation.isPending) return
    createMutation.mutate()
  }

  async function handleCopy(token: string) {
    const url = `${window.location.origin}/invites/${token}`
    await navigator.clipboard.writeText(url)
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">초대</h2>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일(선택, 비우면 링크형 초대)"
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {createMutation.isPending ? '생성 중...' : '초대 생성'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading && <p>초대 목록 로딩 중...</p>}
      {isError && <p className="text-red-600">초대 목록을 불러오지 못했습니다.</p>}
      {data && data.length === 0 && <p className="text-gray-500">활성화된 초대가 없습니다.</p>}

      <ul className="mt-2 flex flex-col gap-2">
        {data?.map((invite) => (
          <li
            key={invite.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            <div className="flex flex-col text-sm">
              <span>{`${window.location.origin}/invites/${invite.token}`}</span>
              {invite.email && <span className="text-gray-500">받는 사람: {invite.email}</span>}
              <span className="text-gray-500">
                만료: {new Date(invite.expiresAt).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(invite.token)}
                className="text-sm text-blue-600"
              >
                복사
              </button>
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
