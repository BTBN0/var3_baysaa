import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useChat } from '../../context/ChatContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import MessageBubble from './MessageBubble'
import StoryPanel from '../story/StoryPanel'
import StoryCreator from '../story/StoryCreator'

function TypingIndicator({ names }) {
  if (!names.length) return null
  const txt = names.length === 1 ? `${names[0]} бичиж байна` : `${names.slice(0,-1).join(', ')} болон ${names.at(-1)} бичиж байна`
  return (
    <div className="flex items-center gap-2 px-5 pb-1 text-xs text-gray-400 dark:text-gray-500">
      <div className="flex gap-0.5">
        {[0,1,2].map(i=><span key={i} className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{animationDelay:`${i*.15}s`,animationDuration:'1s'}}/>)}
      </div>
      <span>{txt}…</span>
    </div>
  )
}

export default function ChatArea({ onMenuOpen, onAIOpen, aiOpen, onStoryOpen }) {
  const { user } = useAuth()
  const { activeChannel } = useWorkspace()
  const { currentMessages, currentDMs, currentTyping, activeDM, sendMessage, uploadFile, startTyping, uploading, uploadPct } = useChat()
  const [text, setText]               = useState('')
  const [dragOver, setDragOver]       = useState(false)
  const [storyPanelOpen, setStoryPanelOpen] = useState(false)
  const [addingStory, setAddingStory] = useState(false)
  const endRef  = useRef(null)
  const inputRef = useRef(null)
  const fileRef  = useRef(null)

  const msgs = activeDM ? currentDMs : currentMessages

  // Empty state — no workspace or channel yet
  if (!activeChannel && !activeDM) {
    return (
      <div className="flex flex-col flex-1 min-w-0 items-center justify-center bg-white dark:bg-black gap-4">
        <canvas id="cursor-canvas" style={{display:'none'}}/>
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-3xl">💬</div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Workspace сонгоно уу</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sidebar-аас workspace үүсгэх эсвэл нэгдэх</p>
        </div>
        <button onClick={onMenuOpen} className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          Sidebar нээх
        </button>
      </div>
    )
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length, currentTyping.length])

  const handleSend = useCallback(async () => {
    if (!text.trim()) return
    const t = text; setText('')
    await sendMessage(t)
    inputRef.current?.focus()
  }, [text, sendMessage])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    else startTyping()
  }

  const handleFile = async (files) => {
    if (!files?.length) return
    await uploadFile(files[0])
  }

  const title = activeDM ? (activeDM.username || activeDM.name) : (activeChannel?.name || '...')
  const isChannel = !activeDM

  const grouped = msgs.map((msg, i) => {
    const prev = msgs[i-1]
    const isOwn = (msg.userId || msg.senderId) === user?.id
    const showAvatar = !prev ||
      (prev.userId || prev.senderId) !== (msg.userId || msg.senderId) ||
      new Date(msg.createdAt) - new Date(prev.createdAt) > 300000
    return { ...msg, isOwn, showAvatar }
  })

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white dark:bg-black h-full"
      onDragOver={e=>{e.preventDefault();setDragOver(true)}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files)}}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 dark:border-white/8 flex-shrink-0 bg-white dark:bg-dark-800">
        <button onClick={onMenuOpen} className="md:hidden btn-ghost px-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            {isChannel && <span className="text-gray-400 text-sm">#</span>}
            <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 tracking-tight">{title}</h2>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5">{isChannel ? 'Channel' : 'Direct message'}</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {/* Story button */}
          <button onClick={()=>setStoryPanelOpen(o=>!o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
              ${storyPanelOpen ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/20'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <defs><linearGradient id="sbg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f97316"/><stop offset="50%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
              <circle cx="12" cy="12" r="10" stroke={storyPanelOpen?'white':'url(#sbg)'} strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="16" stroke={storyPanelOpen?'white':'url(#sbg)'} strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="8" y1="12" x2="16" y2="12" stroke={storyPanelOpen?'white':'url(#sbg)'} strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Story
          </button>
          {/* AI button */}
          <button onClick={onAIOpen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
              ${aiOpen ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-accent/10 hover:text-accent'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            AI
          </button>
        </div>
      </div>

      {/* Story panel */}
      {storyPanelOpen && (
        <StoryPanel onClose={()=>setStoryPanelOpen(false)} onStoryOpen={onStoryOpen} onAddStory={()=>{setStoryPanelOpen(false);setAddingStory(true)}}/>
      )}
      {addingStory && <StoryCreator onClose={()=>setAddingStory(false)}/>}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto py-4 relative ${dragOver?'ring-2 ring-inset ring-accent/40 bg-accent/5':''}`}>
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-accent">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p className="text-sm font-medium">Файлаа энд чирнэ үү</p>
            </div>
          </div>
        )}
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-2xl">{isChannel ? '#' : '💬'}</div>
            <p className="text-sm">{isChannel ? `#${title} channel-ийн эхлэл` : `${title}-тай ярилцлага`}</p>
          </div>
        )}
        <div className="space-y-0.5">
          {grouped.map(msg => <MessageBubble key={msg.id} msg={msg} isOwn={msg.isOwn} showAvatar={msg.showAvatar}/>)}
        </div>
        <TypingIndicator names={currentTyping}/>
        <div ref={endRef}/>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-white/8">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-accent animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0110 10"/></svg>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all" style={{width:`${uploadPct}%`}}/>
            </div>
            <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{uploadPct}%</span>
          </div>
        </div>
      )}

      {/* Compose */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-gray-100 dark:border-white/8">
        <div className={`flex flex-col rounded-2xl border transition-all ${text?'border-accent/50 shadow-sm shadow-accent/10':'border-gray-200 dark:border-white/10'} bg-gray-50 dark:bg-dark-700`}>
          <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b border-gray-100 dark:border-white/8">
            <button onClick={()=>fileRef.current?.click()} className="btn-ghost px-2 py-1.5 text-gray-400 hover:text-accent" title="Файл">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={e=>handleFile(e.target.files)}/>
            <button className="btn-ghost px-2 py-1.5 text-gray-400" title="Emoji">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </button>
          </div>
          <textarea ref={inputRef}
            className="px-4 pt-2.5 pb-2 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none min-h-[48px] max-h-36"
            placeholder={`Message ${isChannel?'#':''}${title}…`}
            value={text} rows={1}
            onChange={e=>setText(e.target.value)}
            onKeyDown={handleKey}/>
          <div className="flex items-center justify-end px-3 pb-2.5 pt-1">
            <button onClick={handleSend} disabled={!text.trim()}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all
                ${text.trim() ? 'bg-accent text-white hover:bg-accent-hover active:scale-95' : 'bg-gray-200 dark:bg-dark-600 text-gray-400'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Send
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1.5 text-center">Enter — илгээх · Shift+Enter — шинэ мөр</p>
      </div>
    </div>
  )
}
