import { createContext, useContext, useState } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null })
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  const login = async (email, password) => {
    const res = await authService.login({ email, password })
    const { access_token, user: userData } = res.data.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(access_token); setUser(userData)
    return userData
  }

  const register = async (email, username, password) => {
    const res = await authService.register({ email, username, password })
    return res.data
  }

  const logout = async () => {
    try { await authService.logout() } catch (_) {}
    localStorage.removeItem('token'); localStorage.removeItem('user')
    setToken(null); setUser(null)
  }

  return <AuthContext.Provider value={{ user, token, login, register, logout, isAdmin: user?.role === 'admin' }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
