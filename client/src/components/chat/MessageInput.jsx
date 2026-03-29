import { useState, useRef, useEffect } from "react";
import { Paperclip, Smile, Send } from "lucide-react";
import api from "../../api/axios.js";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const MessageInput = ({ onSend, onTyping, channelName, disabled = false }) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);
  const isTyping = useRef(false);
  const pickerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setContent(e.target.value);
    if (!isTyping.current) { isTyping.current = true; onTyping(true); }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { isTyping.current = false; onTyping(false); }, 1500);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selected);
    } else setPreview(null);
  };

  const removeFile = () => {
    setFile(null); setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (disabled || (!content.trim() && !file)) return;
    try {
      setUploading(true);
      let fileUrl = null, fileType = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
        fileUrl = uploadRes.data.data.fileUrl;
        fileType = uploadRes.data.data.fileType;
      }
      onSend(content.trim(), fileUrl, fileType);
      setContent(""); setFile(null); setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      clearTimeout(typingTimeout.current);
      isTyping.current = false; onTyping(false);
    } catch (err) {
      console.error("Upload failed", err);
    } finally { setUploading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  useEffect(() => { return () => clearTimeout(typingTimeout.current); }, []);

  if (disabled) {
    return (
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
        <div style={{ padding: "11px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, textAlign: "center", color: "var(--text5)", fontSize: 13 }}>
          You cannot send messages to this person.
        </div>
      </div>
    );
  }

  const iconBtnStyle = { width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "var(--text5)", borderRadius: 6, transition: "all 0.15s", flexShrink: 0 };
  const canSend = (content.trim() || file) && !uploading;

  return (
    <div style={{ padding: "10px 20px 14px", borderTop: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0, position: "relative" }}>
      {file && (
        <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 10 }}>
          {preview ? (
            <img src={preview} alt="preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
          ) : (
            <div style={{ width: 48, height: 48, background: "var(--surface3)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--text4)" }}>
              {file.name.split(".").pop().toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
            <p style={{ fontSize: 11, color: "var(--text5)" }}>{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={removeFile} style={{ background: "none", border: "none", color: "var(--text5)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
      )}

      {showEmojiPicker && (
        <div ref={pickerRef} style={{ position: "absolute", bottom: 70, left: 24, zIndex: 50 }}>
          <Picker data={data} onEmojiSelect={(emoji) => { setContent((p) => p + emoji.native); setShowEmojiPicker(false); inputRef.current?.focus(); }} theme="dark" previewPosition="none" skinTonePosition="none" />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 11, padding: "3px 4px 3px 8px", transition: "border-color 0.15s" }}
        onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--text5)"}
        onBlurCapture={(e) => e.currentTarget.style.borderColor = "var(--border2)"}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} accept="image/*,.pdf,.txt,.zip" />
        <button style={iconBtnStyle} onClick={() => fileInputRef.current?.click()} type="button"
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text5)"; e.currentTarget.style.background = "none"; }}>
          <Paperclip size={14} />
        </button>
        <button style={iconBtnStyle} onClick={() => setShowEmojiPicker((p) => !p)} type="button"
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.background = "var(--surface3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text5)"; e.currentTarget.style.background = "none"; }}>
          <Smile size={14} />
        </button>
        <input ref={inputRef} type="text" value={content} onChange={handleChange} onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName || "channel"}`}
          style={{ flex: 1, background: "transparent", border: "none", color: "var(--text)", fontSize: 13, outline: "none", padding: "8px 4px" }} />
        <button onClick={handleSubmit} disabled={!canSend}
          style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: canSend ? "var(--text)" : "transparent", border: "none", borderRadius: 8, cursor: canSend ? "pointer" : "default", color: canSend ? "var(--bg)" : "var(--text5)", transition: "all 0.15s", flexShrink: 0 }}>
          {uploading ? <span style={{ fontSize: 10 }}>...</span> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
