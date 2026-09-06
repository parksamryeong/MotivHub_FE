import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { acceptInvite } from '../../api/invite'
import { getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { setPendingInviteToken } from './pendingInvite'

export function InviteAcceptPage(): ReactElement {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    if (!token) {
      navigate('/workspaces', { replace: true })
      return
    }

    if (!isAuthenticated) {
      setPendingInviteToken(token)
      navigate('/login', { replace: true })
      return
    }

    acceptInvite(token)
      .then((workspace) => {
        queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        navigate(`/workspaces/${workspace.id}`, { replace: true })
      })
      .catch((err) => {
        setError(getErrorMessage(err))
        setTimeout(() => navigate('/workspaces', { replace: true }), 3000)
      })
  }, [token, isAuthenticated, navigate, queryClient])

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar text-white">
      {error ?? '초대 처리 중...'}
    </div>
  )
}
