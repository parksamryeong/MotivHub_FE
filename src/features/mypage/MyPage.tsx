import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMyPage, deleteAccount } from '../../api/user'
import { fetchWorkspaces } from '../../api/workspace'
import { useAuthStore } from '../../stores/authStore'
import { EditNicknameForm } from './EditNicknameForm'
import { NotificationSettings } from '../notifications/NotificationSettings'

export function MyPage(): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clear = useAuthStore((state) => state.clear)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mypage'],
    queryFn: fetchMyPage,
  })

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      clear()
      navigate('/login', { replace: true })
    },
  })

  if (isLoading) return <p className="text-text-secondary">로딩 중...</p>
  if (isError || !data) return <p className="text-red-600">프로필을 불러오지 못했습니다.</p>

  const totalCount = workspacesQuery.data?.length ?? 0
  const ownerCount =
    workspacesQuery.data?.filter((workspace) => workspace.myRole === 'OWNER').length ?? 0
  const memberCount =
    workspacesQuery.data?.filter((workspace) => workspace.myRole === 'MEMBER').length ?? 0

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-bold text-text-primary">마이페이지</h1>
      <div className="flex flex-col gap-4 rounded-xl bg-card-bg p-6 shadow-card">
        <div className="flex items-center gap-4">
          {data.profileImageUrl ? (
            <img
              src={data.profileImageUrl}
              alt={data.nickname}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-white">
              {data.nickname.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-text-primary">{data.nickname}</p>
            <p className="text-sm text-text-secondary">{data.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-card-border pt-4 text-center">
          <div>
            <p className="text-2xl font-bold text-text-primary">{totalCount}</p>
            <p className="text-xs text-text-secondary">총 워크스페이스</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{ownerCount}</p>
            <p className="text-xs text-text-secondary">OWNER</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{memberCount}</p>
            <p className="text-xs text-text-secondary">MEMBER</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-card-bg p-6 shadow-card">
        <h2 className="text-sm font-semibold text-text-primary">프로필 정보</h2>

        <div>
          <span className="text-sm text-text-secondary">닉네임</span>
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
              <p className="text-text-primary">{data.nickname}</p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-sm text-accent-subtle-text"
              >
                수정
              </button>
            </div>
          )}
        </div>

        <div>
          <span className="text-sm text-text-secondary">이메일</span>
          <p className="text-text-primary">{data.email}</p>
        </div>

        <div>
          <span className="text-sm text-text-secondary">가입일</span>
          <p className="text-text-primary">{new Date(data.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <NotificationSettings />

      <div className="flex flex-col gap-2 rounded-xl bg-card-bg p-6 shadow-card">
        <h2 className="text-sm font-semibold text-red-600">회원 탈퇴</h2>
        <p className="text-xs text-text-secondary">
          탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
        </p>

        {showDeleteConfirm ? (
          <div className="mt-2 rounded-lg border border-red-300 p-3">
            <p className="mb-2 text-sm text-text-primary">
              정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-3 py-1 text-white disabled:opacity-50"
              >
                {deleteMutation.isPending ? '처리 중...' : '탈퇴하기'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-3 py-1 text-text-primary"
              >
                취소
              </button>
            </div>
            {deleteMutation.isError && (
              <p className="mt-2 text-sm text-red-600">
                탈퇴 처리에 실패했습니다. 다시 시도해주세요.
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-1 self-start rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600"
          >
            회원 탈퇴
          </button>
        )}
      </div>
    </div>
  )
}
