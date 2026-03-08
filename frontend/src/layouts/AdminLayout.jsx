import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import clsx from 'clsx'

const navItems = [
  { path: '/admin', label: 'Overview', exact: true },
  { path: '/admin/departments', label: 'Departments' },
  { path: '/admin/knowledge', label: 'Knowledge Base' },
  { path: '/admin/chatbots', label: 'Chatbots' },
  { path: '/admin/pipelines', label: 'Pipelines' },
  { path: '/admin/traces', label: 'Traces' },
  { path: '/admin/test-chat', label: 'Test Chat' },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout, getOrganization } = useAuthStore()
  const organization = getOrganization()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 transform transition-transform duration-200 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-14 px-5 flex items-center border-b border-slate-800">
          <span className="text-lg font-semibold text-white tracking-tight">CustoPilot</span>
        </div>

        {/* Current Org */}
        {organization && (
          <div className="px-5 py-3 border-b border-slate-800">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Workspace</p>
            <p className="text-sm font-medium text-slate-200 truncate">{organization.name}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-brand-600 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-white">
                  {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name || 'Admin'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
              title="Logout"
            >
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={clsx('transition-all duration-200', sidebarOpen ? 'lg:ml-60' : 'ml-0')}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between h-14 px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1h14M1 7h14M1 13h14" strokeLinecap="round" />
              </svg>
            </button>

            <NavLink
              to="/support"
              className="text-sm text-slate-500 hover:text-brand-600 font-medium transition-colors"
            >
              Support Console
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
