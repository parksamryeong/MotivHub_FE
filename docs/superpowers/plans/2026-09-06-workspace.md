# 워크스페이스 관리 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MotivHub_FE에 워크스페이스 관리 기능(생성/목록/상세/멤버/초대/나가기/오너십이전/삭제) 전체를 구현하고, 로그인 후 기본 화면을 워크스페이스 목록으로 전환한다.

**Architecture:** 기존 로그인 기능의 패턴(axios `apiClient` + TanStack Query + Zustand 인증 스토어)을 그대로 따른다. 워크스페이스 데이터는 별도 전역 스토어 없이 전부 TanStack Query로 관리한다. 마이페이지/워크스페이스 화면을 공통 `AppLayout`(상단 네비게이션)으로 묶고, 초대 링크(`/invites/:token`)는 미인증 사용자도 진입 가능해야 하므로 `ProtectedRoute` 밖의 독립 페이지로 구현한다.

**Tech Stack:** React + TypeScript + Vite, React Router, TanStack Query, Zustand, axios, Tailwind CSS (기존 로그인 기능과 동일)

## Global Constraints

- 백엔드 오리진/인증 방식은 로그인 기능과 동일: `VITE_API_BASE_URL` env var, `Authorization: Bearer {accessToken}` 헤더, 401은 기존 axios 인터셉터가 처리(리프레시 재시도) — 이 기능에서 새로 처리하지 않는다
- API 엔드포인트/메서드/바디/응답은 정확히 아래를 따른다 (스펙 원문):
  - `POST /api/workspaces` `{ name }` → `WorkspaceResponse` (인증 필요)
  - `GET /api/workspaces` → `WorkspaceResponse[]` (인증 필요)
  - `GET /api/workspaces/{id}` → `WorkspaceDetailResponse` (멤버만)
  - `PATCH /api/workspaces/{id}` `{ name }` → `WorkspaceResponse` (OWNER 전용)
  - `DELETE /api/workspaces/{id}` → 204 (OWNER 전용)
  - `POST /api/workspaces/{id}/leave` → 204 (MEMBER 자유, OWNER는 혼자일 때만 — 아니면 400 `WORKSPACE_LEAVE_REQUIRES_TRANSFER`)
  - `POST /api/workspaces/{id}/transfer-ownership` `{ newOwnerUserId }` → 204 (OWNER 전용)
  - `DELETE /api/workspaces/{id}/members/{targetUserId}` → 204 (OWNER 전용)
  - `POST /api/workspaces/{id}/invites` `{ email: string|null }` → `WorkspaceInviteResponse` (OWNER 전용)
  - `GET /api/workspaces/{id}/invites` → `WorkspaceInviteResponse[]` (OWNER 전용, 만료/무효화 건 제외)
  - `DELETE /api/workspaces/{id}/invites/{inviteId}` → 204 (OWNER 전용)
  - `POST /api/invites/{token}/accept` → `WorkspaceResponse` (인증된 유저 누구나, 토큰만 유효하면)
- `WorkspaceResponse`: `{ id: number, name: string, myRole: 'OWNER'|'MEMBER', createdAt: string }`
- `WorkspaceDetailResponse`: `WorkspaceResponse & { members: MemberSummary[] }`
- `MemberSummary`: `{ user: UserSummary, role: 'OWNER'|'MEMBER', joinedAt: string }`
- `UserSummary`: `{ id: number, nickname: string, profileImageUrl: string|null }`
- `WorkspaceInviteResponse`: `{ id: number, token: string, email: string|null, expiresAt: string }`
- 에러 응답 포맷: `{ code: string, message: string, timestamp: string }` — 프론트는 `message`를 그대로 표시하고 코드별 한국어 매핑은 만들지 않는다 (단, 필터 단 401은 이 포맷이 아닐 수 있음 — 기존 인터셉터가 처리하는 영역이라 이 기능에서 신경쓰지 않는다)
- 로그인 성공/온보딩 완료 후 기본 이동 대상을 `/mypage` → **`/workspaces`**로 변경
- 자동화 테스트 스위트는 이번 범위 밖 — 각 태스크는 `npm run build`(타입체크+번들 성공) 및 명시된 수동 QA로 검증한다
- **커밋 금지(컨트롤러 세션)**: 컨트롤러 세션은 `git commit`을 실행하지 않는다. 태스크 구현 시 로컬 커밋은 허용되며, 실행자(에이전트)는 커밋 메시지를 **한국어로**, 각 커밋이 실제로 무엇을 바꿨는지 구체적으로 드러나게 작성한다
- `git push`는 어떤 태스크에서도 실행하지 않는다
- 현재 `feature/workspace` 브랜치에서 작업한다 (`main`에서 분기, 이미 생성되어 있음)
- `docs/superpowers/`는 `.gitignore` 처리되어 있다 — 이 계획 문서나 스펙 문서를 커밋 대상에 포함시키지 않는다

