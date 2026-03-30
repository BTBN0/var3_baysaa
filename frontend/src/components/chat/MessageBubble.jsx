import { useState, useEffect, useRef } from 'react'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { messageApi, reactionApi } from '../../lib/api'
import { getSocket, EV } from '../../lib/socket'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '')

function FileAttachment({ fileUrl, fileType }) {
  const isImage = fileType?.startsWith('image/')
  const url = fileUrl?.startsWith('http') ? fileUrl : API_BASE + fileUrl
  if (isImage) return (
    <a href={url} target="_blank" rel="noreferrer" className="block mt-1 max-w-xs">
      <img src={url} alt="attachment" className="rounded-2xl max-h-52 object-cover" />
    </a>
  )
  return (
    <a href={url} download target="_blank" rel="noreferrer"
      className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl max-w-xs"
      style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)'}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      <span className="text-xs text-gray-300 truncate">Файл татах</span>
    </a>
  )
}

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥']

export default function MessageBubble({ msg, isOwn, showAvatar }) {
  const [hovered, setHovered]       = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showMenu, setShowMenu]     = useState(false)
  const [pinAnim, setPinAnim]       = useState(false)
  const [visible, setVisible]       = useState(false)
  const menuRef = useRef(null)
  const { user } = useAuth()
  const { setMessages } = useChat()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(t)
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const handleDelete = async () => {
    setShowMenu(false)
    if (!window.confirm('Устгах уу?')) return
    try {
      await messageApi.delete(msg.id)
      getSocket().emit(EV.DELETE_MESSAGE, { messageId: msg.id, channelId: msg.channelId })
    } catch (e) { console.error(e) }
  }

  const handlePin = async () => {
    setShowMenu(false)
    setPinAnim(true)
    setTimeout(() => setPinAnim(false), 600)
    try {
      const { data } = await messageApi.pin(msg.id)
      const updated = data.data
      setMessages(prev => {
        const next = { ...prev }
        for (const key in next) next[key] = next[key].map(m => m.id === msg.id ? updated : m)
        return next
      })
      getSocket().emit('message_pinned', { message: updated, channelId: msg.channelId })
    } catch (e) { console.error(e) }
  }

  const handleCopy = () => {
    setShowMenu(false)
    navigator.clipboard.writeText(msg.content || '')
  }

  const handleReaction = async (emoji) => {
    setShowPicker(false)
    try {
      await reactionApi.toggle(msg.id, emoji)
      const reactRes = await reactionApi.list(msg.id)
      const reactions = reactRes.data.data || []
      setMessages(prev => {
        const next = { ...prev }
        for (const key in next) next[key] = next[key].map(m => m.id === msg.id ? { ...m, reactions } : m)
        return next
      })
      getSocket().emit(EV.REACTION_UPDATED, { messageId: msg.id, channelId: msg.channelId, reactions })
    } catch (e) { console.error(e) }
  }

  const groupedReactions = (msg.reactions || []).reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, mine: false }
    acc[r.emoji].count++
    if (r.userId === user?.id) acc[r.emoji].mine = true
    return acc
  }, {})

  const isDeleted = msg.deleted
  const showActions = hovered && !isDeleted

  return (
    <>
      <style>{`
        @keyframes pickerIn {
          from { opacity:0; transform:scale(0.8) translateY(4px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes menuIn {
          from { opacity:0; transform:scale(0.92) translateY(-6px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes pinPop {
          0%   { transform:scale(1) rotate(0deg); }
          30%  { transform:scale(1.5) rotate(-20deg); }
          60%  { transform:scale(0.9) rotate(12deg); }
          100% { transform:scale(1) rotate(0deg); }
        }
        @keyframes pinnedIn {
          from { opacity:0; transform:translateX(-6px); }
          to   { opacity:1; transform:translateX(0); }
        }
      `}</style>

      <div
        className={`flex gap-2.5 px-4 py-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.22s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowPicker(false) }}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 self-end mb-1">
          {showAvatar && !isOwn && <Avatar user={msg.user} size={32} />}
        </div>

        {/* Content */}
        <div className={`flex flex-col max-w-[68%] ${isOwn ? 'items-end' : 'items-start'}`}>

          {showAvatar && !isOwn && (
            <span className="text-[11px] ml-1 mb-0.5" style={{color:'rgba(255,255,255,0.32)'}}>
              {msg.user?.username}
            </span>
          )}

          {/* Pinned badge */}
          {msg.pinned && (
            <div className={`flex items-center gap-1 mb-1 ${isOwn ? 'mr-2' : 'ml-2'}`}
              style={{animation:'pinnedIn 0.3s ease'}}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#f59e0b"
                style={{
                  filter:'drop-shadow(0 0 5px rgba(245,158,11,0.7))',
                  animation: pinAnim ? 'pinPop 0.6s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                }}>
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
              <span className="text-[9px] font-semibold tracking-widest"
                style={{color:'#f59e0b', textShadow:'0 0 10px rgba(245,158,11,0.5)'}}>
                ТОГТООСОН
              </span>
            </div>
          )}

          {/* Bubble row */}
          <div className={`flex items-end gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>

            {/* Bubble */}
            <div style={{
              transform: hovered ? 'scale(1.012)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              {isDeleted ? (
                <div className="px-4 py-2.5 rounded-3xl text-xs italic"
                  style={{border:'1px solid rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.22)'}}>
                  Мессеж устгагдсан
                </div>
              ) : (
                <>
                  {msg.content && (
                    <div className={`px-4 py-2.5 text-sm leading-relaxed break-words select-text
                      ${isOwn ? 'rounded-3xl rounded-br-md' : 'rounded-3xl rounded-bl-md'}`}
                      style={isOwn
                        ? {background:'linear-gradient(135deg,#a855f7,#6366f1)',color:'white',boxShadow:'0 4px 20px rgba(168,85,247,0.2)'}
                        : {background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.9)'}}>
                      {msg.content}
                    </div>
                  )}
                  {msg.fileUrl && <FileAttachment fileUrl={msg.fileUrl} fileType={msg.fileType} />}
                </>
              )}
            </div>

            {/* Hover mini toolbar: emoji + reply + three-dot */}
            <div className={`flex items-center gap-1 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}
              style={{
                opacity: showActions ? 1 : 0,
                transform: showActions ? 'scale(1)' : 'scale(0.85)',
                transition: 'opacity 0.15s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                pointerEvents: showActions ? 'auto' : 'none',
              }}>

              {/* Emoji picker trigger */}
              <div className="relative">
                <button onClick={() => { setShowPicker(v => !v); setShowMenu(false) }}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-transform hover:scale-115 active:scale-95"
                  style={{background:'rgba(255,255,255,0.09)'}}>
                  <span style={{fontSize:13}}>😊</span>
                </button>
                {showPicker && (
                  <div className={`absolute bottom-full mb-2 z-50 flex items-center gap-0.5 px-2 py-1.5 rounded-2xl shadow-2xl ${isOwn ? 'right-0' : 'left-0'}`}
                    style={{
                      background:'#1a1a2e',
                      border:'1px solid rgba(255,255,255,0.1)',
                      boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
                      animation:'pickerIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => handleReaction(e)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-transform hover:scale-125 active:scale-95"
                        style={{fontSize:17}}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply */}
              <button className="w-7 h-7 flex items-center justify-center rounded-full transition-transform hover:scale-115 active:scale-95"
                style={{background:'rgba(255,255,255,0.09)'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 17 4 12 9 7"/>
                  <path d="M20 18v-2a4 4 0 00-4-4H4"/>
                </svg>
              </button>

              {/* Three dots → context menu */}
              <div className="relative" ref={menuRef}>
                <button onClick={() => { setShowMenu(v => !v); setShowPicker(false) }}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-transform hover:scale-115 active:scale-95"
                  style={{background:'rgba(255,255,255,0.09)'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.65)">
                    <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                  </svg>
                </button>

                {/* Context menu — Instagram style */}
                {showMenu && (
                  <div
                    className={`absolute bottom-full mb-2 z-50 rounded-2xl overflow-hidden shadow-2xl min-w-[160px] ${isOwn ? 'right-0' : 'left-0'}`}
                    style={{
                      background:'#1c1c1e',
                      border:'1px solid rgba(255,255,255,0.1)',
                      boxShadow:'0 24px 64px rgba(0,0,0,0.7)',
                      animation:'menuIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    }}>

                    {/* Time header */}
                    <div className="px-4 py-2.5 text-center"
                      style={{borderBottom:'1px solid rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.35)',fontSize:11}}>
                      {formatTime(msg.createdAt)}
                    </div>

                    {/* Menu items */}
                    {[
                      {
                        label: msg.pinned ? 'Болиулах' : 'Тогтоох',
                        icon: (
                          <svg width="16" height="16" viewBox="0 0 24 24"
                            fill={msg.pinned ? '#f59e0b' : 'none'}
                            stroke={msg.pinned ? '#f59e0b' : 'currentColor'} strokeWidth="2">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                          </svg>
                        ),
                        onClick: handlePin,
                      },
                      {
                        label: 'Хуулах',
                        icon: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                          </svg>
                        ),
                        onClick: handleCopy,
                      },
                      ...(isOwn ? [{
                        label: 'Устгах',
                        icon: (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                          </svg>
                        ),
                        onClick: handleDelete,
                        danger: true,
                      }] : []),
                    ].map((item, i, arr) => (
                      <button key={item.label} onClick={item.onClick}
                        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5 active:bg-white/10"
                        style={{
                          borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          color: item.danger ? '#f87171' : 'rgba(255,255,255,0.85)',
                          fontSize: 14,
                          fontWeight: 400,
                        }}>
                        <span>{item.label}</span>
                        <span style={{opacity: item.danger ? 1 : 0.7}}>{item.icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className={`flex gap-1 mt-1 flex-wrap ${isOwn ? 'justify-end' : ''}`}>
              {Object.values(groupedReactions).map(r => (
                <button key={r.emoji} onClick={() => handleReaction(r.emoji)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-110 active:scale-95"
                  style={r.mine
                    ? {background:'rgba(168,85,247,0.2)',border:'1px solid rgba(168,85,247,0.4)',boxShadow:'0 0 8px rgba(168,85,247,0.2)'}
                    : {background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)'}}>
                  <span>{r.emoji}</span>
                  <span style={{color:'rgba(255,255,255,0.6)',fontSize:10}}>{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
