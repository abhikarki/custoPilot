import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  LayoutDashboard,
  AlertCircle,
  MessageSquare,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/support', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/support/escalations', label: 'Escalations', icon: AlertCircle },
  { path: '/support/conversations', label: 'Conversations', icon: MessageSquare },
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
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-[260px] bg-primary-100 border-r border-primary-200 transform transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-primary-200">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold text-primary-600 tracking-tight">CustoPilot</span>
            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Support
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-primary-200 text-primary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors',
                  isActive
                    ? 'bg-white text-primary-600 shadow-subtle'
                    : 'text-primary-500 hover:bg-primary-200/60'
                )
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="border-t border-primary-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-600 rounded-full flex items-center justify-center">
                <span className="text-[14px] font-medium text-white">
                  {user?.full_name?.[0] || user?.email?.[0] || 'S'}
                </span>
              </div>
              <div>
                <p className="text-[14px] font-medium text-primary-600">{user?.full_name || 'Support'}</p>
                <p className="text-[12px] text-primary-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-primary-400 hover:text-primary-600 rounded-lg hover:bg-primary-200 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={clsx('transition-all duration-200', sidebarOpen ? 'lg:ml-[260px]' : 'ml-0')}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-primary-200">
          <div className="flex items-center justify-between h-14 px-5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-primary-100 text-primary-500 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className="text-[13px] text-primary-400 hover:text-accent-500 font-medium transition-colors"
              >
                ← Admin Dashboard
              </NavLink>
            )}
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
