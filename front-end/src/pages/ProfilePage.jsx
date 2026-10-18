import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useAuth } from '../context/Authcontext'
import { setUser } from '../store/authSlice'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5_242_880 // 5 MB

const ProfilePage = () => {
  const { user, isLoggedIn } = useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const token = useSelector((state) => state.auth.token)

  const [isEditing, setIsEditing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fileError, setFileError] = useState('')
  const [username, setUsername] = useState(user?.username || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [imgError, setImgError] = useState(false)

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500 gap-4">
        <span className="text-6xl">👤</span>
        <h2 className="text-2xl font-semibold">You're not logged in</h2>
        <button
          onClick={() => navigate('/login')}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
        >
          Login
        </button>
      </div>
    )
  }

  const joinedAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A'

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??'
  const avatarSrc = previewUrl || user?.profilePicture || ''
  const showImage = avatarSrc !== '' && !imgError

  const resetForm = () => {
    setUsername(user?.username || '')
    setPassword('')
    setConfirmPassword('')
    setPreviewUrl(null)
    setSelectedFile(null)
    setFileError('')
    setError('')
    setSuccess('')
    setImgError(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError('')
    setSelectedFile(null)
    setPreviewUrl(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Invalid file type. Please select a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_SIZE) {
      setFileError('File exceeds the maximum allowed size of 5 MB.')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setImgError(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== '' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!token) {
      setError('Not authenticated. Please log in again.')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()

      if (username !== user.username) formData.append('username', username)
      if (password !== '') formData.append('password', password)
      if (selectedFile) formData.append('profilePicture', selectedFile) // ✅ selectedFile, not profilePicture

      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/auth/update/${user.id}`,
        formData,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      dispatch(setUser(res.data.user))
      setSuccess('Profile updated successfully.')
      setPassword('')
      setConfirmPassword('')
      setSelectedFile(null)
      setPreviewUrl(null)
      setFileError('')
      setIsEditing(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-500 to-purple-600" />

        <div className="px-8 pb-8">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-14 mb-4">

            {/* Avatar */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                {showImage ? (
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {/* Camera overlay — edit mode only */}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Upload profile picture"
                >
                  <svg className="w-6 h-6 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-white text-xs font-medium">Change</span>
                </button>
              )}

              {/* Green dot when file selected */}
              {selectedFile && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>

            {/* Edit / Cancel button */}
            {!isEditing ? (
              <button
                type="button"
                onClick={() => { resetForm(); setIsEditing(true) }}
                className="mb-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-semibold"
              >
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { resetForm(); setIsEditing(false) }}
                disabled={loading}
                className="mb-2 border border-gray-300 text-gray-600 px-5 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Upload hint */}
          {isEditing && (
            <p className="text-xs text-gray-400 mb-3">
              Hover the photo and click to change it · JPEG, PNG, WebP · max 5 MB
            </p>
          )}

          {/* File error */}
          {fileError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">
              {fileError}
            </div>
          )}

          {/* Success banner */}
          {success && !isEditing && (
            <div className="mb-3 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}

          {/* Read-only info */}
          {!isEditing && (
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user.username}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">Joined {joinedAt}</p>
            </div>
          )}

          {/* Edit form */}
          {isEditing && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={2}
                  maxLength={30}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Email (cannot be changed)</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="border border-gray-200 rounded-lg px-4 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">
                  New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={password ? 8 : undefined}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {password !== '' && confirmPassword !== '' && password !== confirmPassword && (
                  <span className="text-xs text-red-500 mt-1">Passwords do not match.</span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
