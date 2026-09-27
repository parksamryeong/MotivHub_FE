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

  const [step, setStep] = useState<'EMAIL' | 'VERIFY'>('EMAIL')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailErrorCode, setEmailErrorCode] = useState<string | undefined>(undefined)
  const [isSendingCode, setIsSendingCode] = useState(false)

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || isSendingCode) return
    setIsSendingCode(true)
    setEmailError(null)
    setEmailErrorCode(undefined)
    try {
      await requestSignupVerification(email.trim())
      setStep('VERIFY')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setEmailError(getErrorMessage(err))
      setEmailErrorCode(getErrorCode(err))
    } finally {
      setIsSendingCode(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isSendingCode || isLocked) return
    setIsSendingCode(true)
    setVerifyError(null)
    try {
      await requestSignupVerification(email.trim())
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setVerifyError(getErrorMessage(err))
    } finally {
      setIsSendingCode(false)
    }
  }

  const nicknameError = nickname ? getNicknameFormatError(nickname) : null
  const passwordError = password ? getSignupPasswordError(password) : null
  const canSubmitVerify =
    code.length === 6 && !passwordError && password.length > 0 && !nicknameError && nickname.length > 0

  async function handleCompleteSignup(e: FormEvent) {
    e.preventDefault()
    if (isLocked || isCompleting || !canSubmitVerify) return
    setIsCompleting(true)
    setVerifyError(null)
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
      setVerifyError(getErrorMessage(err))
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-content-bg px-6 py-12">
      <div className="flex w-96 flex-col gap-4 rounded-xl border border-card-border bg-card-bg p-8 shadow-card">
        <span className="text-xl font-bold text-text-primary">MotivHub</span>
        <h1 className="text-lg font-bold text-text-primary">회원가입</h1>

        {step === 'EMAIL' ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-2">
            <label className="text-sm text-text-secondary">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
            />
            {emailError && (
              <div className="text-sm text-red-600">
                {emailError}
                {emailErrorCode === 'EMAIL_ALREADY_REGISTERED' && (
                  <>
                    {' '}
                    <Link to="/login" className="font-medium underline">
                      로그인하러 가기
                    </Link>
                  </>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={!email.trim() || isSendingCode}
              className="mt-2 rounded-lg bg-action px-4 py-2 text-sm font-medium text-action-text disabled:opacity-50"
            >
              {isSendingCode ? '전송 중...' : '인증코드 받기'}
            </button>
          </form>
        ) : isLocked ? (
          <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            <p className="font-semibold">인증 시도 횟수를 초과했습니다.</p>
            <p>보안을 위해 30분 후에 다시 시도할 수 있습니다. 재발급으로는 풀리지 않습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleCompleteSignup} className="flex flex-col gap-3">
            <p className="text-xs text-text-secondary">
              <b className="text-text-primary">{email}</b>로 인증코드를 보냈어요.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">인증코드 (6자리)</label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="123456"
                  autoFocus
                  className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
                />
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isSendingCode}
                  className="flex-shrink-0 whitespace-nowrap rounded-lg border border-card-border px-3 py-2 text-xs text-text-secondary disabled:opacity-50"
                >
                  {cooldown > 0 ? `재발급 (${cooldown}s)` : '재발급'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                maxLength={72}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
              />
              {passwordError && <span className="text-xs text-red-600">{passwordError}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">닉네임</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={15}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
              />
              {nicknameError && <span className="text-xs text-red-600">{nicknameError}</span>}
            </div>

            {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}

            <button
              type="submit"
              disabled={!canSubmitVerify || isCompleting}
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