---

## File Structure

```
src/
  api/
    types.ts                              # (수정) WorkspaceResponse 등 타입 추가
    errors.ts                             # (신규) getErrorMessage
    workspace.ts                          # (신규) 워크스페이스 CRUD API 함수
    invite.ts                             # (신규) 초대 API 함수
  layouts/
    AppLayout.tsx                         # (신규) 상단 네비게이션 + <Outlet/>
  routes/
    router.tsx                            # (수정) AppLayout 레이아웃 라우트, 초대 라우트 추가
  features/
    auth/
      OAuthCallbackPage.tsx               # (수정) 기본 이동 대상 변경 + 대기 초대 소비
      OnboardingNicknamePage.tsx          # (수정) 동일
    mypage/
      MyPage.tsx                          # (수정) 로그아웃 버튼 제거(AppLayout으로 이동)
    workspaces/
      pendingInvite.ts                    # (신규) localStorage 기반 대기 초대 토큰 유틸
      WorkspaceListPage.tsx               # (신규) 목록 + 생성
      WorkspaceDetailPage.tsx             # (신규) 상세 + 이름수정 + 멤버관리 + 나가기/삭제
      InviteManagement.tsx                # (신규) 초대 생성/목록/무효화 (WorkspaceDetailPage에 포함)
      InviteAcceptPage.tsx                # (신규) 초대 수락 처리 전용 페이지
```

---

### Task 1: 공통 타입 + 에러 유틸

**Files:**
- Modify: `src/api/types.ts`
- Create: `src/api/errors.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `types.ts`에 추가: `WorkspaceRole`, `WorkspaceResponse`, `UserSummary`, `MemberSummary`, `WorkspaceDetailResponse`, `WorkspaceInviteResponse`, `ApiErrorResponse`
  - `errors.ts`: `getErrorMessage(error: unknown): string`

- [ ] **Step 1: `src/api/types.ts`에 아래 타입 추가** (파일 끝에 이어서 작성, 기존 내용은 그대로 둔다)

```ts
export type WorkspaceRole = 'OWNER' | 'MEMBER'

export interface WorkspaceResponse {
  id: number
  name: string
  myRole: WorkspaceRole
  createdAt: string
}

export interface UserSummary {
  id: number
  nickname: string
  profileImageUrl: string | null
}

export interface MemberSummary {
  user: UserSummary
  role: WorkspaceRole
  joinedAt: string
}

export interface WorkspaceDetailResponse extends WorkspaceResponse {
  members: MemberSummary[]
}

export interface WorkspaceInviteResponse {
  id: number
  token: string
  email: string | null
  expiresAt: string
}

export interface ApiErrorResponse {
  code: string
  message: string
  timestamp: string
}
```

- [ ] **Step 2: `src/api/errors.ts` 작성**

```ts
import { isAxiosError } from 'axios'
import type { ApiErrorResponse } from './types'

const DEFAULT_MESSAGE = '요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.'

export function getErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorResponse>(error) && error.response?.data?.message) {
    return error.response.data.message
  }
  return DEFAULT_MESSAGE
}
```

- [ ] **Step 3: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 4: 로컬 커밋**

한국어로, 이 태스크에서 실제로 추가한 내용(타입/에러 유틸)이 드러나게 커밋 메시지를 작성한다. `git push`는 하지 않는다.

---

### Task 2: 워크스페이스 API 함수

**Files:**
- Create: `src/api/workspace.ts`

**Interfaces:**
- Consumes: `apiClient` (`src/api/client.ts`, 기존 파일), `WorkspaceResponse`/`WorkspaceDetailResponse` (Task 1)
- Produces: `createWorkspace(name: string): Promise<WorkspaceResponse>`, `fetchWorkspaces(): Promise<WorkspaceResponse[]>`, `fetchWorkspaceDetail(id: number): Promise<WorkspaceDetailResponse>`, `renameWorkspace(id: number, name: string): Promise<WorkspaceResponse>`, `deleteWorkspace(id: number): Promise<void>`, `leaveWorkspace(id: number): Promise<void>`, `transferOwnership(id: number, newOwnerUserId: number): Promise<void>`, `kickMember(id: number, targetUserId: number): Promise<void>`

- [ ] **Step 1: `src/api/workspace.ts` 작성**

```ts
import { apiClient } from './client'
import type { WorkspaceResponse, WorkspaceDetailResponse } from './types'

