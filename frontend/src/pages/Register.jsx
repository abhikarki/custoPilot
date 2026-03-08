import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
  })
  const { register, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Registration disabled
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CustoPilot</h1>
          <p className="text-sm text-slate-500 mt-1">AI-Powered Customer Support Platform</p>
        </div>

        {/* Invite Only Notice */}
        <div className="mb-5 p-4 bg-warning-50 border border-warning-100 rounded-lg">
          <p className="text-sm font-medium text-warning-700">Invite Only</p>
          <p className="text-xs text-warning-600 mt-1.5 leading-relaxed">
            Registration is currently by invitation only. Please use the demo account to explore the platform.
          </p>
          <Link
            to="/login"
            className="inline-block mt-3 text-xs text-warning-700 hover:text-warning-800 font-medium"
          >
            Go to Login
          </Link>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 opacity-60">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed"
                placeholder="Create password"
              />
            </div>

            <button
              type="submit"
              disabled
              className="w-full py-2.5 px-4 bg-slate-200 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
            >
              Registration Disabled
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
