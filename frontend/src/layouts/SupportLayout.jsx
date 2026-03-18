import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import clsx from 'clsx'

const navItems = [
  { path: '/support', label: 'Overview', exact: true },
  { path: '/support/escalations', label: 'Escalations' },
  { path: '/support/conversations', label: 'Conversations' },
]

export default function SupportLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">CustoPilot</span>
            <p className="text-[11px] text-slate-500">Support Workspace</p>
          </div>
          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
            Support
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center px-3 py-2.5 rounded-md text-sm font-medium border transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-slate-200 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-slate-700">
                  {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'S'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name || 'Support'}</p>
                <p className="text-xs text-slate-500 capitalize truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
              title="Logout"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      <div className={clsx('transition-all duration-200', sidebarOpen ? 'lg:ml-64' : 'ml-0')}>
        <header className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-5 lg:px-8">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1h14M1 7h14M1 13h14" strokeLinecap="round" />
              </svg>
            </button>

            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Admin Dashboard
              </NavLink>
            )}
          </div>
        </header>

        <main className="px-4 py-5 lg:px-8 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
