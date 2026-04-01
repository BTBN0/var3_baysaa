import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace("/api", "");

export const SocketProvider = ({ children }) => {
  const { token }                             = useAuth();
  const [socket, setSocket]                   = useState(null);
  const [onlineUsers, setOnlineUsers]         = useState([]);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setOnlineUsers([]);
      return;
    }

    const s = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    s.on("connect",       () => console.log("✅ Socket connected:", s.id));
    s.on("connect_error", (e) => console.error("❌ Socket error:", e.message));
    s.on("disconnect",    (r) => console.log("🔌 Socket disconnected:", r));

    s.on("user_online",  ({ userId }) => setOnlineUsers(p => [...new Set([...p, userId])]));
    s.on("user_offline", ({ userId }) => setOnlineUsers(p => p.filter(id => id !== userId)));

    s.on("kicked_from_workspace", ({ message }) => {
      alert(`Та энэ workspace-аас хасагдлаа.\nШалтгаан: ${message}`);
      window.location.href = "/dashboard";
    });

    s.on("session_expired", ({ message }) => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    });

    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
