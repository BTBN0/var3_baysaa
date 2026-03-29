export default function StoryRing({ user, size = 36, seen = false, hasStory = false, onClick }) {
  const pad = hasStory ? 3 : 0
  const outer = size + pad * 2
  const uid = `sr-${user?.id || user?.userId || Math.random().toString(36).slice(2)}-${size}`

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 ${hasStory ? 'hover:scale-105 active:scale-95' : ''} transition-transform duration-150`}
      style={{ width: outer, height: outer }}
    >
      <svg width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#f97316"/>
            <stop offset="30%"  stopColor="#ec4899"/>
            <stop offset="65%"  stopColor="#a855f7"/>
            <stop offset="100%" stopColor="#3b82f6"/>
          </linearGradient>
          <clipPath id={`clip-${uid}`}>
            <circle cx={outer/2} cy={outer/2} r={size/2 - 1}/>
          </clipPath>
        </defs>

        {/* Ring */}
        {hasStory && !seen && (
          <circle
            cx={outer/2} cy={outer/2}
            r={outer/2 - 1.5}
            fill="none"
            stroke={`url(#grad-${uid})`}
            strokeWidth="2.5"
          />
        )}
        {hasStory && seen && (
          <circle
            cx={outer/2} cy={outer/2}
            r={outer/2 - 1.5}
            fill="none"
            stroke="rgba(156,163,175,0.6)"
            strokeWidth="1.5"
          />
        )}

        {/* White gap between ring and avatar */}
        {hasStory && (
          <circle
            cx={outer/2} cy={outer/2}
            r={size/2}
            fill="white"
            className="dark:fill-dark-800"
          />
        )}

        {/* Avatar */}
        <circle cx={outer/2} cy={outer/2} r={size/2 - (hasStory ? 1 : 0)} fill={user?.bg || '#e8f1fb'} clipPath={`url(#clip-${uid})`}/>
        <text
          x={outer/2} y={outer/2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.36}
          fontWeight="700"
          fill={user?.color || '#0071e3'}
          style={{ userSelect: 'none', pointerEvents: 'none', fontFamily: 'system-ui,sans-serif' }}
        >
          {user?.initials || user?.name?.slice(0,2).toUpperCase() || '?'}
        </text>
      </svg>
    </button>
  )
}
