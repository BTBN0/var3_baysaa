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
  if (!token) return
  const s = getSocket()
  // Token өөрчлөгдсөн бол disconnect хийж дахин холбоно
  if (s.connected && s.auth?.token !== token) {
    s.disconnect()
  }
  s.auth = { token }
  if (!s.connected) s.connect()
  return s
}

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect()
}

export const EV = {
  // Client emits
  JOIN_WORKSPACE:   'join_workspace',
  JOIN_CHANNEL:     'join_channel',
  SEND_MESSAGE:     'send_message',
  DELETE_MESSAGE:   'delete_message',
  MESSAGE_EDITED:   'message_edited',
  MESSAGE_PINNED:   'message_pinned',
  REACTION_UPDATED: 'reaction_updated',
  TYPING_START:     'typing_start',
  TYPING_STOP:      'typing_stop',
  DM_SEND:          'dm_send',
  FRIEND_REQUEST_SENT:     'friend_request_sent',
  FRIEND_REQUEST_ACCEPTED: 'friend_request_accepted',

  // Server emits
  NEW_MESSAGE:       'new_message',
  MESSAGE_DELETED:   'message_deleted',
  MSG_EDITED:        'message_edited',
  MSG_PINNED:        'message_pinned',
  REACTION_UPDATED_S:'reaction_updated',
  USER_TYPING:       'user_typing',
  USER_ONLINE:       'user_online',
  USER_OFFLINE:      'user_offline',
  DM_NEW:            'dm_new_message',
  FRIEND_REQUEST_RECEIVED: 'friend_request_received',
  FRIEND_ACCEPTED:   'friend_accepted',
  SESSION_EXPIRED:   'session_expired',
}
