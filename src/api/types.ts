export type OAuthProvider = 'google' | 'github' | 'kakao' | 'naver'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface UserProfile {
  id: number
  nickname: string
  nicknameConfigured: boolean
  email: string
  profileImageUrl: string | null
  provider: OAuthProvider
  createdAt: string
}

export interface MyPageProfile {
  nickname: string
  email: string
  profileImageUrl: string | null
  createdAt: string
}

export interface NicknameCheckResponse {
  available: boolean
}

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
