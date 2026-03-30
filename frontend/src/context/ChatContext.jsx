import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { messageApi, dmApi, reactionApi, uploadApi } from '../lib/api'
import { getSocket, EV } from '../lib/socket'
import { useAuth } from './AuthContext'
import { useWorkspace } from './WorkspaceContext'

const Ctx = createContext(null)

export function ChatProvider({ children }) {
  const { user } = useAuth()
  const { activeChannel } = useWorkspace()
  const [messages,   setMessages]   = useState({})
  const [dmMessages, setDmMessages] = useState({})
  const [activeDM,   setActiveDM]   = useState(null)
  const [typing,     setTyping]     = useState({})
  const [uploading,  setUploading]  = useState(false)
  const [uploadPct,  setUploadPct]  = useState(0)
  const [notifications, setNotifs]  = useState([])
  const timers = useRef({})

  // Load channel messages
  useEffect(() => {
    if (!activeChannel) return
    const key = activeChannel.id
    if (messages[key]) return
    messageApi.list(key, { limit: 50 })
      .then(({ data }) => {
        // backend returns { ok, data: Message[] } (already reversed)
        const arr = Array.isArray(data.data) ? data.data : []
        setMessages(prev => ({ ...prev, [key]: arr }))
      })
      .catch(console.error)
  }, [activeChannel?.id])

  // Load DM messages
  useEffect(() => {
    if (!activeDM) return
    const key = activeDM.id
    if (dmMessages[key]) return
    dmApi.list(key)
      .then(({ data }) => {
        const arr = Array.isArray(data.data) ? data.data : []
        setDmMessages(prev => ({ ...prev, [key]: arr }))
      })
      .catch(console.error)
  }, [activeDM?.id])

  // Socket events
  useEffect(() => {
    if (!user) return
    const socket = getSocket()

    const onNewMsg = (msg) => {
      const key = msg.channelId
      setMessages(prev => {
        const existing = prev[key] || []
        // avoid duplicates (optimistic update already added it)
        if (existing.find(m => m.id === msg.id)) return prev
        return { ...prev, [key]: [...existing, msg] }
      })
      if (key !== activeChannel?.id) {
        addNotif({ type: 'channel', from: msg.user?.username, text: msg.content, channelId: key })
      }
    }

    const onMsgDeleted = ({ messageId }) => {
      setMessages(prev => {
        const next = { ...prev }
        for (const key in next) {
          next[key] = next[key].map(m =>
            m.id === messageId ? { ...m, deleted: true } : m)
        }
        return next
      })
    }

    const onMsgEdited = ({ message, channelId }) => {
      setMessages(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || []).map(m => m.id === message.id ? message : m),
      }))
    }

    const onMsgPinned = ({ message, channelId }) => {
      setMessages(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || []).map(m => m.id === message.id ? message : m),
      }))
    }

    const onReactionUpdated = ({ messageId, reactions }) => {
      setMessages(prev => {
        const next = { ...prev }
        for (const key in next) {
          next[key] = next[key].map(m => m.id === messageId ? { ...m, reactions } : m)
        }
        return next
      })
    }

    const onNewDM = (msg) => {
      const key = msg.senderId === user.id ? msg.receiverId : msg.senderId
      setDmMessages(prev => {
        const existing = prev[key] || []
        if (existing.find(m => m.id === msg.id)) return prev
        return { ...prev, [key]: [...existing, msg] }
      })
      if (key !== activeDM?.id) {
        addNotif({ type: 'dm', from: msg.sender?.username, text: msg.content, userId: key })
      }
    }

    const onTyping = ({ userId, username, typing: isTyping, channelId }) => {
      if (userId === user.id) return
      const key = channelId || 'global'
      setTyping(prev => {
        const cur = { ...(prev[key] || {}) }
        if (isTyping) cur[userId] = username
        else delete cur[userId]
        return { ...prev, [key]: cur }
      })
      clearTimeout(timers.current[`${key}-${userId}`])
      if (isTyping) {
        timers.current[`${key}-${userId}`] = setTimeout(() => {
          setTyping(prev => {
            const cur = { ...(prev[key] || {}) }
            delete cur[userId]
            return { ...prev, [key]: cur }
          })
        }, 4000)
      }
    }

    const onSessionExpired = () => {
      localStorage.removeItem('cz-token')
      localStorage.removeItem('cz-user')
      window.location.reload()
    }

    socket.on(EV.NEW_MESSAGE,        onNewMsg)
    socket.on(EV.MESSAGE_DELETED,    onMsgDeleted)
    socket.on(EV.MSG_EDITED,         onMsgEdited)
    socket.on('message_pinned',      onMsgPinned)
    socket.on(EV.REACTION_UPDATED_S, onReactionUpdated)
    socket.on(EV.DM_NEW,             onNewDM)
    socket.on(EV.USER_TYPING,        onTyping)
    socket.on(EV.SESSION_EXPIRED,    onSessionExpired)

    return () => {
      socket.off(EV.NEW_MESSAGE,        onNewMsg)
      socket.off(EV.MESSAGE_DELETED,    onMsgDeleted)
      socket.off(EV.MSG_EDITED,         onMsgEdited)
      socket.off('message_pinned',      onMsgPinned)
      socket.off(EV.REACTION_UPDATED_S, onReactionUpdated)
      socket.off(EV.DM_NEW,            onNewDM)
      socket.off(EV.USER_TYPING,       onTyping)
      socket.off(EV.SESSION_EXPIRED,   onSessionExpired)
    }
  }, [user?.id, activeChannel?.id, activeDM?.id])

  const sendMessage = useCallback(async (content, fileUrl = null, fileType = null) => {
    if (!content?.trim() && !fileUrl) return
    const optId = 'tmp-' + Date.now()

    if (activeChannel) {
      const key = activeChannel.id
      const opt = {
        id: optId, content, fileUrl, fileType,
        userId: user.id, user,
        channelId: key,
        createdAt: new Date().toISOString(),
        reactions: [], pending: true,
      }
      setMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), opt] }))
      try {
        const { data } = await messageApi.send(key, { content, fileUrl, fileType })
        const msg = data.data
        setMessages(prev => ({
          ...prev,
          [key]: (prev[key] || []).map(m => m.id === optId ? msg : m),
        }))
        getSocket().emit(EV.SEND_MESSAGE, msg)
      } catch {
        setMessages(prev => ({
          ...prev,
          [key]: (prev[key] || []).filter(m => m.id !== optId),
        }))
      }
    } else if (activeDM) {
      const key = activeDM.id
      const opt = {
        id: optId, content,
        senderId: user.id, receiverId: key,
        sender: user,
        createdAt: new Date().toISOString(), pending: true,
      }
      setDmMessages(prev => ({ ...prev, [key]: [...(prev[key] || []), opt] }))
      try {
        const { data } = await dmApi.send(key, { content })
        const msg = data.data
        setDmMessages(prev => ({
          ...prev,
          [key]: (prev[key] || []).map(m => m.id === optId ? msg : m),
        }))
        getSocket().emit(EV.DM_SEND, { toUserId: key, message: msg })
      } catch {
        setDmMessages(prev => ({
          ...prev,
          [key]: (prev[key] || []).filter(m => m.id !== optId),
        }))
      }
    }
  }, [activeChannel, activeDM, user])

  const uploadFile = useCallback(async (file) => {
    setUploading(true); setUploadPct(0)
    try {
      const { data } = await uploadApi.upload(file, setUploadPct)
      const fileUrl  = data.data?.fileUrl
      const fileType = data.data?.fileType || file.type
      if (fileUrl) await sendMessage('', fileUrl, fileType)
      return data.data
    } finally { setUploading(false); setUploadPct(0) }
  }, [sendMessage])

  const startTyping = useCallback(() => {
    if (!activeChannel) return
    getSocket().emit(EV.TYPING_START, { channelId: activeChannel.id })
    clearTimeout(timers.current['self'])
    timers.current['self'] = setTimeout(() => {
      getSocket().emit(EV.TYPING_STOP, { channelId: activeChannel.id })
    }, 2500)
  }, [activeChannel])

  const addNotif = useCallback((n) => {
    const id = Date.now()
    setNotifs(prev => [{ ...n, id }, ...prev].slice(0, 10))
    setTimeout(() => setNotifs(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])

  const dismissNotif = useCallback((id) => setNotifs(prev => prev.filter(n => n.id !== id)), [])

  const currentMessages = activeChannel ? (messages[activeChannel.id] || []) : []
  const currentDMs      = activeDM     ? (dmMessages[activeDM.id]     || []) : []
  const typingKey       = activeChannel?.id || `dm-${activeDM?.id}`
  const currentTyping   = Object.values(typing[typingKey] || {})

  // For AIPanel context
  const activeMessages = currentMessages

  return (
    <Ctx.Provider value={{
      messages, setMessages,
      dmMessages, setDmMessages,
      activeDM, setActiveDM,
      currentMessages, currentDMs, currentTyping,
      uploading, uploadPct,
      notifications, dismissNotif, addNotif,
      sendMessage, uploadFile, startTyping,
      activeMessages,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useChat = () => useContext(Ctx)
// Note: ChatContext already handles cleanup via socket.off in useEffect cleanup
