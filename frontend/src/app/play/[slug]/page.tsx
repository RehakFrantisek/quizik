"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader, Trophy, X, Check, Moon, Sun } from "lucide-react";
import { Minigame } from "@/components/play/Minigame";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LangContext";

const AVATARS = ["🦊", "🐼", "🐸", "🐯", "🐻", "🐺", "🦁", "🐷", "🐨", "🐮", "🐙", "🦋"];

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: "single_choice" | "multiple_choice" | "true_false" | "short_answer";
  body: string;
  points: number;
  image_url?: string | null;
  options: QuestionOption[];
}

interface SessionData {
  session_id: string;
  session_slug: string;
  title: string;
  description: string | null;
  leaderboard_enabled: boolean;
  play_mode?: "quiz" | "memory_pairs" | string;
  allow_repeat: boolean;
  show_correct_answer: boolean;
  gamification_enabled?: boolean;
  minigame_type?: string;
  minigame_config?: Record<string, unknown> | null;
  minigame_trigger_mode?: string;
  minigame_trigger_n?: number;
  time_limit_sec: number | null;
  question_count: number;
  questions: Question[];
  bonuses_enabled?: boolean;
  bonus_eliminate?: boolean;
  bonus_second_chance?: boolean;
  bonus_end_correction?: boolean;
  bonus_unlock_mode?: string;   // "immediate" | "after_x" | "random"
  bonus_unlock_x?: number;
}

interface AnswerResult {
  question_id: string;
  is_correct: boolean;
  points_awarded: number;
  correct_option_ids: string[];
  correct_texts: string[];
}

function answerToText(
  question: Question | undefined,
  answer: string | string[] | undefined,
  fallback: string,
): string {
  if (answer == null) return fallback;
  if (!question) return Array.isArray(answer) ? answer.join(", ") : answer;
  const map = new Map(question.options.map((opt) => [opt.id, opt.text]));
  if (Array.isArray(answer)) {
    if (answer.length === 0) return fallback;
    return answer.map((id) => map.get(id) ?? id).join(", ");
  }
  return map.get(answer) ?? answer;
}

type Phase = "name" | "quiz" | "minigame" | "memory_mode" | "result" | "error" | "already_attempted";

interface Result {
  score: number;
  max_score: number;
  percentage: number;
  minigame_score: number;
  time_spent_sec?: number | null;
  leaderboard_enabled: boolean;
}

function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  const key = "quizik_device_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  return token;
}

function pickEnabledMinigame(sessionData: SessionData | null): "tap_sprint" | "typing_race" | "slider" | "memory_pairs" | "risk_reward" {
  const fallback = (sessionData?.minigame_type as "tap_sprint" | "typing_race" | "slider" | "memory_pairs" | "risk_reward" | undefined) ?? "tap_sprint";
  const raw = sessionData?.minigame_config && typeof sessionData.minigame_config === "object"
    ? (sessionData.minigame_config as { enabled_minigames?: unknown }).enabled_minigames
    : null;
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const allowed = raw.filter((x): x is "tap_sprint" | "typing_race" | "slider" | "memory_pairs" | "risk_reward" =>
    typeof x === "string" && ["tap_sprint", "typing_race", "slider", "memory_pairs", "risk_reward"].includes(x));
  if (allowed.length === 0) return fallback;
  return allowed[Math.floor(Math.random() * allowed.length)];
}

function PlayControls() {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <button onClick={toggleLang}
        className="text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title={lang === "en" ? "Switch to Czech" : "Přepnout na angličtinu"}>
        {lang === "en" ? "CZ" : "EN"}
      </button>
      <button onClick={toggleTheme}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 p-1.5 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title={theme === "dark" ? "Light mode" : "Dark mode"}>
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </div>
  );
}

