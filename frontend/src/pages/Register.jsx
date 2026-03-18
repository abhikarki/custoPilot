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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-sm p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Access Policy</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Registration is invitation only</h1>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          New workspace provisioning is currently controlled. Use the demo login credentials to explore the product.
        </p>

        <div className="mt-6 p-4 rounded-lg border border-slate-200 bg-slate-100">
          <p className="text-sm font-semibold text-slate-700">Invite Only</p>
          <p className="text-xs text-slate-600 mt-1.5">
            If you need production access, contact the platform administrator.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 opacity-60">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              disabled
              className="cp-input cursor-not-allowed bg-slate-100"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled
              className="cp-input cursor-not-allowed bg-slate-100"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled
              className="cp-input cursor-not-allowed bg-slate-100"
              placeholder="Create password"
            />
          </div>

          <button type="submit" disabled className="cp-btn-ghost w-full cursor-not-allowed">
            Registration Disabled
          </button>
        </form>

        <div className="mt-6 text-xs text-slate-500">
          Already have access?{' '}
          <Link to="/login" className="text-brand-700 hover:text-brand-800 font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
