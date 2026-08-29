import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { OAuthCallbackPage } from '../features/auth/OAuthCallbackPage'
import { OnboardingNicknamePage } from '../features/auth/OnboardingNicknamePage'
import { MyPage } from '../features/mypage/MyPage'
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
  {
    path: '/mypage',
    element: (
      <ProtectedRoute>
        <MyPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <ProtectedRoute>
        <Navigate to="/mypage" replace />
      </ProtectedRoute>
    ),
  },
])
