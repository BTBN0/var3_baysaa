import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { Phone, Video, MessageCircle, UserPlus, AtSign, Bell, X } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

const TYPE_META = {
  dm:              { grad: "linear-gradient(135deg,#1B3066,#2a4080)", accent: "#2a4080", Icon: MessageCircle },
  mention:         { grad: "linear-gradient(135deg,#d97706,#b45309)", accent: "#f59e0b", Icon: AtSign        },
  friend_request:  { grad: "linear-gradient(135deg,#6B7399,#1B3066)", accent: "#6B7399", Icon: UserPlus      },
  friend_accepted: { grad: "linear-gradient(135deg,#16a34a,#15803d)", accent: "#22c55e", Icon: UserPlus      },
  call:            { grad: "linear-gradient(135deg,#22c55e,#16a34a)", accent: "#22c55e", Icon: Phone         },
  default:         { grad: "linear-gradient(135deg,#1B3066,#080B2A)", accent: "#1B3066", Icon: Bell          },
};

const fmtTime = () => {
  const now = new Date();
  return now.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
};

// ── Single Toast ──────────────────────────────────────────────────────────
const Toast = ({ toast, onClose, isDark }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("enter");
  const timer = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setPhase("idle"), 20);
    timer.current = setTimeout(close, 5500);
    return () => { clearTimeout(t); clearTimeout(timer.current); };
  }, []);

  const close = () => {
    clearTimeout(timer.current);
    setPhase("leave");
    setTimeout(() => onClose(toast.id), 350);
  };

  const handleClick = () => {
    if (toast.link) navigate(toast.link);
    close();
  };

  const meta = TYPE_META[toast.type] || TYPE_META.default;
  const { grad, accent, Icon } = meta;
  const avatarSrc = toast.avatar
    ? (toast.avatar.startsWith("http") ? toast.avatar : API_BASE + toast.avatar)
    : null;
  const bg   = isDark ? "#0D1035" : "#ffffff";
  const text = isDark ? "#F0F0F5" : "#080B2A";
  const sub  = isDark ? "#b8bdd8" : "#6B7399";

  return (
    <div onClick={handleClick} style={{
      width: 320, background: bg,
      border: `1px solid ${accent}55`,
      borderRadius: 16, overflow: "hidden",
      boxShadow: isDark ? `0 16px 48px rgba(8,11,42,.75), 0 0 0 1px ${accent}22` : "0 8px 32px rgba(8,11,42,.12)",
      cursor: "pointer",
      transform: phase === "idle" ? "translateX(0) scale(1)" : phase === "enter" ? "translateX(80px) scale(.96)" : "translateX(80px) scale(.94)",
      opacity: phase === "idle" ? 1 : 0,
      transition: "transform .35s cubic-bezier(0.22,1,0.36,1), opacity .35s ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateX(-2px) scale(1.01)"; clearTimeout(timer.current); }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0) scale(1)"; timer.current = setTimeout(close, 2500); }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: grad, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)", animation: "shimmer 2.5s ease infinite" }} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 12px 10px" }}>
        {/* Avatar / icon */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {avatarSrc
            ? <img src={avatarSrc} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 42, height: 42, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${accent}44` }}>
                <Icon size={18} color="#fff" />
              </div>
          }
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 17, height: 17, borderRadius: "50%", background: grad, border: `2px solid ${bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={8} color="#fff" />
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
              {toast.title}
            </p>
            <span style={{ fontSize: 10, color: sub, flexShrink: 0, marginLeft: 6 }}>{toast.time}</span>
          </div>
          <p style={{ fontSize: 12, color: sub, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
            {toast.message}
          </p>
        </div>

        {/* Close */}
        <button onClick={e => { e.stopPropagation(); close(); }} style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          background: isDark ? "rgba(107,115,153,.2)" : "rgba(27,48,102,.08)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: sub, transition: "all .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.2)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(107,115,153,.2)" : "rgba(27,48,102,.08)"; e.currentTarget.style.color = sub; }}>
          <X size={10} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: isDark ? "rgba(107,115,153,.15)" : "rgba(27,48,102,.07)" }}>
        <div style={{ height: "100%", background: accent, animation: "shrink 5.5s linear forwards", transformOrigin: "left" }} />
      </div>
    </div>
  );
};

// ── Container ─────────────────────────────────────────────────────────────
const ToastContainer = () => {
  const { socket } = useSocket();
  const { user }   = useAuth();
  const { theme }  = useTheme();
  const isDark = theme === "dark";
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const add = useCallback((t) => {
    setToasts(p => [...p, { ...t, id: ++idRef.current, time: fmtTime() }].slice(-5));
  }, []);

  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  useEffect(() => {
    if (!socket || !user) return;

    const onDM = (msg) => {
      if (msg.senderId === user.id) return;
      if (window.location.pathname === `/dm/${msg.senderId}`) return;
      add({
        type: "dm",
        title: msg.sender?.username || "Шинэ мессеж",
        message: msg.content ? (msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content) : "📎 Файл илгээлээ",
        avatar: msg.sender?.avatar,
        link: `/dm/${msg.senderId}`,
      });
    };

    const onMsg = (msg) => {
      if (msg.user?.id === user.id) return;
      if (!msg.content?.includes(`@${user.username}`)) return;
      add({
        type: "mention",
        title: `${msg.user?.username} танд дурдсан`,
        message: msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content,
        avatar: msg.user?.avatar,
        link: msg.channelId ? `/chat/${msg.workspaceId}/${msg.channelId}` : null,
      });
    };

    const onFriendReq = (req) => add({
      type: "friend_request",
      title: "Найзын хүсэлт ирлээ",
      message: `${req.sender?.username} танд найзын хүсэлт илгээлээ`,
      avatar: req.sender?.avatar,
      link: "/friends",
    });

    const onFriendAcc = ({ username }) => add({
      type: "friend_accepted",
      title: "Найзын хүсэлт зөвшөөрлөө",
      message: `${username} таны хүсэлтийг хүлээн авлаа`,
      link: "/friends",
    });


    socket.on("dm_new_message",          onDM);
    socket.on("new_message",             onMsg);
    socket.on("friend_request_received", onFriendReq);
    socket.on("friend_accepted",         onFriendAcc);

    return () => {
      socket.off("dm_new_message",          onDM);
      socket.off("new_message",             onMsg);
      socket.off("friend_request_received", onFriendReq);
      socket.off("friend_accepted",         onFriendAcc);
    };
  }, [socket, user, add]);

  return (
    <>
      <style>{`
        @keyframes shrink  { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9997, display: "flex", flexDirection: "column-reverse", gap: 10, pointerEvents: "none" }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              <Toast toast={t} onClose={remove} isDark={isDark} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ToastContainer;
