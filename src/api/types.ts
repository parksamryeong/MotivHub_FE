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
