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

  useEffect(() => {
    if (!user) return
    // GET /api/workspaces → { ok, data: Workspace[] }
    workspaceApi.list()
      .then(({ data }) => {
        const list = data.data || []
        setWorkspaces(list)
        if (list.length > 0) selectWorkspace(list[0])
        else setLoading(false)
      })
      .catch(e => { console.error(e); setLoading(false) })
  }, [user?.id])

  const selectWorkspace = useCallback(async (ws) => {
    setActiveWorkspace(ws)
    setActiveChannel(null)
    setLoading(true)
    try {
      const [chRes, memRes] = await Promise.all([
        // GET /api/channels/workspace/:workspaceId → { ok, data: Channel[] }
        channelApi.list(ws.id),
        // GET /api/workspaces/:workspaceId/members → { ok, data: Member[] }
        workspaceApi.members(ws.id),
      ])
      const chs  = chRes.data.data  || []
      const mems = memRes.data.data || []
      setChannels(chs)
      setMembers(mems)
      if (chs.length > 0) {
        setActiveChannel(chs[0])
        // join_workspace takes workspaceId string directly
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
    // POST /api/workspaces → { ok, data: Workspace }
    const res = await workspaceApi.create(data)
    const ws = res.data.data
    setWorkspaces(prev => [...prev, ws])
    await selectWorkspace(ws)
    return ws
  }, [selectWorkspace])

  const joinWorkspace = useCallback(async (inviteCode) => {
    // POST /api/workspaces/join → { ok, data: Workspace }
    const res = await workspaceApi.join(inviteCode)
    const ws = res.data.data
    setWorkspaces(prev => prev.find(w => w.id === ws.id) ? prev : [...prev, ws])
    await selectWorkspace(ws)
    return ws
  }, [selectWorkspace])

  const createChannel = useCallback(async (data) => {
    if (!activeWorkspace) return
    // POST /api/channels → { ok, data: Channel }
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
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useWorkspace = () => useContext(Ctx)
