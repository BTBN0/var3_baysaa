import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import api from "../../api/axios.js";

const UserProfilePopup = ({ user, position, onClose }) => {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();
  const popupRef = useRef(null);

  const [friendStatus, setFriendStatus] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const isOnline = onlineUsers.includes(user?.id);
  const isOwnProfile = currentUser?.id === user?.id;

  useEffect(() => {
    if (!user || isOwnProfile) return;

    api.get("/friends").then((res) => {
      const friends = res.data.data || [];
      if (friends.find((f) => f.id === user.id)) setFriendStatus("friends");
    }).catch(() => {});

    api.get("/friends/requests").then((res) => {
      const requests = res.data.data || [];
      if (requests.find((r) => r.senderId === currentUser?.id)) setFriendStatus("pending");
    }).catch(() => {});

    api.get(`/blocks/check/${user.id}`).then((res) => {
      setIsBlocked(res.data.data.blocked);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
    };
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleAddFriend = async () => {
    setLoading(true);
    try {
      await api.post("/friends/request", { username: user.username });
      setFriendStatus("pending");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/blocks/${user.id}`);
      setIsBlocked(res.data.data.blocked);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDM = () => {
    navigate(`/dm/${user.id}`);
    onClose();
  };

  const formatLastSeen = (dateStr) => {
    if (!dateStr) return "Offline";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const colors = ["bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-blue-600", "bg-teal-600"];
  const avatarColor = colors[user?.username?.charCodeAt(0) % colors.length] || "bg-indigo-600";

  const POPUP_WIDTH = 220;
  const top = Math.max(60, Math.min(position.y - 30, window.innerHeight - 320));
  const left = Math.min(position.x + 20, window.innerWidth - POPUP_WIDTH - 20);

  return (
    <div
      ref={popupRef}
      style={{ position: "fixed", zIndex: 200, top, left, width: POPUP_WIDTH }}
      className="bg-[#1a1d27] border border-[#2d3748] rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Banner */}
      <div className="h-10 bg-gradient-to-r from-indigo-600/40 to-purple-600/40" />

      {/* Avatar + Info row */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[#2d3748]">
        <div className="relative flex-shrink-0 -mt-6">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-12 h-12 rounded-full object-cover"
              style={{ border: "3px solid #1a1d27" }}
            />
          ) : (
            <div
              className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center text-white text-lg font-bold`}
              style={{ border: "3px solid #1a1d27" }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1d27] ${isOnline ? "bg-green-400" : "bg-slate-500"}`} />
        </div>
        <div className="flex-1 min-w-0 pt-2">
          <h3 className="font-bold text-white text-sm truncate">{user?.username}</h3>
          <p className="text-xs text-slate-500">
            {isOnline ? "🟢 Online" : `⚫ ${formatLastSeen(user?.lastSeen)}`}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-3 py-3 space-y-1.5">
        {!isOwnProfile ? (
          <>
            <button
              onClick={handleDM}
              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition"
            >
              💬 Message
            </button>

            {friendStatus === "friends" ? (
              <button disabled className="w-full py-1.5 bg-[#2d3748] text-slate-500 text-xs font-medium rounded-lg cursor-default">
                ✅ Friends
              </button>
            ) : friendStatus === "pending" ? (
              <button disabled className="w-full py-1.5 bg-[#2d3748] text-slate-500 text-xs font-medium rounded-lg cursor-default">
                ⏳ Pending
              </button>
            ) : (
              <button
                onClick={handleAddFriend}
                disabled={loading}
                className="w-full py-1.5 bg-[#2d3748] hover:bg-[#374151] text-slate-300 hover:text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                👥 Add Friend
              </button>
            )}

            <button
              onClick={handleBlock}
              disabled={loading}
              className={`w-full py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
                isBlocked
                  ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                  : "bg-[#2d3748] text-slate-400 hover:text-red-400"
              }`}
            >
              {isBlocked ? "🚫 Unblock" : "🚫 Block"}
            </button>
          </>
        ) : (
          <button
            onClick={() => { navigate("/profile"); onClose(); }}
            className="w-full py-1.5 bg-[#2d3748] hover:bg-[#374151] text-slate-300 text-xs font-medium rounded-lg transition"
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default UserProfilePopup;