import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
      state.error = null
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.error = null
    },
    loginFailure: (state, action) => {
      state.error = action.payload
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.error = null
    },
  },
})

export const { setUser, setCredentials, loginFailure, logout } = authSlice.actions
export const selectCurrentUser = (state) => state.auth.user
export const selectIsLoggedIn = (state) => !!state.auth.token
export const selectAuthError = (state) => state.auth.error

export default authSlice.reducer
