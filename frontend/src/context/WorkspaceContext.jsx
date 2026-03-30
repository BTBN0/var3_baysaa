import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { workspaceApi, channelApi } from '../lib/api'
import { getSocket, EV } from '../lib/socket'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const [workspaces,      setWorkspaces]      = useState([])
  const [activeWorkspace, setActiveWorkspace] = useState(null)
  const [channels,        setChannels]        = useState([])
  const [activeChannel,   setActiveChannel]   = useState(null)
  const [members,         setMembers]         = useState([])
  const [loading,         setLoading]         = useState(false)
  const [onlineUsers,     setOnlineUsers]     = useState(new Set())

  // Online/offline events
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    const onOnline  = ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId]))
    const onOffline = ({ userId }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s })
    socket.on(EV.USER_ONLINE,  onOnline)
    socket.on(EV.USER_OFFLINE, onOffline)
    return () => {
      socket.off(EV.USER_ONLINE,  onOnline)
      socket.off(EV.USER_OFFLINE, onOffline)
    }
  }, [user?.id])

  // User өөрчлөгдөхөд дахин ачаалах
  useEffect(() => {
    if (!user) {
      // Logout хийсэн — бүгдийг цэвэрлэ
      setWorkspaces([])
      setActiveWorkspace(null)
      setChannels([])
      setActiveChannel(null)
      setMembers([])
      setOnlineUsers(new Set())
      return
    }
    setLoading(true)
    workspaceApi.list()
      .then(({ data }) => {
        const list = data.data || []
        setWorkspaces(list)
        if (list.length > 0) {
          selectWorkspace(list[0])
        } else {
          setLoading(false)
        }
      })
      .catch(e => { console.error(e); setLoading(false) })
  }, [user?.id])

  const selectWorkspace = useCallback(async (ws) => {
    setActiveWorkspace(ws)
    setActiveChannel(null)
    setLoading(true)
    try {
      const [chRes, memRes] = await Promise.all([
        channelApi.list(ws.id),
        workspaceApi.members(ws.id),
      ])
      const chs  = chRes.data.data  || []
      // Backend sends flat: {id, username, avatar, role}
      const mems = memRes.data.data || []
      setChannels(chs)
      setMembers(mems)
      if (chs.length > 0) {
        setActiveChannel(chs[0])
        getSocket().emit(EV.JOIN_WORKSPACE, ws.id)
        getSocket().emit(EV.JOIN_CHANNEL, chs[0].id)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  const selectChannel = useCallback((ch) => {
    setActiveChannel(ch)
    getSocket().emit(EV.JOIN_CHANNEL, ch.id)
  }, [])

  const createWorkspace = useCallback(async (data) => {
    const res = await workspaceApi.create(data)
    const ws = res.data.data
    setWorkspaces(prev => [...prev, ws])
    await selectWorkspace(ws)
    return ws
  }, [selectWorkspace])

  const joinWorkspace = useCallback(async (inviteCode) => {
    const res = await workspaceApi.join(inviteCode)
    const ws = res.data.data
    setWorkspaces(prev => prev.find(w => w.id === ws.id) ? prev : [...prev, ws])
    await selectWorkspace(ws)
    return ws
  }, [selectWorkspace])

  const createChannel = useCallback(async (data) => {
    if (!activeWorkspace) return
    const res = await channelApi.create({ ...data, workspaceId: activeWorkspace.id })
    const ch = res.data.data
    setChannels(prev => [...prev, ch])
    selectChannel(ch)
    return ch
  }, [activeWorkspace, selectChannel])

  return (
    <Ctx.Provider value={{
      workspaces, setWorkspaces,
      activeWorkspace, selectWorkspace,
      channels, setChannels,
      activeChannel, selectChannel,
      members, setMembers,
      loading,
      createWorkspace, joinWorkspace, createChannel,
      onlineUsers,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useWorkspace = () => useContext(Ctx)
