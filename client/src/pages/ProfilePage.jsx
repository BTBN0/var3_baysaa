import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const ProfilePage = () => {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [username, setUsername] = useState(user?.username || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post("/auth/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const updatedUser = res.data.data;
      setAvatarPreview(updatedUser.avatar);
      login(token, updatedUser);
      setSuccess("Avatar updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Avatar upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (username === user?.username) return setError("No changes to save");
    try {
      setSaving(true);
      const res = await api.patch("/auth/profile", { username });
      login(token, res.data.data);
      setSuccess("Profile saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <div className="border-b border-[#2d3748] px-8 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition text-sm">← Back</button>
        <h1 className="text-lg font-semibold">Profile Settings</h1>
      </div>
      <div className="max-w-lg mx-auto px-8 py-12">
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-3xl font-bold">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase()
              )}
            </div>
            <button onClick={() => fileInputRef.current.click()} disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-medium">
              {uploading ? "..." : "Change"}
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          <p className="text-slate-500 text-xs mt-3">Click avatar to change</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input type="text" value={user?.email || ""} disabled
              className="w-full px-4 py-2.5 bg-[#0f1117] border border-[#2d3748] rounded-lg text-slate-500 cursor-not-allowed" />
            <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
              className="w-full px-4 py-2.5 bg-[#0f1117] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-indigo-500 transition" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition disabled:opacity-50">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <div className="mt-10 p-4 bg-[#1a1d27] border border-[#2d3748] rounded-xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Account info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Member since</span>
              <span className="text-slate-300">{new Date(user?.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">User ID</span>
              <span className="text-slate-500 text-xs font-mono truncate max-w-48">{user?.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
