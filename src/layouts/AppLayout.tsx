import { useState, type ReactElement } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

const SIDEBAR_COLLAPSED_KEY = 'motivhub-sidebar-collapsed'

export function AppLayout(): ReactElement {
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clear()
      navigate('/login', { replace: true })
    }
  }

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      } catch {
        // localStorage 접근 불가 시 조용히 무시 — 접힘 상태가 다음 방문까지 기억되지 않을 뿐 기능엔 영향 없음
      }
      return next
    })
  }

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg text-sm ${isCollapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'} ${
      isActive
        ? 'bg-sidebar-active font-semibold text-accent'
        : 'text-sidebar-muted hover:text-white'
    }`

  return (
    <div className="flex min-h-screen">
      <aside
        className={`flex flex-shrink-0 flex-col bg-sidebar py-6 transition-[width] ${
          isCollapsed ? 'w-16 px-2' : 'w-56 px-4'
        }`}
      >
        <div
          className={`mb-8 flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between px-3'
          }`}
        >
          {!isCollapsed && <span className="text-lg font-bold text-white">MotivHub</span>}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
            className="rounded-lg px-2 py-1 text-sidebar-muted hover:text-white"
          >
            {isCollapsed ? '»' : '«'}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/workspaces" className={navLinkClassName} title="워크스페이스">
            {isCollapsed ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-xs font-semibold">
                워
              </span>
            ) : (
              '워크스페이스'
            )}
          </NavLink>
          <NavLink to="/mypage" className={navLinkClassName} title="마이페이지">
            {isCollapsed ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-xs font-semibold">
                마
              </span>
            ) : (
              '마이페이지'
            )}
          </NavLink>
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          title="로그아웃"
          aria-label="로그아웃"
          className={`rounded-lg text-sm text-sidebar-muted hover:text-white ${
            isCollapsed ? 'flex justify-center px-0 py-2' : 'px-3 py-2 text-left'
          }`}
        >
          {isCollapsed ? '⏻' : '로그아웃'}
        </button>
      </aside>
      <main className="flex-1 bg-content-bg p-8">
        <Outlet />
      </main>
    </div>
  )
}
