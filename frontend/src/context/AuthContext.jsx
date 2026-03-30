import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authApi } from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cz-profile')) || {} } catch { return {} }
  })
  const [loading, setLoading] = useState(false)
  const [ready,   setReady]   = useState(false)

  // Аппликейшн ачаалахад сессийг сэргээнэ
  useEffect(() => {
    const token  = localStorage.getItem('cz-token')
    const cached = localStorage.getItem('cz-user')
    if (token && cached) {
      try {
        const u = JSON.parse(cached)
        u.initials = (u.username || '??').slice(0, 2).toUpperCase()
        setUser(u)
        connectSocket(token)
      } catch {}
      // Серверээс шинэчилнэ
      authApi.me()
        .then(({ data }) => {
          const u = data.data
          if (u?.id) {
            u.initials = (u.username || '??').slice(0, 2).toUpperCase()
            setUser(u)
            localStorage.setItem('cz-user', JSON.stringify(u))
          }
        })
        .catch(() => {
          // Token хүчингүй болсон бол гаргана
          localStorage.removeItem('cz-token')
          localStorage.removeItem('cz-user')
          setUser(null)
          disconnectSocket()
        })
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

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
      const u     = data.data?.user
      if (!token || !u) {
        return { ok: false, error: data.message || 'Нэвтрэлт амжилтгүй' }
      }
      u.initials = (u.username || '??').slice(0, 2).toUpperCase()
      localStorage.setItem('cz-token', token)
      localStorage.setItem('cz-user', JSON.stringify(u))
      setUser(u)
      connectSocket(token)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Нэвтрэх амжилтгүй' }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (username, email, password) => {
    setLoading(true)
    try {
      const { data } = await authApi.register({ username, email, password })
      // Backend: { ok: true, data: { token, user } }
      const token = data.data?.token
      const u     = data.data?.user
      if (!token || !u) {
        return { ok: false, error: data.message || 'Бүртгэл амжилтгүй' }
      }
      u.initials = (u.username || '??').slice(0, 2).toUpperCase()
      localStorage.setItem('cz-token', token)
      localStorage.setItem('cz-user', JSON.stringify(u))
      setUser(u)
      connectSocket(token)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Бүртгэл амжилтгүй' }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('cz-token')
    localStorage.removeItem('cz-user')
    setUser(null)
    disconnectSocket()
  }, [])

  const updateProfile = useCallback(async (formData) => {
    try {
      const res = await authApi.updateProfile(formData)
      const updated = res.data.data
      if (updated?.id) {
        updated.initials = (updated.username || '??').slice(0, 2).toUpperCase()
        setUser(updated)
        localStorage.setItem('cz-user', JSON.stringify(updated))
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Алдаа гарлаа' }
    }
  }, [])

  const updateAvatar = useCallback(async (file) => {
    try {
      const res = await authApi.updateAvatar(file)
      const updated = res.data.data
      if (updated?.id) {
        updated.initials = (updated.username || '??').slice(0, 2).toUpperCase()
        setUser(updated)
        localStorage.setItem('cz-user', JSON.stringify(updated))
      }
      return { ok: true, avatarUrl: updated?.avatar }
    } catch (err) {
      return { ok: false, error: err.response?.data?.message || 'Алдаа гарлаа' }
    }
  }, [])

  return (
    <Ctx.Provider value={{
      user, profile, loading, ready,
      login, register, logout,
      saveProfile, updateProfile, updateAvatar,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
