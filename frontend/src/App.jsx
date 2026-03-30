import { useState } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ChatProvider } from './context/ChatContext'
import { StoryProvider } from './context/StoryContext'
import { useCursor } from './hooks/useCursor'
import AuthPage from './components/auth/AuthPage'
import Sidebar from './components/sidebar/Sidebar'
import ChatArea from './components/chat/ChatArea'
import AIPanel from './components/ai/AIPanel'
import UserProfile from './components/profile/UserProfile'
import StoryViewer from './components/story/StoryViewer'
import NotificationToast from './components/notifications/NotificationToast'

// Canvas stays mounted at all times — never unmounts
function CursorCanvas() {
  return (
    <canvas
      id="cursor-canvas"
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 99999,
        display: 'block',
      }}
    />
  )
}

function Shell() {
  const { user, ready } = useAuth()
  const { theme } = useTheme()

  // useCursor always runs — regardless of auth state
  useCursor(theme)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [aiOpen,      setAiOpen]      = useState(false)
  const [storyUser,   setStoryUser]   = useState(null)

  if (!ready) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-black">
      <svg className="w-8 h-8 text-accent animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" strokeOpacity=".2"/>
        <path d="M12 2a10 10 0 0110 10"/>
      </svg>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50 dark:bg-black">

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          onProfileOpen={() => setProfileOpen(true)}
          onStoryOpen={setStoryUser}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}/>
          <div className="absolute left-0 top-0 bottom-0 w-72 z-50">
            <Sidebar
              onClose={() => setSidebarOpen(false)}
              onProfileOpen={() => { setProfileOpen(true); setSidebarOpen(false) }}
              onStoryOpen={setStoryUser}
            />
          </div>
        </div>
      )}

      {/* Chat + AI */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        <ChatArea
          onMenuOpen={() => setSidebarOpen(true)}
          onAIOpen={() => setAiOpen(o => !o)}
          aiOpen={aiOpen}
          onStoryOpen={setStoryUser}
        />

        {/* Desktop AI panel */}
        <div
          className="hidden md:flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: aiOpen ? 288 : 0, opacity: aiOpen ? 1 : 0 }}
        >
          <div className="w-72 flex-shrink-0 h-full">
            {aiOpen && <AIPanel onClose={() => setAiOpen(false)} />}
          </div>
        </div>
      </div>

      {/* Mobile AI overlay */}
      {aiOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAiOpen(false)}/>
          <div className="absolute right-0 top-0 bottom-0 w-80 z-50 anim-slide-in-r">
            <AIPanel onClose={() => setAiOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-white/5 flex md:hidden z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom,0)' }}>
        {[
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/></svg>, label: 'Channels', action: () => setSidebarOpen(true) },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Chat', action: () => setSidebarOpen(false) },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>, label: 'AI', action: () => setAiOpen(o => !o) },
          { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/></svg>, label: 'Profile', action: () => setProfileOpen(true) },
        ].map(t => (
          <button key={t.label} onClick={t.action}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-accent transition-colors">
            {t.icon}
            <span className="text-[10px]">{t.label}</span>
          </button>
        ))}
      </nav>

      <NotificationToast />
      {profileOpen && <UserProfile onClose={() => setProfileOpen(false)} />}
      {storyUser && <StoryViewer userId={storyUser.userId || storyUser} onClose={() => setStoryUser(null)} />}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <ChatProvider>
            <StoryProvider>
              {/* Canvas + cursor always live here — never unmounts */}
              <CursorCanvas />
              <Shell />
            </StoryProvider>
          </ChatProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
