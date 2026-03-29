import { useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useStory } from '../../context/StoryContext'
import StoryRing from './StoryRing'
import { SKINS } from '../profile/UserProfile'

export default function StoryBar({ onStoryOpen, onAddStory }) {
  const { user, profile } = useAuth()
  const { allStories, myStories } = useStory()
  const scrollRef = useRef(null)
  const skin = SKINS[profile?.skinIdx ?? 0] || SKINS[0]

  const hasMyStory = myStories.length > 0
  const myGroup = allStories.find(s => s.isMe)

  return (
    <div className="flex-shrink-0 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-dark-800">
      <div
        ref={scrollRef}
        className="flex items-center gap-4 px-4 py-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Add my story */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <StoryRing
              user={{ ...user, id: String(user?.id), bg: skin.bg, color: skin.fg, initials: user?.initials }}
              size={52}
              hasStory={hasMyStory}
              seen={true}
              onClick={() => hasMyStory
                ? onStoryOpen({ userId: String(user?.id) })
                : onAddStory()
              }
            />
            {!hasMyStory && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center border-2 border-white dark:border-dark-800">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
            )}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
            {hasMyStory ? 'Минийх' : 'Нэмэх'}
          </span>
        </div>

        {/* Team stories */}
        {allStories.filter(g => !g.isMe).map(group => (
          <div key={group.userId} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <StoryRing
              user={{ initials: group.userInitials, name: group.userName, color: group.userColor, bg: group.userBg, id: group.userId }}
              size={52}
              hasStory={true}
              seen={group.seen}
              onClick={() => onStoryOpen({ userId: group.userId })}
            />
            <span className={`text-[10px] font-medium truncate max-w-[52px] ${group.seen ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
              {group.userName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
