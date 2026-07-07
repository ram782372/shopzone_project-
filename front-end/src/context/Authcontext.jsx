import { createContext, useContext } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectCurrentUser, selectIsLoggedIn, logout } from '../store/authSlice'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const user = useSelector(selectCurrentUser)
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const dispatch = useDispatch()

  const handleLogout = () => dispatch(logout())

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
