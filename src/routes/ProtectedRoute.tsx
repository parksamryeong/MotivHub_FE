import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function ProtectedRoute({ children }: { children: ReactElement }): ReactElement {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (
    user &&
    user.nicknameConfigured === false &&
    location.pathname !== '/onboarding/nickname'
  ) {
    return <Navigate to="/onboarding/nickname" replace />
  }

  return children
}
