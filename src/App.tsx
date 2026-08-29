import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { refreshTokens } from './api/client'
import { fetchMe } from './api/user'
import { router } from './routes/router'

const queryClient = new QueryClient()

function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const clear = useAuthStore((state) => state.clear)

  useEffect(() => {
    async function bootstrap() {
      if (!refreshToken) {
        setIsBootstrapping(false)
        return
      }
      try {
        const tokens = await refreshTokens()
        setTokens(tokens)
        const user = await fetchMe()
        setUser(user)
      } catch {
        clear()
      } finally {
        setIsBootstrapping(false)
      }
    }
    bootstrap()
    // 최초 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isBootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center">로딩 중...</div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
