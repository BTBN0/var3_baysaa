import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

const GRADIENTS = {
  dm:              "linear-gradient(135deg,#1B3066,#2a4080)",
  friend_request:  "linear-gradient(135deg,#6B7399,#1B3066)",
  friend_accepted: "linear-gradient(135deg,#16a34a,#15803d)",
  mention:         "linear-gradient(135deg,#d97706,#b45309)",
  default:         "linear-gradient(135deg,#080B2A,#1B3066)",
};
const ACCENTS = {
  dm:              "#2a4080",
  friend_request:  "#6B7399",
  friend_accepted: "#22c55e",
  mention:         "#f59e0b",
  default:         "#1B3066",
};
const ICONS = { dm:"💬", friend_request:"👥", friend_accepted:"✅", mention:"🔔", default:"🔔" };

const Toast = ({ toast, onClose, isDark }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("enter");
  const timerRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("idle"), 20);
    timerRef.current = setTimeout(() => close(), 5200);
    return () => { clearTimeout(t1); clearTimeout(timerRef.current); };
  }, []);

  const close = () => {
    clearTimeout(timerRef.current);
    setPhase("leave");
    setTimeout(() => onClose(toast.id), 380);
  };

  const src = toast.avatar
    ? (toast.avatar.startsWith("http") ? toast.avatar : API_BASE + toast.avatar)
    : null;

  const accent = ACCENTS[toast.type] || ACCENTS.default;
  const grad   = GRADIENTS[toast.type] || GRADIENTS.default;
  const icon   = ICONS[toast.type] || ICONS.default;
  const bg     = isDark ? "#0D1035" : "#ffffff";
  const title  = isDark ? "#F0F0F5" : "#080B2A";
  const sub    = isDark ? "#b8bdd8" : "#6B7399";

  return (
    <div
      onClick={() => { if (toast.link) navigate(toast.link); close(); }}
      style={{
        width: 320, background: bg,
        border: `1px solid ${accent}44`,
        borderRadius: 16, overflow: "hidden",
        boxShadow: isDark
          ? `0 16px 48px rgba(8,11,42,0.7), 0 0 0 1px ${accent}22`
          : `0 8px 32px rgba(8,11,42,0.12)`,
        cursor: "pointer",
        transition: "transform .35s cubic-bezier(0.22,1,0.36,1), opacity .35s ease",
        transform: phase === "idle" ? "translateY(0) scale(1)" : phase === "enter" ? "translateY(24px) scale(0.96)" : "translateY(16px) scale(0.95)",
        opacity: phase === "idle" ? 1 : 0,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px) scale(1.01)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0) scale(1)"}
    >
      {/* Accent top bar */}
      <div style={{ height: 3, background: grad, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)", animation: "toastShimmer 2s ease infinite" }} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px 14px" }}>
        <div style={{ flexShrink: 0, position: "relative" }}>
          {src
            ? <img src={src} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 44, height: 44, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 14px ${accent}44` }}>{icon}</div>
          }
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: grad, border: `2px solid ${bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
            {icon}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: title, marginBottom: 3, lineHeight: 1.3 }}>{toast.title}</p>
          <p style={{ fontSize: 12, color: sub, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{toast.message}</p>
        </div>

        <button onClick={e => { e.stopPropagation(); close(); }} style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
          background: isDark ? "rgba(107,115,153,0.2)" : "rgba(27,48,102,0.08)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: sub, fontSize: 11, transition: "all .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(107,115,153,0.2)" : "rgba(27,48,102,0.08)"; e.currentTarget.style.color = sub; }}
        >✕</button>
      </div>

      <div style={{ height: 2, background: isDark ? "rgba(107,115,153,0.15)" : "rgba(27,48,102,0.08)" }}>
        <div style={{ height: "100%", background: accent, animation: "toastShrink 5s linear forwards", transformOrigin: "left" }} />
      </div>
    </div>
  );
};

const ToastContainer = () => {
  const { socket } = useSocket();
  const { user }   = useAuth();
  const { theme }  = useTheme();
  const isDark = theme === "dark";
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const add = (toast) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { ...toast, id }]);
  };
  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    if (!socket) {
      console.warn("ToastContainer: socket not ready");
      return;
    }
    if (!user) return;

    console.log("✅ ToastContainer: socket listeners registered");

    const handleDM = (msg) => {
      console.log("📩 dm_new_message received:", msg);
      if (msg.senderId === user.id) return;
      add({
        type: "dm",
        title: msg.sender?.username || "Шинэ мессеж",
        message: msg.content || "Файл илгээсэн",
        avatar: msg.sender?.avatar,
        link: `/dm/${msg.senderId}`,
      });
    };

    const handleFriendReq = (req) => {
      console.log("👥 friend_request_received:", req);
      add({
        type: "friend_request",
        title: "Найзын хүсэлт",
        message: `${req.sender?.username} танд найзын хүсэлт илгээлээ`,
        avatar: req.sender?.avatar,
        link: "/friends",
      });
    };

    const handleFriendAcc = ({ username }) => {
      console.log("✅ friend_accepted:", username);
      add({
        type: "friend_accepted",
        title: "Найзын хүсэлт зөвшөөрөгдлөө",
        message: `${username} таны хүсэлтийг зөвшөөрлөө`,
        link: "/friends",
      });
    };

    const handleMention = (msg) => {
      if (msg.user?.id === user.id) return;
      if (!msg.content?.includes(`@${user.username}`)) return;
      console.log("🔔 mention:", msg);
      add({
        type: "mention",
        title: `${msg.user?.username} танд дурдлаа`,
        message: msg.content,
        avatar: msg.user?.avatar,
        link: msg.channelId ? `/chat/${msg.workspaceId}/${msg.channelId}` : null,
      });
    };

    socket.on("dm_new_message",          handleDM);
    socket.on("friend_request_received", handleFriendReq);
    socket.on("friend_accepted",         handleFriendAcc);
    socket.on("new_message",             handleMention);

    return () => {
      socket.off("dm_new_message",          handleDM);
      socket.off("friend_request_received", handleFriendReq);
      socket.off("friend_accepted",         handleFriendAcc);
      socket.off("new_message",             handleMention);
    };
  }, [socket, user]);

  if (toasts.length === 0) return (
    <style>{`
      @keyframes toastShrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
      @keyframes toastShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
    `}</style>
  );

  return (
    <>
      <style>{`
        @keyframes toastShrink { from{transform:scaleX(1)} to{transform:scaleX(0)} }
        @keyframes toastShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
      `}</style>
      <div style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 9999,
        display: "flex", flexDirection: "column-reverse", gap: 10,
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <Toast toast={t} onClose={remove} isDark={isDark} />
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastContainer;
