import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { OAuthCallbackPage } from '../features/auth/OAuthCallbackPage'
import { OnboardingNicknamePage } from '../features/auth/OnboardingNicknamePage'
import { MyPage } from '../features/mypage/MyPage'
import { WorkspaceListPage } from '../features/workspaces/WorkspaceListPage'
import { WorkspaceBoardPage } from '../features/workspaces/WorkspaceBoardPage'
import { WorkspaceDetailPage } from '../features/workspaces/WorkspaceDetailPage'
import { InviteAcceptPage } from '../features/workspaces/InviteAcceptPage'
import { AppLayout } from '../layouts/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  {
    path: '/onboarding/nickname',
    element: (
      <ProtectedRoute>
        <OnboardingNicknamePage />
      </ProtectedRoute>
    ),
  },
  { path: '/invites/:token', element: <InviteAcceptPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/mypage', element: <MyPage /> },
      { path: '/workspaces', element: <WorkspaceListPage /> },
      { path: '/workspaces/:id', element: <WorkspaceBoardPage /> },
      { path: '/workspaces/:id/settings', element: <WorkspaceDetailPage /> },
      { path: '*', element: <Navigate to="/workspaces" replace /> },
    ],
  },
])
