"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { ArrowLeft, Eye, EyeOff, Trophy, Edit2, X, Check, QrCode, BarChart2, Trash2, AlertTriangle } from "lucide-react";
import QRCode from "react-qr-code";

interface Session {
  id: string;
  quiz_id: string;
  title: string | null;
  session_slug: string;
  status: string;
  leaderboard_enabled: boolean;
  play_mode?: "quiz" | "memory_pairs" | string;
  minigame_config?: Record<string, unknown> | null;
  gamification_enabled: boolean;
  minigame_type: string;
  minigame_trigger_mode: string;
  minigame_trigger_n: number;
  allow_repeat: boolean;
  max_repeats: number;
  show_correct_answer: boolean;
  attempt_count: number;
  starts_at: string | null;
  ends_at: string | null;
  question_count: number;
  shuffle_questions: boolean | null;
  shuffle_options: boolean | null;
  anticheat_enabled: boolean;
  anticheat_tab_switch: boolean;
  anticheat_fast_answer: boolean;
  bonuses_enabled: boolean;
  bonus_eliminate: boolean;
  bonus_second_chance: boolean;
  bonus_end_correction: boolean;
  bonus_unlock_mode: string;
  bonus_unlock_x: number;
}

interface Attempt {
  id: string;
  participant_name: string;
  status: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  started_at: string;
  completed_at: string | null;
  hidden_from_leaderboard: boolean;
}

