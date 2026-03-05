import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Loader2 } from 'lucide-react'

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
    <div className="min-h-screen bg-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-apple-xl mb-5">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h1 className="text-[32px] font-semibold text-primary-600 tracking-tight">CustoPilot</h1>
          <p className="text-[17px] text-primary-400 mt-1">AI-Powered Customer Support</p>
        </div>

        {/* Invite Only Notice */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-apple">
          <p className="text-[15px] font-medium text-amber-800">Invite Only</p>
          <p className="text-[13px] text-amber-700 mt-1.5 leading-relaxed">
            Sign ups are currently by invitation only. Please use the demo account to explore the platform.
          </p>
          <Link
            to="/login"
            className="inline-block mt-3 text-[13px] text-amber-700 hover:text-amber-900 font-medium"
          >
            Go to Login →
          </Link>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-apple-lg shadow-card p-8 opacity-60">
          <h2 className="text-[21px] font-semibold text-primary-600 mb-6">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled
                className="w-full px-4 py-3 bg-primary-100 border border-primary-200 rounded-apple text-[15px] text-primary-400 cursor-not-allowed"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled
                className="w-full px-4 py-3 bg-primary-100 border border-primary-200 rounded-apple text-[15px] text-primary-400 cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-primary-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                disabled
                className="w-full px-4 py-3 bg-primary-100 border border-primary-200 rounded-apple text-[15px] text-primary-400 cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled
              className="w-full py-3 px-4 bg-primary-300 text-primary-400 rounded-apple text-[15px] font-medium cursor-not-allowed"
            >
              Registration Disabled
            </button>
          </form>

          <div className="mt-6 text-center text-[13px] text-primary-400">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-500 hover:text-accent-600 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
