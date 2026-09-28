import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { completeSignup, requestSignupVerification } from '../../api/auth'
import { fetchMe } from '../../api/user'
import { getErrorCode, getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { consumePendingInviteToken } from '../workspaces/pendingInvite'
import { getNicknameFormatError } from '../mypage/nicknameFormat'
import { getSignupPasswordError } from './signupPassword'

const RESEND_COOLDOWN_SECONDS = 30

export function SignupPage(): ReactElement {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)

  const [email, setEmail] = useState('')
  const [isVerificationSent, setIsVerificationSent] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailErrorCode, setEmailErrorCode] = useState<string | undefined>(undefined)
  const [cooldown, setCooldown] = useState(0)

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleSendCode() {
    if (!email.trim() || isSendingCode || cooldown > 0) return
    setIsSendingCode(true)
    setEmailError(null)
    setEmailErrorCode(undefined)
    try {
      await requestSignupVerification(email.trim())
      setIsVerificationSent(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setEmailError(getErrorMessage(err))
      setEmailErrorCode(getErrorCode(err))
    } finally {
      setIsSendingCode(false)
    }
  }

  const nicknameError = nickname ? getNicknameFormatError(nickname) : null
  const passwordError = password ? getSignupPasswordError(password) : null
  const canSubmit =
    isVerificationSent &&
    code.length === 6 &&
    password.length > 0 &&
    !passwordError &&
    nickname.length > 0 &&
    !nicknameError

  async function handleCompleteSignup(e: FormEvent) {
    e.preventDefault()
    if (isLocked || isCompleting || !canSubmit) return
    setIsCompleting(true)
    setFormError(null)
    try {
      const tokens = await completeSignup(email.trim(), code, password, nickname.trim())
      setTokens(tokens)
      const user = await fetchMe()
      setUser(user)
      const pendingToken = consumePendingInviteToken()
      navigate(pendingToken ? `/invites/${pendingToken}` : '/dashboard', { replace: true })
    } catch (err) {
      if (getErrorCode(err) === 'TOO_MANY_VERIFICATION_ATTEMPTS') {
        setIsLocked(true)
      }
      setFormError(getErrorMessage(err))
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-content-bg px-6 py-12">
      <div className="flex w-96 flex-col gap-4 rounded-xl border border-card-border bg-card-bg p-8 shadow-card">
        <span className="text-xl font-bold text-text-primary">MotivHub</span>
        <h1 className="text-lg font-bold text-text-primary">회원가입</h1>

        {isLocked ? (
          <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            <p className="font-semibold">인증 시도 횟수를 초과했습니다.</p>
            <p>보안을 위해 30분 후에 다시 시도할 수 있습니다. 재발급으로는 풀리지 않습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleCompleteSignup} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">이메일</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isVerificationSent}
                  placeholder="you@example.com"
                  autoFocus
                  className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary disabled:bg-content-bg disabled:text-text-secondary"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!email.trim() || isSendingCode || cooldown > 0}
                  className="flex-shrink-0 whitespace-nowrap rounded-lg border border-action px-3 py-2 text-xs font-medium text-action disabled:opacity-50"
                >
                  {cooldown > 0
                    ? `재발급 (${cooldown}s)`
                    : isSendingCode
                      ? '전송 중...'
                      : isVerificationSent
                        ? '재발급'
                        : '인증코드 받기'}
                </button>
              </div>
              {emailError && (
                <span className="text-xs text-red-600">
                  {emailError}
                  {emailErrorCode === 'EMAIL_ALREADY_REGISTERED' && (
                    <>
                      {' '}
                      <Link to="/login" className="font-medium underline">
                        로그인하러 가기
                      </Link>
                    </>
                  )}
                </span>
              )}
              {isVerificationSent && !emailError && (
                <span className="text-xs text-accent-subtle-text">인증코드를 보냈어요.</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">인증코드 (6자리)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                disabled={!isVerificationSent}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary disabled:bg-content-bg disabled:text-text-secondary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isVerificationSent}
                autoComplete="new-password"
                maxLength={72}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary disabled:bg-content-bg disabled:text-text-secondary"
              />
              {passwordError && <span className="text-xs text-red-600">{passwordError}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">닉네임</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={!isVerificationSent}
                maxLength={15}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary disabled:bg-content-bg disabled:text-text-secondary"
              />
              {nicknameError && <span className="text-xs text-red-600">{nicknameError}</span>}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={!canSubmit || isCompleting}
              className="mt-1 rounded-lg bg-action px-4 py-2 text-sm font-medium text-action-text disabled:opacity-50"
            >
              {isCompleting ? '가입 중...' : '가입 완료'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-text-secondary">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-accent-subtle-text">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
