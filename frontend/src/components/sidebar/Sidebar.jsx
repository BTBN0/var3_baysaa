import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import { useChat } from '../../context/ChatContext'
import { useTheme } from '../../context/ThemeContext'
import { useStory } from '../../context/StoryContext'
import StoryRing from '../story/StoryRing'

const SKINS = [
  { bg:'#FDDBB4',fg:'#8B5E3C' },{ bg:'#F5C99A',fg:'#7A4A2A' },{ bg:'#E8A87C',fg:'#6B3820' },
  { bg:'#C68642',fg:'#3E1F00' },{ bg:'#8D5524',fg:'#FFD5A8' },{ bg:'#4A2912',fg:'#F5C99A' },
  { bg:'#DBEAFE',fg:'#1D4ED8' },{ bg:'#EDE9FE',fg:'#7C3AED' },{ bg:'#FCE7F3',fg:'#BE185D' },
  { bg:'#D1FAE5',fg:'#065F46' },
]

function WorkspacePicker({ workspaces, active, onSelect, onCreate, onJoin }) {
  const [showNew, setShowNew] = useState(false)
  const [tab, setTab]         = useState('create')
  const [name, setName]       = useState('')
  const [code, setCode]       = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await onCreate({ name })
    setShowNew(false); setName('')
  }
  const handleJoin = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    await onJoin(code.trim())
    setShowNew(false); setCode('')
  }

  return (
    <div className="flex-shrink-0 border-b border-gray-100 dark:border-white/8">
      <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2" style={{scrollbarWidth:'none'}}>
        {workspaces.map(ws => (
          <button key={ws.id} onClick={()=>onSelect(ws)} title={ws.name}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
              ${active?.id===ws.id ? 'bg-accent text-white scale-105' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'}`}>
            {ws.avatar ? <img src={ws.avatar} className="w-full h-full object-cover rounded-xl"/> : ws.name.slice(0,2).toUpperCase()}
          </button>
        ))}
        <button onClick={()=>setShowNew(v=>!v)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-accent hover:bg-accent/10 transition-all flex-shrink-0 border border-dashed border-gray-300 dark:border-white/15">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      {showNew && (
        <div className="mx-3 mb-2 p-3 bg-gray-50 dark:bg-dark-700 rounded-2xl border border-gray-200 dark:border-white/10 anim-slide-down">
          <div className="flex gap-1 mb-3">
            {['create','join'].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${tab===t?'bg-white dark:bg-dark-600 text-gray-900 dark:text-gray-100 shadow-sm':'text-gray-400 hover:text-gray-600'}`}>
                {t==='create'?'Үүсгэх':'Нэгдэх'}
              </button>
            ))}
          </div>
          {tab==='create' ? (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input className="input-base py-2 text-xs flex-1" placeholder="Workspace нэр" value={name} onChange={e=>setName(e.target.value)}/>
              <button type="submit" className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-semibold">Үүсгэх</button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="flex gap-2">
              <input className="input-base py-2 text-xs flex-1" placeholder="Invite code" value={code} onChange={e=>setCode(e.target.value)}/>
              <button type="submit" className="px-3 py-2 rounded-xl bg-accent text-white text-xs font-semibold">Нэгдэх</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ onClose, onProfileOpen, onStoryOpen }) {
  const { user, logout, profile } = useAuth()
  const { workspaces, activeWorkspace, selectWorkspace, channels, activeChannel, selectChannel, createWorkspace, joinWorkspace, createChannel, members } = useWorkspace()
  const { setActiveDM } = useChat()
  const { theme, toggle } = useTheme()
  const { allStories } = useStory()
  const [search, setSearch]     = useState('')
  const [showNewCh, setShowNewCh] = useState(false)
  const [newChName, setNewChName] = useState('')

  const skin = SKINS[profile?.skinIdx ?? 0] || SKINS[0]
  const initials = user?.initials || user?.username?.slice(0,2).toUpperCase() || 'YO'

  const filtered = search ? channels.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())) : channels
  const dmMembers = members.filter(m => m.userId !== user?.id)

  const handleCreateChannel = async (e) => {
    e.preventDefault()
    if (!newChName.trim()) return
    await createChannel({ name: newChName.trim() })
    setNewChName(''); setShowNewCh(false)
  }

  const handleDM = (member) => {
    setActiveDM(member.user || member)
    onClose?.()
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-white/8">

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 dark:border-white/8 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
          <svg width="13" height="15" viewBox="0 0 814 1000" fill="white" className="dark:invert">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.3-150.3-109.2c-49.5-71.8-93.7-184.7-93.7-292.9 0-161 105-246 209-246 55.6 0 101.5 37.1 135.3 37.1 32.5 0 83.2-39.2 147-39.2 23.9 0 108.2 2.2 168.3 84zM549.4 35.2c25.4-30.3 44.7-72.5 44.7-114.7 0-5.8-.6-11.7-1.9-16.3-42.3 1.6-91.4 28.3-121 59.2-23.5 25.1-46 67.2-46 110 0 6.4 1.3 12.8 1.9 14.7 2.6.6 6.4 1.3 10.3 1.3 37.4-.1 84.2-25.7 112-54.2z"/>
          </svg>
        </div>
        <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-gray-100 flex-1 truncate">{activeWorkspace?.name || 'Czilla'}</span>
        <button onClick={toggle} className="btn-ghost px-2 py-1.5 text-xs">
          {theme==='dark'
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          }
        </button>
      </div>

      {/* Workspace picker */}
      <WorkspacePicker workspaces={workspaces} active={activeWorkspace} onSelect={selectWorkspace} onCreate={createWorkspace} onJoin={joinWorkspace}/>

      {/* Search */}
      <div className="px-3 py-2.5 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {/* Channels */}
      <nav className="flex-1 overflow-y-auto px-0 pb-2">
        <div className="px-1.5">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Channels</span>
            <button onClick={()=>setShowNewCh(v=>!v)} className="text-gray-400 hover:text-accent transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          {showNewCh && (
            <form onSubmit={handleCreateChannel} className="flex gap-1.5 px-2 mb-2 anim-slide-down">
              <input className="input-base py-1.5 text-xs flex-1" placeholder="channel-name" value={newChName} onChange={e=>setNewChName(e.target.value)} autoFocus/>
              <button type="submit" className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold">+</button>
            </form>
          )}

          {filtered.map(ch => (
            <button key={ch.id} onClick={()=>{selectChannel(ch);onClose?.()}}
              className={`sidebar-item w-full ${activeChannel?.id===ch.id?'sidebar-active':''}`}>
              <span className="text-sm w-4 text-center opacity-60">#</span>
              <span className="flex-1 truncate text-left">{ch.name}</span>
            </button>
          ))}
        </div>

        {/* DMs */}
        {dmMembers.length > 0 && (
          <div className="px-1.5 pt-3">
            <div className="flex items-center px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Direct Messages</span>
            </div>
            {dmMembers.slice(0, 8).map(m => {
              const u = m.user || m
              const storyGroup = allStories.find(s => s.userId === u.id)
              return (
                <button key={u.id} onClick={()=>handleDM(u)} className="sidebar-item w-full">
                  <div className="relative flex-shrink-0">
                    <StoryRing user={{ initials: u.username?.slice(0,2).toUpperCase(), id: u.id, bg:'#e8f1fb', color:'#0071e3' }}
                      size={20} hasStory={!!storyGroup} seen={storyGroup?.seen ?? true}
                      onClick={(e)=>{ if(storyGroup){e.stopPropagation();onStoryOpen?.({userId:u.id})} }}/>
                  </div>
                  <span className="flex-1 truncate text-left text-sm">{u.username}</span>
                </button>
              )
            })}
          </div>
        )}
      </nav>

      {/* User bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-white/15 flex-shrink-0">
        <button onClick={onProfileOpen} className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
          <div className="relative flex-shrink-0">
            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center overflow-hidden text-xs font-bold select-none"
              style={{ background: skin.bg, color: skin.fg, border: `2px solid ${skin.fg}55` }}>
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white dark:border-[#1c1c1e]"/>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{profile?.name || user?.username}</p>
            <p className="text-[10px] text-green-500">● Online</p>
          </div>
        </button>
        <button onClick={logout} title="Гарах" className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}
