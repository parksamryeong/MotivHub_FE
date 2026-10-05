import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { completePasswordReset, requestPasswordReset } from '../../api/auth'
import { getErrorCode, getErrorMessage } from '../../api/errors'
import { getEmailFormatError, getSignupPasswordError } from './signupPassword'

const RESEND_COOLDOWN_SECONDS = 30

const RESET_ERROR_MESSAGES: Record<string, string> = {
  INVALID_PASSWORD_RESET_TOKEN: '먼저 인증코드를 받아주세요.',
  PASSWORD_RESET_TOKEN_EXPIRED: '인증코드가 만료되었습니다. 재발급 후 다시 시도해주세요.',
  PASSWORD_RESET_CODE_MISMATCH: '인증코드가 올바르지 않습니다.',
}

export function PasswordResetPage(): ReactElement {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [isCodeRequested, setIsCodeRequested] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const emailFormatError = email && !isCodeRequested ? getEmailFormatError(email.trim()) : null
  const passwordError = newPassword ? getSignupPasswordError(newPassword) : null
  const canSubmit =
    isCodeRequested && code.length === 6 && newPassword.length > 0 && !passwordError

  async function handleRequestCode() {
    if (!email.trim() || isRequesting || cooldown > 0 || emailFormatError) return
    setIsRequesting(true)
    setRequestError(null)
    try {
      await requestPasswordReset(email.trim())
      setIsCodeRequested(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setRequestError(getErrorMessage(err))
    } finally {
      setIsRequesting(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (isLocked || isSubmitting || !canSubmit) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      await completePasswordReset(email.trim(), code, newPassword)
      navigate('/login', {
        replace: true,
        state: { notice: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.' },
      })
    } catch (err) {
      const errorCode = getErrorCode(err)
      if (errorCode === 'TOO_MANY_PASSWORD_RESET_ATTEMPTS') {
        setIsLocked(true)
        return
      }
      setFormError((errorCode && RESET_ERROR_MESSAGES[errorCode]) ?? getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-content-bg px-6 py-12">
      <div className="flex w-96 flex-col gap-4 rounded-xl border border-card-border bg-card-bg p-8 shadow-card">
        <span className="text-xl font-bold text-text-primary">MotivHub</span>
        <h1 className="text-lg font-bold text-text-primary">비밀번호 재설정</h1>

        {isLocked ? (
          <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            <p className="font-semibold">인증 시도 횟수를 초과했습니다.</p>
            <p>잠시 후(30분) 다시 시도해주세요. 재발급으로는 풀리지 않습니다.</p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">이메일</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isCodeRequested}
                  placeholder="you@example.com"
                  autoFocus
                  className="flex-1 rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary disabled:bg-content-bg disabled:text-text-secondary"
                />
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={
                    !email.trim() || !!emailFormatError || isRequesting || cooldown > 0
                  }
                  className="flex-shrink-0 whitespace-nowrap rounded-lg border border-action px-3 py-2 text-xs font-medium text-action disabled:opacity-50"
                >
                  {cooldown > 0
                    ? `재발급 (${cooldown}s)`
                    : isRequesting
                      ? '전송 중...'
                      : isCodeRequested
                        ? '재발급'
                        : '인증코드 받기'}
                </button>
              </div>
              {emailFormatError && !requestError && (
                <span className="text-xs text-red-600">{emailFormatError}</span>
              )}
              {requestError && <span className="text-xs text-red-600">{requestError}</span>}
              {isCodeRequested && !requestError && (
                <span className="text-xs text-accent-subtle-text">
                  가입된 이메일이라면 안내 메일을 보냈습니다. 소셜 로그인으로 가입하셨다면 메일의
                  안내에 따라 해당 서비스로 로그인해주세요.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">인증코드 (6자리)</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
                disabled={!isCodeRequested}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary disabled:bg-content-bg disabled:text-text-secondary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-text-secondary">새 비밀번호</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={!isCodeRequested}
                autoComplete="new-password"
                maxLength={72}
                className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary disabled:bg-content-bg disabled:text-text-secondary"
              />
              {passwordError && <span className="text-xs text-red-600">{passwordError}</span>}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="mt-1 rounded-lg bg-action px-4 py-2 text-sm font-medium text-action-text disabled:opacity-50"
            >
              {isSubmitting ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-text-secondary">
          <Link to="/login" className="font-medium text-accent-subtle-text">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  )
}
