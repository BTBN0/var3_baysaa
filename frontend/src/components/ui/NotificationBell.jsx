import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2 } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

const timeAgo = (id) => {
  const d = Date.now() - id;
  const m = Math.floor(d / 60000);
  if (m < 1)  return "Саяхан";
  if (m < 60) return `${m}м өмнө`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ц өмнө`;
  return `${Math.floor(h / 24)}ө өмнө`;
};

const TYPE_GRAD = {
  dm:              "linear-gradient(135deg,#1B3066,#2a4080)",
  friend_request:  "linear-gradient(135deg,#6B7399,#1B3066)",
  friend_accepted: "linear-gradient(135deg,#16a34a,#15803d)",
  mention:         "linear-gradient(135deg,#d97706,#b45309)",
  default:         "linear-gradient(135deg,#080B2A,#1B3066)",
};
const TYPE_ACCENT = {
  dm: "#2a4080", friend_request: "#6B7399",
  friend_accepted: "#22c55e", mention: "#f59e0b", default: "#1B3066",
};
const TYPE_ICON = {
  dm: "💬", friend_request: "👥", friend_accepted: "✅", mention: "🔔", default: "🔔",
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);
  const navigate = useNavigate();

  const P = {
    bg:     isDark ? "#0D1035" : "#ffffff",
    bg2:    isDark ? "#111540" : "#f4f4fb",
    border: isDark ? "#1B3066" : "#c8c8dc",
    bd2:    isDark ? "#2a4080" : "#b0b0cc",
    text:   isDark ? "#F0F0F5" : "#080B2A",
    text2:  isDark ? "#b8bdd8" : "#1B3066",
    muted:  isDark ? "#6B7399" : "#6B7399",
    hover:  isDark ? "rgba(107,115,153,0.12)" : "rgba(27,48,102,0.05)",
    shadow: isDark ? "0 20px 60px rgba(8,11,42,0.8), 0 0 0 1px rgba(27,48,102,0.5)" : "0 8px 40px rgba(8,11,42,0.15), 0 0 0 1px rgba(27,48,102,0.1)",
  };

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleClick = (n) => {
    markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      {/* Bell button */}
      <button onClick={() => setOpen(p => !p)} title="Мэдэгдлүүд" style={{
        width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
        background: open ? "var(--surface2)" : "none",
        border: "none", cursor: "pointer",
        color: open ? "var(--text)" : "var(--text5)",
        borderRadius: 6, position: "relative", transition: "all .15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface2)"; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.color = "var(--text5)"; e.currentTarget.style.background = "none"; } }}
      >
        <Bell size={13} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 1, right: 1,
            width: 14, height: 14, borderRadius: "50%",
            background: "linear-gradient(135deg,#1B3066,#6B7399)",
            color: "#F0F0F5", fontSize: 7, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1.5px solid var(--surface)",
            animation: "popIn .3s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", bottom: 34, left: -8,
          width: 320, background: P.bg,
          border: `1px solid ${P.border}`,
          borderRadius: 16, overflow: "hidden",
          boxShadow: P.shadow, zIndex: 200,
          animation: "fadeUp .2s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: `1px solid ${P.border}`,
            background: isDark ? "rgba(27,48,102,0.15)" : "rgba(27,48,102,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Мэдэгдлүүд</span>
              {unreadCount > 0 && (
                <span style={{
                  padding: "1px 7px", borderRadius: 10,
                  background: "linear-gradient(135deg,#1B3066,#2a4080)",
                  color: "#F0F0F5", fontSize: 10, fontWeight: 700,
                }}>
                  {unreadCount} шинэ
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Бүгдийг уншсан" style={{
                  width: 26, height: 26, borderRadius: 7, border: "none",
                  background: "transparent", cursor: "pointer", color: P.muted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = P.hover; e.currentTarget.style.color = P.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.muted; }}>
                  <Check size={12} />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} title="Цэвэрлэх" style={{
                  width: 26, height: 26, borderRadius: 7, border: "none",
                  background: "transparent", cursor: "pointer", color: P.muted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#f87171"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.muted; }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 340, overflowY: "auto", scrollbarWidth: "thin" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: P.muted }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>🔔</div>
                <p style={{ fontSize: 13, fontWeight: 500, color: P.text2, marginBottom: 3 }}>Мэдэгдэл байхгүй</p>
                <p style={{ fontSize: 11, color: P.muted }}>Шинэ мэдэгдэл ирэхэд энд харагдана</p>
              </div>
            ) : notifications.map((n, i) => {
              const grad   = TYPE_GRAD[n.type]   || TYPE_GRAD.default;
              const accent = TYPE_ACCENT[n.type] || TYPE_ACCENT.default;
              const icon   = TYPE_ICON[n.type]   || TYPE_ICON.default;
              const avatarSrc = n.avatar
                ? (n.avatar.startsWith("http") ? n.avatar : API_BASE + n.avatar)
                : null;

              return (
                <button key={n.id} onClick={() => handleClick(n)} style={{
                  width: "100%", textAlign: "left",
                  padding: "10px 16px",
                  display: "flex", alignItems: "flex-start", gap: 10,
                  background: !n.read
                    ? (isDark ? "rgba(27,48,102,0.1)" : "rgba(27,48,102,0.03)")
                    : "transparent",
                  border: "none",
                  borderBottom: `1px solid ${P.border}`,
                  cursor: "pointer", transition: "background .1s",
                  animation: `fadeUp .25s ease ${i * 0.04}s both`,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = P.hover}
                  onMouseLeave={e => e.currentTarget.style.background = !n.read
                    ? (isDark ? "rgba(27,48,102,0.1)" : "rgba(27,48,102,0.03)")
                    : "transparent"
                  }
                >
                  {/* Avatar/icon */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {avatarSrc
                      ? <img src={avatarSrc} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 36, height: 36, borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
                    }
                    <span style={{
                      position: "absolute", bottom: -1, right: -1,
                      width: 16, height: 16, borderRadius: "50%",
                      background: grad, border: `2px solid ${P.bg}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8,
                    }}>{icon}</span>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: P.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                        {n.title}
                      </p>
                      <span style={{ fontSize: 10, color: P.muted, flexShrink: 0 }}>{timeAgo(n.id)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: P.muted, margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {n.message}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: `linear-gradient(135deg,#1B3066,#6B7399)`,
                      flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
