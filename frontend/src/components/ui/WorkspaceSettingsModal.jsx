import { useState, useRef } from "react";
import { X, Camera, Check, Copy, Link, UserPlus, Search, Loader } from "lucide-react";
import api from "../../api/axios.js";
import { useTheme } from "../../context/ThemeContext.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

export default function WorkspaceSettingsModal({ workspace, workspaceId, onClose }) {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  const [tab, setTab]               = useState("general"); // "general" | "invite"
  const [name, setName]             = useState(workspace?.name || "");
  const [description, setDesc]      = useState(workspace?.description || "");
  const [avatarPreview, setPreview] = useState(
    workspace?.avatar
      ? (workspace.avatar.startsWith("http") ? workspace.avatar : API_BASE + workspace.avatar)
      : null
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");
  const [copied,     setCopied]     = useState(false);

  // Invite user state
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviting,       setInviting]       = useState(false);
  const [inviteResult,   setInviteResult]   = useState(null); // { ok, message, user }
  const [invitedUsers,   setInvitedUsers]   = useState([]);

  const fileRef = useRef(null);

  const P = {
    bg:      isDark ? "#0D1035"  : "#ffffff",
    bg2:     isDark ? "#111540"  : "#f4f4fb",
    border:  isDark ? "#1B3066"  : "#c8c8dc",
    bd2:     isDark ? "#2a4080"  : "#b0b0cc",
    text:    isDark ? "#F0F0F5"  : "#080B2A",
    text2:   isDark ? "#b8bdd8"  : "#1B3066",
    muted:   isDark ? "#6B7399"  : "#6B7399",
    inputBg: isDark ? "#080B2A"  : "#F0F0F5",
    shadow:  isDark ? "0 24px 60px rgba(8,11,42,0.8)" : "0 8px 40px rgba(8,11,42,0.15)",
  };

  const hue  = (workspace?.name?.charCodeAt(0) || 0) % 360;
  const grad = `linear-gradient(135deg,hsl(${hue},45%,25%),hsl(${hue+30},45%,18%))`;

  const inputSt = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: `1px solid ${P.bd2}`, background: P.inputBg, color: P.text,
    fontSize: 13, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s",
  };
  const onFocus = e => { e.target.style.borderColor = "#6B7399"; e.target.style.boxShadow = "0 0 0 3px rgba(107,115,153,.15)"; };
  const onBlur  = e => { e.target.style.borderColor = P.bd2; e.target.style.boxShadow = "none"; };
  const labelSt = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: P.muted, marginBottom: 6 };

  // ── Save general settings ──────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      if (avatarFile) {
        const form = new FormData();
        form.append("avatar", avatarFile);
        await api.patch(`/workspaces/${workspaceId}/avatar`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      if (name.trim() !== workspace?.name || description !== workspace?.description) {
        await api.patch(`/workspaces/${workspaceId}`, {
          name: name.trim(), description: description.trim(),
        });
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); window.location.reload(); }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Хадгалж чадсангүй");
    } finally { setSaving(false); }
  };

  // ── Invite user by username ────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true); setInviteResult(null);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/invite-user`, {
        username: inviteUsername.trim(),
      });
      setInviteResult({ ok: true, message: res.data.message, user: res.data.data });
      setInvitedUsers(p => [...p, res.data.data]);
      setInviteUsername("");
    } catch (err) {
      setInviteResult({ ok: false, message: err.response?.data?.message || "Алдаа гарлаа" });
    } finally { setInviting(false); }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${workspace?.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TABS = [
    { id: "general", label: "Тохиргоо" },
    { id: "invite",  label: "Урилга" },
  ];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: isDark ? "rgba(8,11,42,.75)" : "rgba(8,11,42,.4)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeIn .15s ease both",
    }}>
      <div style={{
        width: "100%", maxWidth: 460,
        background: P.bg, border: `1px solid ${P.border}`,
        borderRadius: 20, overflow: "hidden",
        boxShadow: P.shadow,
        animation: "fadeUp .25s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${P.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Workspace mini avatar */}
            <div style={{ width: 32, height: 32, borderRadius: 8, background: avatarPreview ? "transparent" : grad, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>
              {avatarPreview ? <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : workspace?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: P.text, margin: 0 }}>{workspace?.name}</h2>
              <p style={{ fontSize: 11, color: P.muted, margin: 0 }}>Workspace тохиргоо</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: "50%", background: isDark ? "rgba(107,115,153,.15)" : "rgba(27,48,102,.06)", border: "none", cursor: "pointer", color: P.muted, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.15)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(107,115,153,.15)" : "rgba(27,48,102,.06)"; e.currentTarget.style.color = P.muted; }}>
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${P.border}`, padding: "0 20px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 14px", border: "none", background: "transparent",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              color: tab === t.id ? P.text : P.muted,
              borderBottom: tab === t.id ? `2px solid ${isDark ? "#6B7399" : "#1B3066"}` : "2px solid transparent",
              marginBottom: -1, transition: "all .15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: General settings ── */}
        {tab === "general" && (
          <form onSubmit={handleSave} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Avatar picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: 16, background: avatarPreview ? "transparent" : grad, border: `2px solid ${P.border}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(8,11,42,.2)" }}>
                  {avatarPreview
                    ? <img src={avatarPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 28, fontWeight: 700, color: "#F0F0F5" }}>{workspace?.name?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} style={{ position: "absolute", inset: 0, borderRadius: 16, background: "rgba(8,11,42,.55)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <Camera size={20} color="#F0F0F5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setPreview(URL.createObjectURL(f)); } }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 4 }}>Workspace зураг</p>
                <p style={{ fontSize: 11, color: P.muted, lineHeight: 1.5 }}>Зураг дарж өөрчлөх<br />PNG, JPG дэмжинэ</p>
              </div>
            </div>

            {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", fontSize: 12 }}>{error}</div>}

            <div>
              <label style={labelSt}>Нэр</label>
              <input style={inputSt} value={name} onChange={e => setName(e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Workspace нэр" />
            </div>
            <div>
              <label style={labelSt}>Тайлбар</label>
              <input style={inputSt} value={description} onChange={e => setDesc(e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Заавал биш" />
            </div>

            {/* Invite link */}
            <div>
              <label style={labelSt}>Урилгын холбоос</label>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${P.bd2}`, background: P.inputBg, fontSize: 11, color: P.muted, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <Link size={11} style={{ flexShrink: 0, color: "#6B7399" }} />
                  {`${window.location.origin}/invite/${workspace?.inviteCode}`}
                </div>
                <button type="button" onClick={copyLink} style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: copied ? "rgba(34,197,94,.15)" : isDark ? "rgba(27,48,102,.4)" : "rgba(27,48,102,.1)", border: copied ? "1px solid rgba(34,197,94,.3)" : `1px solid ${P.bd2}`, color: copied ? "#4ade80" : P.text2, fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "all .15s", display: "flex", alignItems: "center", gap: 5 }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Хуулсан!" : "Хуулах"}
                </button>
              </div>
              <p style={{ fontSize: 11, color: P.muted, marginTop: 5 }}>Энэ холбоосыг хуваалцсанаар хэн ч workspace-д нэгдэх боломжтой.</p>
            </div>

            <button type="submit" disabled={saving} style={{ padding: "11px", borderRadius: 10, border: saved ? "1px solid rgba(34,197,94,.3)" : "none", background: saved ? "rgba(34,197,94,.15)" : "linear-gradient(135deg,#1B3066,#2a4080)", color: saved ? "#4ade80" : "#F0F0F5", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .6 : 1, transition: "all .2s", boxShadow: saved ? "none" : "0 4px 14px rgba(27,48,102,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onMouseEnter={e => { if (!saving && !saved) { e.currentTarget.style.background = "linear-gradient(135deg,#2a4080,#6B7399)"; } }}
              onMouseLeave={e => { if (!saving && !saved) { e.currentTarget.style.background = "linear-gradient(135deg,#1B3066,#2a4080)"; } }}>
              {saved ? <><Check size={14} /> Хадгаллаа!</> : saving ? "Хадгалж байна…" : "Хадгалах"}
            </button>
          </form>
        )}

        {/* ── Tab: Invite user ── */}
        {tab === "invite" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: P.muted, margin: 0, lineHeight: 1.6 }}>
              Хэрэглэгчийн нэрийг оруулж workspace-д шууд нэмэх боломжтой.
            </p>

            <form onSubmit={handleInvite} style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: P.muted, pointerEvents: "none" }} />
                <input
                  style={{ ...inputSt, paddingLeft: 32 }}
                  value={inviteUsername}
                  onChange={e => { setInviteUsername(e.target.value); setInviteResult(null); }}
                  onFocus={onFocus} onBlur={onBlur}
                  placeholder="Хэрэглэгчийн нэр…"
                  autoComplete="off"
                />
              </div>
              <button type="submit" disabled={inviting || !inviteUsername.trim()} style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: inviting || !inviteUsername.trim() ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#1B3066,#2a4080)", color: "#F0F0F5", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: inviting || !inviteUsername.trim() ? .5 : 1, transition: "all .15s" }}>
                {inviting ? <Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={13} />}
                Нэмэх
              </button>
            </form>

            {/* Result message */}
            {inviteResult && (
              <div style={{ padding: "10px 14px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, background: inviteResult.ok ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)", border: `1px solid ${inviteResult.ok ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}` }}>
                {inviteResult.ok && inviteResult.user?.avatar && (
                  <img src={API_BASE + inviteResult.user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                )}
                <span style={{ fontSize: 13, color: inviteResult.ok ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                  {inviteResult.ok ? "✅ " : "❌ "}{inviteResult.message}
                </span>
              </div>
            )}

            {/* Invited this session */}
            {invitedUsers.length > 0 && (
              <div>
                <label style={labelSt}>Энэ session-д нэмсэн</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {invitedUsers.map(u => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: P.bg2, border: `1px solid ${P.border}` }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `hsl(${(u.username?.charCodeAt(0)||0)*37%360},40%,28%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#F0F0F5", flexShrink: 0 }}>
                        {u.avatar
                          ? <img src={API_BASE + u.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          : u.username?.[0]?.toUpperCase()
                        }
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{u.username}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#4ade80" }}>✓ Нэмэгдлээ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite link shortcut */}
            <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 16 }}>
              <label style={labelSt}>Холбоосоор урих</label>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${P.bd2}`, background: P.inputBg, fontSize: 11, color: P.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                  <Link size={11} style={{ flexShrink: 0 }} />
                  {`${window.location.origin}/invite/${workspace?.inviteCode}`}
                </div>
                <button type="button" onClick={copyLink} style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: copied ? "rgba(34,197,94,.15)" : isDark ? "rgba(27,48,102,.4)" : "rgba(27,48,102,.1)", border: copied ? "1px solid rgba(34,197,94,.3)" : `1px solid ${P.bd2}`, color: copied ? "#4ade80" : P.text2, fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "all .15s", display: "flex", alignItems: "center", gap: 5 }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Хуулсан!" : "Хуулах"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
