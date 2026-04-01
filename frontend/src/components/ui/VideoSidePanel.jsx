import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Phone, Maximize2, Minimize2, X, GripVertical } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";

// ── Video element ──────────────────────────────────────────────────────────
const VideoEl = ({ stream, muted, mirror, contain }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream || null;
    if (stream) ref.current.play().catch(() => {});
  }, [stream]);
  return (
    <video ref={ref} autoPlay playsInline muted={muted} style={{
      width: "100%", height: "100%",
      objectFit: contain ? "contain" : "cover",
      transform: mirror ? "scaleX(-1)" : "none",
      background: "#040612",
    }} />
  );
};

// ── Participant tile ───────────────────────────────────────────────────────
const Tile = ({ stream, label, muted, isLocal, isCameraOff, large }) => {
  const hasVideo = stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks()[0].readyState === "live" &&
    !(isLocal && isCameraOff);

  const initials = label?.slice(0, 2).toUpperCase() || "?";
  const hue = ((label?.charCodeAt(0) || 0) * 37) % 360;

  return (
    <div style={{
      position: "relative",
      background: `hsl(${hue},30%,12%)`,
      borderRadius: large ? 14 : 10,
      overflow: "hidden",
      width: "100%",
      aspectRatio: large ? "16/9" : "16/9",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px solid rgba(255,255,255,0.06)",
      boxShadow: large ? "inset 0 0 40px rgba(0,0,0,0.4)" : "none",
    }}>
      {hasVideo
        ? <VideoEl stream={stream} muted={muted} mirror={isLocal} />
        : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              width: large ? 64 : 36, height: large ? 64 : 36, borderRadius: "50%",
              background: `linear-gradient(135deg, hsl(${hue},60%,35%), hsl(${hue+30},60%,25%))`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: large ? 22 : 13, fontWeight: 700, color: "#fff",
              boxShadow: `0 0 20px hsl(${hue},60%,20%)`,
            }}>{initials}</div>
            {isCameraOff && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Camera off</span>}
          </div>
        )
      }
      {/* Name tag */}
      <div style={{
        position: "absolute", bottom: 8, left: 8,
        fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.9)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        padding: "2px 8px", borderRadius: 20,
      }}>
        {label}{isLocal ? " (та)" : ""}
        {muted && " 🔇"}
      </div>
    </div>
  );
};

// ── Control button (always-dark for fullscreen) ────────────────────────────
const FsBtn = ({ onClick, active, danger, size = 48, title, children }) => (
  <button onClick={onClick} title={title} style={{
    width: size, height: size, borderRadius: "50%", border: "none",
    cursor: "pointer", transition: "all .2s cubic-bezier(0.34,1.56,0.64,1)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    background: danger
      ? "rgba(239,68,68,0.9)"
      : active
        ? "rgba(255,255,255,0.25)"
        : "rgba(255,255,255,0.1)",
    color: "#fff",
    boxShadow: danger ? "0 4px 20px rgba(239,68,68,0.5)" : active ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
  }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = "scale(1.12)";
      e.currentTarget.style.background = danger ? "#ef4444" : active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.background = danger ? "rgba(239,68,68,0.9)" : active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)";
    }}>
    {children}
  </button>
);

// ── Panel button (theme-aware for sidebar) ─────────────────────────────────
const PanelBtn = ({ onClick, active, danger, size = 36, title, children, isDark }) => {
  const base = danger
    ? "rgba(239,68,68,0.12)"
    : active
      ? isDark ? "rgba(255,255,255,0.18)" : "rgba(27,48,102,0.22)"
      : isDark ? "rgba(255,255,255,0.06)" : "rgba(27,48,102,0.06)";
  const col = danger
    ? "#f87171"
    : active
      ? isDark ? "#fff" : "#1B3066"
      : isDark ? "rgba(255,255,255,0.55)" : "#6B7399";

  return (
    <button onClick={onClick} title={title} style={{
      width: size, height: size, borderRadius: "50%",
      border: `1px solid ${danger ? "rgba(239,68,68,0.25)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(27,48,102,0.12)"}`,
      cursor: "pointer", transition: "all .2s cubic-bezier(0.34,1.56,0.64,1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, background: base, color: col,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "scale(1.1)";
        e.currentTarget.style.background = danger ? "rgba(239,68,68,0.85)" : isDark ? "rgba(255,255,255,0.2)" : "rgba(27,48,102,0.18)";
        if (danger) e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.background = base;
        e.currentTarget.style.color = col;
      }}>
      {children}
    </button>
  );
};

