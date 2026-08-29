import { useEffect, useState, useRef, type FormEvent, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkNicknameAvailable, updateNickname } from '../../api/user'
import { useAuthStore } from '../../stores/authStore'

export function OnboardingNicknamePage(): ReactElement {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [nickname, setNickname] = useState('')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nicknameRef = useRef('')

  useEffect(() => {
    nicknameRef.current = nickname

    if (!nickname) {
      setAvailable(null)
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
        .finally(() => setChecking(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [nickname])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!available || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const user = await updateNickname(nickname)
      setUser(user)
      navigate('/mypage', { replace: true })
    } catch {
      setError('닉네임 설정에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-bold">닉네임을 설정해주세요</h1>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          className="w-64 rounded border px-3 py-2"
        />
        {checking && <p className="text-sm text-gray-500">확인 중...</p>}
        {!checking && available === true && (
          <p className="text-sm text-green-600">사용 가능한 닉네임입니다</p>
        )}
        {!checking && available === false && (
          <p className="text-sm text-red-600">이미 사용 중인 닉네임입니다</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!available || checking || submitting}
          className="w-64 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? '저장 중...' : '완료'}
        </button>
      </form>
    </div>
  )
}
