"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sparkles, Moon, Sun } from "lucide-react";

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const { t, lang, toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";
  const isGmail = email.toLowerCase().endsWith("@gmail.com");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGmail) return;
    setError("");
    setLoading(true);
    try {
      await register(email, password, displayName || undefined, invitationCode || undefined);
      router.push("/quizzes");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.googleSignupFailed"));
    } finally {
      setLoading(false);
    }
  };

  const bg = isDark
    ? "min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4"
    : "min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 p-4";

  const card = isDark
    ? "bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700"
    : "bg-white rounded-2xl shadow-xl p-8 border border-violet-100";

  const inputClass = `w-full rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-violet-400 outline-none transition-shadow border ${
    isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "border-gray-200 bg-white text-gray-900"
  }`;

  const labelClass = `block text-sm font-semibold mb-1 ${isDark ? "text-gray-200" : "text-gray-700"}`;

  return (
    <div className={bg}>
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        <button
          onClick={toggleLang}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
            isDark ? "text-gray-300 border-slate-600 hover:bg-slate-700" : "text-gray-500 border-gray-200 hover:bg-violet-50"
          }`}
        >
          {lang === "en" ? "CZ" : "EN"}
        </button>
        <button
          onClick={toggleTheme}
          className={`p-1.5 rounded-lg border transition-colors ${
            isDark ? "text-gray-300 border-slate-600 hover:bg-slate-700" : "text-gray-500 border-gray-200 hover:bg-violet-50"
          }`}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-500 w-16 h-16 rounded-2xl shadow-lg mb-4">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">
            Qvízovna
          </h1>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{t("auth.platformSubtitle")}</p>
        </div>

        <div className={card}>
          <h2 className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>{t("auth.createAccount")}</h2>
          <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-violet-400 hover:underline font-semibold">
              {t("auth.signIn")}
            </Link>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <div className="mb-4">
              <GoogleLogin
                onSuccess={async (resp) => {
                  if (!resp.credential) return;
                  setError("");
                  setLoading(true);
                  try {
                    await loginWithGoogle(resp.credential, invitationCode || undefined);
                    router.push("/quizzes");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : t("auth.googleSignupFailed"));
                  } finally {
                    setLoading(false);
                  }
                }}
                onError={() => setError(t("auth.googleSignupFailed"))}
                text="signup_with"
                width="100%"
              />
              <div className="flex items-center gap-3 my-4">
                <div className={`flex-1 h-px ${isDark ? "bg-slate-600" : "bg-gray-200"}`} />
                <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-400"}`}>{t("auth.orRegisterWithEmail")}</span>
                <div className={`flex-1 h-px ${isDark ? "bg-slate-600" : "bg-gray-200"}`} />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>
                {t("auth.displayName")} <span className={`font-normal ${isDark ? "text-slate-400" : "text-gray-400"}`}>{t("auth.displayNameOptional")}</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
                placeholder={t("auth.yourName")}
              />
            </div>
            <div>
              <label className={labelClass}>{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
              {isGmail && (
                <p className="mt-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {t("auth.gmailHint")}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>{t("auth.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
                placeholder={t("auth.minChars")}
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("auth.invitationCode")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                required
                className={`${inputClass} font-mono`}
                placeholder={t("auth.invitationCodePlaceholder")}
              />
            </div>
            <button
              type="submit"
              disabled={loading || isGmail}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-500 text-white py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md"
            >
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
