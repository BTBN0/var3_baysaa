# Czilla Frontend

React + Vite + Tailwind + Socket.IO

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Backend REST API base URL |
| `VITE_SOCKET_URL` | `/` | Socket.IO server URL |

## Backend API Routes (Prisma schema-г дагасан)

### Auth
| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/register` | `{ username, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | — |
| POST | `/api/auth/logout` | — |
| PATCH | `/api/auth/profile` | `{ username?, avatar? }` |

### Workspaces
| Method | Path | Body |
|---|---|---|
| GET | `/api/workspaces` | — |
| POST | `/api/workspaces` | `{ name, description? }` |
| POST | `/api/workspaces/join` | `{ inviteCode }` |
| GET | `/api/workspaces/:id/channels` | — |
| GET | `/api/workspaces/:id/members` | — |
| DELETE | `/api/workspaces/:id/members/:uid` | — |
| POST | `/api/workspaces/:id/bans` | `{ userId, reason? }` |

### Messages
| Method | Path | Body |
|---|---|---|
| GET | `/api/channels/:id/messages` | `?limit=50` |
| POST | `/api/channels/:id/messages` | `{ content, fileUrl?, fileType? }` |
| PATCH | `/api/messages/:id` | `{ content }` |
| DELETE | `/api/messages/:id` | — |
| POST | `/api/messages/:id/pin` | — |
| POST | `/api/messages/:id/reactions` | `{ emoji }` |
| DELETE | `/api/messages/:id/reactions/:emoji` | — |
| POST | `/api/channels/:id/upload` | multipart/form-data |

### Direct Messages
| Method | Path | Body |
|---|---|---|
| GET | `/api/dm/:userId` | `?limit=50` |
| POST | `/api/dm/:userId` | `{ content }` |
| DELETE | `/api/dm/:id` | — |
| POST | `/api/dm/:userId/upload` | multipart/form-data |

### Friends & Blocks
| Method | Path |
|---|---|
| GET | `/api/friends` |
| GET | `/api/friends/requests` |
| POST | `/api/friends/request/:userId` |
| POST | `/api/friends/requests/:id/accept` |
| POST | `/api/friends/requests/:id/decline` |
| DELETE | `/api/friends/:userId` |
| GET | `/api/blocks` |
| POST | `/api/blocks/:userId` |
| DELETE | `/api/blocks/:userId` |

## Socket.IO Events

### Client → Server
| Event | Payload |
|---|---|
| `channel:join` | `{ channelId }` |
| `channel:leave` | `{ channelId }` |
| `workspace:join` | `{ workspaceId }` |
| `typing:start` | `{ channelId }` |
| `typing:stop` | `{ channelId }` |
| `dm:join` | `{ userId }` |

### Server → Client
| Event | Payload |
|---|---|
| `message:new` | Message object |
| `message:updated` | Message object |
| `message:deleted` | `{ messageId, channelId }` |
| `dm:new` | DirectMessage object |
| `dm:deleted` | `{ id, senderId, receiverId }` |
| `typing` | `{ channelId, userId, username, typing }` |
| `user:online` | `{ userId }` |
| `user:offline` | `{ userId }` |
| `channel:created` | Channel object |
| `channel:deleted` | `{ channelId }` |
| `friend:request` | FriendRequest object |
| `friend:accepted` | `{ userId }` |

## Features

- 🔐 JWT auth (login / register)
- 🏢 Workspace management (create, join via invite code)
- 💬 Real-time channel messages (Socket.IO)
- 📩 Direct messages
- ⌨️ Typing indicators
- 📁 File upload
- ❤️ Emoji reactions
- 📌 Pin messages
- 👥 Friends & block system
- 📖 Story system (in-memory)
- 🤖 AI assistant (Claude API)
- 🌙 Dark / Light mode
- ✨ Custom cursor trail
