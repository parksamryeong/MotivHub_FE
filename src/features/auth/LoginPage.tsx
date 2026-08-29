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
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <h1 className="mb-4 text-2xl font-bold">MotivHub 로그인</h1>
      {PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleLogin(provider.id)}
          className="w-64 rounded border px-4 py-2 hover:bg-gray-50"
        >
          {provider.label}
        </button>
      ))}
    </div>
  )
}
