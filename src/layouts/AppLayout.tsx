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
    isActive ? 'font-bold text-blue-600' : 'text-gray-600'

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex gap-4">
          <NavLink to="/workspaces" className={navLinkClassName}>
            워크스페이스
          </NavLink>
          <NavLink to="/mypage" className={navLinkClassName}>
            마이페이지
          </NavLink>
        </div>
        <button type="button" onClick={handleLogout} className="text-sm text-gray-600">
          로그아웃
        </button>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
