"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, X, Send, Clock, CheckCircle, ChevronDown, ChevronUp, Image, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useLang } from "@/contexts/LangContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getToken } from "@/lib/auth";

interface FeedbackItem {
  id: string;
  message: string;
  image_url: string | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function FeedbackModal() {
  const { t } = useLang();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "history">("send");

  // Send form state
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // History state
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Unread badge: open feedbacks with admin reply not yet seen
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await apiClient.get("/feedback/mine") as FeedbackItem[];
      setHistory(Array.isArray(data) ? data : []);
      const withReply = (Array.isArray(data) ? data : []).filter(
        (f: FeedbackItem) => f.admin_reply && f.status === "resolved"
      ).length;
      setUnreadCount(withReply);
    } catch {
      // silently ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/uploads/question-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json() as { url: string };
      setImageUrl(json.url);
    } catch {
      setSendError(t("feedback.error"));
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setSendError("");
    try {
      await apiClient.post("/feedback", { message: message.trim(), image_url: imageUrl });
      setSent(true);
      setMessage("");
      setImageUrl(null);
      await loadHistory();
      setTimeout(() => {
        setSent(false);
        setActiveTab("history");
      }, 1800);
    } catch {
      setSendError(t("feedback.error"));
    } finally {
      setSending(false);
    }
  };

  const surface = isDark
    ? "bg-slate-900 border-slate-700 text-gray-100"
    : "bg-white border-gray-200 text-gray-800";

  const inputClass = `w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400 resize-none ${
    isDark ? "bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-500" : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
  }`;

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-semibold border-b-2 transition-colors ${
      active
        ? "border-violet-600 text-violet-600"
        : isDark
        ? "border-transparent text-gray-400 hover:text-gray-200"
        : "border-transparent text-gray-400 hover:text-gray-700"
    }`;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`relative flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-xl border ml-0.5 transition-colors ${
          isDark
            ? "text-gray-400 border-slate-700 hover:bg-slate-700 hover:text-violet-300"
            : "text-slate-500 border-white/70 bg-white/70 hover:bg-white hover:text-indigo-600"
        }`}
        title={t("feedback.btn")}
      >
        <MessageSquarePlus size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Modal — rendered in a portal so it escapes the nav's backdrop-filter stacking context */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] ${surface}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${isDark ? "border-slate-700" : "border-gray-100"}`}>
              <div>
                <h2 className="font-bold text-base">{t("feedback.title")}</h2>
                <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("feedback.subtitle")}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className={`flex border-b shrink-0 ${isDark ? "border-slate-700" : "border-gray-100"}`}>
              <button className={tabClass(activeTab === "send")} onClick={() => setActiveTab("send")}>
                {t("feedback.tabSend")}
              </button>
              <button className={tabClass(activeTab === "history")} onClick={() => setActiveTab("history")}>
                {t("feedback.tabHistory")}
                {history.length > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${isDark ? "bg-slate-700 text-gray-300" : "bg-gray-100 text-gray-500"}`}>
                    {history.length}
                  </span>
                )}
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5">
              {/* ── Send tab ── */}
              {activeTab === "send" && (
                <form onSubmit={handleSend} className="space-y-3">
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("feedback.messagePlaceholder")}
                    className={inputClass}
                    required
                  />

                  {/* Image upload */}
                  <div>
                    {imageUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-violet-300">
                        <img src={imageUrl} alt="attachment" className="w-full max-h-40 object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrl(null)}
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-colors ${
                          isDark
                            ? "border-slate-600 text-gray-400 hover:bg-slate-800"
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <Image size={15} />
                        {uploading ? "Uploading..." : t("feedback.attachImage")}
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {sendError && <p className="text-red-500 text-sm">{sendError}</p>}
                  {sent && (
                    <p className="text-green-500 text-sm flex items-center gap-1.5">
                      <CheckCircle size={15} /> {t("feedback.sent")}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity active:scale-95"
                  >
                    <Send size={15} />
                    {sending ? t("feedback.sending") : t("feedback.send")}
                  </button>
                </form>
              )}

              {/* ── History tab ── */}
              {activeTab === "history" && (
                <div className="space-y-3">
                  {historyLoading ? (
                    <p className={`text-center py-8 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {t("common.loading")}
                    </p>
                  ) : history.length === 0 ? (
                    <p className={`text-center py-8 text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {t("feedback.noHistory")}
                    </p>
                  ) : (
                    history.map((fb) => (
                      <div
                        key={fb.id}
                        className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-100 bg-gray-50"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm leading-snug line-clamp-2 flex-1">{fb.message}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                              fb.status === "resolved"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : isDark
                                ? "bg-slate-700 text-slate-300 border-slate-600"
                                : "bg-orange-50 text-orange-600 border-orange-200"
                            }`}>
                              {fb.status === "resolved" ? t("feedback.statusResolved") : t("feedback.statusOpen")}
                            </span>
                            <button
                              onClick={() => setExpandedId(expandedId === fb.id ? null : fb.id)}
                              className={`${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-700"}`}
                            >
                              {expandedId === fb.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </div>
                        </div>

                        <p className={`text-xs mt-1 flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                          <Clock size={11} /> {formatDate(fb.created_at)}
                        </p>

                        {expandedId === fb.id && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm whitespace-pre-wrap">{fb.message}</p>
                            {fb.image_url && (
                              <img src={fb.image_url} alt="attachment" className="rounded-lg max-h-48 object-cover w-full" />
                            )}
                            {fb.admin_reply && (
                              <div className={`mt-2 rounded-xl p-3 border-l-4 border-violet-500 ${isDark ? "bg-violet-900/20" : "bg-violet-50"}`}>
                                <p className={`text-xs font-semibold mb-1 ${isDark ? "text-violet-400" : "text-violet-700"}`}>
                                  {t("feedback.adminReply")}
                                </p>
                                <p className="text-sm whitespace-pre-wrap">{fb.admin_reply}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
