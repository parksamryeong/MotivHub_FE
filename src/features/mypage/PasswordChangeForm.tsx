import { useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '../../api/user'
import { getErrorCode, getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { getSignupPasswordError } from '../auth/signupPassword'

const CHANGE_ERROR_MESSAGES: Record<string, string> = {
  CURRENT_PASSWORD_MISMATCH: '현재 비밀번호가 올바르지 않습니다.',
  NEW_PASSWORD_SAME_AS_CURRENT: '새 비밀번호가 현재 비밀번호와 같습니다.',
}

export function PasswordChangeForm({ onCancel }: { onCancel: () => void }): ReactElement {
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const newPasswordError = newPassword ? getSignupPasswordError(newPassword) : null
  const canSubmit = currentPassword.length > 0 && newPassword.length > 0 && !newPasswordError

  const mutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      clear()
      navigate('/login', {
        replace: true,
        state: { notice: '비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.' },
      })
    },
  })

  const errorCode = getErrorCode(mutation.error)
  const errorMessage = mutation.isError
    ? (errorCode && CHANGE_ERROR_MESSAGES[errorCode]) ?? getErrorMessage(mutation.error)
    : null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || mutation.isPending) return
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="현재 비밀번호"
        autoComplete="current-password"
        maxLength={72}
        className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
      />
      <div className="flex flex-col gap-1">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="새 비밀번호 (영문+숫자 8~72자)"
          autoComplete="new-password"
          maxLength={72}
          className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
        />
        {newPasswordError && <span className="text-xs text-red-600">{newPasswordError}</span>}
      </div>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit || mutation.isPending}
          className="rounded-lg bg-action px-3 py-1.5 text-sm font-medium text-action-text disabled:opacity-50"
        >
          {mutation.isPending ? '변경 중...' : '변경하기'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-text-primary"
        >
          취소
        </button>
      </div>
    </form>
  )
}
