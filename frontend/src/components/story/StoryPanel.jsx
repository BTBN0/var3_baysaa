import { useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useStory } from '../../context/StoryContext'
import StoryRing from './StoryRing'
import { SKINS } from '../profile/UserProfile'

export default function StoryPanel({ onClose, onStoryOpen, onAddStory }) {
  const { user, profile } = useAuth()
  const { allStories, myStories } = useStory()
  const hasMyStory = myStories.length > 0
  const scrollRef = useRef(null)
  const skin = SKINS[profile?.skinIdx ?? 0] || SKINS[0]

  return (
    <div
      className="flex-shrink-0 border-b border-gray-100 dark:border-white/10 bg-white/95 dark:bg-dark-800/95 backdrop-blur-sm"
      style={{ animation: 'storyPanelIn .22s cubic-bezier(0.22,1,0.36,1)' }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Stories</span>
        <button onClick={onClose}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex items-center gap-3.5 px-4 pt-1 pb-3.5 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Add my story */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <StoryRing
              user={{ ...user, id: String(user?.id), bg: skin.bg, color: skin.fg, initials: user?.initials }}
              size={54}
              hasStory={hasMyStory}
              seen={true}
              onClick={() => hasMyStory
                ? onStoryOpen({ userId: String(user?.id) })
                : onAddStory()
              }
            />
            {!hasMyStory && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center border-2 border-white dark:border-dark-800">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-none">
            {hasMyStory ? 'Минийх' : 'Нэмэх'}
          </span>
        </div>

        {/* Team stories */}
        {allStories.filter(g => !g.isMe).map(group => (
          <div key={group.userId} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <StoryRing
              user={{ initials: group.userInitials, name: group.userName, color: group.userColor, bg: group.userBg, id: group.userId }}
              size={54}
              hasStory={true}
              seen={group.seen}
              onClick={() => onStoryOpen({ userId: group.userId })}
            />
            <span className={`text-[10px] font-medium truncate max-w-[54px] leading-none
              ${group.seen ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 font-semibold'}`}>
              {group.userName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
