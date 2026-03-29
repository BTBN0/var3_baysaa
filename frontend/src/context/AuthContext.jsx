import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authApi } from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => { try { return JSON.parse(localStorage.getItem('cz-user')) } catch { return null } })
  const [profile, setProfile] = useState(() => { try { return JSON.parse(localStorage.getItem('cz-profile')) || {} } catch { return {} } })
  const [loading, setLoading] = useState(false)
  const [ready,   setReady]   = useState(false)

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('cz-token')
    const cached = localStorage.getItem('cz-user')
    if (token && cached) {
      connectSocket(token)
      authApi.me()
        .then(({ data }) => {
          // Backend: { ok: true, data: user }
          const u = data.data || data.user
          if (u?.id) persistUser(u)
        })
        .catch(() => {
          // Token invalid — keep cached user
        })
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  const persistUser = (u, token) => {
    if (u && u.id) {
      // Add initials helper (backend doesn't send this)
      u.initials = (u.username || u.email || '??').slice(0, 2).toUpperCase()
    }
    setUser(u)
    if (u) {
      localStorage.setItem('cz-user', JSON.stringify(u))
      if (token) localStorage.setItem('cz-token', token)
      connectSocket(token || localStorage.getItem('cz-token'))
    } else {
      localStorage.removeItem('cz-user')
      localStorage.removeItem('cz-token')
      disconnectSocket()
    }
  }

  const saveProfile = useCallback((updates) => {
    setProfile(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem('cz-profile', JSON.stringify(next))
      return next
    })
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      // Backend: { ok: true, data: { token, user } }
      const token = data.data?.token
      const user  = data.data?.user
      if (!token) return { ok: false, error: 'Token хүлээж аваагүй' }
      persistUser(user, token)
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.message || 'Нэвтрэх амжилтгүй'
      return { ok: false, error: msg }
    } finally { setLoading(false) }
  }, [])

  const register = useCallback(async (username, email, password) => {
    setLoading(true)
    try {
      const { data } = await authApi.register({ username, email, password })
      // Backend: { ok: true, data: { token, user } }
      const token = data.data?.token
      const user  = data.data?.user
      if (!token) return { ok: false, error: 'Token хүлээж аваагүй' }
      persistUser(user, token)
      return { ok: true }
    } catch (err) {
      const msg = err.response?.data?.message || 'Бүртгэл амжилтгүй'
      return { ok: false, error: msg }
    } finally { setLoading(false) }
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch {}
    persistUser(null)
  }, [])

  const updateProfile = useCallback(async (data) => {
    try {
      const res = await authApi.updateProfile(data)
      persistUser(res.data.user || res.data)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Алдаа гарлаа' }
    }
  }, [])

  return (
    <Ctx.Provider value={{ user, profile, loading, ready, login, register, logout, saveProfile, updateProfile }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