export function createWorkspace(name: string): Promise<WorkspaceResponse> {
  return apiClient.post<WorkspaceResponse>('/api/workspaces', { name }).then((res) => res.data)
}

export function fetchWorkspaces(): Promise<WorkspaceResponse[]> {
  return apiClient.get<WorkspaceResponse[]>('/api/workspaces').then((res) => res.data)
}

export function fetchWorkspaceDetail(id: number): Promise<WorkspaceDetailResponse> {
  return apiClient
    .get<WorkspaceDetailResponse>(`/api/workspaces/${id}`)
    .then((res) => res.data)
}

export function renameWorkspace(id: number, name: string): Promise<WorkspaceResponse> {
  return apiClient
    .patch<WorkspaceResponse>(`/api/workspaces/${id}`, { name })
    .then((res) => res.data)
}

export function deleteWorkspace(id: number): Promise<void> {
  return apiClient.delete(`/api/workspaces/${id}`).then(() => undefined)
}

export function leaveWorkspace(id: number): Promise<void> {
  return apiClient.post(`/api/workspaces/${id}/leave`).then(() => undefined)
}

export function transferOwnership(id: number, newOwnerUserId: number): Promise<void> {
  return apiClient
    .post(`/api/workspaces/${id}/transfer-ownership`, { newOwnerUserId })
    .then(() => undefined)
}

export function kickMember(id: number, targetUserId: number): Promise<void> {
  return apiClient
    .delete(`/api/workspaces/${id}/members/${targetUserId}`)
    .then(() => undefined)
}
```

- [ ] **Step 2: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 3: 로컬 커밋**

한국어로, 이 태스크에서 추가한 API 함수 목록이 드러나게 커밋 메시지 작성.

---

### Task 3: 초대 API 함수

**Files:**
- Create: `src/api/invite.ts`

**Interfaces:**
- Consumes: `apiClient`, `WorkspaceResponse`/`WorkspaceInviteResponse` (Task 1)
- Produces: `createInvite(workspaceId: number, email: string | null): Promise<WorkspaceInviteResponse>`, `fetchInvites(workspaceId: number): Promise<WorkspaceInviteResponse[]>`, `revokeInvite(workspaceId: number, inviteId: number): Promise<void>`, `acceptInvite(token: string): Promise<WorkspaceResponse>`

- [ ] **Step 1: `src/api/invite.ts` 작성**

```ts
import { apiClient } from './client'
import type { WorkspaceResponse, WorkspaceInviteResponse } from './types'

export function createInvite(
  workspaceId: number,
  email: string | null
): Promise<WorkspaceInviteResponse> {
  return apiClient
    .post<WorkspaceInviteResponse>(`/api/workspaces/${workspaceId}/invites`, { email })
    .then((res) => res.data)
}

export function fetchInvites(workspaceId: number): Promise<WorkspaceInviteResponse[]> {
  return apiClient
    .get<WorkspaceInviteResponse[]>(`/api/workspaces/${workspaceId}/invites`)
    .then((res) => res.data)
}

export function revokeInvite(workspaceId: number, inviteId: number): Promise<void> {
  return apiClient
    .delete(`/api/workspaces/${workspaceId}/invites/${inviteId}`)
    .then(() => undefined)
}

export function acceptInvite(token: string): Promise<WorkspaceResponse> {
  return apiClient
    .post<WorkspaceResponse>(`/api/invites/${token}/accept`)
    .then((res) => res.data)
}
```

- [ ] **Step 2: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 3: 로컬 커밋**

한국어로, 초대 API 함수 추가 내용이 드러나게 커밋.

---

### Task 4: AppLayout + 라우팅 개편

**Files:**
- Create: `src/layouts/AppLayout.tsx`
- Create: `src/features/workspaces/WorkspaceListPage.tsx` (placeholder)
- Create: `src/features/workspaces/WorkspaceDetailPage.tsx` (placeholder)
- Create: `src/features/workspaces/InviteAcceptPage.tsx` (placeholder)
- Modify: `src/routes/router.tsx`
- Modify: `src/features/mypage/MyPage.tsx` (로그아웃 버튼 제거)

**Interfaces:**
- Consumes: `logout` (`src/api/auth.ts`, 기존), `useAuthStore` (기존), `ProtectedRoute` (기존, 수정 없음)
- Produces: `AppLayout(): ReactElement` (라우터의 레이아웃 라우트에서 사용). `WorkspaceListPage`/`WorkspaceDetailPage`/`InviteAcceptPage`는 이번 태스크에서 placeholder로 생성되고, Task 6/7/9에서 실제 구현으로 교체된다.

- [ ] **Step 1: `src/layouts/AppLayout.tsx` 작성**

```tsx
import type { ReactElement } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

