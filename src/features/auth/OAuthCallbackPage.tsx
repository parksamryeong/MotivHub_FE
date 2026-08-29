import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCode } from '../../api/auth'
import { fetchMe } from '../../api/user'
import { useAuthStore } from '../../stores/authStore'

export function OAuthCallbackPage(): ReactElement {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const code = searchParams.get('code')
    const oauthError = searchParams.get('error')

    if (oauthError) {
      setError('소셜 로그인에 실패했습니다. 다시 시도해주세요.')
      setTimeout(() => navigate('/login', { replace: true }), 1500)
      return
    }

    if (!code) {
      setError('잘못된 접근입니다.')
      setTimeout(() => navigate('/login', { replace: true }), 1500)
      return
    }

    exchangeCode(code)
      .then((tokens) => {
        setTokens(tokens)
        return fetchMe()
      })
      .then((user) => {
        setUser(user)
        navigate(user.nicknameConfigured ? '/mypage' : '/onboarding/nickname', {
          replace: true,
        })
      })
      .catch(() => {
        setError('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
        setTimeout(() => navigate('/login', { replace: true }), 1500)
      })
  }, [searchParams, navigate, setTokens, setUser])

  return (
    <div className="flex h-screen items-center justify-center">
      {error ?? '로그인 처리 중...'}
    </div>
  )
}
