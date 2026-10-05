import { useState, type FormEvent, type ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginWithEmail, oauthAuthorizeUrl } from '../../api/auth'
import { fetchMe } from '../../api/user'
import { getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { consumePendingInviteToken } from '../workspaces/pendingInvite'
import { GithubIcon, GoogleIcon, KakaoIcon } from './socialIcons'
import type { OAuthProvider } from '../../api/types'

const SOCIAL_PROVIDERS: { id: OAuthProvider; label: string; icon: ReactElement; className: string }[] = [
  {
    id: 'google',
    label: 'Google로 계속하기',
    icon: <GoogleIcon />,
    className: 'border border-card-border bg-white hover:bg-gray-50',
  },
  {
    id: 'github',
    label: 'GitHub로 계속하기',
    icon: <GithubIcon />,
    className: 'bg-[#181717] text-white hover:bg-[#181717]/90',
  },
  {
    id: 'kakao',
    label: '카카오로 계속하기',
    icon: <KakaoIcon />,
    className: 'bg-[#FEE500] hover:bg-[#FEE500]/90',
  },
]

const FEATURES = [
  { icon: '📋', title: '칸반 보드로 작업 관리', desc: '할 일을 만들고 진행 상태를 팀과 함께 추적하세요' },
  { icon: '⚡', title: '실시간 공동편집', desc: '문서를 여러 명이 동시에 편집해도 안전하게 동기화됩니다' },
  { icon: '💡', title: '트러블슈팅 지식 공유', desc: '댓글 하나로 팀의 노하우를 이슈 게시판에 쌓아가세요' },
]

export function LoginPage(): ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const notice = (location.state as { notice?: string } | null)?.notice

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSocialLogin(provider: OAuthProvider) {
    window.location.href = oauthAuthorizeUrl(provider)
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const tokens = await loginWithEmail(email.trim(), password)
      setTokens(tokens)
      const user = await fetchMe()
      setUser(user)
      if (!user.nicknameConfigured) {
        navigate('/onboarding/nickname', { replace: true })
        return
      }
      const pendingToken = consumePendingInviteToken()
      navigate(pendingToken ? `/invites/${pendingToken}` : '/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-sidebar">
      <div className="relative hidden flex-col justify-center overflow-hidden px-16 py-12 md:flex md:flex-[1.9]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-action/20 blur-3xl" />

        <div className="relative flex max-w-xl flex-col gap-12">
          <span className="text-3xl font-bold text-white">MotivHub</span>

          <div className="flex flex-col gap-4">
            <h1 className="text-5xl font-bold leading-snug text-white">
              팀의 작업과 지식을,
              <br />
              한 곳에서 함께.
            </h1>
            <p className="max-w-md text-base text-sidebar-muted">
              흩어진 태스크 관리, 파일 공유, 이슈 공유를 하나의 워크스페이스로 모은 팀 협업
              허브입니다.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-xl">
                  {feature.icon}
                </span>
                <div>
                  <p className="text-base font-semibold text-white">{feature.title}</p>
                  <p className="text-sm text-sidebar-muted">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-content-bg px-6 py-12 md:justify-end md:pr-8">
        <div className="flex w-[420px] flex-col gap-5 rounded-xl border border-card-border bg-card-bg p-10 shadow-card">
          <div className="mb-1 flex flex-col gap-1 md:hidden">
            <span className="text-xl font-bold text-text-primary">MotivHub</span>
            <p className="text-sm text-text-secondary">팀의 작업과 지식을 한 곳에서 함께</p>
          </div>

          <h2 className="text-2xl font-bold text-text-primary">로그인</h2>

          <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoComplete="email"
              className="rounded-lg border border-card-border bg-card-bg px-4 py-3 text-base text-text-primary"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              maxLength={72}
              className="rounded-lg border border-card-border bg-card-bg px-4 py-3 text-base text-text-primary"
            />
            <div className="-mt-1 text-right">
              <Link to="/password-reset" className="text-sm text-text-secondary hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            {notice && !error && <p className="text-sm text-accent-subtle-text">{notice}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={!email.trim() || !password || isSubmitting}
              className="mt-1 rounded-lg bg-action px-4 py-3 text-base font-medium text-action-text disabled:opacity-50"
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="font-medium text-accent-subtle-text">
              회원가입
            </Link>
          </p>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-card-border" />
            <span className="text-xs text-text-secondary">간편로그인</span>
            <div className="h-px flex-1 bg-card-border" />
          </div>

          <div className="flex justify-center gap-4">
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleSocialLogin(provider.id)}
                aria-label={provider.label}
                title={provider.label}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${provider.className}`}
              >
                {provider.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
