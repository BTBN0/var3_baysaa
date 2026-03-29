import { createContext, useContext, useState, useEffect } from 'react'

const Ctx = createContext(null)

const init = () => {
  const t = localStorage.getItem('cz-theme') || 'dark'
  document.documentElement.classList.toggle('dark', t === 'dark')
  return t
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(init)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('cz-theme', theme)
  }, [theme])
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
