import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Navigation */}
      <header className="w-full border-b border-slate-200">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="text-xl font-bold text-slate-900">CustoPilot</div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Welcome Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome</h1>
            <p className="text-sm text-slate-500">Sign in to your account to continue</p>
          </div>

          {/* Demo Credentials Banner */}
          <div className="mb-6 rounded-lg bg-slate-100 border border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Demo Credentials</p>
                <p className="mt-1 text-sm text-slate-600">admin@custopilot.com / admin123</p>
              </div>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Autofill
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Your email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Your password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-11 border border-slate-300 rounded-xl bg-white text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 5C7 5 2.73 8.11 1 12.46c1.73 4.35 6 7.54 11 7.54s9.27-3.19 11-7.54C21.27 8.11 17 5 12 5m0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5m0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.83 9L15.23 12.39c.75-.52 1.25-1.37 1.25-2.39 0-2.21-1.79-4-4-4-.99 0-1.87.46-2.39 1.17L11.83 9M19.54 8.46c.5.59 1.03 1.22 1.45 1.93.85 1.48 1.21 2.89 1.23 2.97-.02.09-.38 1.54-1.21 2.97-.23.41-.48.82-.75 1.19l2.41 2.41c.33-.72.64-1.5.92-2.36C23.54 16.5 24 14.9 24 12c0-4.41-2.87-8.21-6.8-9.58l2.34 2.34zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c0 4.41 2.87 8.21 6.8 9.58l-2.34-2.34-.46-.46L2 4.27zM7.46 6.88L6.87 7.47 9.24 9.84c-.25.67-.4 1.41-.4 2.16 0 3.53 2.61 6.43 6 6.92v-2.02c-2.84-.48-5-2.94-5-5.9 0-.71.15-1.39.38-2.04l3.85 3.85c.35-1.35.03-2.84-.77-3.9zM12.5 10c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-7 px-6 py-3.5 bg-emerald-400 hover:bg-emerald-500 text-slate-900 font-semibold rounded-full transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Log in
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 text-center text-sm text-slate-600">
            Need access?{' '}
            <Link to="/register" className="font-semibold text-slate-900 hover:text-slate-700 transition-colors">
              Request an invite
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
