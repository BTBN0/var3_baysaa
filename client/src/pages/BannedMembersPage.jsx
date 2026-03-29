import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios.js";

const UserAvatar = ({ user }) => {
  const colors = ["bg-indigo-600", "bg-purple-600", "bg-pink-600", "bg-blue-600", "bg-teal-600"];
  const color = colors[user?.username?.charCodeAt(0) % colors.length] || "bg-indigo-600";
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
      {user?.username?.[0]?.toUpperCase()}
    </div>
  );
};

const BannedMembersPage = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unbanTarget, setUnbanTarget] = useState(null);
  const [unbanning, setUnbanning] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBans();
    api.get("/workspaces").then((res) => {
      const ws = res.data.data || [];
      const found = ws.find((w) => w.id === workspaceId);
      if (found) setWorkspaceName(found.name);
    });
  }, [workspaceId, location.key]);

  const fetchBans = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/bans/${workspaceId}`);
      setBans(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load banned members");
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!unbanTarget) return;
    setUnbanning(true);
    try {
      await api.delete(`/bans/${workspaceId}/${unbanTarget.user.id}`);
      setBans((prev) => prev.filter((b) => b.id !== unbanTarget.id));
      setUnbanTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUnbanning(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString([], {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="border-b border-[#2d3748] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition text-sm">
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-semibold">Banned Members</h1>
            {workspaceName && <p className="text-xs text-slate-500">{workspaceName}</p>}
          </div>
        </div>
        <button
          onClick={fetchBans}
          className="text-xs text-slate-500 hover:text-white transition px-3 py-1.5 bg-[#1a1d27] border border-[#2d3748] rounded-lg"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm">Loading...</div>
        ) : bans.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-sm font-medium text-slate-400">No banned members</p>
            <p className="text-xs text-slate-600 mt-1">This workspace has a clean record</p>
          </div>
        ) : (
          <>
            <p className="text-slate-500 text-sm mb-4">
              {bans.length} banned {bans.length === 1 ? "member" : "members"}
            </p>
            <div className="space-y-3">
              {bans.map((ban) => (
                <div key={ban.id}
                  className="flex items-center gap-4 p-4 bg-[#1a1d27] border border-[#2d3748] rounded-xl hover:border-red-500/20 transition">
                  <UserAvatar user={ban.user} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{ban.user?.username}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <p className="text-xs text-slate-500">Banned {formatDate(ban.createdAt)}</p>
                      {ban.reason && (
                        <>
                          <span className="text-slate-700">·</span>
                          <p className="text-xs text-slate-500 italic">"{ban.reason}"</p>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setUnbanTarget(ban)}
                    className="px-3 py-1.5 bg-[#2d3748] hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 border border-transparent hover:border-indigo-500/30 rounded-lg text-xs font-medium transition flex-shrink-0"
                  >
                    Unban
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {unbanTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-full max-w-sm bg-[#1a1d27] border border-[#2d3748] rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-2">
              Unban @{unbanTarget.user?.username}?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              They will be able to rejoin the workspace using an invite code.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setUnbanTarget(null)}
                className="flex-1 py-2.5 border border-[#2d3748] rounded-lg text-slate-400 hover:text-white transition text-sm">
                Cancel
              </button>
              <button onClick={handleUnban} disabled={unbanning}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition text-sm disabled:opacity-50">
                {unbanning ? "Unbanning..." : "Unban"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannedMembersPage;