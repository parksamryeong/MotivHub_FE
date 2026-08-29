# 로그인 기능 프론트엔드 설계

## 배경

MotivHub 협업 툴의 첫 기능으로 소셜 로그인(OAuth2)을 구현한다. 백엔드는 완성되어 있으며, 프론트는
Vite + React(TS) 기반 신규 프로젝트를 이번 작업에서 처음 구성한다.

## 백엔드 계약 (참고)

**OAuth 흐름**
1. FE에서 `GET {API_BASE_URL}/oauth2/authorization/{provider}` 로 브라우저 이동 (`provider` = google | github | kakao | naver)
2. 성공 시 백엔드가 `${FRONTEND_URL}/oauth/callback?code={임시코드}` 로 리다이렉트
3. 실패 시 `${FRONTEND_URL}/oauth/callback?error=oauth_failed` 로 리다이렉트
4. FE는 `code`를 exchange API로 교환해 토큰을 발급받음

**API 목록**

| Method | Path | Body | Response | 인증 |
|---|---|---|---|---|
| POST | /api/auth/exchange | `{ code }` | `{ accessToken, refreshToken }` | 불필요 |
| POST | /api/auth/refresh | `{ refreshToken }` | `{ accessToken, refreshToken }` | 불필요 |
| POST | /api/auth/logout | - | 204 | 필요 |
| GET | /api/users/me | - | `{ id, nickname, nicknameConfigured, email, profileImageUrl, provider, createdAt }` | 필요 |
| GET | /api/users/me/mypage | - | `{ nickname, email, profileImageUrl, createdAt }` | 필요 |
| GET | /api/users/nickname-check?nickname=xxx | - | `{ available }` | 불필요 |
| PATCH | /api/users/me/nickname | `{ nickname }` | UserProfileResponse | 필요 |
| DELETE | /api/users/me | - | 204 | 필요 |

- 인증 필요 요청은 `Authorization: Bearer {accessToken}` 헤더 사용
- CORS는 `FRONTEND_URL` 하나만 허용, `allowCredentials: false` — 쿠키 미사용, 토큰은 body/header로만 주고받음
- `nicknameConfigured`가 false면 최초 로그인 직후 닉네임 미설정 상태 → 온보딩 화면으로 분기

## 기술 스택

- Vite + React + TypeScript
- React Router (라우팅)
- TanStack Query (서버 상태: `/me`, `/mypage`, nickname-check 등)
- Zustand (인증 토큰/유저 전역 상태)
- axios (HTTP 클라이언트, 인터셉터로 인증 헤더/401 갱신 처리)
- Tailwind CSS (스타일링)

이번 단계는 기능 중심의 심플한 UI로 구현하고, 정교한 비주얼 디자인은 이후 단계에서 다룬다.

## 폴더 구조

```
src/
  api/
    client.ts          # axios 인스턴스 + 요청/응답 인터셉터
    auth.ts             # exchange, refresh, logout API 함수
    user.ts             # me, mypage, nickname-check, nickname PATCH, delete
  stores/
    authStore.ts        # zustand: accessToken, refreshToken, user, actions
  features/
    auth/
      LoginPage.tsx
      OAuthCallbackPage.tsx
      OnboardingNicknamePage.tsx
    mypage/
      MyPage.tsx
      EditNicknameForm.tsx
  routes/
    ProtectedRoute.tsx   # 미인증 시 /login 리다이렉트
    router.tsx
  App.tsx
  main.tsx
```

## 인증 상태 관리

`authStore` (Zustand)는 다음을 보관한다:
- `accessToken`: 메모리에만 보관 (persist 안 함, 새로고침 시 소실)
- `refreshToken`: `localStorage`에 저장 (persist)
- `user`: `/api/users/me` 응답 (id, nickname, nicknameConfigured, email, profileImageUrl, provider, createdAt)
- 파생값 `isAuthenticated`
- 액션: `setTokens({ accessToken, refreshToken })`, `setUser(user)`, `clear()`

Zustand를 선택한 이유는 React 컴포넌트 트리 밖(axios 인터셉터)에서도 `authStore.getState()`로
직접 상태를 읽고 쓸 수 있어, 토큰 갱신 로직을 인터셉터 안에 자연스럽게 넣을 수 있기 때문이다.
React Context는 이 부분에서 별도의 모듈 전역 변수와 이중 동기화가 필요해 구조가 복잡해진다.

**앱 부트스트랩**
1. 앱 최초 로드 시 `localStorage`에서 `refreshToken` 확인
2. 있으면 `/api/auth/refresh` 호출 → 성공 시 새 토큰 저장 후 `/api/users/me` 조회 → `authStore.setUser()`
3. 이 과정이 끝날 때까지 최상위에서 로딩 화면 표시
4. `refreshToken`이 없거나 refresh 실패 시 미인증 상태로 확정

