import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

const STATUS_CONFIG = {
  online:  { color: 'bg-green-400', label: 'Online',  dot: 'text-green-500' },
  away:    { color: 'bg-amber-400', label: 'Away',    dot: 'text-amber-500' },
  busy:    { color: 'bg-red-400',   label: 'Busy',    dot: 'text-red-500'   },
  offline: { color: 'bg-gray-400',  label: 'Offline', dot: 'text-gray-400'  },
}

const COVERS = [
  { id: 'violet', v: 'linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)' },
  { id: 'ocean',  v: 'linear-gradient(135deg,#0ea5e9,#38bdf8,#22d3ee)' },
  { id: 'forest', v: 'linear-gradient(135deg,#16a34a,#4ade80,#34d399)' },
  { id: 'fire',   v: 'linear-gradient(135deg,#f97316,#fb923c,#fbbf24)' },
  { id: 'rose',   v: 'linear-gradient(135deg,#f43f5e,#fb7185,#f472b6)' },
  { id: 'night',  v: 'linear-gradient(135deg,#0f172a,#1e293b,#334155)' },
  { id: 'aurora', v: 'linear-gradient(135deg,#06b6d4,#a78bfa,#f0abfc)' },
  { id: 'gold',   v: 'linear-gradient(135deg,#d97706,#f59e0b,#fcd34d)' },
]

export const SKINS = [
  { bg: '#FDDBB4', fg: '#8B5E3C' },
  { bg: '#F5C99A', fg: '#7A4A2A' },
  { bg: '#E8A87C', fg: '#6B3820' },
  { bg: '#C68642', fg: '#3E1F00' },
  { bg: '#8D5524', fg: '#FFD5A8' },
  { bg: '#4A2912', fg: '#F5C99A' },
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#EDE9FE', fg: '#7C3AED' },
  { bg: '#FCE7F3', fg: '#BE185D' },
  { bg: '#D1FAE5', fg: '#065F46' },
]

