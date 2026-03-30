export function Avatar({ user, size = 32, showStatus = false, status = 'offline' }) {
  const s = { width: size, height: size, fontSize: size * 0.36, borderRadius: size > 28 ? 10 : '50%' }
  return (
    <div className="relative inline-flex flex-shrink-0">
      {user?.avatar ? (
        <img src={user.avatar} alt={user.username || user.name} style={s}
          className="object-cover" />
      ) : (
        <div style={{ ...s, background: user?.bg || '#e8f1fb', color: user?.color || '#0071e3' }}
          className="flex items-center justify-center font-bold select-none flex-shrink-0">
          {user?.initials || user?.username?.slice(0,2).toUpperCase() || user?.name?.slice(0,2).toUpperCase() || '?'}
        </div>
      )}
      {showStatus && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2
          border-white dark:border-dark-800
          ${status === 'online'  ? 'bg-green-400' :
            status === 'away'    ? 'bg-amber-400'  : 'bg-gray-400'}`}
        />
      )}
    </div>
  )
}
