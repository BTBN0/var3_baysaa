import { io } from 'socket.io-client'

let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export const connectSocket = (token) => {
  const s = getSocket()
  s.auth = { token }
  if (!s.connected) s.connect()
  return s
}

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect()
}

// ── Client → Server events (exact backend socket event names) ──
export const EV = {
  // Client emits
  JOIN_WORKSPACE:  'join_workspace',   // workspaceId (string)
  JOIN_CHANNEL:    'join_channel',     // channelId (string)
  SEND_MESSAGE:    'send_message',     // { channelId, ...message }
  DELETE_MESSAGE:  'delete_message',   // { messageId, channelId }
  MESSAGE_EDITED:  'message_edited',   // { message, channelId }
  MESSAGE_PINNED:  'message_pinned',   // { message, channelId }
  REACTION_UPDATED:'reaction_updated', // { messageId, channelId, reactions }
  TYPING_START:    'typing_start',     // { channelId }
  TYPING_STOP:     'typing_stop',      // { channelId }
  DM_SEND:         'dm_send',          // { toUserId, message }
  FRIEND_REQUEST_SENT:    'friend_request_sent',     // { toUserId, request }
  FRIEND_REQUEST_ACCEPTED:'friend_request_accepted', // { toUserId }

  // Server emits
  NEW_MESSAGE:      'new_message',        // message object
  MESSAGE_DELETED:  'message_deleted',    // { messageId }
  MSG_EDITED:       'message_edited',     // { message, channelId }
  MSG_PINNED:       'message_pinned',     // { message, channelId }
  REACTION_UPDATED_S:'reaction_updated',  // { messageId, reactions }
  USER_TYPING:      'user_typing',        // { userId, username, typing }
  USER_ONLINE:      'user_online',        // { userId }
  USER_OFFLINE:     'user_offline',       // { userId }
  DM_NEW:           'dm_new_message',     // message object
  FRIEND_REQUEST_RECEIVED: 'friend_request_received', // request
  FRIEND_ACCEPTED:  'friend_accepted',    // { userId, username }
  SESSION_EXPIRED:  'session_expired',    // { message }
}
