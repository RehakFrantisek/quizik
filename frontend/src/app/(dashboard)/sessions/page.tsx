"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink, Plus, Search, Trash2, AlertTriangle, Trophy, Edit2 } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

interface Quiz {
  id: string;
  title: string;
  status: string;
}

interface Session {
  id: string;
  quiz_id: string;
  group_id: string | null;
  title: string | null;
  session_slug: string;
  status: string;
  leaderboard_enabled: boolean;
  allow_repeat: boolean;
  show_correct_answer: boolean;
  gamification_enabled: boolean;
  attempt_count: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
}

export default function SessionsPage() {
  const { t } = useLang();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({
    quiz_id: "",
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
    if (user) {
      Promise.all([loadSessions(), loadQuizzes(), loadGroups()]).finally(() => setFetching(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSessions = async () => {
    const data = await apiClient.get("/sessions");
    setSessions(Array.isArray(data) ? data : []);
  };

  const loadQuizzes = async () => {
    const data = await apiClient.get("/quizzes");
    setQuizzes(Array.isArray(data) ? data : []);
  };

  const loadGroups = async () => {
    try {
      const data = await apiClient.get("/groups");
      setGroups(Array.isArray(data) ? data : []);
    } catch { /* non-critical */ }
  };

  const quizMap = Object.fromEntries(quizzes.map((q) => [q.id, q]));
  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.quiz_id) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        quiz_id: form.quiz_id,
        leaderboard_enabled: form.leaderboard_enabled,
        allow_repeat: form.max_repeats === 0,
        max_repeats: form.max_repeats,
        show_correct_answer: form.show_correct_answer,
        gamification_enabled: form.gamification_enabled,
        question_count: form.question_count,
        shuffle_questions: form.shuffle_questions || null,
        shuffle_options: form.shuffle_options || null,
        anticheat_enabled: form.anticheat_enabled,
        anticheat_tab_switch: form.anticheat_tab_switch,
        anticheat_fast_answer: form.anticheat_fast_answer,
        bonuses_enabled: form.bonuses_enabled,
        bonus_eliminate: form.bonus_eliminate,
        bonus_second_chance: form.bonus_second_chance,
        bonus_end_correction: form.bonus_end_correction,
        bonus_unlock_mode: form.bonus_unlock_mode,
        bonus_unlock_x: form.bonus_unlock_x,
      };
      if (form.title) body.title = form.title;
      if (form.starts_at) body.starts_at = new Date(form.starts_at).toISOString();
      if (form.ends_at) body.ends_at = new Date(form.ends_at).toISOString();
      body.minigame_type = form.minigame_type;
      body.minigame_trigger_mode = form.minigame_trigger_mode;
      body.minigame_trigger_n = form.minigame_trigger_n;
      await apiClient.post("/sessions", body);
      setShowCreate(false);
      setForm({ quiz_id: "", title: "", starts_at: "", ends_at: "", leaderboard_enabled: true, max_repeats: 0, show_correct_answer: true, gamification_enabled: false, minigame_type: "tap_sprint", minigame_trigger_mode: "every_n", minigame_trigger_n: 3, question_count: 0, shuffle_questions: false, shuffle_options: false, anticheat_enabled: false, anticheat_tab_switch: false, anticheat_fast_answer: false, bonuses_enabled: false, bonus_eliminate: false, bonus_second_chance: false, bonus_end_correction: false, bonus_unlock_mode: "immediate", bonus_unlock_x: 3 });
      await loadSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/sessions/${deletingId}`);
      setSessions((prev) => prev.filter((s) => s.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  };

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;
  if (fetching) return <div className="p-8">{t("common.loading")}</div>;

  const playBase = typeof window !== "undefined" ? window.location.origin : "";
  const filtered = sessions.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const quizTitle = (quizMap[s.quiz_id]?.title ?? "").toLowerCase();
    return (s.title ?? "").toLowerCase().includes(q) || s.session_slug.toLowerCase().includes(q) || quizTitle.includes(q);
  });

  const publishedQuizzes = quizzes.filter((q) => q.status === "published");

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-red-500 shrink-0" />
              <h2 className="text-lg font-bold text-gray-800">{t("sessions.deleteTitle")}</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              {t("sessions.deleteConfirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? t("common.deleting") : t("common.yesDelete")}
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("sessions.title")}</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus size={18} /> <span className="hidden sm:inline">{t("sessions.newSession")}</span>
        </button>
      </div>

      {/* Create session form */}
      {showCreate && (
        <form
          onSubmit={createSession}
          className="bg-white border border-blue-200 rounded-xl p-6 mb-6 shadow-sm"
        >
          <h2 className="text-lg font-bold mb-4">{t("sessions.createTitle")}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t("sessions.quizTemplate")} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.quiz_id}
                onChange={(e) => setForm({ ...form, quiz_id: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">{t("sessions.quizTemplatePlaceholder")}</option>
                {publishedQuizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              {publishedQuizzes.length === 0 && (
                <p className="text-xs text-yellow-600 mt-1">{t("sessions.noPublishedQuizzes")}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t("sessions.sessionTitle")} <span className="text-gray-400 font-normal">{t("common.optional")}</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={t("session.titlePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("sessions.opensAt")} <span className="text-gray-400 font-normal">{t("common.optional")}</span></label>
                <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("sessions.closesAt")} <span className="text-gray-400 font-normal">{t("common.optional")}</span></label>
                <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.leaderboard_enabled} onChange={(e) => setForm({ ...form, leaderboard_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-semibold text-gray-700">{t("sessions.leaderboard")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.show_correct_answer} onChange={(e) => setForm({ ...form, show_correct_answer: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-semibold text-gray-700">{t("sessions.showAnswers")}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.gamification_enabled} onChange={(e) => setForm({ ...form, gamification_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-semibold text-gray-700">{t("sessions.minigames")}</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("sessions.maxRepeats")} <span className="text-gray-400 font-normal text-xs">{t("sessions.maxRepeatsHint")}</span>
                </label>
                <input type="number" min={0} max={1000} value={form.max_repeats} onChange={(e) => setForm({ ...form, max_repeats: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("sessions.questionCount")} <span className="text-gray-400 font-normal text-xs">{t("sessions.questionCountHint")}</span>
                </label>
                <input type="number" min={0} value={form.question_count} onChange={(e) => setForm({ ...form, question_count: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-gray-700">{t("sessions.shuffleSection")}</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.shuffle_questions} onChange={(e) => setForm({ ...form, shuffle_questions: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700">{t("sessions.shuffleQuestions")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.shuffle_options} onChange={(e) => setForm({ ...form, shuffle_options: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700">{t("sessions.shuffleOptions")}</span>
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.anticheat_enabled} onChange={(e) => setForm({ ...form, anticheat_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-semibold text-gray-700">{t("sessions.anticheatEnabled")}</span>
              </label>
              {form.anticheat_enabled && (
                <div className="pl-6 space-y-1.5 text-sm text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.anticheat_tab_switch} onChange={(e) => setForm({ ...form, anticheat_tab_switch: e.target.checked })} className="w-4 h-4 rounded" />
                    {t("sessions.anticheatTabSwitch")}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.anticheat_fast_answer} onChange={(e) => setForm({ ...form, anticheat_fast_answer: e.target.checked })} className="w-4 h-4 rounded" />
                    {t("sessions.anticheatFastAnswer")}
                  </label>
                  <p className="text-xs text-gray-400">{t("sessions.anticheatNote")}</p>
                </div>
              )}
            </div>
            {/* Bonuses */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.bonuses_enabled} onChange={(e) => setForm({ ...form, bonuses_enabled: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-semibold text-gray-700">{t("sessions.bonusesEnabled")}</span>
              </label>
              {form.bonuses_enabled && (
                <div className="pl-6 space-y-1.5 text-sm text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.bonus_eliminate} onChange={(e) => setForm({ ...form, bonus_eliminate: e.target.checked })} className="w-4 h-4 rounded" />
                    🎯 {t("sessions.bonusEliminate")}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.bonus_second_chance} onChange={(e) => setForm({ ...form, bonus_second_chance: e.target.checked })} className="w-4 h-4 rounded" />
                    🔄 {t("sessions.bonusSecondChance")}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.bonus_end_correction} onChange={(e) => setForm({ ...form, bonus_end_correction: e.target.checked })} className="w-4 h-4 rounded" />
                    ✏️ {t("sessions.bonusEndCorrection")}
                  </label>
                  <p className="text-xs text-gray-400">{t("sessions.bonusesNote")}</p>
                  <div className="mt-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">{t("sessions.bonusUnlockMode")}</label>
                    <select
                      value={form.bonus_unlock_mode}
                      onChange={(e) => setForm({ ...form, bonus_unlock_mode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none"
                    >
                      <option value="immediate">{t("sessions.bonusUnlockImmediate")}</option>
                      <option value="after_x">{t("sessions.bonusUnlockAfterX")}</option>
                      <option value="random">{t("sessions.bonusUnlockRandom")}</option>
                    </select>
                    {form.bonus_unlock_mode === "after_x" && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 whitespace-nowrap">{t("sessions.bonusUnlockXLabel")}:</label>
                        <input type="number" min={1} max={100} value={form.bonus_unlock_x} onChange={(e) => setForm({ ...form, bonus_unlock_x: Math.max(1, parseInt(e.target.value) || 1) })} className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {form.gamification_enabled && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-xs text-indigo-700 space-y-3">
                <p className="font-semibold text-sm">{t("sessions.minigameSettings")}</p>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t("sessions.gameType")}</label>
                  <select
                    value={form.minigame_type}
                    onChange={(e) => setForm({ ...form, minigame_type: e.target.value })}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 outline-none"
                  >
                    <option value="tap_sprint">⚡ Tap Sprint</option>
                    <option value="typing_race">⌨️ Typing Race</option>
                    <option value="slider">🎯 Aim & Hit</option>
                    <option value="random">🎲 Random each time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{t("sessions.whenToShow")}</label>
                  <select
                    value={form.minigame_trigger_mode}
                    onChange={(e) => setForm({ ...form, minigame_trigger_mode: e.target.value })}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 outline-none"
                  >
                    <option value="every_n">{t("sessions.everyX")}</option>
                    <option value="streak">{t("sessions.streakX")}</option>
                    <option value="random">{t("sessions.randomMaxX")}</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold whitespace-nowrap">{t("sessions.xValue")}</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.minigame_trigger_n}
                    onChange={(e) => setForm({ ...form, minigame_trigger_n: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-20 border border-indigo-300 rounded-lg px-2 py-1 text-sm bg-white text-gray-700 outline-none"
                  />
                </div>
                <p>{t("sessions.minigameScoreNote")}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={creating} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {creating ? t("common.creating") : t("sessions.createSession")}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">{t("common.cancel")}</button>
          </div>
        </form>
      )}

      {/* Search + filter */}
      {sessions.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("sessions.searchPlaceholder")}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t("status.all")}</option>
            <option value="scheduled">{t("status.scheduled")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="closed">{t("status.closed")}</option>
            <option value="archived">{t("status.archived")}</option>
          </select>
        </div>
      )}

      {filtered.length === 0 && sessions.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border rounded-lg bg-gray-50">
          {t("sessions.noSessions")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-8">{t("sessions.noSessions")}</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="border p-4 rounded-lg bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-lg font-semibold">{s.title || quizMap[s.quiz_id]?.title || "(untitled)"}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${s.status === "active" ? "bg-green-50 text-green-700 border-green-200" : s.status === "scheduled" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {t(`status.${s.status}`) || s.status}
                    </span>
                    {s.group_id && groupMap[s.group_id] && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold border bg-teal-50 text-teal-700 border-teal-200 flex items-center gap-1">
                        👥 {groupMap[s.group_id].name}
                      </span>
                    )}
                    {!s.allow_repeat && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold border bg-orange-50 text-orange-700 border-orange-200">{t("session.oneAttemptPerDevice")}</span>
                    )}
                    {s.gamification_enabled && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">{t("session.minigamesOn")}</span>
                    )}
                  </div>
                  {s.title && quizMap[s.quiz_id] && (
                    <p className="text-xs text-gray-400 mb-0.5">{t("session.quizLabel")}: {quizMap[s.quiz_id].title}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {s.attempt_count} {t("session.attempts").toLowerCase()} •{" "}
                    {s.leaderboard_enabled ? t("sessions.leaderboardOn") : t("sessions.leaderboardOff")}
                    {!s.show_correct_answer && ` • ${t("session.answersHidden")}`}
                    {s.starts_at && ` • ${t("session.opens", { date: formatDate(s.starts_at)! })}`}
                    {s.ends_at && ` • ${t("session.closes", { date: formatDate(s.ends_at)! })}`}
                  </p>
                  <p className="text-xs font-mono text-gray-400 mt-1">
                    <a href={`${playBase}/play/${s.session_slug}`} target="_blank" rel="noopener" className="text-blue-500 hover:underline">
                      /play/{s.session_slug}
                    </a>
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-1.5 sm:gap-2 ml-2 shrink-0">
                  <a href={`/play/${s.session_slug}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm text-green-600 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded hover:bg-green-100" title={t("common.open")}>
                    <ExternalLink size={13} /> <span className="hidden sm:inline">{t("common.open")}</span>
                  </a>
                  {s.leaderboard_enabled && (
                    <a href={`/play/${s.session_slug}/leaderboard`} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 px-2.5 py-1.5 rounded hover:bg-yellow-100" title={t("session.viewLeaderboard")}>
                      <Trophy size={13} /> <span className="hidden sm:inline">{t("session.viewLeaderboard")}</span>
                    </a>
                  )}
                  <Link href={`/sessions/${s.id}`} className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded hover:bg-blue-100" title={t("common.edit")}>
                    <Edit2 size={13} /> <span className="hidden sm:inline">{t("common.edit")}</span>
                  </Link>
                  <button
                    onClick={() => setDeletingId(s.id)}
                    className="flex items-center gap-1 text-sm text-red-500 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded hover:bg-red-100"
                    title="Delete session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
