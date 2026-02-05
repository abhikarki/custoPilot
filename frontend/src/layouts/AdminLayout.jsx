import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  LayoutDashboard,
  Building2,
  Folder,
  FileText,
  Bot,
  GitBranch,
  Activity,
  LogOut,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/departments', label: 'Departments', icon: Folder },
  { path: '/admin/knowledge', label: 'Knowledge Upload', icon: FileText },
  { path: '/admin/chatbots', label: 'Chatbot Builder', icon: Bot },
  { path: '/admin/pipelines', label: 'Agent Pipelines', icon: GitBranch },
  { path: '/admin/traces', label: 'Agent Traces', icon: Activity },
  { path: '/admin/test-chat', label: 'Test Chatbot', icon: MessageSquare },
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <span className="text-xl font-bold text-primary-600">CustoPilot</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Org */}
        {organization && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building2 className="w-4 h-4" />
              <span>{organization.name}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {user?.full_name?.[0] || user?.email?.[0] || 'A'}
                </span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.full_name || 'Admin'}</p>
                <p className="text-gray-500 text-xs">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={clsx('transition-all duration-200', sidebarOpen ? 'lg:ml-64' : 'ml-0')}>
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <NavLink
                to="/support"
                className="text-sm text-gray-600 hover:text-primary-600"
              >
                Support Console →
              </NavLink>
            </div>
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
