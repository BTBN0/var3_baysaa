import { useState, useEffect, useRef, useCallback } from 'react'
import { useStory } from '../../context/StoryContext'
import { useAuth } from '../../context/AuthContext'

const DURATION = 5000

function TimeAgo({ ts }) {
  const diff = Date.now() - ts
  if (diff < 60000) return <span>Саяхан</span>
  if (diff < 3600000) return <span>{Math.floor(diff/60000)}м өмнө</span>
  return <span>{Math.floor(diff/3600000)}ц өмнө</span>
}

function ProgressBars({ total, current, progress, paused }) {
  return (
    <div className="flex gap-1 px-3 pt-3 pb-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
          <div
            className="h-full bg-white rounded-full"
            style={{
              width: i < current ? '100%' : i === current ? `${progress}%` : '0%',
              transition: i === current && !paused
                ? `width ${DURATION}ms linear`
                : 'none',
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default function StoryViewer({ userId, onClose }) {
  const { allStories, markSeen } = useStory()
  const { user: me } = useAuth()

  // Find the group index and navigate between groups
  const groups = allStories.filter(g => g.stories?.length > 0)
  const [groupIdx, setGroupIdx] = useState(() =>
    Math.max(0, groups.findIndex(g => g.userId === userId))
  )
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused]     = useState(false)
  const [entering, setEntering] = useState(true)
  const [direction, setDirection] = useState('next') // for swipe feel

  const rafRef   = useRef(null)
  const startRef = useRef(Date.now())
  const elRef    = useRef(0)

  const group  = groups[groupIdx]
  const stories = group?.stories || []
  const story   = stories[storyIdx]

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 20)
    return () => clearTimeout(t)
  }, [])

  const goNext = useCallback(() => {
    if (storyIdx < stories.length - 1) {
      setStoryIdx(i => i + 1)
      setProgress(0); elRef.current = 0
    } else if (groupIdx < groups.length - 1) {
      markSeen(group?.userId)
      setDirection('next')
      setGroupIdx(i => i + 1)
      setStoryIdx(0)
      setProgress(0); elRef.current = 0
    } else {
      markSeen(group?.userId)
      onClose()
    }
  }, [storyIdx, stories.length, groupIdx, groups.length, group, markSeen, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1)
      setProgress(0); elRef.current = 0
    } else if (groupIdx > 0) {
      setDirection('prev')
      setGroupIdx(i => i - 1)
      setStoryIdx(0)
      setProgress(0); elRef.current = 0
    }
  }, [storyIdx, groupIdx])

  // Timer
  useEffect(() => {
    if (paused || !story) return
    startRef.current = Date.now() - elRef.current

    const tick = () => {
      const elapsed = Date.now() - startRef.current
      elRef.current = elapsed
      const pct = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        goNext()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [storyIdx, groupIdx, paused, story, goNext])

  // Keyboard
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [goNext, goPrev, onClose])

  if (!group || !story) return null

  const isMe = group.userId === String(me?.id)

  const bgClass = story.bg || 'from-gray-700 to-gray-900'

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        transition: 'opacity 0.2s',
        opacity: entering ? 0 : 1,
      }}
      onClick={onClose}
    >
      {/* Prev group button */}
      {groupIdx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setGroupIdx(i=>i-1); setStoryIdx(0); setProgress(0) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      )}

      {/* Next group button */}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setGroupIdx(i=>i+1); setStoryIdx(0); setProgress(0) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center text-white transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* Story card */}
      <div
        className={`relative select-none`}
        style={{
          width: 'min(390px, 100vw)',
          height: 'min(700px, 100dvh)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          transform: entering ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={() => { setPaused(true); elRef.current = Date.now() - startRef.current }}
        onMouseUp={() => { setPaused(false) }}
        onTouchStart={() => { setPaused(true) }}
        onTouchEnd={() => { setPaused(false) }}
      >
        {/* Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${bgClass}`} />
        {story.image && (
          <img src={story.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Vignette */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.55) 100%)'
        }} />

        {/* Progress bars */}
        <div className="relative z-10">
          <ProgressBars total={stories.length} current={storyIdx} progress={progress} paused={paused} />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center gap-3 px-4 py-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-white flex-shrink-0"
            style={{ background: group.userBg, color: group.userColor }}
          >
            {group.userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">{group.userName}</p>
            <p className="text-[11px] text-white/60">
              <TimeAgo ts={story.createdAt} />
            </p>
          </div>
          {paused && (
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            </div>
          )}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Story content */}
        <div className="absolute inset-0 flex items-center justify-center px-8 pb-20 pt-24">
          {!story.image && (
            <p className="text-white text-[26px] font-black text-center leading-tight tracking-tight drop-shadow-lg"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
              {story.content}
            </p>
          )}
        </div>

        {/* Bottom reply bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-6 pt-2">
          {!isMe ? (
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-white/15 backdrop-blur border border-white/30 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/60 focus:outline-none focus:bg-white/20 transition-colors"
                placeholder={`${group.userName}-д хариулах…`}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              />
              <button
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 flex items-center justify-center text-white transition-colors"
                onClick={e => e.stopPropagation()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </button>
              <button
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 flex items-center justify-center text-white transition-colors"
                onClick={e => e.stopPropagation()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex items-center gap-4 bg-black/30 backdrop-blur rounded-2xl px-5 py-2.5">
                <span className="text-white/60 text-xs">👁 {Math.floor(Math.random()*12)+2} харсан</span>
                <span className="text-white/30">·</span>
                <span className="text-white/60 text-xs">❤️ {Math.floor(Math.random()*8)} хариу</span>
              </div>
            </div>
          )}
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 flex" style={{top:80, bottom:80}}>
          <div className="flex-1" onClick={e => { e.stopPropagation(); goPrev() }} />
          <div className="flex-1" onClick={e => { e.stopPropagation(); goNext() }} />
        </div>
      </div>
    </div>
  )
}