export function AppLayout(): ReactElement {
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clear()
      navigate('/login', { replace: true })
    }
  }

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'font-bold text-blue-600' : 'text-gray-600'

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex gap-4">
          <NavLink to="/workspaces" className={navLinkClassName}>
            워크스페이스
          </NavLink>
          <NavLink to="/mypage" className={navLinkClassName}>
            마이페이지
          </NavLink>
        </div>
        <button type="button" onClick={handleLogout} className="text-sm text-gray-600">
          로그아웃
        </button>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: placeholder 컴포넌트 3개 생성**

Create `src/features/workspaces/WorkspaceListPage.tsx`:
```tsx
export function WorkspaceListPage() {
  return <div>Workspace List (placeholder)</div>
}
```

Create `src/features/workspaces/WorkspaceDetailPage.tsx`:
```tsx
export function WorkspaceDetailPage() {
  return <div>Workspace Detail (placeholder)</div>
}
```

Create `src/features/workspaces/InviteAcceptPage.tsx`:
```tsx
export function InviteAcceptPage() {
  return <div>Invite Accept (placeholder)</div>
}
```

- [ ] **Step 3: `src/routes/router.tsx`를 아래 내용으로 전체 교체**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { OAuthCallbackPage } from '../features/auth/OAuthCallbackPage'
import { OnboardingNicknamePage } from '../features/auth/OnboardingNicknamePage'
import { MyPage } from '../features/mypage/MyPage'
import { WorkspaceListPage } from '../features/workspaces/WorkspaceListPage'
import { WorkspaceDetailPage } from '../features/workspaces/WorkspaceDetailPage'
import { InviteAcceptPage } from '../features/workspaces/InviteAcceptPage'
import { AppLayout } from '../layouts/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  {
    path: '/onboarding/nickname',
    element: (
      <ProtectedRoute>
        <OnboardingNicknamePage />
      </ProtectedRoute>
    ),
  },
  { path: '/invites/:token', element: <InviteAcceptPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/mypage', element: <MyPage /> },
      { path: '/workspaces', element: <WorkspaceListPage /> },
      { path: '/workspaces/:id', element: <WorkspaceDetailPage /> },
      { path: '*', element: <Navigate to="/workspaces" replace /> },
    ],
  },
])
```

`ProtectedRoute`는 기존 그대로 사용한다 (레이아웃 라우트를 한 번만 감싸는 구조로 바뀌었을 뿐, `ProtectedRoute` 자체 코드는 수정하지 않는다). `/invites/:token`은 의도적으로 `ProtectedRoute`로 감싸지 않는다 — 미인증 사용자도 이 경로에 진입해야 하기 때문이다 (Task 9에서 자체적으로 인증 여부를 분기).

- [ ] **Step 4: `src/features/mypage/MyPage.tsx`에서 로그아웃 버튼 제거**

파일 전체를 아래 내용으로 교체한다 (로그아웃 관련 import, 함수, 버튼만 제거하고 나머지는 동일):

```tsx
import { useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchMyPage, deleteAccount } from '../../api/user'
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
```

- [ ] **Step 5: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 6: 수동 QA**

Run: `npm run dev`. 인증된 상태로 `/mypage`, `/workspaces` 접속 시 상단에 네비게이션(워크스페이스/마이페이지/로그아웃)이 보이고, 마이페이지 화면 자체에는 더 이상 로그아웃 버튼이 없는지 확인. 상단 "로그아웃" 클릭 시 정상적으로 `/login`으로 이동하는지 확인. 미인증 상태에서 아무 경로나 접속하면 `/login`으로 리다이렉트되는지 확인 (레이아웃 라우트 바깥에서 `ProtectedRoute`가 여전히 동작하는지).

- [ ] **Step 7: 로컬 커밋**

한국어로, 라우팅/레이아웃 개편 내용이 드러나게 커밋.

---

### Task 5: 대기 초대 유틸 + 로그인 콜백/온보딩 이동 대상 변경

**Files:**
- Create: `src/features/workspaces/pendingInvite.ts`
- Modify: `src/features/auth/OAuthCallbackPage.tsx`
- Modify: `src/features/auth/OnboardingNicknamePage.tsx`

**Interfaces:**
- Consumes: 없음 (순수 유틸)
- Produces: `setPendingInviteToken(token: string): void`, `consumePendingInviteToken(): string | null` — 호출 시 저장된 값을 반환하고 즉시 삭제한다(1회성)

- [ ] **Step 1: `src/features/workspaces/pendingInvite.ts` 작성**

```ts
const STORAGE_KEY = 'pendingInviteToken'

