import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '../api/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void
  setUser: (user: UserProfile) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'motivhub-auth',
      partialize: (state) => ({ refreshToken: state.refreshToken }),
    }
  )
)