interface AnalyticsQuestion {
  question_id: string;
  position: number;
  body: string;
  total: number;
  correct: number;
  accuracy: number;
  avg_time_sec: number | null;
  option_counts: Record<string, number>;
  options: { id: string; text: string; is_correct: boolean }[];
}

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { t, lang } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [quizTitle, setQuizTitle] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [analytics, setAnalytics] = useState<null | { total_attempts: number; questions: AnalyticsQuestion[] }>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [deletingAttemptId, setDeletingAttemptId] = useState<string | null>(null);
  const [deleteAttemptLoading, setDeleteAttemptLoading] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Settings editor
  const [editingSettings, setEditingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    title: "",
    starts_at: "",
    ends_at: "",
    leaderboard_enabled: true,
    max_repeats: 0,
    show_correct_answer: true,
    gamification_enabled: false,
    minigame_type: "tap_sprint",
    minigame_trigger_mode: "every_n",
    minigame_trigger_n: 3,
    question_count: 0,
    shuffle_questions: false,
    shuffle_options: false,
    anticheat_enabled: false,
    anticheat_tab_switch: false,
    anticheat_fast_answer: false,
    bonuses_enabled: false,
    bonus_eliminate: false,
    bonus_second_chance: false,
    bonus_end_correction: false,
    bonus_unlock_mode: "immediate",
    bonus_unlock_x: 3,
  });

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const load = async () => {
    try {
      const [s, a] = await Promise.all([
        apiClient.get(`/sessions/${id}`),
        apiClient.get(`/sessions/${id}/attempts`),
      ]);
      setSession(s);
      setAttempts(Array.isArray(a) ? a : []);
      // Fetch quiz title for breadcrumb fallback
      try {
        const q = await apiClient.get(`/quizzes/${s.quiz_id}`);
        setQuizTitle(q.title ?? null);
      } catch {}
    } catch (err) {
      console.error(err);
      alert("Failed to load session");
    } finally {
      setFetching(false);
    }
  };

  const openSettingsEditor = () => {
    if (!session) return;
    setSettingsForm({
      title: session.title ?? "",
      starts_at: toLocalDatetimeValue(session.starts_at),
      ends_at: toLocalDatetimeValue(session.ends_at),
      leaderboard_enabled: session.leaderboard_enabled,
      max_repeats: session.max_repeats ?? 0,
      show_correct_answer: session.show_correct_answer,
      gamification_enabled: session.gamification_enabled,
      minigame_type: session.minigame_type ?? "tap_sprint",
      minigame_trigger_mode: session.minigame_trigger_mode ?? "every_n",
      minigame_trigger_n: session.minigame_trigger_n ?? 3,
      question_count: session.question_count ?? 0,
      shuffle_questions: session.shuffle_questions ?? false,
      shuffle_options: session.shuffle_options ?? false,
      anticheat_enabled: session.anticheat_enabled ?? false,
      anticheat_tab_switch: session.anticheat_tab_switch ?? false,
      anticheat_fast_answer: session.anticheat_fast_answer ?? false,
      bonuses_enabled: session.bonuses_enabled ?? false,
      bonus_eliminate: session.bonus_eliminate ?? false,
      bonus_second_chance: session.bonus_second_chance ?? false,
      bonus_end_correction: session.bonus_end_correction ?? false,
      bonus_unlock_mode: session.bonus_unlock_mode ?? "immediate",
      bonus_unlock_x: session.bonus_unlock_x ?? 3,
    });
    setEditingSettings(true);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const body: Record<string, unknown> = {
        leaderboard_enabled: settingsForm.leaderboard_enabled,
        allow_repeat: settingsForm.max_repeats === 0,
        max_repeats: settingsForm.max_repeats,
        show_correct_answer: settingsForm.show_correct_answer,
        gamification_enabled: settingsForm.gamification_enabled,
        minigame_type: settingsForm.minigame_type,
        minigame_trigger_mode: settingsForm.minigame_trigger_mode,
        minigame_trigger_n: settingsForm.minigame_trigger_n,
        question_count: settingsForm.question_count,
        shuffle_questions: settingsForm.shuffle_questions || null,
        shuffle_options: settingsForm.shuffle_options || null,
        anticheat_enabled: settingsForm.anticheat_enabled,
        anticheat_tab_switch: settingsForm.anticheat_tab_switch,
        anticheat_fast_answer: settingsForm.anticheat_fast_answer,
        bonuses_enabled: settingsForm.bonuses_enabled,
        bonus_eliminate: settingsForm.bonus_eliminate,
        bonus_second_chance: settingsForm.bonus_second_chance,
        bonus_end_correction: settingsForm.bonus_end_correction,
        bonus_unlock_mode: settingsForm.bonus_unlock_mode,
        bonus_unlock_x: settingsForm.bonus_unlock_x,
      };
      if (settingsForm.title.trim()) body.title = settingsForm.title.trim();
      else body.title = null;
      body.starts_at = settingsForm.starts_at ? new Date(settingsForm.starts_at).toISOString() : null;
      body.ends_at = settingsForm.ends_at ? new Date(settingsForm.ends_at).toISOString() : null;
      if (session?.play_mode === "memory_pairs") {
        body.show_correct_answer = false;
        body.gamification_enabled = false;
        body.question_count = 0;
        body.shuffle_questions = null;
        body.shuffle_options = null;
        body.anticheat_enabled = false;
        body.anticheat_tab_switch = false;
        body.anticheat_fast_answer = false;
        body.bonuses_enabled = false;
        body.bonus_eliminate = false;
        body.bonus_second_chance = false;
        body.bonus_end_correction = false;
      }
      await apiClient.patch(`/sessions/${id}`, body);
      setEditingSettings(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const setStatus = async (newStatus: string) => {
    if (!session) return;
    setUpdatingStatus(true);
    try {
      await apiClient.patch(`/sessions/${id}`, { status: newStatus });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await apiClient.get(`/sessions/${id}/analytics`);
      setAnalytics(data);
      setShowAnalytics(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const confirmDeleteAttempt = async () => {
    if (!deletingAttemptId) return;
    setDeleteAttemptLoading(true);
    try {
      await apiClient.delete(`/sessions/${id}/attempts/${deletingAttemptId}`);
      setDeletingAttemptId(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteAttemptLoading(false);
    }
  };

  // Derive effective status from time windows for display
  const effectiveStatus = (() => {
    if (!session) return "";
    if (session.status === "closed" || session.status === "archived") return session.status;
    if (session.starts_at && new Date(session.starts_at) > new Date()) return "scheduled";
    if (session.ends_at && new Date(session.ends_at) < new Date()) return "closed";
    return session.status;
  })();

  const toggleHide = async (attempt: Attempt) => {
    const endpoint = attempt.hidden_from_leaderboard
      ? `/sessions/${id}/attempts/${attempt.id}/unhide`
      : `/sessions/${id}/attempts/${attempt.id}/hide`;
    try {
      await apiClient.post(endpoint, {});
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  };

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;
  if (fetching) return <div className="p-8">{t("session.loadingSession")}</div>;
  if (!session) return <div className="p-8 text-red-500">{t("session.sessionNotFound")}</div>;

  const playUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${session.session_slug}`
      : `/play/${session.session_slug}`;

  const completed = attempts.filter((a) => a.status === "completed");
  const visible = completed.filter((a) => !a.hidden_from_leaderboard);
  const isMemoryMode = session.play_mode === "memory_pairs";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Archive session confirm modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl mx-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-orange-500 shrink-0" />
              <h3 className="font-bold text-gray-800">{t("session.archiveSession")}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">{t("session.archivedHint")}</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowArchiveConfirm(false); setStatus("archived"); }}
                className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-gray-800 text-sm">
                {t("session.archiveSession")}
              </button>
              <button onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete attempt confirmation modal */}
      {deletingAttemptId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl mx-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-red-500 shrink-0" />
              <h3 className="font-bold text-gray-800">{t("attempt.deleteAttempt")}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">{t("attempt.deleteAttemptConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteAttempt} disabled={deleteAttemptLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 text-sm">
                {deleteAttemptLoading ? t("common.deleting") : t("common.yesDelete")}
              </button>
              <button onClick={() => setDeletingAttemptId(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* QR code modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-xl p-8 shadow-xl flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800">{t("session.scanToPlay")}</h2>
            <QRCode value={playUrl} size={220} />
            <p className="text-xs text-gray-400 font-mono max-w-[220px] break-all text-center">{playUrl}</p>
            <button onClick={() => setShowQR(false)} className="text-sm text-gray-500 border border-gray-200 px-4 py-1.5 rounded hover:bg-gray-50">{t("common.close")}</button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/sessions" className="flex items-center gap-2 text-gray-500 hover:text-gray-800 shrink-0">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">{t("session.backToSessions")}</span>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold truncate">{session.title || quizTitle || "Session"}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-bold border shrink-0 ${
            effectiveStatus === "active"
              ? "bg-green-50 text-green-700 border-green-200"
              : effectiveStatus === "scheduled"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }`}
        >
          {t(`status.${effectiveStatus}`) || effectiveStatus}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${isMemoryMode ? "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
          {isMemoryMode ? "🧠 Pexeso" : "📝 Kvíz"}
        </span>
      </div>

      {/* Info card */}
      <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
        {editingSettings ? (
          <form onSubmit={saveSettings}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-700">{t("session.editSettings")}</h2>
              <button type="button" onClick={() => setEditingSettings(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("session.titleOptional")}</label>
                <input
                  type="text"
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                  placeholder={t("session.titlePlaceholder")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("sessions.opensAt")}</label>
                  <input type="datetime-local" value={settingsForm.starts_at} onChange={(e) => setSettingsForm({ ...settingsForm, starts_at: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("sessions.closesAt")}</label>
                  <input type="datetime-local" value={settingsForm.ends_at} onChange={(e) => setSettingsForm({ ...settingsForm, ends_at: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settingsForm.leaderboard_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, leaderboard_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-semibold text-gray-700">{t("sessions.leaderboard")}</span>
                </label>
                {!isMemoryMode && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm.show_correct_answer} onChange={(e) => setSettingsForm({ ...settingsForm, show_correct_answer: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-sm font-semibold text-gray-700">{t("sessions.showAnswers")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm.gamification_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, gamification_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-sm font-semibold text-gray-700">{t("sessions.minigames")}</span>
                    </label>
                  </>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700">{t("sessions.maxRepeats")}</label>
                    <p className="text-xs text-gray-400">{t("sessions.maxRepeatsHint")}</p>
                  </div>
                  <input type="number" min={0} max={1000} value={settingsForm.max_repeats} onChange={(e) => setSettingsForm({ ...settingsForm, max_repeats: Math.max(0, parseInt(e.target.value) || 0) })} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {!isMemoryMode && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-700">{t("sessions.questionCount")}</label>
                      <p className="text-xs text-gray-400">{t("sessions.questionCountHint")}</p>
                    </div>
                    <input type="number" min={0} value={settingsForm.question_count} onChange={(e) => setSettingsForm({ ...settingsForm, question_count: Math.max(0, parseInt(e.target.value) || 0) })} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
              </div>
              {!isMemoryMode && <div className="space-y-1.5">
                <p className="text-sm font-semibold text-gray-700">{t("sessions.shuffleSection")}</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settingsForm.shuffle_questions} onChange={(e) => setSettingsForm({ ...settingsForm, shuffle_questions: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-700">{t("sessions.shuffleQuestions")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settingsForm.shuffle_options} onChange={(e) => setSettingsForm({ ...settingsForm, shuffle_options: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-700">{t("sessions.shuffleOptions")}</span>
                  </label>
                </div>
              </div>}
              {!isMemoryMode && <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settingsForm.anticheat_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, anticheat_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-semibold text-gray-700">{t("sessions.anticheatEnabled")}</span>
                </label>
                {settingsForm.anticheat_enabled && (
                  <div className="pl-6 space-y-1.5 text-sm text-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm.anticheat_tab_switch} onChange={(e) => setSettingsForm({ ...settingsForm, anticheat_tab_switch: e.target.checked })} className="w-4 h-4 rounded" />
                      {t("sessions.anticheatTabSwitch")}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm.anticheat_fast_answer} onChange={(e) => setSettingsForm({ ...settingsForm, anticheat_fast_answer: e.target.checked })} className="w-4 h-4 rounded" />
                      {t("sessions.anticheatFastAnswer")}
                    </label>
                    <p className="text-xs text-gray-400">{t("sessions.anticheatNote")}</p>
                  </div>
                )}
              </div>}
              {/* Bonuses section */}
              {!isMemoryMode && <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settingsForm.bonuses_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, bonuses_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-semibold text-gray-700">{t("sessions.bonusesEnabled")}</span>
                </label>
                {settingsForm.bonuses_enabled && (
                  <div className="pl-6 space-y-1.5 text-sm text-gray-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm.bonus_eliminate} onChange={(e) => setSettingsForm({ ...settingsForm, bonus_eliminate: e.target.checked })} className="w-4 h-4 rounded" />
                      🎯 {t("sessions.bonusEliminate")}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm.bonus_second_chance} onChange={(e) => setSettingsForm({ ...settingsForm, bonus_second_chance: e.target.checked })} className="w-4 h-4 rounded" />
                      🔄 {t("sessions.bonusSecondChance")}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settingsForm.bonus_end_correction} onChange={(e) => setSettingsForm({ ...settingsForm, bonus_end_correction: e.target.checked })} className="w-4 h-4 rounded" />
                      ✏️ {t("sessions.bonusEndCorrection")}
                    </label>
                    <p className="text-xs text-gray-400">{t("sessions.bonusesNote")}</p>
                    <div className="mt-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-600">{t("sessions.bonusUnlockMode")}</label>
                      <select
                        value={settingsForm.bonus_unlock_mode}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bonus_unlock_mode: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        <option value="immediate">{t("sessions.bonusUnlockImmediate")}</option>
                        <option value="after_x">{t("sessions.bonusUnlockAfterX")}</option>
                        <option value="random">{t("sessions.bonusUnlockRandom")}</option>
                      </select>
                      {settingsForm.bonus_unlock_mode === "after_x" && (
                        <div className="flex items-center gap-2 mt-1">
                          <label className="text-xs text-gray-500 whitespace-nowrap">{t("sessions.bonusUnlockXLabel")}:</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={settingsForm.bonus_unlock_x}
                            onChange={(e) => setSettingsForm({ ...settingsForm, bonus_unlock_x: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>}

              {!isMemoryMode && settingsForm.gamification_enabled && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-xs text-indigo-700 space-y-3">
                  <p className="font-semibold text-sm">{t("sessions.minigameSettings")}</p>

                  <div>
                    <label className="block text-xs font-semibold mb-1">{t("sessions.gameType")}</label>
                    <select
                      value={settingsForm.minigame_type}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minigame_type: e.target.value })}
                      className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none"
                    >
                      <option value="tap_sprint">⚡ Tap Sprint — tap as fast as possible</option>
                      <option value="typing_race">⌨️ Typing Race — type words quickly</option>
                      <option value="slider">🎯 Aim & Hit — tap when dot hits the target</option>
                      <option value="random">🎲 Random — different game each time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">{t("sessions.whenToShow")}</label>
                    <select
                      value={settingsForm.minigame_trigger_mode}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minigame_trigger_mode: e.target.value })}
                      className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none"
                    >
                      <option value="every_n">{t("sessions.everyX")}</option>
                      <option value="streak">{t("sessions.streakX")}</option>
                      <option value="random">{t("sessions.randomX")}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold whitespace-nowrap">
                      {settingsForm.minigame_trigger_mode === "every_n" && `${t("sessions.everyX").replace("🔁 ", "")} — ${t("sessions.xValue")}`}
                      {settingsForm.minigame_trigger_mode === "streak" && `${t("sessions.streakX").replace("🔥 ", "")} ${t("sessions.xValue")}`}
                      {settingsForm.minigame_trigger_mode === "random" && `${t("sessions.randomMaxX").replace("🎲 ", "")} ${t("sessions.xValue")}`}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={settingsForm.minigame_trigger_n}
                      onChange={(e) => setSettingsForm({ ...settingsForm, minigame_trigger_n: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-20 border border-indigo-300 rounded-lg px-2 py-1 text-sm bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>

                  <p className="text-indigo-600">• {t("sessions.minigameScoreNote")}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={savingSettings} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm">
                <Check size={14} /> {savingSettings ? t("common.saving") : t("common.save")}
              </button>
              <button type="button" onClick={() => setEditingSettings(false)} className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">{t("common.cancel")}</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-1 text-sm min-w-0 flex-1">
              <p>
                <span className="font-semibold">{t("session.playLink")}</span>{" "}
                <a href={playUrl} target="_blank" rel="noopener" className="text-blue-500 hover:underline font-mono">
                  {playUrl}
                </a>
              </p>
              <p>
                <span className="font-semibold">{t("session.leaderboard")}:</span>{" "}
                {session.leaderboard_enabled ? (
                  <a href={`/play/${session.session_slug}/leaderboard`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-yellow-600 hover:underline font-semibold">
                    <Trophy size={13} /> {t("session.viewLeaderboard")}
                  </a>
                ) : t("session.disabled")}
              </p>
              <p>
                <span className="font-semibold">{t("session.attempts")}:</span>{" "}
                {t("session.attemptsTotal", { total: session.attempt_count, visible: visible.length })}
              </p>
              <p className="text-gray-500">
                {(session.max_repeats ?? 0) === 0
                  ? t("session.repeatsAllowed")
                  : `${t("sessions.maxRepeats")}: ${session.max_repeats}`} ·{" "}
                {isMemoryMode
                  ? "Režim pexeso"
                  : `${session.show_correct_answer ? t("session.answersShown") : t("session.answersHidden")} · ${session.gamification_enabled ? t("session.minigamesOn") : t("session.noMinigames")}`}
                {session.starts_at && ` · ${t("session.opens", { date: formatDate(session.starts_at)! })}`}
                {session.ends_at && ` · ${t("session.closes", { date: formatDate(session.ends_at)! })}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end shrink-0">
              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
                title="Show QR code"
              >
                <QrCode size={14} /> {t("session.qrCode")}
              </button>
              <button
                onClick={openSettingsEditor}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                <Edit2 size={14} /> {t("session.editSettings")}
              </button>
              {session.status !== "archived" && (
                <button
                  onClick={() => setStatus(effectiveStatus === "active" ? "closed" : "active")}
                  disabled={updatingStatus}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-colors ${
                    effectiveStatus === "active"
                      ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      : effectiveStatus === "scheduled"
                      ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  } disabled:opacity-50`}
                >
                  {effectiveStatus === "active"
                    ? t("session.closeSession")
                    : effectiveStatus === "scheduled"
                    ? t("session.openNow")
                    : t("session.reopenSession")}
                </button>
              )}
              {session.status !== "archived" && (
                <button
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={updatingStatus}
                  className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("session.archiveSession")}
                </button>
              )}
              {session.status === "archived" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 italic">{t("session.archivedHint")}</span>
                  <button
                    onClick={() => setStatus("closed")}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t("session.reopenSession")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attempts table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {t("session.attempts")}{" "}
            <span className="text-gray-400 font-normal text-base">({attempts.length})</span>
          </h2>
          <button
            onClick={showAnalytics ? () => setShowAnalytics(false) : loadAnalytics}
            disabled={analyticsLoading}
            className="flex items-center gap-1.5 text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
          >
            <BarChart2 size={14} />
            {analyticsLoading ? t("common.loading") : showAnalytics ? (lang === "cs" ? "Skrýt analytiku" : "Hide Analytics") : t("session.analyticsLoad")}
          </button>
        </div>

        {attempts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t("session.noAttempts")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">{t("session.participant")}</th>
                  <th className="px-4 py-3 text-left">{t("session.status")}</th>
                  <th className="px-4 py-3 text-right">{t("session.score")}</th>
                  <th className="px-4 py-3 text-right">%</th>
                  <th className="px-4 py-3 text-center">{t("session.leaderboard")}</th>
                  <th className="px-4 py-3 text-center">{t("session.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attempts.map((a) => (
                  <tr key={a.id} className={a.hidden_from_leaderboard ? "opacity-50 bg-gray-50" : ""}>
                    <td className="px-4 py-3 font-medium">{a.participant_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          a.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {a.status === "completed" ? t("status.completed") : t("status.inProgress")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.score != null ? `${a.score} / ${a.max_score}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.percentage != null ? `${a.percentage}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.hidden_from_leaderboard ? (
                        <span className="text-xs text-gray-400">{t("session.hidden")}</span>
                      ) : (
                        <span className="text-xs text-green-600">{t("session.visible")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/sessions/${id}/attempts/${a.id}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {t("session.review")}
                        </Link>
                        {a.status === "completed" && (
                          <button
                            onClick={() => toggleHide(a)}
                            className="text-gray-500 hover:text-gray-700"
                            title={a.hidden_from_leaderboard ? "Restore to leaderboard" : "Hide from leaderboard"}
                          >
                            {a.hidden_from_leaderboard ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingAttemptId(a.id)}
                          className="text-red-400 hover:text-red-600"
                          title={t("attempt.deleteAttempt")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Analytics panel */}
      {showAnalytics && analytics && (
        <div className="mt-6 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <BarChart2 size={18} className="text-indigo-500" />
            <h2 className="text-lg font-bold">{t("session.analytics")}</h2>
            <span className="text-xs text-gray-400 ml-1">({analytics.total_attempts} {lang === "cs" ? "dokončených pokusů" : "completed attempts"})</span>
          </div>
          {analytics.questions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t("session.analyticsNoData")}</div>
          ) : (
            <div className="divide-y">
              {analytics.questions.map((q, i) => {
                const accuracyColor = q.accuracy >= 70 ? "bg-green-500" : q.accuracy >= 40 ? "bg-yellow-400" : "bg-red-500";
                const totalOpts = Object.values(q.option_counts).reduce((s, c) => s + c, 0);
                return (
                  <div key={q.question_id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700">
                          <span className="text-gray-400 mr-1.5">Q{i + 1}.</span>
                          {q.body}
                        </p>
                      </div>
                      <div className="text-right text-sm shrink-0">
                        <span className={`inline-block font-bold text-white px-2 py-0.5 rounded-full text-xs ${accuracyColor}`}>
                          {q.accuracy}%
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">{q.correct}/{q.total} {t("attempt.correct").toLowerCase()}</p>
                        {q.avg_time_sec != null && (
                          <p className="text-xs text-gray-400">⏱ {q.avg_time_sec}{t("session.analyticsSeconds")}</p>
                        )}
                      </div>
                    </div>
                    {/* Accuracy bar */}
                    <div className="w-full h-2 bg-gray-100 rounded-full mb-3">
                      <div className={`h-2 rounded-full transition-all ${accuracyColor}`} style={{ width: `${q.accuracy}%` }} />
                    </div>
                    {/* Per-option breakdown */}
                    {q.options.length > 0 && totalOpts > 0 && (
                      <div className="space-y-1">
                        {q.options.map((opt) => {
                          const count = q.option_counts[opt.id] ?? 0;
                          const pct = totalOpts > 0 ? Math.round(count / totalOpts * 100) : 0;
                          return (
                            <div key={opt.id} className="flex items-center gap-2 text-xs">
                              <span className={`w-5 h-5 rounded flex items-center justify-center font-bold shrink-0 ${opt.is_correct ? "bg-green-200 text-green-900" : "bg-gray-200 text-gray-600"}`}>
                                {opt.id.toUpperCase()}
                              </span>
                              <span className="flex-1 truncate text-gray-600">{opt.text}</span>
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full shrink-0">
                                <div className={`h-1.5 rounded-full ${opt.is_correct ? "bg-green-400" : "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-gray-500 tabular-nums w-8 text-right">{pct}%</span>
                              <span className="text-gray-400 tabular-nums w-6 text-right">({count})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
