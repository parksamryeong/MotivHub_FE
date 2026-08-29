import { useEffect, useState, useRef, type FormEvent, type ReactElement } from 'react'
import { checkNicknameAvailable, updateNickname } from '../../api/user'
import type { UserProfile } from '../../api/types'

export function EditNicknameForm({
  currentNickname,
  onSaved,
  onCancel,
}: {
  currentNickname: string
  onSaved: (user: UserProfile) => void
  onCancel: () => void
}): ReactElement {
  const [nickname, setNickname] = useState(currentNickname)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nicknameRef = useRef(currentNickname)

  useEffect(() => {
    nicknameRef.current = nickname
    setChecking(false)

    if (!nickname || nickname === currentNickname) {
      setAvailable(nickname === currentNickname ? true : null)
      return
    }
    setChecking(true)
    setAvailable(null)
    const nicknameToCheck = nickname
    const timer = setTimeout(() => {
      checkNicknameAvailable(nicknameToCheck)
        .then((res) => {
          if (nicknameToCheck === nicknameRef.current) {
            setAvailable(res.available)
          }
        })
        .catch(() => {
          if (nicknameToCheck === nicknameRef.current) {
            setAvailable(null)
          }
        })
        .finally(() => {
          if (nicknameToCheck === nicknameRef.current) {
            setChecking(false)
          }
        })
    }, 400)
    return () => clearTimeout(timer)
  }, [nickname, currentNickname])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!available || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const user = await updateNickname(nickname)
      onSaved(user)
    } catch {
      setError('닉네임 변경에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        className="rounded border px-2 py-1"
      />
      <button
        type="submit"
        disabled={!available || checking || submitting}
        className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
      >
        저장
      </button>
      <button type="button" onClick={onCancel} className="rounded px-3 py-1">
        취소
      </button>
      {checking && <span className="text-sm text-gray-500">확인 중...</span>}
      {!checking && available === false && (
        <span className="text-sm text-red-600">사용 중인 닉네임</span>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  )
}