const MIN_W = 220, MAX_W = 540, DEFAULT_W = 260;

// ── Grid layout for participants ───────────────────────────────────────────
const Grid = ({ allInCall, isCameraOff, screenStream, isScreenSharing }) => {
  const count = allInCall.length;
  // 1 = full, 2 = side by side, 3+ = grid
  const getStyle = () => {
    if (count === 1) return { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" };
    if (count === 2) return { gridTemplateColumns: "1fr", gridTemplateRows: "1fr 1fr" };
    if (count <= 4)  return { gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" };
    return { gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto" };
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "grid", gap: 4, padding: 4, ...getStyle() }}>
      {isScreenSharing && screenStream && (
        <div style={{ gridColumn: count > 1 ? "1/-1" : undefined, borderRadius: 10, overflow: "hidden", background: "#040612", border: "1px solid rgba(255,255,255,0.06)" }}>
          <VideoEl stream={screenStream} muted contain />
        </div>
      )}
      {allInCall.map(p => (
        <Tile key={p.socketId} stream={p.stream} label={p.username} muted={p.isLocal}
          isLocal={p.isLocal} isCameraOff={p.isLocal && isCameraOff} />
      ))}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export default function VideoSidePanel({
  inCall, isMuted, isCameraOff, isScreenSharing,
  localStream, participants = [], localUser, screenStream,
  onJoinAudio, onJoinVideo, onLeave,
  onToggleMute, onToggleCamera, onToggleScreen,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [fullscreen,    setFullscreen]    = useState(false);
  const [showControls,  setShowControls]  = useState(true);
  const [panelW,        setPanelW]        = useState(DEFAULT_W);
  const [dragging,      setDragging]      = useState(false);
  const ctrlTimer  = useRef(null);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  // Auto fullscreen on call start
  useEffect(() => { if (inCall) setFullscreen(true); }, [inCall]);
  useEffect(() => { if (!inCall) setFullscreen(false); }, [inCall]);
  useEffect(() => { if (isScreenSharing) setFullscreen(true); }, [isScreenSharing]);

  const resetTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);
  useEffect(() => { if (fullscreen && inCall) resetTimer(); return () => clearTimeout(ctrlTimer.current); }, [fullscreen, inCall, resetTimer]);

  const onDragStart = useCallback(e => {
    e.preventDefault(); setDragging(true);
    dragStartX.current = e.clientX; dragStartW.current = panelW;
  }, [panelW]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = e => setPanelW(Math.min(MAX_W, Math.max(MIN_W, dragStartW.current + dragStartX.current - e.clientX)));
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const allInCall = [
    ...(localStream ? [{ socketId: "local", username: localUser?.username || "You", stream: localStream, isLocal: true }] : []),
    ...participants,
  ];

  const P = {
    bg:      isDark ? "var(--surface)"  : "#ffffff",
    bg2:     isDark ? "var(--surface2)" : "#f4f4fb",
    border:  isDark ? "var(--border)"   : "#c8c8dc",
    text:    isDark ? "var(--text)"     : "#080B2A",
    muted:   isDark ? "var(--text5)"    : "#6B7399",
  };

  // ── Fullscreen layout ────────────────────────────────────────────
  if (fullscreen && inCall) return (
    <>
      <div onMouseMove={resetTimer} style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "radial-gradient(ellipse at 20% 50%, #0a0f2e 0%, #040612 60%, #020308 100%)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Participant grid */}
        {allInCall.length <= 2 ? (
          // 1-2 people: elegant split
          <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 3, padding: 6 }}>
            {isScreenSharing && screenStream && (
              <div style={{ flex: 2, borderRadius: 16, overflow: "hidden", background: "#040612", border: "1px solid rgba(255,255,255,0.06)" }}>
                <VideoEl stream={screenStream} muted contain />
              </div>
            )}
            {allInCall.map((p, i) => {
              const isBig = !isScreenSharing && allInCall.length === 1;
              return (
                <div key={p.socketId} style={{
                  flex: isScreenSharing ? 1 : (i === 0 && allInCall.length === 2 ? 3 : 2),
                  borderRadius: 16, overflow: "hidden",
                  background: `hsl(${(p.username?.charCodeAt(0)||0)*37%360},25%,10%)`,
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: "inset 0 0 60px rgba(0,0,0,0.5)",
                  transition: "flex .4s ease",
                }}>
                  <Tile stream={p.stream} label={p.username} muted={p.isLocal}
                    isLocal={p.isLocal} isCameraOff={p.isLocal && isCameraOff} large={isBig} />
                </div>
              );
            })}
          </div>
        ) : (
          // 3+ people: grid
          <div style={{ flex: 1, minHeight: 0, display: "grid", gap: 4, padding: 6,
            gridTemplateColumns: allInCall.length <= 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          }}>
            {isScreenSharing && screenStream && (
              <div style={{ gridColumn: "1/-1", borderRadius: 14, overflow: "hidden", background: "#040612" }}>
                <VideoEl stream={screenStream} muted contain />
              </div>
            )}
            {allInCall.map(p => (
              <div key={p.socketId} style={{ borderRadius: 14, overflow: "hidden" }}>
                <Tile stream={p.stream} label={p.username} muted={p.isLocal}
                  isLocal={p.isLocal} isCameraOff={p.isLocal && isCameraOff} />
              </div>
            ))}
          </div>
        )}

        {/* Floating controls */}
        <div style={{
          position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(4,6,18,0.85)", backdropFilter: "blur(20px) saturate(180%)",
          padding: "14px 28px", borderRadius: 50,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
          transition: "opacity .4s, transform .4s",
          opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none",
          transform: `translateX(-50%) translateY(${showControls ? 0 : 16}px)`,
        }}>
          <FsBtn onClick={onToggleMute}   active={isMuted}         title={isMuted?"Unmute":"Mute"}          size={52}>{isMuted?<MicOff size={20}/>:<Mic size={20}/>}</FsBtn>
          <FsBtn onClick={onToggleCamera} active={isCameraOff}     title={isCameraOff?"Camera on":"Camera off"} size={52}>{isCameraOff?<VideoOff size={20}/>:<Video size={20}/>}</FsBtn>
          <FsBtn onClick={onToggleScreen} active={isScreenSharing} title={isScreenSharing?"Stop sharing":"Share screen"} size={52}>{isScreenSharing?<MonitorOff size={20}/>:<Monitor size={20}/>}</FsBtn>
          <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
          <FsBtn onClick={onLeave} danger title="Leave" size={52}><PhoneOff size={20}/></FsBtn>
          <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
          <FsBtn onClick={() => setFullscreen(false)} title="Exit fullscreen" size={44}><Minimize2 size={17}/></FsBtn>
        </div>

        {/* Top-right close */}
        <button onClick={() => setFullscreen(false)} style={{
          position: "absolute", top: 16, right: 16,
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer", color: "rgba(255,255,255,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all .2s", opacity: showControls ? 1 : 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}>
          <Minimize2 size={15} />
        </button>

        {/* Call info badge */}
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(4,6,18,0.7)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "6px 16px", borderRadius: 30,
          opacity: showControls ? 1 : 0, transition: "opacity .4s",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "vsp 1.5s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
            {allInCall.length} оролцогч
          </span>
        </div>
      </div>
      <style>{`@keyframes vsp{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </>
  );

  // ── Side panel ───────────────────────────────────────────────────
  return (
    <>
      <div style={{
        width: panelW, background: P.bg,
        borderLeft: `1px solid ${P.border}`,
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "relative",
        transition: dragging ? "none" : "width .2s ease",
        userSelect: dragging ? "none" : "auto",
      }}>
        {/* Drag handle */}
        <div onMouseDown={onDragStart} style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 5,
          cursor: "ew-resize", zIndex: 10,
          background: dragging ? "rgba(107,115,153,0.35)" : "transparent",
          transition: "background .15s",
        }}
          onMouseEnter={e => { if (!dragging) e.currentTarget.style.background = "rgba(107,115,153,0.2)"; }}
          onMouseLeave={e => { if (!dragging) e.currentTarget.style.background = "transparent"; }} />

        {/* Header */}
        <div style={{
          padding: "12px 14px 12px 18px",
          borderBottom: `1px solid ${P.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isDark ? "rgba(27,48,102,0.08)" : "rgba(27,48,102,0.03)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {inCall && (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "vsp 1.5s infinite", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 12, fontWeight: 700, color: P.text }}>
              {inCall ? `Дуудлага · ${allInCall.length}` : "Дуу & Видео"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {inCall ? (
              <button onClick={() => setFullscreen(true)} title="Fullscreen" style={{
                width: 26, height: 26, borderRadius: 7, border: "none",
                background: "transparent", cursor: "pointer", color: P.muted, transition: "all .15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
                onMouseEnter={e => { e.currentTarget.style.color = P.text; e.currentTarget.style.background = P.bg2; }}
                onMouseLeave={e => { e.currentTarget.style.color = P.muted; e.currentTarget.style.background = "transparent"; }}>
                <Maximize2 size={13} />
              </button>
            ) : (
              <div style={{ display: "flex", gap: 4 }}>
                {[{ fn: onJoinAudio, icon: <Phone size={12} />, tip: "Дуут дуудлага" },
                  { fn: onJoinVideo, icon: <Video size={12} />, tip: "Видео дуудлага" }].map((b, i) => (
                  <button key={i} onClick={b.fn} title={b.tip} style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: P.bg2, border: `1px solid ${P.border}`,
                    cursor: "pointer", color: P.muted, transition: "all .15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.color = P.text; e.currentTarget.style.borderColor = "#6B7399"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = P.muted; e.currentTarget.style.borderColor = P.border; }}>
                    {b.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px 8px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {!inCall ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0", gap: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: isDark ? "rgba(27,48,102,0.2)" : "rgba(27,48,102,0.07)",
                border: `1px solid ${P.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Phone size={20} color={P.muted} strokeWidth={1.5} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: P.muted, textAlign: "center" }}>Дуудлага байхгүй</p>
              <p style={{ fontSize: 11, color: P.muted, textAlign: "center", opacity: 0.7 }}>📞 эсвэл 📹 дарж нэгдэнэ үү</p>
            </div>
          ) : (
            <>
              {isScreenSharing && screenStream && (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(107,115,153,0.2)", background: "#040612" }}>
                  <video autoPlay playsInline muted
                    ref={el => { if (el && screenStream) { el.srcObject = screenStream; el.play().catch(() => {}); } }}
                    style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} />
                </div>
              )}
              <div style={{
                display: "grid", gap: 6,
                gridTemplateColumns: allInCall.length >= 3 ? "1fr 1fr" : "1fr",
              }}>
                {allInCall.map(p => (
                  <Tile key={p.socketId} stream={p.stream} label={p.username}
                    muted={p.isLocal} isLocal={p.isLocal} isCameraOff={p.isLocal && isCameraOff} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Call controls */}
        {inCall && (
          <div style={{
            padding: "10px 12px 12px",
            borderTop: `1px solid ${P.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: isDark ? "rgba(8,11,42,0.3)" : "rgba(240,240,245,0.8)",
          }}>
            <PanelBtn onClick={onToggleMute}   active={isMuted}         isDark={isDark} title={isMuted?"Unmute":"Mute"}          size={38}>{isMuted?<MicOff size={14}/>:<Mic size={14}/>}</PanelBtn>
            <PanelBtn onClick={onToggleCamera} active={isCameraOff}     isDark={isDark} title={isCameraOff?"Camera on":"Camera off"} size={38}>{isCameraOff?<VideoOff size={14}/>:<Video size={14}/>}</PanelBtn>
            <PanelBtn onClick={onToggleScreen} active={isScreenSharing} isDark={isDark} title={isScreenSharing?"Stop":"Share"} size={38}>{isScreenSharing?<MonitorOff size={14}/>:<Monitor size={14}/>}</PanelBtn>
            <PanelBtn onClick={onLeave} danger isDark={isDark} title="Leave" size={38}><PhoneOff size={14}/></PanelBtn>
          </div>
        )}
      </div>
      <style>{`@keyframes vsp{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </>
  );
}
