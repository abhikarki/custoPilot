import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    
    const result = await login(email, password)
    if (result.success) {
      navigate('/')
    }
  }

  const fillDemoCredentials = () => {
    setEmail('admin@custopilot.com')
    setPassword('admin123')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <section className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-25">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Control Center</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 tracking-tight">CustoPilot</h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              AI support operations platform for chatbot management, knowledge routing, and escalations.
            </p>

            <div className="mt-8 cp-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Demo Access</p>
              <p className="text-sm text-slate-700 mt-2">Use the sample admin credentials:</p>
              <p className="text-xs font-mono mt-2 text-slate-800">admin@custopilot.com</p>
              <p className="text-xs font-mono text-slate-800">admin123</p>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="cp-btn-ghost mt-4"
              >
                Autofill Credentials
              </button>
            </div>
          </section>

          <section className="p-8 sm:p-10">
            <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
            <p className="text-sm text-slate-500 mt-1">Use your workspace account to continue.</p>

            {error && (
              <div className="mt-5 p-3 bg-danger-50 border border-danger-100 rounded-md text-xs text-danger-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="cp-input"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="cp-input"
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="cp-btn-primary w-full"
              >
                {isLoading && (
                  <svg className="w-4 h-4 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Sign in
              </button>
            </form>

            <div className="mt-6 text-xs text-slate-500">
              Need access?{' '}
              <Link to="/register" className="text-brand-700 hover:text-brand-800 font-semibold">
                Request an invite
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