export default function PlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>("name");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const [participantName, setParticipantName] = useState("");
  const [avatar, setAvatar] = useState("🦊");
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [questionStart, setQuestionStart] = useState<number>(Date.now());
  const [answerStreak, setAnswerStreak] = useState(0);
  const [riskBets, setRiskBets] = useState<Record<string, number>>({});

  const [allAnswerResults, setAllAnswerResults] = useState<AnswerResult[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [minigameScores, setMinigameScores] = useState<number[]>([]);

  // Bonus power-up state
  const [eliminatedOptions, setEliminatedOptions] = useState<Set<string>>(new Set());
  const [eliminateUsed, setEliminateUsed] = useState(false);
  const [eliminateLoading, setEliminateLoading] = useState(false);
  const [secondChanceUsed, setSecondChanceUsed] = useState(false);
  const [endCorrectionUsed, setEndCorrectionUsed] = useState(false);
  const [endCorrectionApplying, setEndCorrectionApplying] = useState(false);
  // Bonus unlock tracking
  const [bonusVisibleRandom, setBonusVisibleRandom] = useState(false);

  const telemetryBuffer = useRef<{ event_type: string; payload?: Record<string, unknown>; client_ts: string }[]>([]);
  const attemptIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/play/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed to load quiz" }));
          throw new Error(err.error || err.message || "Failed to load quiz");
        }
        return res.json();
      })
      .then((data) => { setSessionData(data); setPhase("name"); })
      .catch((err) => { setErrorMsg(err.message); setPhase("error"); })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (phase !== "quiz") return;
    const onVis = () => telemetryBuffer.current.push({ event_type: document.hidden ? "tab_hidden" : "tab_visible", client_ts: new Date().toISOString() });
    const onBlur = () => telemetryBuffer.current.push({ event_type: "focus_lost", client_ts: new Date().toISOString() });
    const onFocus = () => telemetryBuffer.current.push({ event_type: "focus_gained", client_ts: new Date().toISOString() });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [phase]);

  const flushTelemetry = async (aId: string) => {
    const events = [...telemetryBuffer.current];
    if (!events.length) return;
    telemetryBuffer.current = [];
    try {
      await fetch(`/api/v1/play/${slug}/attempts/${aId}/telemetry`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
    } catch { /* best-effort */ }
  };

  const startAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim()) return;
    try {
      const deviceToken = getDeviceToken();
      const res = await fetch(`/api/v1/play/${slug}/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_name: participantName.trim(), device_token: deviceToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err.detail === "string" ? err.detail : "";
        if (detail.includes("ALREADY_ATTEMPTED")) { setPhase("already_attempted"); return; }
        throw new Error("Failed to start attempt");
      }
      const data = await res.json();
      setAttemptId(data.attempt_id);
      attemptIdRef.current = data.attempt_id;
      setRiskBets({});
      setQuestionStart(Date.now());
      // Random mode: roll for Q1
      if ((sessionData?.bonus_unlock_mode ?? "immediate") === "random") {
        setBonusVisibleRandom(Math.random() < 0.4);
      }
      setPhase(sessionData?.play_mode === "memory_pairs" || sessionData?.play_mode === "speed_match" ? "memory_mode" : "quiz");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start");
    }
  };

  const submitMemoryMode = async (score: number, elapsedSec: number) => {
    if (!sessionData || !attemptIdRef.current) return;
    try {
      const res = await fetch(`/api/v1/play/${slug}/attempts/${attemptIdRef.current}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: [{ question_id: sessionData.questions[0]?.id ?? null, response: null, time_spent_sec: Math.max(1, elapsedSec) }],
          minigame_score: score,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit memory mode");
      const data = await res.json();
      setAllAnswerResults(Array.isArray(data.answer_results) ? data.answer_results : []);
      setResult({
        score: data.score,
        max_score: data.max_score,
        percentage: data.percentage,
        minigame_score: data.minigame_score ?? score,
        time_spent_sec: data.time_spent_sec ?? elapsedSec,
        leaderboard_enabled: sessionData.leaderboard_enabled,
      });
      setPhase("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit memory mode");
      setPhase("error");
    }
  };

  const recordAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const checkMinigameTrigger = (nextIdx: number, newStreak: number, currentMinigameCount: number): boolean => {
    if (!sessionData?.gamification_enabled) return false;
    if (nextIdx >= sessionData.questions.length) return false;
    const mode = sessionData.minigame_trigger_mode ?? "every_n";
    const n = sessionData.minigame_trigger_n ?? 3;
    if (mode === "every_n") return n > 0 && nextIdx % n === 0;
    if (mode === "random") return currentMinigameCount < n && Math.random() < 0.3;
    if (mode === "streak") return newStreak > 0 && newStreak % n === 0;
    return false;
  };

  const nextQuestion = () => {
    const q = sessionData!.questions[currentIdx];
    const elapsed = Math.round((Date.now() - questionStart) / 1000);
    if (elapsed < 2) telemetryBuffer.current.push({ event_type: "fast_answer", payload: { question_id: q.id, time_sec: elapsed }, client_ts: new Date().toISOString() });
    setTimers((prev) => ({ ...prev, [q.id]: elapsed }));
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setEliminatedOptions(new Set());

    const hasAnswer = answers[q.id] != null && answers[q.id] !== "" && (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).length > 0 : true);
    const newStreak = hasAnswer ? answerStreak + 1 : 0;
    setAnswerStreak(newStreak);

    // Roll for random bonus unlock on next question
    if ((sessionData?.bonus_unlock_mode ?? "immediate") === "random") {
      setBonusVisibleRandom(Math.random() < 0.4);
    }

    // Best-effort partial progress save
    if (attemptIdRef.current) {
      const currentAnswers = { ...answers, [q.id]: answers[q.id] };
      fetch(`/api/v1/play/${slug}/attempts/${attemptIdRef.current}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: currentAnswers }),
      }).catch(() => {});
    }

    if (checkMinigameTrigger(nextIdx, newStreak, minigameScores.length)) {
      setAnswerStreak(0);
      setPhase("minigame");
    } else {
      setQuestionStart(Date.now());
    }
  };

  const submitQuiz = async () => {
    if (!attemptId || !sessionData) return;
    const q = sessionData.questions[currentIdx];
    const elapsed = Math.round((Date.now() - questionStart) / 1000);
    if (elapsed < 2) telemetryBuffer.current.push({ event_type: "fast_answer", payload: { question_id: q.id, time_sec: elapsed }, client_ts: new Date().toISOString() });
    const finalTimers = { ...timers, [q.id]: elapsed };
    const answersPayload = sessionData.questions.map((qq) => ({
      question_id: qq.id,
      response: answers[qq.id] ?? null,
      time_spent_sec: finalTimers[qq.id] ?? null,
      risk_bet: riskBets[qq.id] ?? null,
    }));
    const totalMinigameScore = minigameScores.reduce((sum, s) => sum + s, 0);
    try {
      const res = await fetch(`/api/v1/play/${slug}/attempts/${attemptId}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersPayload, minigame_score: totalMinigameScore }),
      });
      if (!res.ok) throw new Error("Submission failed");
      const data = await res.json();
      setAllAnswerResults(data.answer_results ?? []);
      setResult({ score: data.score, max_score: data.max_score, percentage: data.percentage, minigame_score: data.minigame_score ?? 0, time_spent_sec: data.time_spent_sec ?? null, leaderboard_enabled: sessionData.leaderboard_enabled });
      await flushTelemetry(attemptId);
      setPhase("result");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit");
    }
  };

  /** Server-side 50/50: fetch which 2 wrong options to hide */
  const handleEliminate = async (questionId: string) => {
    if (eliminateUsed || eliminateLoading) return;
    setEliminateLoading(true);
    try {
      const res = await fetch(`/api/v1/play/${slug}/questions/${questionId}/eliminate`);
      if (!res.ok) throw new Error("Eliminate failed");
      const data = await res.json();
      setEliminatedOptions(new Set(data.options_to_hide ?? []));
      setEliminateUsed(true);
    } catch {
      // fallback: pick 2 random non-selected for single_choice
    } finally {
      setEliminateLoading(false);
    }
  };

  const handleSecondChance = () => {
    if (secondChanceUsed) return;
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[sessionData!.questions[currentIdx].id];
      return updated;
    });
    setSecondChanceUsed(true);
  };

  const applyEndCorrection = async (questionId: string) => {
    if (!attemptId || endCorrectionUsed || endCorrectionApplying) return;
    setEndCorrectionApplying(true);
    try {
      const res = await fetch(`/api/v1/play/${slug}/attempts/${attemptId}/correct`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId }),
      });
      if (!res.ok) throw new Error("Correction failed");
      const data = await res.json();
      setAllAnswerResults((prev) =>
        prev.map((ar) => ar.question_id === questionId ? { ...ar, is_correct: true } : ar)
      );
      setResult((prev) => prev ? { ...prev, score: data.new_score, percentage: data.new_percentage } : prev);
      setEndCorrectionUsed(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to apply correction");
    } finally {
      setEndCorrectionApplying(false);
    }
  };

  // ── Loading ──

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="animate-spin text-gray-400" size={36} />
    </div>
  );

  if (phase === "error") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <PlayControls />
      <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl p-8 max-w-md text-center shadow">
        <h2 className="text-xl font-bold text-red-700 mb-2">{t("play.quizUnavailable")}</h2>
        <p className="text-gray-600">{errorMsg}</p>
      </div>
    </div>
  );

  if (phase === "already_attempted") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <PlayControls />
      <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-xl p-8 max-w-md text-center shadow">
        <Trophy size={48} className="mx-auto mb-4 text-yellow-500" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t("play.alreadyCompleted")}</h2>
        <p className="text-gray-600 mb-4">{t("play.alreadyCompletedText")}</p>
        {sessionData?.leaderboard_enabled && (
          <Link href={`/play/${slug}/leaderboard`} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-semibold">
            <Trophy size={14} /> {t("play.viewLeaderboard")}
          </Link>
        )}
      </div>
    </div>
  );

  // ── Name / Avatar screen ──

  if (phase === "name") return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <PlayControls />
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-md">
        <h1 className="text-2xl font-black text-gray-800 mb-1">{sessionData!.title}</h1>
        {sessionData!.description && <p className="text-gray-500 text-sm mb-3">{sessionData!.description}</p>}
        <p className="text-sm text-gray-400 mb-5">
          {sessionData!.question_count} {t("play.questions")}
          {!sessionData!.allow_repeat && <span className="ml-2 text-orange-500 font-semibold">{t("play.oneAttemptOnly")}</span>}
        </p>

        {/* Avatar picker */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">{t("play.chooseAvatar")}</p>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((a) => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                className={`text-2xl p-1.5 rounded-xl border-2 transition-all ${avatar === a ? "border-violet-500 bg-violet-50 scale-110" : "border-transparent hover:border-violet-200 hover:bg-violet-50"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={startAttempt} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t("play.yourName")}</label>
            <input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-violet-400 outline-none"
              placeholder={t("play.namePlaceholder")} />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-sm">
            {avatar} {t("play.startQuiz")}
          </button>
        </form>
      </div>
    </div>
  );

  // ── Result screen ──

  if (phase === "result" && result) {
    const isMemoryMode = sessionData?.play_mode === "memory_pairs" || sessionData?.play_mode === "speed_match";
    const passed = isMemoryMode ? true : result.percentage >= 70;
    const bonusEndCorrection = sessionData?.bonuses_enabled && sessionData?.bonus_end_correction;
    const wrongAnswers = allAnswerResults.filter((ar) => !ar.is_correct);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8 px-4">
        <PlayControls />
        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-8 max-w-lg w-full shadow-md text-center">
          <div className="text-5xl mb-3">{avatar}</div>
          <CheckCircle size={48} className={`mx-auto mb-3 ${passed ? "text-green-500" : "text-orange-400"}`} />
          <h2 className="text-2xl font-black mb-1">{t("play.quizComplete")}</h2>
          {!isMemoryMode && (
            <>
              <p className="text-4xl font-bold text-gray-800 mb-1">{result.percentage}%</p>
              <p className="text-gray-500 mb-2">{result.score} / {result.max_score} {t("play.points")}</p>
            </>
          )}
          {!isMemoryMode && result.minigame_score > 0 && (
            <p className="text-xs text-indigo-600 font-semibold mb-1">
              {t("play.bonusPts", { pts: Math.round(result.minigame_score / 10), score: result.minigame_score })}
            </p>
          )}
          {isMemoryMode && result.time_spent_sec != null && (
            <p className="text-sm text-indigo-700 font-semibold mb-1">⏱ Čas: {result.time_spent_sec}s</p>
          )}
          {!isMemoryMode && (
            <p className={`font-semibold mb-4 ${passed ? "text-green-600" : "text-orange-600"}`}>
              {passed ? t("play.wellDone") : t("play.keepPracticing")}
            </p>
          )}

          {bonusEndCorrection && !endCorrectionUsed && wrongAnswers.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <p className="font-bold mb-1">✏️ {t("play.bonusEndCorrectionAvailable")}</p>
              <p className="text-xs text-amber-600">{t("play.bonusEndCorrectionHint")}</p>
            </div>
          )}
          {endCorrectionUsed && (
            <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 font-semibold">
              ✅ {t("play.bonusEndCorrectionApplied")}
            </div>
          )}

          {sessionData?.show_correct_answer && allAnswerResults.length > 0 && (
            <div className="mt-4 text-left space-y-2 border-t pt-4">
              <p className="text-sm font-bold text-gray-600 mb-2">{t("play.answerReview")}</p>
              {allAnswerResults.map((ar, i) => {
                const qs = sessionData.questions.find(qq => qq.id === ar.question_id);
                const userAns = answers[ar.question_id];
                const userAnsText = answerToText(qs, userAns, t("play.noAnswer"));
                const canCorrect = bonusEndCorrection && !endCorrectionUsed && !ar.is_correct;
                return (
                  <div key={ar.question_id} className={`p-3 rounded-xl text-sm ${ar.is_correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex items-start gap-2 mb-1">
                      {ar.is_correct ? <Check size={14} className="text-green-600 shrink-0 mt-0.5" /> : <X size={14} className="text-red-500 shrink-0 mt-0.5" />}
                      <p className="font-semibold text-gray-700 flex-1">Q{i + 1}: {qs?.body}</p>
                      {canCorrect && (
                        <button onClick={() => applyEndCorrection(ar.question_id)} disabled={endCorrectionApplying}
                          className="ml-2 shrink-0 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-0.5 rounded-md transition-colors disabled:opacity-50">
                          {endCorrectionApplying ? "…" : "✏️ Fix"}
                        </button>
                      )}
                    </div>
                    {!ar.is_correct && (
                      <div className="pl-5 text-xs text-gray-500 space-y-0.5">
                        <p>{t("play.yourAnswer")} <span className="font-mono">{userAnsText}</span></p>
                        <p className="text-green-700 font-semibold">{t("play.correct")} {ar.correct_texts.join(", ") || ar.correct_option_ids.join(", ")}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {result.leaderboard_enabled && (
            <Link href={`/play/${slug}/leaderboard`} className="mt-5 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-semibold">
              <Trophy size={14} /> {t("play.viewLeaderboard")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Minigame phase ──

  if (phase === "memory_mode") return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center py-6 px-4">
      <PlayControls />
      <div className="w-full max-w-xl text-center mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{t("play.practiceMode")}</p>
        <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-100">
          {sessionData?.play_mode === "speed_match" ? "⚡ Spojovačka" : `🧠 ${t("play.memoryChallengeTitle")}`}
        </h2>
        <p className="text-sm text-indigo-700 dark:text-indigo-200">
          {sessionData?.play_mode === "speed_match"
            ? "Spoj správné dvojice co nejrychleji. Výsledek se uloží do žebříčku."
            : t("play.memoryChallengeSubtitle")}
        </p>
      </div>
      <Minigame
        type={sessionData?.play_mode === "speed_match" ? "speed_match" : "memory_pairs"}
        config={sessionData?.minigame_config ?? null}
        allowSkip={false}
        onComplete={(score, meta) => submitMemoryMode(score, meta?.elapsedSec ?? 0)}
      />
    </div>
  );

  if (phase === "minigame") return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center py-8 px-4">
      <PlayControls />
      <Minigame
        type={pickEnabledMinigame(sessionData)}
        config={sessionData?.minigame_config ?? null}
        durationSec={5}
        onComplete={(score, meta) => {
          setMinigameScores((prev) => [...prev, score]);
          if (meta?.riskBet && sessionData?.questions[currentIdx]?.id) {
            setRiskBets((prev) => ({ ...prev, [sessionData.questions[currentIdx].id]: meta.riskBet }));
          }
          setPhase("quiz");
          setQuestionStart(Date.now());
        }}
      />
    </div>
  );

  // ── Quiz phase ──

  const questions = sessionData!.questions;
  const q = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const currentAnswer = answers[q.id];
  const answeredCount = Object.keys(timers).length;

  const bonusesEnabled = sessionData?.bonuses_enabled ?? false;
  const unlockMode = sessionData?.bonus_unlock_mode ?? "immediate";
  const unlockX = sessionData?.bonus_unlock_x ?? 3;

  const bonusUnlocked =
    !bonusesEnabled ? false :
    unlockMode === "immediate" ? true :
    unlockMode === "after_x" ? answeredCount >= unlockX :
    bonusVisibleRandom;

  const canEliminate = bonusUnlocked && (sessionData?.bonus_eliminate ?? false) && !eliminateUsed && !eliminateLoading
    && (q.type === "single_choice" || q.type === "true_false") && q.options.length > 2;

  const canSecondChance = bonusUnlocked && (sessionData?.bonus_second_chance ?? false) && !secondChanceUsed
    && currentAnswer != null && currentAnswer !== "" && !(Array.isArray(currentAnswer) && currentAnswer.length === 0);

  const visibleOptions = q.options.filter((opt) => !eliminatedOptions.has(opt.id));

  // Unlock hint text
  const unlockHint = (() => {
    if (!bonusesEnabled || bonusUnlocked) return null;
    if (unlockMode === "after_x") return t("play.bonusLocked").replace("{x}", String(unlockX));
    if (unlockMode === "random") return t("play.bonusLockedRandom");
    return null;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center py-8 px-4">
      <PlayControls />
      <div className="w-full max-w-xl">
        {/* Header row with avatar */}
        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="text-xl">{avatar}</span>
            <span className="font-semibold">{participantName}</span>
          </span>
          <span>{t("play.questionOf", { n: currentIdx + 1, total: questions.length })} · {q.points} pt{q.points !== 1 ? "s" : ""}</span>
        </div>
        <div className="w-full bg-violet-100 rounded-full h-1.5 mb-4">
          <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>

        {/* Bonus power-up bar */}
        {bonusesEnabled && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {unlockHint && (
              <span className="text-xs text-gray-400 italic mr-auto">{unlockHint}</span>
            )}
            {(sessionData?.bonus_eliminate ?? false) && (
              <button onClick={() => handleEliminate(q.id)} disabled={!canEliminate}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors
                  ${canEliminate ? "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"}`}>
                {eliminateLoading ? "…" : "🎯"} {t("play.bonusEliminate")}
              </button>
            )}
            {(sessionData?.bonus_second_chance ?? false) && (
              <button onClick={handleSecondChance} disabled={!canSecondChance}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors
                  ${canSecondChance ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"}`}>
                🔄 {t("play.bonusSecondChance")}
              </button>
            )}
            {(sessionData?.bonus_end_correction ?? false) && (
              <span className={`ml-auto text-xs font-semibold px-2 py-1 rounded-md
                ${endCorrectionUsed ? "text-gray-400" : "text-amber-600 bg-amber-50 border border-amber-200"}`}>
                ✏️ {endCorrectionUsed ? t("play.bonusUsed") : t("play.bonusEndCorrectionReady")}
              </span>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <p className="text-lg font-semibold text-gray-800 mb-4">{q.body}</p>
          {q.image_url && (
            <img src={q.image_url} alt="" className="max-h-56 mx-auto rounded-xl border border-gray-200 object-contain mb-4" />
          )}

          {(q.type === "single_choice" || q.type === "true_false") && (
            <div className="space-y-2">
              {visibleOptions.map((opt) => (
                <button key={opt.id} onClick={() => recordAnswer(q.id, opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${currentAnswer === opt.id ? "border-violet-500 bg-violet-50 text-violet-800 font-semibold" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"}`}>
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {q.type === "multiple_choice" && (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const selected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.id);
                return (
                  <button key={opt.id}
                    onClick={() => {
                      const prev = Array.isArray(currentAnswer) ? currentAnswer : [];
                      recordAnswer(q.id, selected ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selected ? "border-violet-500 bg-violet-50 text-violet-800 font-semibold" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"}`}>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "short_answer" && (
            <input type="text"
              value={typeof currentAnswer === "string" ? currentAnswer : ""}
              onChange={(e) => recordAnswer(q.id, e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-violet-400 outline-none"
              placeholder={t("play.typePlaceholder")}
              onPaste={() => telemetryBuffer.current.push({ event_type: "copy_paste", payload: { question_id: q.id }, client_ts: new Date().toISOString() })}
            />
          )}

          <button onClick={isLast ? submitQuiz : nextQuestion}
            className="mt-5 w-full bg-gradient-to-r from-violet-600 to-indigo-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-sm">
            {isLast ? t("play.submitQuiz") : t("play.nextQuestion")}
          </button>
        </div>
      </div>
    </div>
  );
}
