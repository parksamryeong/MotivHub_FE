import type { ReactElement } from 'react'
import { oauthAuthorizeUrl } from '../../api/auth'
import type { OAuthProvider } from '../../api/types'

const PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: 'google', label: 'Google로 로그인' },
  { id: 'github', label: 'GitHub로 로그인' },
  { id: 'kakao', label: '카카오로 로그인' },
  { id: 'naver', label: '네이버로 로그인' },
]

export function LoginPage(): ReactElement {
  function handleLogin(provider: OAuthProvider) {
    window.location.href = oauthAuthorizeUrl(provider)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sidebar">
      <div className="flex w-80 flex-col items-center gap-3 rounded-xl bg-card-bg p-8 shadow-card">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">MotivHub 로그인</h1>
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleLogin(provider.id)}
            className="w-full rounded-lg border border-card-border px-4 py-2 text-text-primary hover:bg-content-bg"
          >
            {provider.label}
          </button>
        ))}
      </div>
    </div>
  )
}
