import { Search, Users, Hash, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";

const ChatHeader = ({ channel, onlineCount, onToggleMembers, showMembers, onSearch, workspaceId, isOwner }) => {
  const navigate  = useNavigate();
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  const P = {
    bg:           isDark ? "#080B2A"                : "#ffffff",
    border:       isDark ? "#1B3066"                : "#c8c8dc",
    btnBgHover:   isDark ? "rgba(107,115,153,0.18)" : "rgba(27,48,102,0.08)",
    btnBgActive:  isDark ? "rgba(107,115,153,0.22)" : "rgba(27,48,102,0.12)",
    btnBorder:    isDark ? "rgba(107,115,153,0.35)" : "rgba(27,48,102,0.2)",
    btnText:      isDark ? "#b8bdd8"                : "#1B3066",
    btnTextHover: isDark ? "#F0F0F5"                : "#080B2A",
    btnMuted:     isDark ? "#6B7399"                : "#6B7399",
  };

  const btn = (active = false) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "5px 11px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: "pointer", transition: "all 0.15s",
    background: active ? P.btnBgActive : "transparent",
    border: `1px solid ${active ? P.btnBorder : "transparent"}`,
    color: active ? P.btnText : P.btnMuted,
  });

  const onHover = (e, override = {}) => {
    e.currentTarget.style.background  = override.bg   || P.btnBgHover;
    e.currentTarget.style.color       = override.text || P.btnTextHover;
    e.currentTarget.style.borderColor = override.bd   || P.btnBorder;
    e.currentTarget.style.transform   = "translateY(-1px)";
  };
  const onLeave = (e, active = false) => {
    e.currentTarget.style.background  = active ? P.btnBgActive : "transparent";
    e.currentTarget.style.color       = active ? P.btnText : P.btnMuted;
    e.currentTarget.style.borderColor = active ? P.btnBorder : "transparent";
    e.currentTarget.style.transform   = "none";
  };

  return (
    <div style={{
      height: 48,
      borderBottom: `1px solid ${P.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 18px",
      background: P.bg,
      flexShrink: 0,
      boxShadow: isDark ? "0 1px 0 rgba(27,48,102,0.4)" : "0 1px 0 rgba(8,11,42,0.06)",
      animation: "fadeIn .2s ease both",
    }}>
      {/* Left — channel name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: isDark ? "rgba(27,48,102,0.5)" : "rgba(27,48,102,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Hash size={13} color={isDark ? "#6B7399" : "#1B3066"} strokeWidth={2} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#F0F0F5" : "#080B2A" }}>
          {channel?.name || "channel"}
        </span>
        {channel?.description && (
          <>
            <span style={{ width: 1, height: 16, background: P.border, margin: "0 4px" }} />
            <span style={{ fontSize: 12, color: P.btnMuted }}>{channel.description}</span>
          </>
        )}
      </div>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Online pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 20, marginRight: 6,
          background: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)",
          border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)"}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: isDark ? "#4ade80" : "#16a34a" }}>
            {onlineCount} online
          </span>
        </div>

        {/* Search */}
        <button style={btn(false)} onClick={onSearch}
          onMouseEnter={e => onHover(e)} onMouseLeave={e => onLeave(e)}>
          <Search size={12} /> Search
        </button>

        {/* Bans */}
        {isOwner && (
          <button style={btn(false)} onClick={() => navigate(`/bans/${workspaceId}`)}
            onMouseEnter={e => onHover(e, {
              bg:   isDark ? "rgba(239,68,68,0.1)"  : "rgba(239,68,68,0.06)",
              text: isDark ? "#fca5a5"               : "#dc2626",
              bd:   isDark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)",
            })}
            onMouseLeave={e => onLeave(e)}>
            <Ban size={12} /> Bans
          </button>
        )}

        {/* Members */}
        <button
          onClick={onToggleMembers}
          style={{ ...btn(showMembers), background: showMembers ? P.btnBgActive : "transparent" }}
          onMouseEnter={e => { if (!showMembers) onHover(e); }}
          onMouseLeave={e => onLeave(e, showMembers)}>
          <Users size={12} /> Members
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
