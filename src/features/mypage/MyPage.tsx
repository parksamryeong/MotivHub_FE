import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMyPage, deleteAccount } from '../../api/user'
import { logout } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import { EditNicknameForm } from './EditNicknameForm'

export function MyPage(): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mypage'],
    queryFn: fetchMyPage,
  })

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clear()
      navigate('/login', { replace: true })
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      clear()
      navigate('/login', { replace: true })
    } catch {
      setDeleteError('탈퇴 처리에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) return <div className="p-8">로딩 중...</div>
  if (isError || !data) return <div className="p-8">프로필을 불러오지 못했습니다.</div>

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">마이페이지</h1>
      {data.profileImageUrl && (
        <img
          src={data.profileImageUrl}
          alt="프로필 이미지"
          className="h-16 w-16 rounded-full"
        />
      )}
      <div>
        <span className="text-sm text-gray-500">닉네임</span>
        {isEditing ? (
          <EditNicknameForm
            currentNickname={data.nickname}
            onSaved={() => {
              setIsEditing(false)
              queryClient.invalidateQueries({ queryKey: ['mypage'] })
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <p>{data.nickname}</p>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600"
            >
              수정
            </button>
          </div>
        )}
      </div>
      <div>
        <span className="text-sm text-gray-500">이메일</span>
        <p>{data.email}</p>
      </div>
      <div>
        <span className="text-sm text-gray-500">가입일</span>
        <p>{new Date(data.createdAt).toLocaleDateString()}</p>
      </div>

      <button type="button" onClick={handleLogout} className="rounded border px-4 py-2">
        로그아웃
      </button>

      {showDeleteConfirm ? (
        <div className="rounded border border-red-300 p-3">
          <p className="mb-2 text-sm">정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
            >
              {deleting ? '처리 중...' : '탈퇴하기'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded px-3 py-1"
            >
              취소
            </button>
          </div>
          {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-sm text-red-600"
        >
          회원 탈퇴
        </button>
      )}
    </div>
  )
}
