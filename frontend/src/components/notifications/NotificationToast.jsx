import { useChat } from '../../context/ChatContext'

export default function NotificationToast() {
  const { notifications, dismissNotification } = useChat()

  if (!notifications.length) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.slice(0, 4).map(n => (
        <div key={n.id}
          className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-dark-800
                     border border-gray-200 dark:border-white/18 shadow-lg shadow-black/10
                     pointer-events-auto animate-fade-up">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0
            ${n.type === 'message'      ? 'bg-accent/15 text-accent' :
              n.type === 'mention'      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500' :
              n.type === 'file'         ? 'bg-green-100 dark:bg-green-900/30 text-green-500' :
                                          'bg-gray-100 dark:bg-dark-700 text-gray-500'}`}>
            {n.type === 'message' ? '💬' : n.type === 'mention' ? '@' : n.type === 'file' ? '📎' : '🔔'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
              {n.from || 'Notification'}
              {n.channel && <span className="font-normal text-gray-400"> in #{n.channel}</span>}
            </p>
            {n.text && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{n.text}</p>
            )}
          </div>
          <button onClick={() => dismissNotification(n.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
