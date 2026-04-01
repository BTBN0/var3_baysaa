import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext.jsx";
import { useCall } from "../context/CallContext.jsx";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Minimize2, Maximize2 } from "lucide-react";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export default function CallPage() {
  const { userId }        = useParams();
  const [sp]              = useSearchParams();
  const mode              = sp.get("mode")  || "call";
  const wantVideo         = sp.get("video") === "1";

  const { socket }                        = useSocket();
  const { getIncomingCall, clearIncomingCall } = useCall();
  const navigate                          = useNavigate();

  const [status,      setStatus]      = useState("connecting");
  const [isMuted,     setIsMuted]     = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [hasVideo,    setHasVideo]    = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [showCtrl,    setShowCtrl]    = useState(true);
  const [minimized,   setMinimized]   = useState(false);
  const [peerName,    setPeerName]    = useState("");

  // Stable refs - never recreated
  const pc           = useRef(null);
  const localStream  = useRef(null);
  const remoteSocket = useRef(null);
  const iceBuf       = useRef([]);
  const hasRemote    = useRef(false);
  const started      = useRef(false);
  const timerRef     = useRef(null);
  const ctrlRef      = useRef(null);
  const localVidRef  = useRef(null);
  const remoteVidRef = useRef(null);
  const remoteAudRef = useRef(null);

  // ── Utilities ─────────────────────────────────────────────────
  const setVid = (ref, stream) => {
    if (!ref.current || !stream) return;
    if (ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  };

  const flushIce = async () => {
    if (!pc.current) return;
    for (const c of iceBuf.current) {
      try { await pc.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    iceBuf.current = [];
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const resetCtrl = () => {
    setShowCtrl(true);
    clearTimeout(ctrlRef.current);
    ctrlRef.current = setTimeout(() => setShowCtrl(false), 4000);
  };

  // ── Build peer connection ─────────────────────────────────────
  const buildPC = (stream) => {
    pc.current?.close();
    pc.current = null;
    hasRemote.current = false;
    iceBuf.current = [];

    const conn = new RTCPeerConnection(ICE);
    stream.getTracks().forEach(t => conn.addTrack(t, stream));

    conn.onicecandidate = ({ candidate }) => {
      if (candidate && remoteSocket.current && socket)
        socket.emit("dm_call_ice_candidate", {
          candidate: candidate.toJSON(),
          toSocketId: remoteSocket.current,
        });
    };

    conn.ontrack = ({ track, streams }) => {
      const s = streams[0];
      if (!s) return;
      // Always attach to audio (handles both audio-only and video calls)
      if (remoteAudRef.current) {
        remoteAudRef.current.srcObject = s;
        remoteAudRef.current.play().catch(() => {});
      }
      if (track.kind === "video" && remoteVidRef.current) {
        remoteVidRef.current.srcObject = s;
        remoteVidRef.current.play().catch(() => {});
      }
    };

    conn.onconnectionstatechange = () => {
      console.log("[Call] connection state:", conn.connectionState);
      if (conn.connectionState === "failed") {
        endCall(false);
      }
    };

    pc.current = conn;
    return conn;
  };

  // ── Get media with graceful video fallback ─────────────────────
  const getMedia = async (tryVideo) => {
    if (tryVideo) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        return { stream, video: true };
      } catch (e) {
        console.warn("[Call] video unavailable, falling back to audio:", e.message);
      }
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    return { stream, video: false };
  };

  // ── Outgoing call ─────────────────────────────────────────────
  const startCall = async () => {
    console.log("[Call] starting, video:", wantVideo);
    try {
      const { stream, video } = await getMedia(wantVideo);
      localStream.current = stream;
      setHasVideo(video);
      if (video) setVid(localVidRef, stream);

      const conn = buildPC(stream);
      const offer = await conn.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: video });
      await conn.setLocalDescription(offer);

      socket.emit("dm_call_offer", {
        offer: { type: conn.localDescription.type, sdp: conn.localDescription.sdp },
        toUserId: userId,
        withVideo: video,
      });
      setStatus("ringing");
    } catch (err) {
      console.error("[Call] startCall:", err);
      handleMediaError(err);
    }
  };

  // ── Answer incoming call ──────────────────────────────────────
  const answerCall = async (callData) => {
    console.log("[Call] answering, video:", callData.withVideo, "from:", callData.fromSocketId);
    setPeerName(callData.fromUsername || "");
    try {
      const { stream, video } = await getMedia(!!callData.withVideo);
      localStream.current = stream;
      setHasVideo(video);
      if (video) setVid(localVidRef, stream);

      const conn = buildPC(stream);
      remoteSocket.current = callData.fromSocketId;

      await conn.setRemoteDescription(new RTCSessionDescription({
        type: callData.offer.type,
        sdp:  callData.offer.sdp,
      }));
      hasRemote.current = true;
      await flushIce();

      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);

      socket.emit("dm_call_answer", {
        answer: { type: conn.localDescription.type, sdp: conn.localDescription.sdp },
        toSocketId: callData.fromSocketId,
      });

      clearIncomingCall();
      localStorage.removeItem("aura_incoming_call");
      setStatus("active");
      startTimer();
    } catch (err) {
      console.error("[Call] answerCall:", err);
      handleMediaError(err);
    }
  };

  const handleMediaError = (err) => {
    if (err.name === "NotAllowedError")
      alert("Микрофон/камерт зөвшөөрөл олгоно уу.\nБраузерийн зүүн дээд буланд 🔒 дарна уу.");
    else if (err.name === "NotFoundError")
      alert("Микрофон олдсонгүй. Төхөөрөмжөө шалгана уу.");
    else
      alert("Дуудлага эхлүүлж чадсангүй:\n" + err.message);
    setTimeout(() => navigate(`/dm/${userId}`), 500);
  };

  // ── End call ──────────────────────────────────────────────────
  const endCall = (emit = true) => {
    clearInterval(timerRef.current);
    clearTimeout(ctrlRef.current);
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    pc.current?.close(); pc.current = null;
    remoteSocket.current = null;
    hasRemote.current = false;
    if (emit && socket) socket.emit("dm_call_end", { toUserId: userId });
    setStatus("ended");
    setTimeout(() => navigate(`/dm/${userId}`), 1000);
  };

  const toggleMute = () => {
    const t = localStream.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
  };

  const toggleCamera = () => {
    const t = localStream.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsCameraOff(!t.enabled); }
  };

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Register socket listeners
    const onAnswer = async ({ answer, fromSocketId }) => {
      console.log("[Call] got answer");
      if (!pc.current || !answer?.type || !answer?.sdp) return;
      try {
        remoteSocket.current = fromSocketId;
        await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
        hasRemote.current = true;
        await flushIce();
        setStatus("active");
        startTimer();
      } catch (e) { console.error("[Call] setAnswer:", e); }
    };

    const onIce = async ({ candidate }) => {
      if (!candidate) return;
      if (!pc.current || !hasRemote.current) {
        iceBuf.current.push(candidate);
        return;
      }
      try { await pc.current.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("[Call] ice:", e.message); }
    };

    const onEnded   = () => endCall(false);
    const onOffline = () => {
      alert("Хэрэглэгч одоо онлайн биш байна.");
      endCall(false);
    };

    socket.on("dm_call_answer",        onAnswer);
    socket.on("dm_call_ice_candidate", onIce);
    socket.on("dm_call_ended",         onEnded);
    socket.on("dm_call_user_offline",  onOffline);

    // Start or answer — only once, guard with ref
    if (!started.current) {
      started.current = true;
      if (mode === "answer") {
        const callData = getIncomingCall();
        if (callData) {
          answerCall(callData);
        } else {
          console.error("[Call] no incoming call data");
          navigate(`/dm/${userId}`);
        }
      } else {
        startCall();
      }
    }

    resetCtrl();

    return () => {
      socket.off("dm_call_answer",        onAnswer);
      socket.off("dm_call_ice_candidate", onIce);
      socket.off("dm_call_ended",         onEnded);
      socket.off("dm_call_user_offline",  onOffline);
      // Don't reset started on cleanup — StrictMode fires cleanup+re-run
      // started.current = false; // intentionally omitted
    };
  }, [socket]);

  // Reattach local video after re-render
  useEffect(() => {
    if (localStream.current && hasVideo) setVid(localVidRef, localStream.current);
  });

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(ctrlRef.current);
  }, []);

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  // ── MINIMIZED widget ──────────────────────────────────────────
  if (minimized) {
    return (
      <MiniWidget
        status={status} elapsed={elapsed} fmt={fmt}
        isMuted={isMuted} hasVideo={hasVideo} peerName={peerName}
        localVidRef={localVidRef}
        onExpand={() => setMinimized(false)}
        onEnd={() => endCall(true)}
        onToggleMute={toggleMute}
      />
    );
  }

  // ── FULL SCREEN ───────────────────────────────────────────────
  return (
    <div onMouseMove={resetCtrl} style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "radial-gradient(ellipse at 30% 50%, #0d1340 0%, #050918 50%, #020308 100%)",
      display: "flex", flexDirection: "column",
      fontFamily: "system-ui, sans-serif",
    }}>
      <audio ref={remoteAudRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Remote video */}
      <video ref={remoteVidRef} autoPlay playsInline style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover",
        opacity: status === "active" && hasVideo ? 1 : 0,
        transition: "opacity .6s ease",
      }} />

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,.4) 0%, transparent 30%, transparent 55%, rgba(0,0,0,.75) 100%)",
        pointerEvents: "none",
      }} />

      {/* Center content — when not in active video call */}
      {(status !== "active" || !hasVideo) && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
        }}>
          <div style={{ position: "relative" }}>
            {[20, 36, 52].map((r, i) => (
              <div key={i} style={{
                position: "absolute",
                inset: -(r), borderRadius: "50%",
                border: `1.5px solid rgba(255,255,255,${0.12 - i*0.03})`,
                animation: `ringPulse ${2 + i*.5}s ease-in-out ${i*.25}s infinite`,
              }} />
            ))}
            <div style={{
              width: 110, height: 110, borderRadius: "50%",
              background: "linear-gradient(135deg,#1B3066,#2a4080,#6B7399)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, fontWeight: 700, color: "#F0F0F5",
              boxShadow: "0 0 50px rgba(27,48,102,0.6)",
              position: "relative", zIndex: 1,
            }}>
              {(peerName || userId)?.slice(0,1).toUpperCase()}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            {peerName && <p style={{ fontSize: 24, fontWeight: 700, color: "#F0F0F5", margin: "0 0 8px" }}>{peerName}</p>}
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", letterSpacing: ".1em", textTransform: "uppercase", margin: 0 }}>
              {status === "connecting" ? "Холбогдож байна…" :
               status === "ringing"   ? "Залж байна…" :
               status === "active"    ? (hasVideo ? "Видео дуудлага" : "Дуут дуудлага") :
               "Дуусгасан"}
            </p>
            {status === "active" && (
              <p style={{ fontSize: 36, fontWeight: 200, color: "#fff", letterSpacing: 3, margin: "12px 0 0" }}>{fmt(elapsed)}</p>
            )}
          </div>
        </div>
      )}

      {/* Timer badge (video call active) */}
      {status === "active" && hasVideo && (
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(4,6,18,.7)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,.08)",
          padding: "8px 20px", borderRadius: 30,
          opacity: showCtrl ? 1 : 0, transition: "opacity .4s",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "vsp 1.5s infinite" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.9)" }}>{fmt(elapsed)}</span>
        </div>
      )}

      {/* Minimize button */}
      <button onClick={() => setMinimized(true)} title="Жижигрүүлэх" style={{
        position: "absolute", top: 16, right: 16,
        width: 38, height: 38, borderRadius: "50%",
        background: "rgba(255,255,255,.1)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,.15)",
        cursor: "pointer", color: "rgba(255,255,255,.8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .2s", opacity: showCtrl ? 1 : 0,
        zIndex: 10,
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.2)"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "rgba(255,255,255,.8)"; }}>
        <Minimize2 size={16} />
      </button>

      {/* Local PiP */}
      {hasVideo && (
        <div style={{
          position: "absolute", top: 20, right: 68,
          width: 160, height: 100, borderRadius: 14, overflow: "hidden",
          border: "2px solid rgba(255,255,255,.18)",
          boxShadow: "0 8px 30px rgba(0,0,0,.6)",
          transition: "transform .3s ease",
          zIndex: 10,
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <video ref={localVidRef} autoPlay playsInline muted
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        </div>
      )}

      {/* Controls pill */}
      <div style={{
        position: "absolute", bottom: 44, left: "50%",
        transform: `translateX(-50%) translateY(${showCtrl ? 0 : 24}px)`,
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(4,6,18,.88)", backdropFilter: "blur(32px) saturate(200%)",
        padding: "18px 36px", borderRadius: 60,
        border: "1px solid rgba(255,255,255,.09)",
        boxShadow: "0 16px 60px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.07)",
        opacity: showCtrl ? 1 : 0, pointerEvents: showCtrl ? "auto" : "none",
        transition: "opacity .4s ease, transform .4s cubic-bezier(0.22,1,0.36,1)",
        zIndex: 10,
      }}>
        <Btn onClick={toggleMute} active={isMuted} title={isMuted ? "Дуу нээх" : "Дуу хаах"}>
          {isMuted ? <MicOff size={21} /> : <Mic size={21} />}
        </Btn>
        {hasVideo && (
          <Btn onClick={toggleCamera} active={isCameraOff} title={isCameraOff ? "Камер нээх" : "Камер хаах"}>
            {isCameraOff ? <VideoOff size={21} /> : <Video size={21} />}
          </Btn>
        )}
        <Btn onClick={() => endCall(true)} danger size={68}>
          <PhoneOff size={24} />
        </Btn>
        <Btn onClick={() => setMinimized(true)} title="Чат руу буцах">
          <MessageSquare size={21} />
        </Btn>
      </div>

      <style>{`
        @keyframes vsp      { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes ringPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.06);opacity:.4} }
      `}</style>
    </div>
  );
}

// ── Minimized floating widget ──────────────────────────────────────────────
function MiniWidget({ status, elapsed, fmt, isMuted, hasVideo, peerName, localVidRef, onExpand, onEnd, onToggleMute }) {
  const [pos, setPos]   = useState({ x: window.innerWidth - 260, y: 24 });
  const [drag, setDrag] = useState(false);
  const off             = useRef({ x: 0, y: 0 });

  const onDown = e => {
    e.preventDefault();
    off.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDrag(true);
  };

  useEffect(() => {
    if (!drag) return;
    const mv = e => setPos({
      x: Math.max(0, Math.min(window.innerWidth  - 240, e.clientX - off.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 160, e.clientY - off.current.y)),
    });
    const up = () => setDrag(false);
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [drag]);

  return (
    <div style={{
      position: "fixed", zIndex: 9000, left: pos.x, top: pos.y,
      width: 240,
      background: "rgba(4,6,18,.94)", backdropFilter: "blur(24px)",
      border: "1px solid rgba(255,255,255,.12)", borderRadius: 16,
      boxShadow: "0 16px 50px rgba(0,0,0,.65), 0 0 0 1px rgba(27,48,102,.3)",
      overflow: "hidden", userSelect: "none",
      animation: "fadeUp .3s cubic-bezier(0.22,1,0.36,1) both",
    }}>
      {/* Drag handle */}
      <div onMouseDown={onDown} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px",
        background: "rgba(255,255,255,.04)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        cursor: drag ? "grabbing" : "grab",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "vsp 1.5s infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>
            {status === "ringing" ? "Залж байна…" : status === "active" ? fmt(elapsed) : "Дуудлага"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <MBtn onClick={onExpand}><Maximize2 size={11} /></MBtn>
          <MBtn onClick={onEnd} danger><PhoneOff size={11} /></MBtn>
        </div>
      </div>

      {/* Video or waveform */}
      <div style={{ height: 100, background: "#020308", position: "relative", overflow: "hidden" }}>
        {hasVideo
          ? <video ref={localVidRef} autoPlay playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
          : (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {[.8,.4,.9,.5,.7,.3,.6,.5,.8].map((h, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 3,
                    background: "linear-gradient(to top,#1B3066,#6B7399)",
                    height: `${12 + h*24}px`,
                    opacity: isMuted ? 0.2 : 1,
                    animation: `wave ${.7+Math.random()*.5}s ease-in-out ${i*.1}s infinite alternate`,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>
                {isMuted ? "🔇 Дуу хаасан" : "Дуут дуудлага"}
              </span>
            </div>
          )
        }
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px" }}>
        <MBtn onClick={onToggleMute} active={isMuted}>
          {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
        </MBtn>
        <MBtn onClick={onEnd} danger size={34}><PhoneOff size={14} /></MBtn>
        <MBtn onClick={onExpand}><Maximize2 size={13} /></MBtn>
      </div>

      <style>{`
        @keyframes vsp    { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes wave   { from{transform:scaleY(.4)} to{transform:scaleY(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}

function Btn({ onClick, active, danger, size = 54, title, children }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: size, height: size, borderRadius: "50%", border: "none",
        cursor: "pointer", color: "#fff", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .2s cubic-bezier(0.34,1.56,0.64,1)",
        transform: h ? "scale(1.1)" : "scale(1)",
        background: danger
          ? (h ? "#ef4444" : "rgba(239,68,68,.95)")
          : active
            ? (h ? "rgba(255,255,255,.32)" : "rgba(255,255,255,.22)")
            : (h ? "rgba(255,255,255,.2)"  : "rgba(255,255,255,.1)"),
        boxShadow: danger ? "0 4px 24px rgba(239,68,68,.5)" : active ? "0 0 0 2px rgba(255,255,255,.3)" : "none",
      }}>
      {children}
    </button>
  );
}

function MBtn({ onClick, active, danger, size = 26, children }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: size, height: size, borderRadius: "50%", border: "none",
        cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .2s cubic-bezier(0.34,1.56,0.64,1)",
        transform: h ? "scale(1.15)" : "scale(1)",
        background: danger ? (h ? "#ef4444" : "rgba(239,68,68,.8)") : active ? "rgba(255,255,255,.2)" : (h ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.08)"),
        color: danger ? "#fff" : "rgba(255,255,255,.8)",
      }}>
      {children}
    </button>
  );
}
