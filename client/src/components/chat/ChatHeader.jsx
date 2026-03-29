import { Search, Users, Hash, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ChatHeader = ({ channel, onlineCount, onToggleMembers, showMembers, onSearch, workspaceId, isOwner }) => {
  const navigate = useNavigate();

  const btnStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
    background: active ? "var(--surface2)" : "transparent",
    border: `1px solid ${active ? "var(--border2)" : "transparent"}`,
    borderRadius: 7, fontSize: 12, fontWeight: 500,
    color: active ? "var(--text)" : "var(--text4)",
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div style={{ height: 46, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", background: "var(--bg)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Hash size={15} color="var(--text5)" strokeWidth={2} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{channel?.name || "channel"}</span>
        {channel?.description && (
          <>
            <span style={{ width: 1, height: 16, background: "var(--border2)", margin: "0 4px" }} />
            <span style={{ fontSize: 12, color: "var(--text4)" }}>{channel.description}</span>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "var(--surface2)", borderRadius: 7, marginRight: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--text4)" }}>{onlineCount} online</span>
        </div>

        <button
          onClick={onSearch}
          style={btnStyle(false)}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text4)"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          <Search size={12} /> Search
        </button>

        {isOwner && (
          <button
            onClick={() => navigate(`/bans/${workspaceId}`)}
            style={btnStyle(false)}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#fca5a5"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text4)"; e.currentTarget.style.borderColor = "transparent"; }}
          >
            <Ban size={12} /> Bans
          </button>
        )}

        <button
          onClick={onToggleMembers}
          style={btnStyle(showMembers)}
          onMouseEnter={(e) => { if (!showMembers) { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--border2)"; } }}
          onMouseLeave={(e) => { if (!showMembers) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text4)"; e.currentTarget.style.borderColor = "transparent"; } }}
        >
          <Users size={12} /> Members
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