**axios 인터셉터 (`api/client.ts`)**
- 요청 인터셉터: `authStore.getState().accessToken`이 있으면 `Authorization: Bearer {accessToken}` 헤더 자동 첨부
- 응답 인터셉터: 401 수신 시
  - 이미 진행 중인 refresh 요청이 있으면 해당 Promise를 공유해 대기 (동시 다발 401에 대한 중복 refresh 방지)
  - 없으면 `/api/auth/refresh` 호출 → 성공 시 새 토큰 저장, 원래 요청 재시도
  - refresh도 실패하면 `authStore.clear()` 후 `/login`으로 이동

## 라우팅

| 경로 | 인증 | 설명 |
|---|---|---|
| `/login` | 불필요 | provider 버튼 4개 (google, github, kakao, naver) |
| `/oauth/callback` | 불필요 | `code`/`error` 쿼리 처리 |
| `/onboarding/nickname` | 필요 | 최초 닉네임 설정 |
| `/mypage` | 필요 | 프로필 조회/수정/탈퇴/로그아웃 |
| 기타 보호 라우트 | 필요 | `ProtectedRoute`로 감쌈 |

**LoginPage**
- provider별 버튼 클릭 시 `window.location.href = \`${API_BASE_URL}/oauth2/authorization/${provider}\``

**OAuthCallbackPage**
- 쿼리에 `code`가 있으면 `POST /api/auth/exchange` 호출
  - 성공 → `authStore.setTokens()` → `GET /api/users/me` 조회 → `authStore.setUser()`
    - `nicknameConfigured === false` → `/onboarding/nickname`으로 이동
    - `nicknameConfigured === true` → `/mypage`로 이동
  - 실패 → 에러 메시지 표시 후 `/login`으로 이동
- 쿼리에 `error=oauth_failed`가 있으면 에러 메시지 표시 후 `/login`으로 이동

**ProtectedRoute**
- `authStore.isAuthenticated`가 false면 `/login`으로 리다이렉트
- 로그인 후 원래 경로로 복귀하는 기능은 이번 범위에서 생략 (로그인 성공 시 항상 `/mypage` 또는 온보딩으로 이동)

**OnboardingNicknamePage**
- 닉네임 입력 필드, 입력값 변경 시 디바운스(약 400ms)로 `GET /api/users/nickname-check?nickname=xxx` 호출해 사용 가능 여부 표시
- 제출 시 `PATCH /api/users/me/nickname` 호출 → 성공 시 `authStore`의 user 갱신 후 `/mypage`로 이동

**MyPage**
- TanStack Query로 `GET /api/users/me/mypage` 조회 → nickname, email, profileImageUrl, createdAt 표시
- 닉네임 인라인 수정: 온보딩과 동일한 중복확인(`nickname-check`) + `PATCH /api/users/me/nickname` 로직 재사용
- 로그아웃 버튼: `POST /api/auth/logout` 호출 (성공/실패 무관하게) → `authStore.clear()` → `/login`으로 이동
- 회원 탈퇴 버튼: 확인 모달 표시 → 확인 시 `DELETE /api/users/me` → 성공 시 `authStore.clear()` → `/login`으로 이동

## 에러 처리

- API 에러는 각 화면에서 인라인 메시지로 표시 (전역 토스트 라이브러리는 이번 범위에서 추가하지 않음)
- refresh 요청 자체가 실패(리프레시 토큰 만료/무효)하면 무조건 로그아웃 처리 후 `/login`으로 이동
- 네트워크 에러 등 기타 실패는 화면별로 "다시 시도" 안내 정도의 최소한의 처리만 포함

## 환경 변수 & 설정

- `.env`: `VITE_API_BASE_URL=http://localhost:8080` — 백엔드 오리진. OAuth 리다이렉트 시작 URL과 axios `baseURL`에 사용
- `vite.config.ts`에서 dev 서버 포트를 3000으로 고정 (`server.port: 3000`) — 백엔드 기본 `FRONTEND_URL`(`http://localhost:3000`)과 일치시킴. 포트를 바꾸는 경우 백엔드 `FRONTEND_URL` env var도 함께 맞춰야 함

## 테스트

- 최소한 컴포넌트/훅 단위 테스트는 이번 범위에서 필수로 요구하지 않음 (신규 프로젝트 초기 세팅 단계)
- 수동 테스트로 각 provider 로그인 흐름, 401 → refresh → 재시도, refresh 실패 → 로그아웃, 온보딩 분기, 마이페이지 CRUD를 확인

## 범위 밖 (다음 단계)

- 정교한 UI/브랜딩 디자인
- 로그인 후 원래 경로로 복귀하는 리다이렉트
- 전역 토스트/알림 시스템
- 자동화 테스트 스위트