export function setPendingInviteToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function consumePendingInviteToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEY)
  if (token) {
    localStorage.removeItem(STORAGE_KEY)
  }
  return token
}
```

- [ ] **Step 2: `src/features/auth/OAuthCallbackPage.tsx` 전체를 아래 내용으로 교체**

```tsx
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCode } from '../../api/auth'
import { fetchMe } from '../../api/user'
import { useAuthStore } from '../../stores/authStore'
import { consumePendingInviteToken } from '../workspaces/pendingInvite'

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
        if (!user.nicknameConfigured) {
          navigate('/onboarding/nickname', { replace: true })
          return
        }
        const pendingToken = consumePendingInviteToken()
        navigate(pendingToken ? `/invites/${pendingToken}` : '/workspaces', {
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
```

닉네임이 설정되지 않은 사용자는 `pendingInviteToken`을 소비하지 않고 그대로 온보딩으로 보낸다 — 온보딩 완료 후 Step 3의 로직이 대신 소비한다.

- [ ] **Step 3: `src/features/auth/OnboardingNicknamePage.tsx`의 `handleSubmit` 함수만 아래 내용으로 교체**

기존 파일에서 `handleSubmit` 함수를 찾아 다음으로 교체하고, 파일 상단 import 목록에 `import { consumePendingInviteToken } from '../workspaces/pendingInvite'`를 추가한다 (다른 코드는 전부 그대로 둔다):

```tsx
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!available || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const user = await updateNickname(nickname)
      setUser(user)
      const pendingToken = consumePendingInviteToken()
      navigate(pendingToken ? `/invites/${pendingToken}` : '/workspaces', {
        replace: true,
      })
    } catch {
      setError('닉네임 설정에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 4: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 5: 수동 QA**

Run: `npm run dev`. 로그인 → 콜백 처리 후 (닉네임 설정된 계정이면) `/workspaces`로 이동하는지 확인. 닉네임 미설정 계정이면 온보딩으로 이동 후 완료 시 `/workspaces`로 이동하는지 확인.

- [ ] **Step 6: 로컬 커밋**

한국어로, 로그인 후 기본 이동 경로 변경 + 대기 초대 소비 로직 추가 내용이 드러나게 커밋.

---

### Task 6: WorkspaceListPage

**Files:**
- Modify: `src/features/workspaces/WorkspaceListPage.tsx` (Task 4의 placeholder를 실제 구현으로 교체)

**Interfaces:**
- Consumes: `createWorkspace`, `fetchWorkspaces` (Task 2), `getErrorMessage` (Task 1)
- Produces: `WorkspaceListPage(): ReactElement` (router.tsx가 이미 import 중, 변경 없음)

- [ ] **Step 1: `src/features/workspaces/WorkspaceListPage.tsx` 구현**

```tsx
import { useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createWorkspace, fetchWorkspaces } from '../../api/workspace'
import { getErrorMessage } from '../../api/errors'

export function WorkspaceListPage(): ReactElement {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  })

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      setName('')
      setCreateError(null)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => {
      setCreateError(getErrorMessage(error))
    },
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || createMutation.isPending) return
    createMutation.mutate(name.trim())
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">워크스페이스</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="워크스페이스 이름"
          maxLength={50}
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={!name.trim() || createMutation.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {createMutation.isPending ? '생성 중...' : '생성'}
        </button>
      </form>
      {createError && <p className="text-sm text-red-600">{createError}</p>}

      {isLoading && <p>로딩 중...</p>}
      {isError && <p className="text-red-600">워크스페이스 목록을 불러오지 못했습니다.</p>}
      {data && data.length === 0 && (
        <p className="text-gray-500">아직 속한 워크스페이스가 없습니다.</p>
      )}

      <ul className="flex flex-col gap-2">
        {data?.map((workspace) => (
          <li key={workspace.id}>
            <button
              type="button"
              onClick={() => navigate(`/workspaces/${workspace.id}`)}
              className="flex w-full items-center justify-between rounded border px-4 py-3 text-left hover:bg-gray-50"
            >
              <span>{workspace.name}</span>
              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                {workspace.myRole === 'OWNER' ? '오너' : '멤버'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 3: 수동 QA**

Run: `npm run dev` (백엔드도 실행 중이어야 함). `/workspaces`에서 이름을 입력해 생성 → 목록에 즉시 반영되는지, 항목 클릭 시 `/workspaces/{id}`로 이동하는지(상세는 아직 placeholder) 확인.

- [ ] **Step 4: 로컬 커밋**

한국어로, 워크스페이스 목록/생성 화면 구현 내용이 드러나게 커밋.

---

### Task 7: WorkspaceDetailPage (조회/이름수정/멤버관리/나가기/삭제)

**Files:**
- Modify: `src/features/workspaces/WorkspaceDetailPage.tsx` (Task 4의 placeholder를 실제 구현으로 교체)

**Interfaces:**
- Consumes: `fetchWorkspaceDetail`, `renameWorkspace`, `kickMember`, `transferOwnership`, `leaveWorkspace`, `deleteWorkspace` (Task 2), `getErrorMessage` (Task 1), `useAuthStore` (기존, `user?.id` 사용)
- Produces: `WorkspaceDetailPage(): ReactElement` (변경 없음). 이 태스크에서는 초대 관리 섹션을 포함하지 않는다 — Task 8에서 `InviteManagement` 컴포넌트를 추가로 끼워 넣는다.

- [ ] **Step 1: `src/features/workspaces/WorkspaceDetailPage.tsx` 구현**

```tsx
import { useState, type FormEvent, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteWorkspace,
  fetchWorkspaceDetail,
  kickMember,
  leaveWorkspace,
  renameWorkspace,
  transferOwnership,
} from '../../api/workspace'
import { getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'

export function WorkspaceDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>()
  const workspaceId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const queryKey = ['workspaces', workspaceId] as const

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchWorkspaceDetail(workspaceId),
    enabled: Number.isFinite(workspaceId),
  })

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameWorkspace(workspaceId, name),
    onSuccess: () => {
      setIsEditingName(false)
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const kickMutation = useMutation({
    mutationFn: (targetUserId: number) => kickMember(workspaceId, targetUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const transferMutation = useMutation({
    mutationFn: (newOwnerUserId: number) => transferOwnership(workspaceId, newOwnerUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const leaveMutation = useMutation({
    mutationFn: () => leaveWorkspace(workspaceId),
    onSuccess: () => navigate('/workspaces', { replace: true }),
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(workspaceId),
    onSuccess: () => navigate('/workspaces', { replace: true }),
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  function handleRenameSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nameDraft.trim() || renameMutation.isPending) return
    renameMutation.mutate(nameDraft.trim())
  }

  if (isLoading) return <p>로딩 중...</p>
  if (isError || !data) {
    return <p className="text-red-600">찾을 수 없거나 접근 권한이 없습니다.</p>
  }

  const isOwner = data.myRole === 'OWNER'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <form onSubmit={handleRenameSubmit} className="flex flex-1 gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={50}
              className="flex-1 rounded border px-3 py-2"
              autoFocus
            />
            <button
              type="submit"
              disabled={!nameDraft.trim() || renameMutation.isPending}
              className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="rounded px-3 py-2"
            >
              취소
            </button>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{data.name}</h1>
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(data.name)
                  setIsEditingName(true)
                }}
                className="text-sm text-blue-600"
              >
                수정
              </button>
            )}
          </>
        )}
      </div>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <div>
        <h2 className="mb-2 text-lg font-semibold">멤버</h2>
        <ul className="flex flex-col gap-2">
          {data.members.map((member) => (
            <li
              key={member.user.id}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {member.user.profileImageUrl && (
                  <img
                    src={member.user.profileImageUrl}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span>{member.user.nickname}</span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {member.role === 'OWNER' ? '오너' : '멤버'}
                </span>
                <span className="text-xs text-gray-500">
                  가입일 {new Date(member.joinedAt).toLocaleDateString()}
                </span>
              </div>
              {isOwner && member.user.id !== currentUserId && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`${member.user.nickname}님을 오너로 지정할까요?`)) {
                        transferMutation.mutate(member.user.id)
                      }
                    }}
                    className="text-sm text-blue-600"
                  >
                    오너십 이전
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`${member.user.nickname}님을 추방할까요?`)) {
                        kickMutation.mutate(member.user.id)
                      }
                    }}
                    className="text-sm text-red-600"
                  >
                    추방
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <button
          type="button"
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="self-start rounded border px-4 py-2 disabled:opacity-50"
        >
          나가기
        </button>

        {isOwner &&
          (showDeleteConfirm ? (
            <div className="rounded border border-red-300 p-3">
              <p className="mb-2 text-sm">
                정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
                >
                  {deleteMutation.isPending ? '처리 중...' : '삭제하기'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded px-3 py-1"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="self-start text-sm text-red-600"
            >
              워크스페이스 삭제
            </button>
          ))}
      </div>
    </div>
  )
}
```

`leave`/삭제/추방/이전 액션은 확인(브라우저 기본 `confirm()` 또는 인라인 확인 패널)을 거친 뒤에만 실행한다. "나가기"는 서버 검증에 맡긴다 — OWNER가 멤버 있는 상태로 나가려 하면 `leaveMutation`의 `onError`가 `WORKSPACE_LEAVE_REQUIRES_TRANSFER` 메시지를 그대로 보여준다(별도 프론트 사전 차단 로직 없음).

- [ ] **Step 2: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 3: 수동 QA**

Run: `npm run dev` (백엔드 실행 중). 워크스페이스 생성 후 상세 진입 → 이름 수정, 멤버 목록(본인만 있는 상태) 확인. 두 번째 계정으로 같은 워크스페이스에 멤버로 들어와 있는 상태를 만들 수 있다면(또는 백엔드 테스트 데이터로) 추방/오너십 이전/나가기(멤버 있는 상태에서 OWNER가 나가기 시도 시 에러 메시지) 확인. 삭제 확인 모달 동작 확인.

- [ ] **Step 4: 로컬 커밋**

한국어로, 워크스페이스 상세/멤버관리/나가기/삭제 구현 내용이 드러나게 커밋.

---

### Task 8: InviteManagement 컴포넌트 + WorkspaceDetailPage 결합

**Files:**
- Create: `src/features/workspaces/InviteManagement.tsx`
- Modify: `src/features/workspaces/WorkspaceDetailPage.tsx`

**Interfaces:**
- Consumes: `createInvite`, `fetchInvites`, `revokeInvite` (Task 3), `getErrorMessage` (Task 1)
- Produces: `InviteManagement(props: { workspaceId: number }): ReactElement`

- [ ] **Step 1: `src/features/workspaces/InviteManagement.tsx` 작성**

```tsx
import { useState, type FormEvent, type ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInvite, fetchInvites, revokeInvite } from '../../api/invite'
import { getErrorMessage } from '../../api/errors'

