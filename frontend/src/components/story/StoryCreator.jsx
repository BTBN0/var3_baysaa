import { useState, useRef } from 'react'
import { useStory } from '../../context/StoryContext'
import { useAuth } from '../../context/AuthContext'
import { SKINS } from '../profile/UserProfile'

const GRADIENTS = [
  { label: 'Sunset',   value: 'from-orange-400 via-pink-500 to-rose-600' },
  { label: 'Ocean',    value: 'from-blue-500 via-cyan-400 to-teal-500' },
  { label: 'Forest',   value: 'from-green-500 via-emerald-400 to-teal-500' },
  { label: 'Purple',   value: 'from-violet-600 via-purple-500 to-fuchsia-600' },
  { label: 'Fire',     value: 'from-yellow-400 via-orange-500 to-red-600' },
  { label: 'Midnight', value: 'from-slate-800 via-blue-900 to-slate-900' },
  { label: 'Rose',     value: 'from-pink-400 via-rose-400 to-red-400' },
  { label: 'Aurora',   value: 'from-green-400 via-teal-300 to-cyan-500' },
]

const TEXT_SIZES = [
  { label: 'S', class: 'text-xl' },
  { label: 'M', class: 'text-2xl' },
  { label: 'L', class: 'text-3xl' },
]

export default function StoryCreator({ onClose }) {
  const { addStory } = useStory()
  const { user, profile } = useAuth()
  const skin = SKINS[profile?.skinIdx ?? 0] || SKINS[0]
  const [text, setText]   = useState('')
  const [bg,   setBg]     = useState(GRADIENTS[0].value)
  const [sizeIdx, setSizeIdx] = useState(1)
  const [imgPreview, setImgPreview] = useState(null)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef(null)

  const handleImg = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImgPreview(URL.createObjectURL(f))
    setText('')
  }

  const handlePost = async () => {
    if (!text.trim() && !imgPreview) return
    setPosting(true)
    await new Promise(r => setTimeout(r, 400))
    addStory({
      type: imgPreview ? 'image' : 'text',
      content: text,
      bg,
      image: imgPreview,
    })
    setPosting(false)
    onClose()
  }

  const textSizeClass = TEXT_SIZES[sizeIdx].class

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col gap-0 rounded-3xl overflow-hidden shadow-2xl"
        style={{ width: 'min(380px, 95vw)', animation: 'fadeUp .25s cubic-bezier(0.22,1,0.36,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Preview */}
        <div className={`relative bg-gradient-to-br ${bg} flex items-center justify-center`}
          style={{ height: 'min(520px, 70vh)' }}>

          {imgPreview ? (
            <img src={imgPreview} alt="" className="absolute inset-0 w-full h-full object-cover"/>
          ) : (
            <p className={`text-white font-black text-center px-8 leading-tight tracking-tight drop-shadow-lg ${textSizeClass}`}
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
              {text || <span className="text-white/40 text-lg font-medium">Текст бичих…</span>}
            </p>
          )}

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background:'linear-gradient(to bottom,rgba(0,0,0,0.3) 0%,transparent 35%,transparent 65%,rgba(0,0,0,0.4) 100%)' }}/>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white"
                style={{ background: skin.bg, color: skin.fg }}>
                {user?.initials}
              </div>
              <span className="text-white text-sm font-semibold drop-shadow">{user?.name}</span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Photo button */}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur flex items-center justify-center text-white border border-white/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg}/>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-dark-800 px-4 pt-4 pb-5 space-y-4">

          {/* Text input */}
          {!imgPreview && (
            <textarea
              className="w-full bg-gray-100 dark:bg-dark-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
              placeholder="Story текст бичих…"
              rows={2}
              value={text}
              maxLength={120}
              onChange={e => setText(e.target.value)}
              autoFocus
            />
          )}

          {/* Text size — only for text stories */}
          {!imgPreview && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Хэмжээ</span>
              <div className="flex gap-1">
                {TEXT_SIZES.map((s, i) => (
                  <button key={s.label} onClick={() => setSizeIdx(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                      ${sizeIdx === i ? 'bg-accent text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-600'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gradient picker */}
          {!imgPreview && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-2">Арын өнгө</p>
              <div className="flex gap-2 flex-wrap">
                {GRADIENTS.map(g => (
                  <button key={g.value} onClick={() => setBg(g.value)}
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${g.value} transition-all flex-shrink-0
                      ${bg === g.value ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-dark-800' : 'hover:scale-110'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-1">
            {imgPreview && (
              <button onClick={() => setImgPreview(null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/15 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Устгах
              </button>
            )}
            <button
              onClick={handlePost}
              disabled={(!text.trim() && !imgPreview) || posting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {posting ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0110 10"/>
                </svg>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                  Story нийтлэх
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
