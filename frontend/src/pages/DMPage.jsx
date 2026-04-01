import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useCall } from "../context/CallContext.jsx";
import Sidebar from "../components/sidebar/Sidebar.jsx";
import MessageInput from "../components/chat/MessageInput.jsx";
import { CornerUpLeft, Trash2, Edit2, Phone, Video, X, Check, Pin } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");
const fmt = d => d ? new Date(d).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }) : "";

// ── Avatar ────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 36 }) => {
  const hue = (user?.username?.charCodeAt(0) || 0) % 360;
  const src = user?.avatar ? (user.avatar.startsWith("http") ? user.avatar : API_BASE + user.avatar) : null;
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg,hsl(${hue},40%,30%),hsl(${hue+30},40%,20%))`, display: "flex", alignItems: "center", justifyContent: "center", color: "#F0F0F5", fontSize: size * 0.38, fontWeight: 700 }}>
      {user?.username?.[0]?.toUpperCase() || "?"}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DMPage() {
  const { userId }  = useParams();
  const { user }    = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { theme }   = useTheme();
  const { incomingCall, clearIncomingCall } = useCall();
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
  const [editingId,   setEditingId]   = useState(null);
  const [editText,    setEditText]    = useState("");
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

  // Load workspaces
  useEffect(() => {
    api.get("/workspaces").then(async res => {
      const ws = res.data.data || [];
      setWorkspaces(ws);
      const lastId = localStorage.getItem("lastWorkspaceId") || ws[0]?.id;
      const cur = ws.find(w => w.id === lastId) || ws[0] || null;
      setCurWs(cur);
      if (cur) {
        const chRes = await api.get(`/channels/workspace/${cur.id}`).catch(() => ({ data: { data: [] } }));
        setChannels(chRes.data.data || []);
      }
    }).catch(console.error);
  }, []);

  // Load messages + target user + block status
  useEffect(() => {
    if (!userId) return;
    setMessages([]); setReplyTo(null); setEditingId(null);
    Promise.all([
      api.get(`/dm/${userId}`),
      api.get(`/blocks/check/${userId}`).catch(() => ({ data: { data: {} } })),
      api.get(`/blocks/blocked-by/${userId}`).catch(() => ({ data: { data: {} } })),
    ]).then(([dmRes, blockRes, blockedByRes]) => {
      const msgs = dmRes.data.data || [];
      setMessages(msgs);
      if (msgs.length > 0 && !target) {
        const other = msgs.find(m => m.senderId !== user?.id);
        setTarget(other?.sender || other?.receiver || null);
      }
      setIsBlocked(!!blockRes.data.data?.blocked);
      setIsBlockedBy(!!blockedByRes.data.data?.blockedBy);
    }).catch(console.error);

    // Also try to get target user info directly
    api.get(`/dm/users/${curWs?.id || "none"}`).then(r => {
      const found = (r.data.data || []).find(m => m.id === userId);
      if (found) setTarget(found);
    }).catch(() => {});
  }, [userId, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !user?.id) return;

    const onMsg = msg => {
      if ((msg.senderId === userId && msg.receiverId === user.id) ||
          (msg.senderId === user.id && msg.receiverId === userId)) {
        setMessages(p => {
          if (p.find(m => m.id === msg.id)) return p; // deduplicate
          return [...p, msg];
        });
        // Set target from first message if not set
        if (!target && msg.senderId !== user.id) {
          setTarget(msg.sender || null);
        }
      }
    };

    const onCallLog = log => {
      const myId = user.id;
      const isMyConvo = (log.callerId === myId && log.calleeId === userId) ||
                        (log.calleeId === myId && log.callerId === userId);
      if (!isMyConvo) return;
      setMessages(p => [...p, { ...log, isCallLog: true, id: log.id || `call_${Date.now()}` }]);
    };

    socket.on("dm_new_message", onMsg);
    socket.on("dm_call_log",    onCallLog);
    return () => {
      socket.off("dm_new_message", onMsg);
      socket.off("dm_call_log",    onCallLog);
    };
  }, [socket, userId, user?.id]);

  // Handlers
  const handleSend = async (content, fileUrl, fileType) => {
    if (!canMsg || !content?.trim()) return;
    try {
      const body = { content, fileUrl, fileType };
      if (replyTo) body.replyTo = {
        id: replyTo.id,
        content: replyTo.content,
        username: replyTo.sender?.username || replyTo.user?.username || target?.username,
      };
      const res = await api.post(`/dm/${userId}`, body);
      const newMsg = res.data.data;
      setMessages(p => [...p, newMsg]);
      socket?.emit("dm_send", { toUserId: userId, message: newMsg });
      setReplyTo(null);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async id => {
    try {
      await api.delete(`/dm/${id}`);
      setMessages(p => p.map(m => m.id === id ? { ...m, deleted: true, content: "" } : m));
    } catch (e) { console.error(e); }
  };

  const handleEdit = async (id, content) => {
    if (!content.trim()) return;
    try {
      const res = await api.patch(`/dm/${id}`, { content: content.trim() });
      setMessages(p => p.map(m => m.id === id ? { ...m, content: content.trim(), edited: true } : m));
      setEditingId(null); setEditText("");
    } catch (e) { console.error(e); }
  };

  const handlePin = async msg => {
    try {
      await api.patch(`/dm/${msg.id}/pin`);
      setMessages(p => p.map(m => m.id === msg.id ? { ...m, pinned: !m.pinned } : m));
    } catch (e) { console.error(e); }
  };

  const handleBlock = async () => {
    try {
      const res = await api.post(`/blocks/${userId}`);
      setIsBlocked(!!res.data.data?.blocked);
      setBlockModal(false);
    } catch (e) { console.error(e); }
  };

  const pinnedMsgs = messages.filter(m => m.pinned && !m.deleted && !m.isCallLog);

  return (
    <div style={{ display: "flex", height: "100dvh", background: P.bg, overflow: "hidden" }}>
      <Sidebar workspaces={workspaces} channels={channels} setChannels={setChannels}
        currentWorkspace={curWs} onProfileOpen={() => {}} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* ── Header ── */}
        <div style={{
          height: 48, borderBottom: `1px solid ${P.border}`, background: P.surface,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", flexShrink: 0,
          boxShadow: isDark ? "0 1px 0 rgba(27,48,102,.4)" : "0 1px 0 rgba(8,11,42,.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Avatar user={target} size={30} />
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", border: `2px solid ${P.surface}`, background: isOnline ? "#22c55e" : isDark ? "#3d4670" : "#c8c8dc" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: P.text, margin: 0 }}>{target?.username || "..."}</p>
              <p style={{ fontSize: 11, margin: 0, fontWeight: 500, color: isBlocked || isBlockedBy ? "#f87171" : isOnline ? "#22c55e" : P.muted }}>
                {isBlocked ? "🚫 Блоклосон" : isBlockedBy ? "🚫 Блоклогдсон" : isOnline ? "Онлайн" : "Офлайн"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {canMsg && (<>
              <HBtn onClick={() => navigate(`/call/${userId}?mode=call&video=0`)} accent="green" isDark={isDark} title="Дуут залгалт"><Phone size={13} /></HBtn>
              <HBtn onClick={() => navigate(`/call/${userId}?mode=call&video=1`)} isDark={isDark} title="Видео залгалт"><Video size={13} /></HBtn>
            </>)}
            {!isBlockedBy && <HBtn onClick={() => setBlockModal(true)} accent="red" isDark={isDark} title={isBlocked ? "Unblock" : "Block"}>🚫</HBtn>}
          </div>
        </div>

        {/* ── Incoming call banner (from this user) ── */}
        {incomingCall && (
          <div style={{ padding: "10px 16px", background: "rgba(34,197,94,.08)", borderBottom: "1px solid rgba(34,197,94,.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "vsp 1.2s infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#4ade80" }}>
                {incomingCall.fromUsername} {incomingCall.withVideo ? "📹 видео" : "📞 дуут"} залж байна…
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => {
                try { localStorage.setItem("aura_incoming_call", JSON.stringify(incomingCall)); } catch {}
                navigate(`/call/${incomingCall.fromUserId}?mode=answer&video=${incomingCall.withVideo?"1":"0"}`);
                setTimeout(clearIncomingCall, 800);
              }} style={{ padding: "6px 16px", background: "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Хүлээн авах
              </button>
              <button onClick={() => { socket?.emit("dm_call_end", { toUserId: incomingCall.fromUserId }); clearIncomingCall(); }} style={{ padding: "6px 14px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Татгалзах
              </button>
            </div>
          </div>
        )}

        {/* ── Pinned messages ── */}
        {pinnedMsgs.length > 0 && (
          <div style={{ padding: "6px 16px", borderBottom: `1px solid ${P.border}`, background: isDark ? "rgba(27,48,102,.1)" : "rgba(27,48,102,.04)", display: "flex", alignItems: "center", gap: 8 }}>
            <Pin size={12} color={P.muted} />
            <span style={{ fontSize: 11, color: P.muted, fontWeight: 600 }}>Тогтоосон:</span>
            <span style={{ fontSize: 12, color: P.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {pinnedMsgs[pinnedMsgs.length - 1]?.content}
            </span>
          </div>
        )}

        {/* ── Block banners ── */}
        {isBlocked && <div style={{ padding: "7px 20px", background: "rgba(239,68,68,.06)", borderBottom: "1px solid rgba(239,68,68,.15)", textAlign: "center" }}><p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>Та энэ хэрэглэгчийг блоклосон байна.</p></div>}
        {isBlockedBy && !isBlocked && <div style={{ padding: "7px 20px", background: P.surf2, borderBottom: `1px solid ${P.border}`, textAlign: "center" }}><p style={{ fontSize: 12, color: P.muted, margin: 0 }}>Энэ хэрэглэгчтэй харилцах боломжгүй.</p></div>}

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px", display: "flex", flexDirection: "column" }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: P.muted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: P.text2, marginBottom: 4 }}>{canMsg ? `${target?.username || "Хэрэглэгч"}-тэй чатлаарай` : "Мессеж байхгүй"}</p>
              <p style={{ fontSize: 12, color: P.muted }}>Энэ бол хувийн харилцаа</p>
            </div>
          )}

          {messages.map((msg, i) => {
            // Call log row
            if (msg.isCallLog || msg.type === "call_log") {
              return <CallLogRow key={msg.id} msg={msg} P={P} isDark={isDark} currentUserId={user?.id} />;
            }

            const isOwn = msg.senderId === user?.id;
            const prev  = messages[i - 1];
            const showHead = !prev || prev.isCallLog || prev.senderId !== msg.senderId ||
              (new Date(msg.createdAt) - new Date(prev.createdAt)) > 5 * 60 * 1000;

            const rt = (() => {
              if (!msg.replyTo) return null;
              if (typeof msg.replyTo === "string") { try { return JSON.parse(msg.replyTo); } catch { return null; } }
              return msg.replyTo;
            })();

            const isEditing = editingId === msg.id;

            return (
              <MsgRow key={msg.id} msg={msg} isOwn={isOwn} showHead={showHead}
                user={user} target={target} rt={rt} P={P} isDark={isDark}
                isEditing={isEditing} editText={editText} setEditText={setEditText}
                onReply={() => setReplyTo(msg)}
                onDelete={() => handleDelete(msg.id)}
                onPin={() => handlePin(msg)}
                onEditStart={() => { setEditingId(msg.id); setEditText(msg.content || ""); }}
                onEditSave={() => handleEdit(msg.id, editText)}
                onEditCancel={() => { setEditingId(null); setEditText(""); }}
              />
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Reply preview ── */}
        {replyTo && (
          <div style={{ padding: "6px 16px 6px 20px", borderTop: `1px solid ${P.border}`, background: isDark ? "rgba(27,48,102,.1)" : "rgba(27,48,102,.04)", display: "flex", alignItems: "center", gap: 10 }}>
            <CornerUpLeft size={13} color={P.muted} />
            <span style={{ fontSize: 12, color: P.muted }}>
              <b style={{ color: P.text2 }}>{replyTo.sender?.username || (replyTo.senderId === user?.id ? user?.username : target?.username)}</b>
              {" "}
              {replyTo.content?.slice(0, 60)}
            </span>
            <button onClick={() => setReplyTo(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: P.muted, display: "flex", alignItems: "center" }}><X size={14} /></button>
          </div>
        )}

        <MessageInput onSend={handleSend} onTyping={() => {}} channelName={target?.username} disabled={!canMsg} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
      </div>

      {/* ── Block modal ── */}
      {blockModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setBlockModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 200, backdropFilter: "blur(6px)", background: isDark ? "rgba(8,11,42,.75)" : "rgba(8,11,42,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 360, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 20, padding: 24, boxShadow: isDark ? "0 24px 60px rgba(8,11,42,.8)" : "0 8px 40px rgba(8,11,42,.15)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 8 }}>{isBlocked ? "Unblock" : "Block"} @{target?.username}?</h3>
            <p style={{ fontSize: 13, color: P.muted, marginBottom: 20, lineHeight: 1.6 }}>{isBlocked ? "Тэд дахин мессеж илгээх, залгах боломжтой болно." : "Тэд танд мессеж илгээх, залгах боломжгүй болно."}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBlockModal(false)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${P.bd2}`, background: "transparent", color: P.muted, fontSize: 13, cursor: "pointer" }}>Болих</button>
              <button onClick={handleBlock} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: isBlocked ? "#16a34a" : "#dc2626", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{isBlocked ? "Unblock" : "Block"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes vsp      { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes slideIn  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}

// ── Call Log Row ──────────────────────────────────────────────────────────
function CallLogRow({ msg, P, isDark, currentUserId }) {
  const isVideo   = !!(msg.withVideo);
  const duration  = msg.duration;
  const iMadeCall = msg.callerId === currentUserId;
  const time = msg.time ? new Date(msg.time).toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "7px 14px", borderRadius: 20,
        background: isDark ? "rgba(27,48,102,.18)" : "rgba(27,48,102,.07)",
        border: `1px solid ${isDark ? "rgba(107,115,153,.25)" : "rgba(27,48,102,.12)"}`,
      }}>
        <span style={{ fontSize: 15 }}>{isVideo ? "📹" : "📞"}</span>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: P.text2 }}>
            {isVideo ? "Видео дуудлага" : "Дуут дуудлага"}
          </span>
          <span style={{ fontSize: 11, color: P.muted, marginLeft: 6 }}>
            {duration ? `· ⏱ ${duration}` : iMadeCall ? "· Залсан" : "· Ирсэн"}
          </span>
        </div>
        {time && <span style={{ fontSize: 10, color: P.muted, opacity: .7 }}>{time}</span>}
      </div>
    </div>
  );
}

