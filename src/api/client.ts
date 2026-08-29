import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/authStore'
import type { AuthTokens } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

let refreshPromise: Promise<AuthTokens> | null = null

export async function refreshTokens(): Promise<AuthTokens> {
  const { refreshToken } = useAuthStore.getState()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  const response = await axios.post<AuthTokens>(`${API_BASE_URL}/api/auth/refresh`, {
    refreshToken,
  })
  return response.data
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      throw error
    }
    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null
        })
      }
      const tokens = await refreshPromise
      useAuthStore.getState().setTokens(tokens)
      originalRequest.headers.set('Authorization', `Bearer ${tokens.accessToken}`)
      return apiClient(originalRequest)
    } catch (refreshError) {
      useAuthStore.getState().clear()
      window.location.href = '/login'
      throw refreshError
    }
  }
)
