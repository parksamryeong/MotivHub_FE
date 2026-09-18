import type { ReactElement } from 'react'
import { oauthAuthorizeUrl } from '../../api/auth'
import type { OAuthProvider } from '../../api/types'

const PROVIDERS: {
  id: OAuthProvider
  label: string
  className: string
}[] = [
  {
    id: 'google',
    label: 'Google로 계속하기',
    className: 'border border-card-border bg-white text-gray-700 hover:bg-gray-50',
  },
  {
    id: 'github',
    label: 'GitHub로 계속하기',
    className: 'bg-[#181717] text-white hover:bg-[#181717]/90',
  },
  {
    id: 'kakao',
    label: '카카오로 계속하기',
    className: 'bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/90',
  },
  {
    id: 'naver',
    label: '네이버로 계속하기',
    className: 'bg-[#03C75A] text-white hover:bg-[#03C75A]/90',
  },
]

const FEATURES = [
  { icon: '📋', title: '칸반 보드로 작업 관리', desc: '할 일을 만들고 진행 상태를 팀과 함께 추적하세요' },
  { icon: '⚡', title: '실시간 공동편집', desc: '문서를 여러 명이 동시에 편집해도 안전하게 동기화됩니다' },
  { icon: '💡', title: '트러블슈팅 지식 공유', desc: '댓글 하나로 팀의 노하우를 이슈 게시판에 쌓아가세요' },
]

export function LoginPage(): ReactElement {
  function handleLogin(provider: OAuthProvider) {
    window.location.href = oauthAuthorizeUrl(provider)
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

      <div className="flex flex-1 items-center justify-center bg-content-bg px-6 py-12 md:justify-end md:pr-16">
        <div className="flex w-80 flex-col gap-3 rounded-xl border border-card-border bg-card-bg p-8 shadow-card">
          <div className="mb-2 flex flex-col gap-1 md:hidden">
            <span className="text-xl font-bold text-text-primary">MotivHub</span>
            <p className="text-sm text-text-secondary">팀의 작업과 지식을 한 곳에서 함께</p>
          </div>

          <h2 className="mb-2 text-xl font-bold text-text-primary">로그인</h2>

          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleLogin(provider.id)}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${provider.className}`}
            >
              {provider.label}
            </button>
          ))}

          <p className="mt-2 text-center text-xs text-text-secondary">
            계정이 없으신가요? 위 버튼으로 로그인하면 자동으로 가입됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
