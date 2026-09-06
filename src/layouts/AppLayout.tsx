import type { ReactElement } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

export function AppLayout(): ReactElement {
  const navigate = useNavigate()
  const clear = useAuthStore((state) => state.clear)

  async function handleLogout() {
    try {
      await logout()
    } finally {
      clear()
      navigate('/login', { replace: true })
    }
  }

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm ${
      isActive ? 'bg-sidebar-active font-semibold text-accent' : 'text-sidebar-muted hover:text-white'
    }`

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-shrink-0 flex-col bg-sidebar px-4 py-6">
        <span className="mb-8 px-3 text-lg font-bold text-white">MotivHub</span>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/workspaces" className={navLinkClassName}>
            워크스페이스
          </NavLink>
          <NavLink to="/mypage" className={navLinkClassName}>
            마이페이지
          </NavLink>
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg px-3 py-2 text-left text-sm text-sidebar-muted hover:text-white"
        >
          로그아웃
        </button>
      </aside>
      <main className="flex-1 bg-content-bg p-8">
        <Outlet />
      </main>
    </div>
  )
}
