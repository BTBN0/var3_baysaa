import { createContext, useContext, useState, useRef, useEffect } from "react";
import { useSocket } from "./SocketContext.jsx";

const CallContext = createContext(null);
const STORAGE_KEY = "aura_incoming_call";

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const [incomingCall, _set] = useState(null);
  const ref = useRef(null);

  const set = (data) => {
    ref.current = data;
    _set(data);
    if (data) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clear = () => {
    ref.current = null;
    _set(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Always-current getter — reads from ref or localStorage
  const get = () => {
    if (ref.current) return ref.current;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  };

  useEffect(() => {
    if (!socket) return;
    const onOffer = (data) => {
      const path = window.location.pathname;
      if (path === `/dm/${data.fromUserId}`) return;
      if (path.startsWith(`/call/`)) return;
      set(data);
    };
    const onEnded = () => clear();
    socket.on("dm_call_offer",  onOffer);
    socket.on("dm_call_ended",  onEnded);
    return () => {
      socket.off("dm_call_offer",  onOffer);
      socket.off("dm_call_ended",  onEnded);
    };
  }, [socket]);

  return (
    <CallContext.Provider value={{
      incomingCall,
      setIncomingCall:  set,
      clearIncomingCall: clear,
      getIncomingCall:  get,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
