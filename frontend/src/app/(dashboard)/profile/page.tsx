"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { apiClient } from "@/lib/api-client";
import { ArrowLeft, User, Lock, Check } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const { t } = useLang();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
    if (user) setDisplayName(user.display_name || "");
  }, [isLoading, user, router]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setNameSaving(true);
    setNameMsg(null);
    try {
      const data = await apiClient.patch("/auth/profile", { display_name: displayName.trim() });
      // Update stored user
      const stored = localStorage.getItem("quizik_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem("quizik_user", JSON.stringify({ ...parsed, display_name: data.display_name }));
      }
      setNameMsg({ ok: true, text: t("profile.nameSaved") });
    } catch (err) {
      setNameMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setNameSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd !== confirmPwd) {
      setPwdMsg({ ok: false, text: t("profile.passwordMismatch") });
      return;
    }
    if (newPwd.length < 8) {
      setPwdMsg({ ok: false, text: t("profile.passwordTooShort") });
      return;
    }
    setPwdSaving(true);
    try {
      await apiClient.post("/auth/change-password", { current_password: currentPwd, new_password: newPwd });
      setPwdMsg({ ok: true, text: t("profile.passwordChanged") });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Failed";
      try { const p = JSON.parse(msg); msg = p.detail || p.error || msg; } catch {}
      if (msg === "Current password is incorrect") msg = t("profile.currentPasswordIncorrect");
      setPwdMsg({ ok: false, text: msg });
    } finally {
      setPwdSaving(false);
    }
  };

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;

  // has_password is false for Google-only accounts (no password set)
  const isGoogleUser = user.has_password === false;

  return (
    <div className="max-w-xl mx-auto p-8">
      <div className="mb-6">
        <Link href="/quizzes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={14} /> {t("quiz.myQuizzes")}
        </Link>
        <h1 className="text-2xl font-black text-gray-800">{t("profile.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      {/* Display name */}
      <div className="bg-white border rounded-xl p-6 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-blue-500" />
          <h2 className="font-bold text-gray-800">{t("profile.displayName")}</h2>
        </div>
        <form onSubmit={saveName} className="space-y-3">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {nameMsg && (
            <p className={`text-sm ${nameMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {nameMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={nameSaving}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Check size={14} />
            {nameSaving ? t("common.saving") : t("common.save")}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-indigo-500" />
          <h2 className="font-bold text-gray-800">{t("profile.changePassword")}</h2>
        </div>
        {isGoogleUser ? (
          <p className="text-sm text-gray-500">{t("profile.googleAccount")}</p>
        ) : (
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("profile.currentPassword")}</label>
              <input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("profile.newPassword")}</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={8}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("profile.confirmPassword")}</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                minLength={8}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 outline-none ${
                  confirmPwd && confirmPwd !== newPwd
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:ring-indigo-500"
                }`}
                placeholder="••••••••"
              />
            </div>
            {pwdMsg && (
              <p className={`text-sm ${pwdMsg.ok ? "text-green-600" : "text-red-600"}`}>
                {pwdMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={pwdSaving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Lock size={14} />
              {pwdSaving ? t("common.saving") : t("profile.changePassword")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
