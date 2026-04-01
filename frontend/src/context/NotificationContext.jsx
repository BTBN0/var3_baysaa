import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./SocketContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const Ctx = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user }   = useAuth();
  const [items, setItems] = useState([]);

  // Track pending calls — if dm_call_ended fires before answer → missed call
  const pendingCalls = useRef({});  // fromUserId → callData

  const add = useCallback((n) => {
    setItems(p => [
      { ...n, id: Date.now() + Math.random(), read: false, time: new Date() },
      ...p
    ].slice(0, 50));
  }, []);

  const markRead    = useCallback((id) => setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setItems(p => p.map(n => ({ ...n, read: true }))), []);
  const clearAll    = useCallback(() => setItems([]), []);
  const unreadCount = items.filter(n => !n.read).length;

  useEffect(() => {
    if (!socket || !user) return;

    // DM message — only when not on that DM page
    const onDM = (msg) => {
      if (msg.senderId === user.id) return;
      if (msg.isCallLog || msg.type === "call_log") return; // skip call logs
      if (window.location.pathname === `/dm/${msg.senderId}`) return;
      add({
        type: "dm",
        title: msg.sender?.username || "Шинэ мессеж",
        message: msg.content
          ? (msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content)
          : "📎 Файл",
        avatar: msg.sender?.avatar,
        link: `/dm/${msg.senderId}`,
      });
    };

    // Channel mention
    const onMsg = (msg) => {
      if (msg.user?.id === user.id) return;
      if (!msg.content?.includes(`@${user.username}`)) return;
      add({
        type: "mention",
        title: `${msg.user?.username} танд дурдсан`,
        message: msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content,
        avatar: msg.user?.avatar,
        link: msg.channelId ? `/chat/${msg.workspaceId}/${msg.channelId}` : null,
      });
    };

    const onFriendReq = (req) => add({
      type: "friend_request",
      title: "Найзын хүсэлт",
      message: `${req.sender?.username} танд найзын хүсэлт илгээлээ`,
      avatar: req.sender?.avatar,
      link: "/friends",
    });

    const onFriendAcc = ({ username }) => add({
      type: "friend_accepted",
      title: "Найзын хүсэлт зөвшөөрлөө",
      message: `${username} таны хүсэлтийг хүлээн авлаа`,
      link: "/friends",
    });

    // Incoming call — store as pending (NOT a notification yet)
    const onCallOffer = (data) => {
      pendingCalls.current[data.fromUserId] = data;
      // Auto-expire after 35s if not answered or declined
      setTimeout(() => {
        if (pendingCalls.current[data.fromUserId]) {
          // Missed call — add to bell notifications
          add({
            type: "missed_call",
            title: `${data.fromUsername} дуудсан — хариулаагүй`,
            message: data.withVideo ? "📹 Видео дуудлага" : "📞 Дуут дуудлага",
            avatar: data.fromAvatar,
            link: `/dm/${data.fromUserId}`,
          });
          delete pendingCalls.current[data.fromUserId];
        }
      }, 35000);
    };

    // Call ended by caller — missed call notification
    const onCallEnded = ({ fromUserId }) => {
      const pending = pendingCalls.current[fromUserId];
      if (pending) {
        delete pendingCalls.current[fromUserId];
        // Only add missed call if we didn't answer (not on call page)
        const onCallPage = window.location.pathname.startsWith("/call/");
        if (!onCallPage) {
          add({
            type: "missed_call",
            title: `${pending.fromUsername} дуудсан — хариулаагүй`,
            message: pending.withVideo ? "📹 Видео дуудлага" : "📞 Дуут дуудлага",
            avatar: pending.fromAvatar,
            link: `/dm/${fromUserId}`,
          });
        }
      }
    };

    socket.on("dm_new_message",          onDM);
    socket.on("new_message",             onMsg);
    socket.on("friend_request_received", onFriendReq);
    socket.on("friend_accepted",         onFriendAcc);
    socket.on("dm_call_offer",           onCallOffer);
    socket.on("dm_call_ended",           onCallEnded);

    return () => {
      socket.off("dm_new_message",          onDM);
      socket.off("new_message",             onMsg);
      socket.off("friend_request_received", onFriendReq);
      socket.off("friend_accepted",         onFriendAcc);
      socket.off("dm_call_offer",           onCallOffer);
      socket.off("dm_call_ended",           onCallEnded);
    };
  }, [socket, user, add]);

  return (
    <Ctx.Provider value={{ notifications: items, unreadCount, markRead, markAllRead, clearAll, addNotification: add }}>
      {children}
    </Ctx.Provider>
  );
};

export const useNotifications = () => useContext(Ctx);
