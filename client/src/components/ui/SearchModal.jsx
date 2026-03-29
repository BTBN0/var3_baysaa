import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const SearchModal = ({ onClose, channelId }) => {
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === "users") {
          const res = await api.get(`/auth/search?q=${query}`);
          setResults(res.data.data || []);
        } else {
          const res = await api.get(`/messages/${channelId}/search?q=${query}`);
          setResults(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, tab, channelId]);

  const UserAvatar = ({ user }) => {
    const colors = ["bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-blue-600"];
    const color = colors[user?.username?.charCodeAt(0) % colors.length] || "bg-indigo-600";
    if (user?.avatar) {
      return <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
    }
    return (
      <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
        {user?.username?.[0]?.toUpperCase()}
      </div>
    );
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#1a1d27] border border-[#2d3748] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2d3748]">
          <span className="text-slate-500">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "users" ? "Search users..." : "Search messages..."}
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white transition text-sm">✕</button>
          )}
          <kbd className="text-xs text-slate-600 border border-[#2d3748] px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2d3748]">
          <button
            onClick={() => { setTab("users"); setResults([]); }}
            className={`flex-1 py-2.5 text-xs font-medium transition ${tab === "users" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            👤 Users
          </button>
          <button
            onClick={() => { setTab("messages"); setResults([]); }}
            className={`flex-1 py-2.5 text-xs font-medium transition ${tab === "messages" ? "text-indigo-400 border-b-2 border-indigo-500" : "text-slate-500 hover:text-slate-300"}`}
          >
            💬 Messages {!channelId && "(open a channel first)"}
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">Searching...</div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="px-4 py-8 text-center text-slate-600 text-sm">
              Type at least 2 characters to search
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-600 text-sm">
              No results found for "{query}"
            </div>
          )}

          {!loading && tab === "users" && results.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#2d3748]/50 transition">
              <UserAvatar user={user} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{user.username}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { navigate(`/dm/${user.id}`); onClose(); }}
                  className="text-xs px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 rounded-lg transition"
                >
                  DM
                </button>
                <button
                  onClick={() => { navigate("/friends"); onClose(); }}
                  className="text-xs px-3 py-1.5 bg-[#2d3748] hover:bg-[#374151] text-slate-300 rounded-lg transition"
                >
                  Add Friend
                </button>
              </div>
            </div>
          ))}

          {!loading && tab === "messages" && results.map((msg) => (
            <div key={msg.id} className="px-4 py-3 hover:bg-[#2d3748]/50 transition">
              <div className="flex items-center gap-2 mb-1">
                <UserAvatar user={msg.user} />
                <span className="text-xs font-medium text-white">{msg.user?.username}</span>
                <span className="text-xs text-slate-600">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-400 pl-10 leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;