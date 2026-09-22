import { useEffect, type ReactElement } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { NotificationBell } from '../features/notifications/NotificationBell'
import { stompClient } from '../realtime/stompClient'
import { useAuthStore } from '../stores/authStore'

export function AppLayout(): ReactElement {
  const navigate = useNavigate()
  useEffect(() => {
    stompClient.activate()
    return () => {
      stompClient.deactivate()
    }
  }, [])
  const clear = useAuthStore((state) => state.clear)
  const user = useAuthStore((state) => state.user)

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clear()
      navigate('/login', { replace: true })
    }
  }

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      isActive ? 'bg-sidebar-active text-accent' : 'text-sidebar-muted hover:text-white'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 bg-sidebar px-6">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-white">MotivHub</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/workspaces" className={navLinkClassName}>
              워크스페이스
            </NavLink>
            <NavLink to="/issues" className={navLinkClassName}>
              이슈 게시판
            </NavLink>
            <NavLink to="/my-tasks" className={navLinkClassName}>
              내 할 일
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <NavLink to="/mypage" aria-label="마이페이지" title="마이페이지">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.nickname}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                {user?.nickname.slice(0, 1) ?? '마'}
              </span>
            )}
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm text-sidebar-muted hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </header>
      <main className="flex-1 bg-content-bg p-8">
        <Outlet />
      </main>
    </div>
  )
}
