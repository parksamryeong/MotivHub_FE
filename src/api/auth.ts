import axios from 'axios'
import { apiClient } from './client'
import { useAuthStore } from '../stores/authStore'
import type { AuthTokens, OAuthProvider } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export function exchangeCode(code: string): Promise<AuthTokens> {
  return axios
    .post<AuthTokens>(`${API_BASE_URL}/api/auth/exchange`, { code })
    .then((res) => res.data)
}

export function logout(): Promise<void> {
  const { refreshToken } = useAuthStore.getState()
  return apiClient.post('/api/auth/logout', { refreshToken }).then(() => undefined)
}

export function oauthAuthorizeUrl(provider: OAuthProvider): string {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`
}

export function requestSignupVerification(email: string): Promise<void> {
  return axios
    .post(`${API_BASE_URL}/api/auth/signup/request-verification`, { email })
    .then(() => undefined)
}

export function completeSignup(
  email: string,
  code: string,
  password: string,
  nickname: string
): Promise<AuthTokens> {
  return axios
    .post<AuthTokens>(`${API_BASE_URL}/api/auth/signup/complete`, {
      email,
      code,
      password,
      nickname,
    })
    .then((res) => res.data)
}

export function loginWithEmail(email: string, password: string): Promise<AuthTokens> {
  return axios
    .post<AuthTokens>(`${API_BASE_URL}/api/auth/login`, { email, password })
    .then((res) => res.data)
}