export function InviteManagement({ workspaceId }: { workspaceId: number }): ReactElement {
  const queryClient = useQueryClient()
  const queryKey = ['workspaces', workspaceId, 'invites'] as const
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchInvites(workspaceId),
  })

  const createMutation = useMutation({
    mutationFn: () => createInvite(workspaceId, email.trim() || null),
    onSuccess: () => {
      setEmail('')
      setError(null)
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => setError(getErrorMessage(error)),
  })

  const revokeMutation = useMutation({
    mutationFn: (inviteId: number) => revokeInvite(workspaceId, inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (error) => setError(getErrorMessage(error)),
  })

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (createMutation.isPending) return
    createMutation.mutate()
  }

  async function handleCopy(token: string) {
    const url = `${window.location.origin}/invites/${token}`
    await navigator.clipboard.writeText(url)
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">초대</h2>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일(선택, 비우면 링크형 초대)"
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {createMutation.isPending ? '생성 중...' : '초대 생성'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading && <p>초대 목록 로딩 중...</p>}
      {isError && <p className="text-red-600">초대 목록을 불러오지 못했습니다.</p>}
      {data && data.length === 0 && <p className="text-gray-500">활성화된 초대가 없습니다.</p>}

      <ul className="mt-2 flex flex-col gap-2">
        {data?.map((invite) => (
          <li
            key={invite.id}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            <div className="flex flex-col text-sm">
              <span>{`${window.location.origin}/invites/${invite.token}`}</span>
              {invite.email && <span className="text-gray-500">받는 사람: {invite.email}</span>}
              <span className="text-gray-500">
                만료: {new Date(invite.expiresAt).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(invite.token)}
                className="text-sm text-blue-600"
              >
                복사
              </button>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(invite.id)}
                disabled={revokeMutation.isPending}
                className="text-sm text-red-600 disabled:opacity-50"
              >
                무효화
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: `src/features/workspaces/WorkspaceDetailPage.tsx` 수정**

파일 상단 import 목록에 다음을 추가:
```tsx
import { InviteManagement } from './InviteManagement'
```

멤버 목록을 감싼 `<div>...</div>` 블록과 하단 액션(`나가기`/`워크스페이스 삭제`)을 감싼 `<div className="flex flex-col gap-2 border-t pt-4">` 블록 사이에 다음을 추가:
```tsx
      {isOwner && <InviteManagement workspaceId={workspaceId} />}
```

- [ ] **Step 3: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 4: 수동 QA**

Run: `npm run dev` (백엔드 실행 중). OWNER로 워크스페이스 상세 진입 → 초대 섹션이 보이는지, 이메일 없이 생성(링크형) → 목록에 표시되는지, 복사 버튼으로 클립보드에 `{origin}/invites/{token}` 형태가 복사되는지, 무효화 후 목록에서 사라지는지 확인. MEMBER 역할로는 초대 섹션이 아예 보이지 않는지 확인.

- [ ] **Step 5: 로컬 커밋**

한국어로, 초대 관리 UI 추가 및 상세 페이지 결합 내용이 드러나게 커밋.

---

### Task 9: InviteAcceptPage

**Files:**
- Modify: `src/features/workspaces/InviteAcceptPage.tsx` (Task 4의 placeholder를 실제 구현으로 교체)

**Interfaces:**
- Consumes: `acceptInvite` (Task 3), `getErrorMessage` (Task 1), `setPendingInviteToken` (Task 5), `useAuthStore` (기존, `isAuthenticated`)
- Produces: `InviteAcceptPage(): ReactElement` (변경 없음)

- [ ] **Step 1: `src/features/workspaces/InviteAcceptPage.tsx` 구현**

```tsx
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { acceptInvite } from '../../api/invite'
import { getErrorMessage } from '../../api/errors'
import { useAuthStore } from '../../stores/authStore'
import { setPendingInviteToken } from './pendingInvite'

export function InviteAcceptPage(): ReactElement {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [error, setError] = useState<string | null>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    if (!token) {
      navigate('/workspaces', { replace: true })
      return
    }

    if (!isAuthenticated) {
      setPendingInviteToken(token)
      navigate('/login', { replace: true })
      return
    }

    acceptInvite(token)
      .then((workspace) => {
        navigate(`/workspaces/${workspace.id}`, { replace: true })
      })
      .catch((err) => {
        setError(getErrorMessage(err))
        setTimeout(() => navigate('/workspaces', { replace: true }), 3000)
      })
  }, [token, isAuthenticated, navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      {error ?? '초대 처리 중...'}
    </div>
  )
}
```

`hasRun` ref는 다른 콜백성 페이지(`OAuthCallbackPage`)와 동일하게 React 18 StrictMode의 effect 이중 실행을 막기 위함이다. 이 페이지는 `App.tsx`의 부트스트랩(새로고침 시 `refreshToken`으로 인증 상태 복원)이 끝난 뒤에만 렌더링되므로, `isAuthenticated` 값은 마운트 시점에 이미 확정되어 있다.

- [ ] **Step 2: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 성공.

- [ ] **Step 3: 수동 QA**

Run: `npm run dev` (백엔드 실행 중). ① 로그인된 상태에서 유효한 초대 링크(`/invites/{token}`) 방문 → 워크스페이스 상세로 이동하는지. ② 로그아웃 상태에서 같은 링크 방문 → `/login`으로 이동 → 로그인 완료 후 자동으로 초대가 수락되고 워크스페이스 상세로 이동하는지 (닉네임 미설정 계정이면 온보딩을 먼저 거치는지도 함께 확인). ③ 만료되었거나 무효화된 토큰으로 방문 시 에러 메시지 후 `/workspaces`로 이동하는지.

- [ ] **Step 4: 로컬 커밋**

한국어로, 초대 수락 페이지 구현 및 미로그인 시 자동 재시도 흐름 내용이 드러나게 커밋.

---

## 완료 후 남는 작업 (범위 밖, 스펙 참조)

- 태스크 관리(태스크 CRUD/상태/담당자/댓글) — 별도 스펙
- 정교한 UI/브랜딩 디자인
- 워크스페이스 목록에 멤버 아바타 미리보기
- 자동화 테스트 스위트
