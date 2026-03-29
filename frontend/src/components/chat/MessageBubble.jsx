import { useState } from 'react'
import { Avatar } from '../ui/Avatar'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })
}

function FileAttachment({ file }) {
  const isImage = file.type?.startsWith('image/')
  if (isImage) return (
    <a href={file.url} target="_blank" rel="noreferrer" className="block mt-2 max-w-xs">
      <img src={file.url} alt={file.name} className="rounded-xl border border-gray-200 dark:border-white/18 max-h-48 object-cover" />
    </a>
  )
  return (
    <a href={file.url} download={file.name} target="_blank" rel="noreferrer"
      className="mt-2 flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-white/18 hover:border-accent/40 transition-colors max-w-xs">
      <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
        <p className="text-[10px] text-gray-400">{file.size ? `${(file.size/1024).toFixed(1)} KB` : 'File'}</p>
      </div>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 ml-auto flex-shrink-0"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </a>
  )
}

export default function MessageBubble({ msg, isOwn, showAvatar }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`flex gap-3 group px-4 py-1 rounded-xl transition-colors duration-75
        ${hovered ? 'bg-gray-50 dark:bg-dark-700/50' : ''}
        ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 mt-0.5">
        {showAvatar && !isOwn && <Avatar user={msg.user} size={32} />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {showAvatar && (
          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
              {isOwn ? 'You' : msg.user.name}
            </span>
            <span className="text-[10px] text-gray-400 tabular-nums">{formatTime(msg.createdAt)}</span>
          </div>
        )}

        <div className={`max-w-[85%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          {msg.text && (
            <p className={`text-sm leading-relaxed break-words px-3.5 py-2 rounded-2xl
              ${isOwn
                ? 'bg-accent text-white rounded-br-sm'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'}`}>
              {msg.text}
            </p>
          )}

          {msg.file && <FileAttachment file={msg.file} />}

          {/* Reactions */}
          {msg.reactions?.length > 0 && (
            <div className={`flex gap-1 mt-1 flex-wrap ${isOwn ? 'justify-end' : ''}`}>
              {msg.reactions.map((r, i) => (
                <button key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-white/18 text-xs hover:scale-105 transition-transform">
                  <span>{r.emoji}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1 ${isOwn ? 'order-first mr-1' : 'ml-auto'}`}>
          {['😊','👍','❤️'].map(e => (
            <button key={e} className="w-6 h-6 flex items-center justify-center text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors" title={e}>
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
