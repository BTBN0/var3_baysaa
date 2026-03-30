import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('cz-token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    // Login/register endpoint-д 401 ирсэн бол reload хийхгүй — алдааг component-д дамжуулна
    const url = err.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('cz-token')
      localStorage.removeItem('cz-user')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

export default api

// Response format: { ok: true, message: '...', data: ... }

// ── Auth → /api/auth ──
export const authApi = {
  register:      (data) => api.post('/auth/register', data),   // { username, email, password }
  login:         (data) => api.post('/auth/login', data),       // { email, password }
  me:            ()     => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),   // { username }
  updateAvatar:  (file) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post('/auth/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  searchUsers:   (q)    => api.get('/auth/search', { params: { q } }),
}

// ── Workspaces → /api/workspaces ──
export const workspaceApi = {
  list:    ()             => api.get('/workspaces'),
  create:  (data)         => api.post('/workspaces', data),          // { name, description? }
  join:    (inviteCode)   => api.post('/workspaces/join', { inviteCode }),
  members: (workspaceId) => api.get(`/workspaces/${workspaceId}/members`),
  updateAvatar: (workspaceId, file) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.patch(`/workspaces/${workspaceId}/avatar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ── Channels → /api/channels ──
export const channelApi = {
  list:   (workspaceId) => api.get(`/channels/workspace/${workspaceId}`),
  create: (data)        => api.post('/channels', data),  // { name, workspaceId, description? }
}

// ── Messages → /api/messages ──
export const messageApi = {
  list:    (channelId, params) => api.get(`/messages/${channelId}`, { params }),
  pinned:  (channelId)         => api.get(`/messages/${channelId}/pinned`),
  search:  (channelId, q)      => api.get(`/messages/${channelId}/search`, { params: { q } }),
  send:    (channelId, data)   => api.post(`/messages/${channelId}`, data),  // { content, fileUrl?, fileType? }
  edit:    (messageId, content)=> api.patch(`/messages/${messageId}`, { content }),
  delete:  (messageId)         => api.delete(`/messages/${messageId}`),
  pin:     (messageId)         => api.patch(`/messages/${messageId}/pin`),
}

// ── Reactions → /api/reactions ──
export const reactionApi = {
  toggle: (messageId, emoji) => api.post(`/reactions/${messageId}`, { emoji }),
  list:   (messageId)        => api.get(`/reactions/${messageId}`),
}

// ── File Upload → /api/upload ──
export const uploadApi = {
  upload: (file, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress?.(Math.round(e.loaded / e.total * 100)),
    })
  },
}

// ── Direct Messages → /api/dm ──
export const dmApi = {
  conversations: ()       => api.get('/dm/conversations'),
  members:  (workspaceId) => api.get(`/dm/users/${workspaceId}`),
  list:     (userId)      => api.get(`/dm/${userId}`),
  send:     (userId, data)=> api.post(`/dm/${userId}`, data),   // { content, fileUrl?, fileType? }
  delete:   (messageId)   => api.delete(`/dm/${messageId}`),
}

// ── Friends → /api/friends ──
export const friendApi = {
  list:     ()          => api.get('/friends'),
  requests: ()          => api.get('/friends/requests'),
  send:     (data)      => api.post('/friends/request', data),  // { receiverId }
  accept:   (requestId) => api.post(`/friends/accept/${requestId}`),
  decline:  (requestId) => api.post(`/friends/decline/${requestId}`),
}

// ── Blocks → /api/blocks ──
export const blockApi = {
  list:       ()       => api.get('/blocks'),
  block:      (userId) => api.post(`/blocks/${userId}`),
  checkBlock: (userId) => api.get(`/blocks/check/${userId}`),
}

// ── Bans → /api/bans ──
export const banApi = {
  list:   (workspaceId)         => api.get(`/bans/${workspaceId}`),
  ban:    (workspaceId, userId)  => api.post(`/bans/${workspaceId}/${userId}`),
  unban:  (workspaceId, userId)  => api.delete(`/bans/${workspaceId}/${userId}`),
}
