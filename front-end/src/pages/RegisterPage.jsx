import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post('http://localhost:5000/api/auth/register', form)
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* left panel */}
      <div className="hidden lg:flex flex-col justify-center bg-[#2874f0] w-[380px] shrink-0 px-12 py-16">
        <h2 className="text-3xl font-bold text-white leading-snug mb-4">
          Looks like<br />you're new here!
        </h2>
        <p className="text-blue-200 text-sm">Sign up with your details to get started.</p>
      </div>

      {/* right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white shadow-md rounded w-full max-w-sm p-8">
          <h1 className="text-xl font-bold text-gray-800 mb-6">Create Account</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <input
              name="username"
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full border-b-2 border-gray-300 focus:border-[#2874f0] px-0 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-colors"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border-b-2 border-gray-300 focus:border-[#2874f0] px-0 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-colors"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full border-b-2 border-gray-300 focus:border-[#2874f0] px-0 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-colors"
            />

            <p className="text-xs text-gray-500">
              By continuing, you agree to ShopZone's Terms of Use and Privacy Policy.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#fb641b] hover:bg-orange-600 text-white py-3 rounded font-bold text-sm transition-colors disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Continue'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">Existing user?</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Link
              to="/login"
              className="w-full border border-[#2874f0] text-[#2874f0] py-3 rounded font-bold text-sm text-center hover:bg-blue-50 transition-colors"
            >
              Login
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
