import { apiClient } from './client'
import type { UserProfile, MyPageProfile, NicknameCheckResponse } from './types'

export function fetchMe(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/api/users/me').then((res) => res.data)
}

export function fetchMyPage(): Promise<MyPageProfile> {
  return apiClient.get<MyPageProfile>('/api/users/me/mypage').then((res) => res.data)
}

export function checkNicknameAvailable(nickname: string): Promise<NicknameCheckResponse> {
  return apiClient
    .get<NicknameCheckResponse>('/api/users/nickname-check', { params: { nickname } })
    .then((res) => res.data)
}

export function updateNickname(nickname: string): Promise<UserProfile> {
  return apiClient
    .patch<UserProfile>('/api/users/me/nickname', { nickname })
    .then((res) => res.data)
}

export function deleteAccount(): Promise<void> {
  return apiClient.delete('/api/users/me').then(() => undefined)
}
