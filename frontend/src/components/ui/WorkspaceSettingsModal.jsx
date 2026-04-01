import { useState, useRef } from "react";
import { X, Camera, Check, Copy, Link, RefreshCw } from "lucide-react";
import api from "../../api/axios.js";
import { useTheme } from "../../context/ThemeContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

export default function WorkspaceSettingsModal({ workspace, workspaceId, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [name, setName]         = useState(workspace?.name || "");
  const [description, setDesc]  = useState(workspace?.description || "");
  const [avatarPreview, setAvatarPreview] = useState(
    workspace?.avatar
      ? (workspace.avatar.startsWith("http") ? workspace.avatar : API_BASE + workspace.avatar)
      : null
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");
  const fileRef = useRef(null);

  const P = {
    bg:     isDark ? "#0D1035" : "#ffffff",
    bg2:    isDark ? "#111540" : "#f4f4fb",
    border: isDark ? "#1B3066" : "#c8c8dc",
    bd2:    isDark ? "#2a4080" : "#b0b0cc",
    text:   isDark ? "#F0F0F5" : "#080B2A",
    text2:  isDark ? "#b8bdd8" : "#1B3066",
    muted:  isDark ? "#6B7399" : "#6B7399",
    inputBg: isDark ? "#080B2A" : "#F0F0F5",
    shadow:  isDark ? "0 24px 60px rgba(8,11,42,0.8)" : "0 8px 40px rgba(8,11,42,0.15)",
  };

  const gradients = [
    "linear-gradient(135deg,#1B3066,#2a4080)",
    "linear-gradient(135deg,#2a4080,#6B7399)",
    "linear-gradient(135deg,#6B7399,#1B3066)",
    "linear-gradient(135deg,#080B2A,#2a4080)",
  ];
  const grad = gradients[(workspace?.name?.charCodeAt(0) || 0) % gradients.length];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      // Upload avatar first if changed
      if (avatarFile) {
        const form = new FormData();
        form.append("avatar", avatarFile);
        await api.patch(`/workspaces/${workspaceId}/avatar`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      // Update name/description
      if (name.trim() !== workspace?.name || description !== workspace?.description) {
        await api.patch(`/workspaces/${workspaceId}`, {
          name: name.trim(),
          description: description.trim(),
        });
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); window.location.reload(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Хадгалж чадсангүй");
    } finally { setSaving(false); }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: `1px solid ${P.bd2}`, background: P.inputBg, color: P.text,
    fontSize: 13, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s",
  };
  const onFocus = e => { e.target.style.borderColor = "#6B7399"; e.target.style.boxShadow = "0 0 0 3px rgba(107,115,153,0.15)"; };
  const onBlur  = e => { e.target.style.borderColor = P.bd2; e.target.style.boxShadow = "none"; };
  const labelSt = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: P.muted, marginBottom: 6 };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: isDark ? "rgba(8,11,42,0.75)" : "rgba(8,11,42,0.4)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeIn .15s ease both",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: P.bg, border: `1px solid ${P.border}`,
        borderRadius: 20, overflow: "hidden",
        boxShadow: P.shadow,
        animation: "fadeUp .25s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${P.border}` }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: P.text, margin: 0 }}>Workspace тохиргоо</h2>
            <p style={{ fontSize: 12, color: P.muted, margin: "2px 0 0" }}>Нэр болон зургийг өөрчлөх</p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: "50%",
            background: isDark ? "rgba(107,115,153,0.15)" : "rgba(27,48,102,0.06)",
            border: "none", cursor: "pointer", color: P.muted,
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(107,115,153,0.15)" : "rgba(27,48,102,0.06)"; e.currentTarget.style.color = P.muted; }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Avatar picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 16,
                background: avatarPreview ? "transparent" : grad,
                border: `2px solid ${P.border}`,
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(8,11,42,0.2)",
              }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 28, fontWeight: 700, color: "#F0F0F5" }}>{workspace?.name?.[0]?.toUpperCase()}</span>
                }
              </div>
              {/* Camera overlay */}
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                position: "absolute", inset: 0, borderRadius: 16,
                background: "rgba(8,11,42,0.55)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity .15s",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <Camera size={20} color="#F0F0F5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 4 }}>Workspace зураг</p>
              <p style={{ fontSize: 11, color: P.muted, lineHeight: 1.5 }}>Зураг дарж өөрчлөх<br/>PNG, JPG дэмжинэ</p>
            </div>
          </div>

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label style={labelSt}>Нэр</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
              onFocus={onFocus} onBlur={onBlur} placeholder="Workspace нэр" />
          </div>

          {/* Description */}
          <div>
            <label style={labelSt}>Тайлбар</label>
            <input style={inputStyle} value={description} onChange={e => setDesc(e.target.value)}
              onFocus={onFocus} onBlur={onBlur} placeholder="Заавал биш" />
          </div>


          {/* Invite Link */}
          <div>
            <label style={labelSt}>Урилгын холбоос</label>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{
                flex: 1, padding: "8px 12px", borderRadius: 10,
                border: `1px solid ${P.bd2}`, background: P.inputBg,
                fontSize: 11, color: P.muted, fontFamily: "monospace",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Link size={11} style={{ flexShrink: 0, color: "#6B7399" }} />
                {`${window.location.origin}/invite/${workspace?.inviteCode}`}
              </div>
              <button type="button" onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/invite/${workspace?.inviteCode}`);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }} style={{
                padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                background: copiedLink ? "rgba(34,197,94,0.15)" : isDark ? "rgba(27,48,102,0.4)" : "rgba(27,48,102,0.1)",
                border: copiedLink ? "1px solid rgba(34,197,94,0.3)" : `1px solid ${P.bd2}`,
                color: copiedLink ? "#4ade80" : P.text2,
                fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "all .15s",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                {copiedLink ? "Хуулсан!" : "Хуулах"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: P.muted, marginTop: 5 }}>
              Энэ холбоосыг хуваалцсанаар хэн ч workspace-д нэгдэх боломжтой.
            </p>
          </div>

          {/* Save */}
          <button type="submit" disabled={saving} style={{
            padding: "11px", borderRadius: 10, border: "none",
            background: saved
              ? "rgba(34,197,94,0.15)"
              : "linear-gradient(135deg,#1B3066,#2a4080)",
            border: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
            color: saved ? "#4ade80" : "#F0F0F5",
            fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1, transition: "all .2s",
            boxShadow: saved ? "none" : "0 4px 14px rgba(27,48,102,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
            onMouseEnter={e => { if (!saving && !saved) { e.currentTarget.style.background = "linear-gradient(135deg,#2a4080,#6B7399)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(107,115,153,0.35)"; }}}
            onMouseLeave={e => { if (!saving && !saved) { e.currentTarget.style.background = "linear-gradient(135deg,#1B3066,#2a4080)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(27,48,102,0.4)"; }}}>
            {saved ? <><Check size={14} /> Хадгаллаа!</> : saving ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </form>
      </div>
    </div>
  );
}
