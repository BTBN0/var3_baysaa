import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import Sidebar from "../components/sidebar/Sidebar.jsx";
import MessageInput from "../components/chat/MessageInput.jsx";
import { Edit2, Trash2, CornerUpLeft, Phone, Video, X } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");
const fmt = d => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Avatar = ({ user, size = 36 }) => {
  const hue = (user?.username?.charCodeAt(0) || 0) % 360;
  const src = user?.avatar ? (user.avatar.startsWith("http") ? user.avatar : API_BASE + user.avatar) : null;
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg,hsl(${hue},40%,30%),hsl(${hue+30},40%,20%))`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#F0F0F5", fontSize: size * 0.38, fontWeight: 700 }}>
      {user?.username?.[0]?.toUpperCase() || "?"}
    </div>
  );
};

export default function DMPage() {
  const { userId }  = useParams();
  const { user }    = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { theme }   = useTheme();
  const navigate    = useNavigate();
  const isDark = theme === "dark";

  const [workspaces,  setWorkspaces]  = useState([]);
  const [channels,    setChannels]    = useState([]);
  const [curWs,       setCurWs]       = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [target,      setTarget]      = useState(null);
  const [isBlocked,   setIsBlocked]   = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [blockModal,  setBlockModal]  = useState(false);
  const [replyTo,     setReplyTo]     = useState(null);
  const bottomRef = useRef(null);
  const canMsg = !isBlocked && !isBlockedBy;
  const isOnline = onlineUsers.includes(userId);

  const P = {
    bg:      isDark ? "#080B2A"  : "#F0F0F5",
    surface: isDark ? "#0D1035"  : "#ffffff",
    surf2:   isDark ? "#111540"  : "#f0f0f8",
    border:  isDark ? "#1B3066"  : "#c8c8dc",
    bd2:     isDark ? "#2a4080"  : "#b0b0cc",
    text:    isDark ? "#F0F0F5"  : "#080B2A",
    text2:   isDark ? "#b8bdd8"  : "#1B3066",
    muted:   isDark ? "#6B7399"  : "#6B7399",
    hover:   isDark ? "rgba(107,115,153,.1)" : "rgba(27,48,102,.05)",
  };

  // Load workspace + target user
  useEffect(() => {
    api.get("/workspaces").then(async res => {
      const ws = res.data.data || [];
      setWorkspaces(ws);
      const lastId = localStorage.getItem("lastWorkspaceId") || ws[0]?.id;
      const cur = ws.find(w => w.id === lastId) || ws[0] || null;
      setCurWs(cur);
      if (cur) {
        const [chRes, memRes] = await Promise.all([
          api.get(`/channels/workspace/${cur.id}`),
          api.get(`/dm/users/${cur.id}`),
        ]);
        setChannels(chRes.data.data || []);
        const found = (memRes.data.data || []).find(m => m.id === userId);
        if (found) setTarget(found);
      }
    }).catch(console.error);
  }, [userId]);

  // Load messages + block status
  useEffect(() => {
    if (!userId) return;
    setMessages([]);
    setReplyTo(null);
    api.get(`/dm/${userId}`).then(res => {
      const msgs = res.data.data || [];
      setMessages(msgs);
      if (msgs.length > 0 && !target) {
        const other = msgs[0].senderId === user?.id ? msgs[0].receiver : msgs[0].sender;
        setTarget(other);
      }
    }).catch(console.error);
    api.get(`/blocks/check/${userId}`).then(r => setIsBlocked(!!r.data.data?.blocked)).catch(() => {});
    api.get(`/blocks/blocked-by/${userId}`).then(r => setIsBlockedBy(!!r.data.data?.blockedBy)).catch(() => {});
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Real-time DM messages
  useEffect(() => {
    if (!socket) return;
    const onMsg = msg => {
      if ((msg.senderId === userId && msg.receiverId === user?.id) ||
          (msg.senderId === user?.id && msg.receiverId === userId)) {
        setMessages(p => [...p, msg]);
      }
    };
    socket.on("dm_new_message", onMsg);
    return () => socket.off("dm_new_message", onMsg);
  }, [socket, userId]);

  const handleSend = async (content, fileUrl, fileType) => {
    if (!canMsg) return;
    try {
      const body = { content, fileUrl, fileType };
      if (replyTo) body.replyTo = { id: replyTo.id, content: replyTo.content, username: replyTo.sender?.username || replyTo.user?.username };
      const res = await api.post(`/dm/${userId}`, body);
      setMessages(p => [...p, res.data.data]);
      socket?.emit("dm_send", { toUserId: userId, message: res.data.data });
      setReplyTo(null);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`/dm/${id}`);
      setMessages(p => p.map(m => m.id === id ? { ...m, deleted: true } : m));
    } catch (e) { console.error(e); }
  };

  const handleBlock = async () => {
    try {
      const res = await api.post(`/blocks/${userId}`);
      setIsBlocked(!!res.data.data?.blocked);
      setBlockModal(false);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ display: "flex", height: "100dvh", background: P.bg, overflow: "hidden" }}>
      <Sidebar workspaces={workspaces} channels={channels} setChannels={setChannels}
        currentWorkspace={curWs} onProfileOpen={() => {}} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Header */}
        <div style={{
          height: 48, borderBottom: `1px solid ${P.border}`, background: P.surface, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px",
          boxShadow: isDark ? "0 1px 0 rgba(27,48,102,.4)" : "0 1px 0 rgba(8,11,42,.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Avatar user={target} size={30} />
              <span style={{
                position: "absolute", bottom: -1, right: -1, width: 10, height: 10,
                borderRadius: "50%", border: `2px solid ${P.surface}`,
                background: isOnline ? "#22c55e" : isDark ? "#3d4670" : "#c8c8dc",
              }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: P.text, margin: 0 }}>{target?.username || "..."}</p>
              <p style={{ fontSize: 11, margin: 0, fontWeight: 500, color: isBlocked || isBlockedBy ? "#f87171" : isOnline ? "#22c55e" : P.muted }}>
                {isBlocked ? "🚫 Блоклосон" : isBlockedBy ? "🚫 Блоклогдсон" : isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {canMsg && (<>
              <HBtn onClick={() => navigate(`/call/${userId}?mode=call&video=0`)} isDark={isDark}
                title="Дуут залгалт" accent="green">
                <Phone size={13} />
              </HBtn>
              <HBtn onClick={() => navigate(`/call/${userId}?mode=call&video=1`)} isDark={isDark}
                title="Видео залгалт">
                <Video size={13} />
              </HBtn>
            </>)}
            {!isBlockedBy && (
              <HBtn onClick={() => setBlockModal(true)} isDark={isDark}
                title={isBlocked ? "Unblock" : "Block"} accent="red">
                🚫
              </HBtn>
            )}
          </div>
        </div>

        {/* Block banners */}
        {isBlocked && (
          <div style={{ padding: "7px 20px", background: "rgba(239,68,68,.06)", borderBottom: "1px solid rgba(239,68,68,.15)", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>Та энэ хэрэглэгчийг блоклосон байна.</p>
          </div>
        )}
        {isBlockedBy && !isBlocked && (
          <div style={{ padding: "7px 20px", background: P.surf2, borderBottom: `1px solid ${P.border}`, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: P.muted, margin: 0 }}>Энэ хэрэглэгчтэй харилцах боломжгүй.</p>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 8px", display: "flex", flexDirection: "column" }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: P.muted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: P.text2, marginBottom: 4 }}>
                {canMsg ? `${target?.username || "Хэрэглэгч"}-тэй чатлаарай` : "Мессеж байхгүй"}
              </p>
              <p style={{ fontSize: 12, color: P.muted }}>Энэ бол хувийн харилцаа</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.senderId === user?.id;
            const showHead = i === 0 || messages[i-1]?.senderId !== msg.senderId ||
              (new Date(msg.createdAt) - new Date(messages[i-1]?.createdAt)) > 5 * 60 * 1000;
            const rt = msg.replyTo
              ? (typeof msg.replyTo === "string" ? (() => { try { return JSON.parse(msg.replyTo); } catch { return null; } })() : msg.replyTo)
              : null;
            return (
              <MsgRow key={msg.id} msg={msg} isOwn={isOwn} showHead={showHead}
                user={user} target={target} rt={rt} P={P} isDark={isDark}
                onReply={() => setReplyTo(msg)} onDelete={() => handleDelete(msg.id)} />
            );
          })}
          <div ref={bottomRef} />
        </div>

        <MessageInput onSend={handleSend} onTyping={() => {}} channelName={target?.username}
          disabled={!canMsg} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>

      {/* Block confirm */}
      {blockModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setBlockModal(false); }} style={{
          position: "fixed", inset: 0, zIndex: 200, backdropFilter: "blur(6px)",
          background: isDark ? "rgba(8,11,42,.75)" : "rgba(8,11,42,.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn .15s ease both",
        }}>
          <div style={{
            width: "100%", maxWidth: 360, background: P.surface,
            border: `1px solid ${P.border}`, borderRadius: 20, padding: 24,
            boxShadow: isDark ? "0 24px 60px rgba(8,11,42,.8)" : "0 8px 40px rgba(8,11,42,.15)",
            animation: "fadeUp .2s cubic-bezier(0.22,1,0.36,1) both",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 8 }}>
              {isBlocked ? "Unblock" : "Block"} @{target?.username}?
            </h3>
            <p style={{ fontSize: 13, color: P.muted, marginBottom: 20, lineHeight: 1.6 }}>
              {isBlocked ? "Тэд дахин мессеж илгээх, залгах боломжтой болно." : "Тэд танд мессеж илгээх, залгах боломжгүй болно."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBlockModal(false)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${P.bd2}`,
                background: "transparent", color: P.muted, fontSize: 13, cursor: "pointer", transition: "all .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6B7399"; e.currentTarget.style.color = P.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = P.bd2; e.currentTarget.style.color = P.muted; }}>
                Болих
              </button>
              <button onClick={handleBlock} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none",
                background: isBlocked ? "#16a34a" : "#dc2626",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                {isBlocked ? "Unblock" : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HBtn({ onClick, title, isDark, accent = "default", children }) {
  const [h, setH] = useState(false);
  const bg = h
    ? accent === "green"  ? "#16a34a"
    : accent === "red"    ? "rgba(239,68,68,.85)"
    : isDark ? "rgba(107,115,153,.2)" : "rgba(27,48,102,.12)"
    : isDark ? "rgba(107,115,153,.1)" : "rgba(27,48,102,.06)";
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: "5px 11px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(107,115,153,.25)" : "rgba(27,48,102,.15)"}`,
        background: bg, color: h && accent === "green" ? "#fff" : h && accent === "red" ? "#fff" : isDark ? "#b8bdd8" : "#6B7399",
        fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
        display: "flex", alignItems: "center", gap: 5,
      }}>
      {children}
    </button>
  );
}

function MsgRow({ msg, isOwn, showHead, user, target, rt, P, isDark, onReply, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: showHead ? "10px 4px 2px" : "1px 4px",
        borderRadius: 8, position: "relative",
        background: hover ? (isDark ? "rgba(107,115,153,.08)" : "rgba(27,48,102,.04)") : "transparent",
        transition: "background .1s",
        animation: showHead ? "slideInRight .18s ease both" : "none",
      }}>
      <div style={{ width: 36, flexShrink: 0 }}>
        {showHead && <Avatar user={isOwn ? user : target} size={32} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {showHead && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isOwn ? P.muted : P.text }}>{isOwn ? user?.username : target?.username}</span>
            <span style={{ fontSize: 11, color: P.muted }}>{fmt(msg.createdAt)}</span>
          </div>
        )}
        {rt && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 6,
            padding: "4px 8px", marginBottom: 4, borderRadius: 6,
            background: isDark ? "rgba(107,115,153,.1)" : "rgba(27,48,102,.06)",
            borderLeft: "2px solid #6B7399",
          }}>
            <CornerUpLeft size={10} style={{ color: "#6B7399", flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7399" }}>{rt.username} </span>
              <span style={{ fontSize: 11, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", maxWidth: 200 }}>{rt.content}</span>
            </div>
          </div>
        )}
        {msg.deleted
          ? <p style={{ fontSize: 13, color: P.muted, fontStyle: "italic", margin: 0 }}>Мессеж устгагдсан</p>
          : <>
              {msg.content && <p style={{ fontSize: 13, color: P.text2, lineHeight: 1.6, wordBreak: "break-word", margin: 0 }}>{msg.content}</p>}
              {msg.fileUrl && msg.fileType?.startsWith("image/") && (
                <a href={API_BASE + msg.fileUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 6 }}>
                  <img src={API_BASE + msg.fileUrl} alt="" style={{ maxWidth: 280, maxHeight: 200, borderRadius: 10, border: `1px solid ${P.border}`, objectFit: "cover" }} />
                </a>
              )}
            </>
        }
      </div>
      {hover && !msg.deleted && (
        <div style={{
          position: "absolute", right: 8, top: showHead ? 8 : -10,
          display: "flex", gap: 2,
          background: isDark ? "#111540" : "#fff",
          border: `1px solid ${P.bd2}`, borderRadius: 8,
          padding: "3px 4px", boxShadow: "0 4px 12px rgba(0,0,0,.2)", zIndex: 10,
        }}>
          <ABtn onClick={onReply}><CornerUpLeft size={12} /></ABtn>
          {isOwn && <ABtn onClick={onDelete} danger><Trash2 size={12} /></ABtn>}
        </div>
      )}
    </div>
  );
}

function ABtn({ onClick, danger, children }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 26, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
        background: h ? (danger ? "rgba(239,68,68,.12)" : "rgba(107,115,153,.15)") : "none",
        color: h ? (danger ? "#fca5a5" : "var(--text)") : "var(--text5)",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all .1s",
      }}>
      {children}
    </button>
  );
}