// ── Header button ─────────────────────────────────────────────────────────
function HBtn({ onClick, title, isDark, accent = "default", children }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      padding: "5px 11px", borderRadius: 8, cursor: "pointer", transition: "all .15s",
      display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
      border: `1px solid ${isDark ? "rgba(107,115,153,.25)" : "rgba(27,48,102,.15)"}`,
      background: h ? (accent === "green" ? "#16a34a" : accent === "red" ? "rgba(239,68,68,.85)" : isDark ? "rgba(107,115,153,.2)" : "rgba(27,48,102,.12)") : (isDark ? "rgba(107,115,153,.1)" : "rgba(27,48,102,.06)"),
      color: h ? (accent === "green" || accent === "red" ? "#fff" : isDark ? "#F0F0F5" : "#080B2A") : (isDark ? "#b8bdd8" : "#6B7399"),
    }}>{children}</button>
  );
}

// ── Message Row ───────────────────────────────────────────────────────────
function MsgRow({ msg, isOwn, showHead, user, target, rt, P, isDark, isEditing, editText, setEditText, onReply, onDelete, onPin, onEditStart, onEditSave, onEditCancel }) {
  const [hover, setHover] = useState(false);
  const editRef = useRef(null);

  useEffect(() => { if (isEditing && editRef.current) { editRef.current.focus(); editRef.current.select(); } }, [isEditing]);

  const sender = isOwn ? user : target;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: showHead ? "8px 4px 2px" : "1px 4px",
      borderRadius: 8, position: "relative",
      background: hover ? P.hover : "transparent",
      transition: "background .1s",
    }}>
      {/* Avatar */}
      <div style={{ width: 34, flexShrink: 0, paddingTop: showHead ? 2 : 0 }}>
        {showHead && <Avatar user={sender} size={32} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showHead && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: isOwn ? P.muted : P.text }}>{sender?.username}</span>
            <span style={{ fontSize: 10, color: P.muted }}>{fmt(msg.createdAt)}</span>
            {msg.edited && <span style={{ fontSize: 10, color: P.muted, fontStyle: "italic" }}>(засагдсан)</span>}
            {msg.pinned && <Pin size={10} color={P.muted} />}
          </div>
        )}

        {/* Reply preview */}
        {rt && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 8px", marginBottom: 4, borderRadius: 6, background: isDark ? "rgba(107,115,153,.1)" : "rgba(27,48,102,.06)", borderLeft: "2px solid #6B7399" }}>
            <CornerUpLeft size={10} style={{ color: "#6B7399", flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7399" }}>{rt.username} </span>
              <span style={{ fontSize: 11, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", maxWidth: 220 }}>{rt.content}</span>
            </div>
          </div>
        )}

        {/* Message content */}
        {msg.deleted ? (
          <p style={{ fontSize: 13, color: P.muted, fontStyle: "italic", margin: 0 }}>Мессеж устгагдсан</p>
        ) : isEditing ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input ref={editRef} value={editText} onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onEditSave(); if (e.key === "Escape") onEditCancel(); }}
              style={{ flex: 1, padding: "5px 10px", borderRadius: 8, border: `1px solid ${P.bd2}`, background: P.surf2, color: P.text, fontSize: 13, outline: "none" }} />
            <button onClick={onEditSave} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "rgba(34,197,94,.15)", color: "#4ade80", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={13} /></button>
            <button onClick={onEditCancel} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "rgba(239,68,68,.1)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={13} /></button>
          </div>
        ) : (
          <>
            {msg.content && <p style={{ fontSize: 13, color: P.text2, lineHeight: 1.6, wordBreak: "break-word", margin: 0 }}>{msg.content}</p>}
            {msg.fileUrl && msg.fileType?.startsWith("image/") && (
              <a href={API_BASE + msg.fileUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 6 }}>
                <img src={API_BASE + msg.fileUrl} alt="" style={{ maxWidth: 280, maxHeight: 200, borderRadius: 10, border: `1px solid ${P.border}`, objectFit: "cover" }} />
              </a>
            )}
          </>
        )}
      </div>

      {/* Hover actions */}
      {hover && !msg.deleted && !isEditing && (
        <div style={{
          position: "absolute", right: 6, top: showHead ? 6 : -12,
          display: "flex", gap: 2,
          background: isDark ? "#111540" : "#fff",
          border: `1px solid ${P.bd2}`, borderRadius: 8,
          padding: "3px 4px", boxShadow: "0 4px 12px rgba(0,0,0,.2)", zIndex: 10,
        }}>
          <ABtn onClick={onReply} title="Хариулах"><CornerUpLeft size={12} /></ABtn>
          <ABtn onClick={onPin} title={msg.pinned ? "Тогтоолтыг арилгах" : "Тогтоох"}><Pin size={12} /></ABtn>
          {isOwn && <ABtn onClick={onEditStart} title="Засах"><Edit2 size={12} /></ABtn>}
          {isOwn && <ABtn onClick={onDelete} danger title="Устгах"><Trash2 size={12} /></ABtn>}
        </div>
      )}
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────
function ABtn({ onClick, danger, title, children }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      width: 26, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
      background: h ? (danger ? "rgba(239,68,68,.12)" : "rgba(107,115,153,.15)") : "none",
      color: h ? (danger ? "#fca5a5" : "var(--text)") : "var(--text5)",
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all .1s",
    }}>{children}</button>
  );
}
