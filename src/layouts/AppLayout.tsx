import { useEffect, useState, type ReactElement } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { NotificationBell } from '../features/notifications/NotificationBell'
import { stompClient } from '../realtime/stompClient'
import { useAuthStore } from '../stores/authStore'

const NAV_ITEMS = [
  { to: '/workspaces', label: '워크스페이스' },
  { to: '/issues', label: '이슈 게시판' },
  { to: '/my-tasks', label: '내 할 일' },
]

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const mobileNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-sidebar-active text-accent' : 'text-sidebar-muted hover:text-white'
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex-shrink-0 border-b border-white/10 bg-sidebar">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-white">MotivHub</span>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
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

          <div className="flex items-center gap-1 md:hidden">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isMobileMenuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={mobileNavLinkClassName}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/mypage"
              className={mobileNavLinkClassName}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              마이페이지
            </NavLink>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false)
                handleLogout()
              }}
              className="rounded-lg px-3 py-2 text-left text-sm text-sidebar-muted hover:text-white"
            >
              로그아웃
            </button>
          </nav>
        )}
      </header>
      <main className="flex-1 bg-content-bg p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