export default function UserProfile({ onClose }) {
  const { user, logout, profile, saveProfile } = useAuth()

  // Read persisted profile state, fall back to defaults
  const [name,      setName]      = useState(profile.name      ?? user?.name  ?? '')
  const [email,     setEmail]     = useState(profile.email     ?? user?.email ?? '')
  const [bio,       setBio]       = useState(profile.bio       ?? '')
  const [status,    setStatus]    = useState(profile.status    ?? 'online')
  const [coverId,   setCoverId]   = useState(profile.coverId   ?? 'violet')
  const [skinIdx,   setSkinIdx]   = useState(profile.skinIdx   ?? 0)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null)

  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [showSkins, setShowSkins] = useState(false)

  const avatarRef = useRef(null)
  const scrollRef = useRef(null)

  const skin       = SKINS[skinIdx] || SKINS[0]
  const initials   = user?.initials || user?.name?.slice(0,2).toUpperCase() || 'YO'
  const sc         = STATUS_CONFIG[status]
  const coverStyle = COVERS.find(c => c.id === coverId)?.v || COVERS[0].v

  // Hide cursor while scrolling
  useEffect(() => {
    const canvas = document.getElementById('particle-canvas')
    const el = scrollRef.current
    if (!canvas || !el) return
    const hide = () => {
      canvas.style.opacity = '0'
      clearTimeout(el._t)
      el._t = setTimeout(() => { canvas.style.opacity = '1' }, 280)
    }
    el.addEventListener('scroll', hide, { passive: true })
    return () => el.removeEventListener('scroll', hide)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    // Save all profile data to context (persisted in localStorage)
    saveProfile({ name, email, bio, status, coverId, skinIdx, avatarUrl })
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90dvh', animation: 'fadeUp .25s cubic-bezier(0.22,1,0.36,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cover */}
        <div className="relative flex-shrink-0 rounded-t-3xl" style={{ height: 110, background: coverStyle }}>
          <div className="absolute inset-0 rounded-t-3xl"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)', backgroundSize: '20px 20px' }}/>
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors z-10">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Avatar */}
          <div className="absolute z-20" style={{ left: 20, bottom: -38 }}>
            <div className="relative group">
              <div className="w-[76px] h-[76px] rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  border: `4px solid ${skin.bg}`,
                  boxShadow: `0 0 0 2px ${skin.fg}40, 0 4px 20px rgba(0,0,0,0.22)`,
                  background: avatarUrl ? 'transparent' : skin.bg,
                }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover"/>
                  : <span className="text-2xl font-black select-none leading-none" style={{ color: skin.fg }}>{initials}</span>
                }
              </div>
              <button onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if(f) setAvatarUrl(URL.createObjectURL(f)) }}/>

              {/* Skin toggle button */}
              {!avatarUrl && (
                <button onClick={() => setShowSkins(v => !v)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                  style={{ background: skin.bg }}>
                  <span className="sr-only">Skin</span>
                </button>
              )}

              {/* Status dot */}
              <span className={`absolute bottom-0.5 right-5 w-4 h-4 rounded-full border-[3px] border-white z-30 ${sc.color}`}/>
            </div>

            {/* Skin picker popup */}
            {showSkins && (
              <div className="absolute z-40 mt-2 p-3 bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/15"
                style={{ top: '100%', left: 0, animation: 'fadeUp .15s ease' }}>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Skin өнгө</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {SKINS.map((s, i) => (
                    <button key={i} onClick={() => { setSkinIdx(i); setShowSkins(false) }}
                      className={`w-8 h-8 rounded-full transition-all hover:scale-110
                        ${skinIdx === i ? 'scale-110 ring-2 ring-offset-1 ring-gray-500' : ''}`}
                      style={{ background: s.bg, border: `2px solid ${s.fg}55` }}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-5" style={{ scrollbarWidth: 'none' }}>

          {/* Edit button row */}
          <div className="flex items-center justify-end" style={{ paddingTop: 50 }}>
            <button onClick={() => setEditing(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all
                ${editing
                  ? 'bg-gray-100 dark:bg-[#2c2c2e] border-gray-200 dark:border-white/15 text-gray-500'
                  : 'bg-gray-900 dark:bg-white border-transparent text-white dark:text-gray-900 hover:opacity-80'}`}>
              {editing
                ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Болих</>
                : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>Засах</>}
            </button>
          </div>

          {/* Name / status */}
          <div className="mt-1 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">{name || user?.name}</h2>
              <span className={`flex items-center gap-1 text-[10px] font-semibold ${sc.dot}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.color}`}/>{sc.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{email || user?.email}</p>
            {bio && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{bio}</p>}
          </div>

          {/* Stats */}
          <div className="flex rounded-2xl overflow-hidden border border-gray-100 dark:border-white/8 mb-4">
            {[{l:'Channel',v:'5'},{l:'Мессеж',v:'142'},{l:'Story',v:'3'}].map((s,i) => (
              <div key={s.l} className={`flex-1 py-2.5 text-center ${i>0?'border-l border-gray-100 dark:border-white/8':''}`}>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.v}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Edit form */}
          {editing && (
            <form onSubmit={handleSave} className="mb-4 p-4 bg-gray-50 dark:bg-[#2c2c2e] rounded-2xl border border-gray-100 dark:border-white/8 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Cover өнгө</p>
                <div className="flex gap-2 flex-wrap">
                  {COVERS.map(opt => (
                    <button type="button" key={opt.id} onClick={() => setCoverId(opt.id)}
                      className={`w-8 h-8 rounded-full flex-shrink-0 transition-all hover:scale-110
                        ${coverId === opt.id ? 'scale-125 outline outline-2 outline-offset-2 outline-gray-400' : ''}`}
                      style={{ background: opt.v }}/>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-white/8 pt-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Нэр</p>
                  <input className="input-base py-2 text-sm" type="text" value={name} onChange={e => setName(e.target.value)}/>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Имэйл</p>
                  <input className="input-base py-2 text-sm" type="email" value={email} onChange={e => setEmail(e.target.value)}/>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Bio</p>
                  <textarea className="input-base py-2 text-sm resize-none" rows={2} value={bio}
                    onChange={e => setBio(e.target.value)} placeholder="Өөрийгөө танилцуулах…"/>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Статус</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(STATUS_CONFIG).map(([key,cfg]) => (
                      <button type="button" key={key} onClick={() => setStatus(key)}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-semibold border transition-all
                          ${status === key
                            ? 'bg-gray-900 dark:bg-white border-transparent text-white dark:text-gray-900'
                            : 'bg-white dark:bg-[#3a3a3c] border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300'}`}>
                        <span className={`w-2 h-2 rounded-full ${cfg.color}`}/>{cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50">
                {saving
                  ? <><svg className="w-3.5 h-3.5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0110 10"/></svg>Хадгалж байна…</>
                  : saved
                    ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Хадгаллаа!</>
                    : 'Хадгалах'}
              </button>
            </form>
          )}

          <button onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-red-200 dark:border-red-900/40 text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Гарах
          </button>
        </div>
      </div>
    </div>
  )
}
