"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { ArrowLeft, Check, Clock, X, AlertTriangle, Shield, Trash2 } from "lucide-react";

interface AnswerOut {
  id: string;
  question_id: string;
  response: string | string[] | null;
  is_correct: boolean;
  points_awarded: number;
  points_override: number | null;
  override_reason: string | null;
  override_at: string | null;
  time_spent_sec: number | null;
}

interface TelemetryEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  client_ts: string | null;
  created_at: string;
}

interface AttemptDetail {
  id: string;
  participant_name: string;
  status: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  started_at: string;
  completed_at: string | null;
  hidden_from_leaderboard: boolean;
  answers: AnswerOut[];
  telemetry_events: TelemetryEvent[];
  partial_answers: Record<string, unknown> | null;
}

interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  body: string;
  type: string;
  points: number;
  position: number;
  options: QuestionOption[];
}

function getFastAnswerTimeSec(payload: Record<string, unknown> | null): number | null {
  if (!payload) return null;
  const raw = payload["time_sec"];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export default function AttemptReviewPage() {
  const { id: sessionId, attemptId } = useParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { t, lang } = useLang();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [fetching, setFetching] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [deletingAttempt, setDeletingAttempt] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [overrides, setOverrides] = useState<Record<string, { points: string; reason: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user && sessionId && attemptId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId, attemptId]);

  const load = async () => {
    try {
      const [attemptData, sessionData] = await Promise.all([
        apiClient.get(`/sessions/${sessionId}/attempts/${attemptId}`),
        apiClient.get(`/sessions/${sessionId}`),
      ]);
      setAttempt(attemptData);
      try {
        const quizData = await apiClient.get(`/quizzes/${sessionData.quiz_id}`);
        const qMap: Record<string, Question> = {};
        for (const q of quizData.questions ?? []) qMap[q.id] = q;
        setQuestions(qMap);
      } catch { /* questions are optional enrichment */ }
    } catch (err) {
      console.error(err);
      alert("Failed to load attempt");
    } finally {
      setFetching(false);
    }
  };

  const saveOverride = async (answerId: string) => {
    const form = overrides[answerId];
    if (!form) return;
    const points = parseInt(form.points, 10);
    if (isNaN(points) || points < 0) { alert("Points must be a non-negative number"); return; }
    setSavingId(answerId);
    try {
      await apiClient.patch(
        `/sessions/${sessionId}/attempts/${attemptId}/answers/${answerId}/score`,
        { points_override: points, reason: form.reason || null }
      );
      await load();
      setOverrides((prev) => { const next = { ...prev }; delete next[answerId]; return next; });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setSavingId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/sessions/${sessionId}/attempts/${attemptId}`);
      router.push(`/sessions/${sessionId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
      setDeleteLoading(false);
      setDeletingAttempt(false);
    }
  };

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;
  if (fetching) return <div className="p-8">{t("common.loading")}</div>;
  if (!attempt) return <div className="p-8 text-red-500">Attempt not found</div>;

  // Risk summary from telemetry
  const riskEvents = attempt.telemetry_events.filter(e => ["tab_hidden", "focus_lost", "copy_paste"].includes(e.event_type));
  const fastAnswers = attempt.telemetry_events.filter(e => e.event_type === "fast_answer");
  const riskLevel = riskEvents.length >= 3 ? "high" : riskEvents.length >= 1 ? "medium" : "low";

  const TELEMETRY_LABELS_EN: Record<string, string> = {
    tab_hidden: "Left the tab / screen locked",
    tab_visible: "Returned to tab / screen unlocked",
    focus_lost: "Lost window focus",
    focus_gained: "Regained window focus",
    copy_paste: "Paste detected",
    fast_answer: "Very fast answer (<2s)",
  };
  const TELEMETRY_LABELS_CS: Record<string, string> = {
    tab_hidden: "Opustil záložku / zamknutá obrazovka",
    tab_visible: "Vrátil se na záložku / odemknutá obrazovka",
    focus_lost: "Ztráta fokusu okna",
    focus_gained: "Obnovení fokusu okna",
    copy_paste: "Detekováno vložení (paste)",
    fast_answer: "Velmi rychlá odpověď (<2s)",
  };
  const TELEMETRY_LABELS = lang === "cs" ? TELEMETRY_LABELS_CS : TELEMETRY_LABELS_EN;
  const telemetryLabel = (type: string) => TELEMETRY_LABELS[type] ?? type.replace(/_/g, " ");

  const TELEMETRY_COLOR: Record<string, string> = {
    tab_hidden: "bg-red-100 text-red-700",
    focus_lost: "bg-red-100 text-red-700",
    copy_paste: "bg-red-100 text-red-700",
    fast_answer: "bg-yellow-100 text-yellow-700",
    tab_visible: "bg-gray-100 text-gray-600",
    focus_gained: "bg-gray-100 text-gray-600",
  };
  const telemetryColor = (type: string) => TELEMETRY_COLOR[type] ?? "bg-gray-100 text-gray-600";

  const riskLabel = riskLevel === "high" ? t("attempt.riskHigh") : riskLevel === "medium" ? t("attempt.riskMedium") : t("attempt.riskLow");

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Delete confirmation modal */}
      {deletingAttempt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl mx-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={22} className="text-red-500 shrink-0" />
              <h3 className="font-bold text-gray-800">{t("attempt.deleteAttempt")}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">{t("attempt.deleteAttemptConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} disabled={deleteLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 text-sm">
                {deleteLoading ? t("common.deleting") : t("common.yesDelete")}
              </button>
              <button onClick={() => setDeletingAttempt(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/sessions/${sessionId}`} className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
            <ArrowLeft size={16} /> {t("attempt.backToSession")}
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("attempt.review")} — {attempt.participant_name}</h1>
            <p className="text-sm text-gray-500">
              {attempt.status === "in_progress"
                ? (lang === "cs" ? "Probíhá (nedokončeno)" : "In progress (incomplete)")
                : `${t("session.score")}: ${attempt.score} / ${attempt.max_score} (${attempt.percentage}%)`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDeletingAttempt(true)}
          className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 shrink-0"
        >
          <Trash2 size={14} /> {t("attempt.deleteAttempt")}
        </button>
      </div>

      {/* In-progress banner with partial answers */}
      {attempt.status === "in_progress" && (
        <div className="mb-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
          <p className="text-sm font-semibold text-yellow-800 mb-1">
            {lang === "cs" ? "⚠ Nedokončený pokus" : "⚠ Incomplete attempt"}
          </p>
          {attempt.partial_answers && Object.keys(attempt.partial_answers).length > 0 ? (
            <div>
              <p className="text-xs text-yellow-700 mb-2">
                {lang === "cs"
                  ? `Uloženo ${Object.keys(attempt.partial_answers).length} odpovědí před přerušením.`
                  : `${Object.keys(attempt.partial_answers).length} answer(s) saved before interruption.`}
              </p>
              <div className="space-y-1">
                {Object.entries(attempt.partial_answers).map(([qid, resp]) => {
                  const q = questions[qid];
                  return (
                    <div key={qid} className="text-xs text-yellow-800 flex gap-2">
                      <span className="font-medium">{q ? q.body.slice(0, 50) + (q.body.length > 50 ? "…" : "") : qid.slice(0, 8) + "…"}:</span>
                      <span className="text-yellow-600">{Array.isArray(resp) ? (resp as string[]).join(", ") : String(resp)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-yellow-700">
              {lang === "cs" ? "Žádné odpovědi nebyly uloženy (student odešel před první odpovědí)." : "No answers were saved (student left before answering)."}
            </p>
          )}
        </div>
      )}

      {/* Anti-cheat risk summary */}
      {attempt.telemetry_events.length > 0 && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${riskLevel === "high" ? "bg-red-50 border-red-200" : riskLevel === "medium" ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
          <Shield size={18} className={`shrink-0 mt-0.5 ${riskLevel === "high" ? "text-red-500" : riskLevel === "medium" ? "text-yellow-600" : "text-green-600"}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">
                {t("attempt.anticheat")}: {riskLabel}
              </p>
              <button onClick={() => setShowTelemetry(!showTelemetry)} className="text-xs text-blue-600 hover:underline">
                {showTelemetry
                  ? t("attempt.hideEvents")
                  : t("attempt.showEvents").replace("{n}", String(attempt.telemetry_events.length))}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {riskEvents.length > 0 && t("attempt.suspicious").replace("{n}", String(riskEvents.length))}
              {fastAnswers.length > 0 && ` · ${t("attempt.fastAnswers").replace("{n}", String(fastAnswers.length))}`}
              {riskEvents.length === 0 && fastAnswers.length === 0 && t("attempt.noSuspicious")}
            </p>
            {showTelemetry && (
              <ul className="mt-3 space-y-1 text-xs text-gray-600 max-h-52 overflow-y-auto">
                {attempt.telemetry_events.map((ev) => {
                  const timeSec = getFastAnswerTimeSec(ev.payload);
                  return (
                    <li key={ev.id} className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full font-semibold shrink-0 ${telemetryColor(ev.event_type)}`}>
                        {telemetryLabel(ev.event_type)}
                      </span>
                      {ev.client_ts && (
                        <span className="text-gray-400 tabular-nums">{new Date(ev.client_ts).toLocaleTimeString()}</span>
                      )}
                      {ev.event_type === "fast_answer" && timeSec != null && (
                        <span className="text-yellow-600">({timeSec}s)</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {attempt.answers.map((ans, i) => {
          const formState = overrides[ans.id] ?? {
            points: String(ans.points_override ?? ans.points_awarded),
            reason: ans.override_reason ?? "",
          };
          const effectivePoints = ans.points_override ?? ans.points_awarded;
          const question = questions[ans.question_id];
          const correctOptions = question?.options.filter(o => o.is_correct) ?? [];

          return (
            <div key={ans.id} className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-gray-500">
                  Q{i + 1}{question ? ` · ${question.type.replace(/_/g, " ")} · ${question.points} pt${question.points !== 1 ? "s" : ""}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  {ans.is_correct ? (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <Check size={11} /> {t("attempt.correct")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <X size={11} /> {t("attempt.incorrect")}
                    </span>
                  )}
                  {ans.points_override !== null && (
                    <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">{t("attempt.overridden")}</span>
                  )}
                </div>
              </div>

              {question && (
                <p className="text-base font-semibold text-gray-800 mb-3">{question.body}</p>
              )}

              <div className="flex items-center gap-3 mb-3">
                {ans.time_spent_sec != null && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={11} /> {ans.time_spent_sec}s
                  </span>
                )}
              </div>

              {/* Three-column comparison for non-short-answer */}
              {question && question.type !== "short_answer" && question.options.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  {question.options.map((opt) => {
                    const studentSelected = Array.isArray(ans.response)
                      ? ans.response.includes(opt.id)
                      : ans.response === opt.id;
                    return (
                      <div key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                        opt.is_correct && studentSelected ? "bg-green-50 border-green-300 text-green-800 font-semibold" :
                        opt.is_correct ? "bg-blue-50 border-blue-200 text-blue-800" :
                        studentSelected ? "bg-red-50 border-red-200 text-red-700" :
                        "bg-gray-50 border-gray-100 text-gray-500"
                      }`}>
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                          opt.is_correct ? "bg-blue-200 text-blue-900" : "bg-gray-200 text-gray-600"
                        }`}>
                          {opt.id.toUpperCase()}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {opt.is_correct && <span className="text-xs text-blue-600 font-bold shrink-0">✓ {t("attempt.correct").toLowerCase()}</span>}
                        {studentSelected && !opt.is_correct && <span className="text-xs text-red-500 shrink-0">← student</span>}
                        {studentSelected && opt.is_correct && <span className="text-xs text-green-600 shrink-0">← student</span>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Short answer: show student response + correct answer side by side */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-semibold">{t("attempt.studentAnswer")}</p>
                    <div className={`bg-gray-50 border rounded px-3 py-2 text-sm font-mono ${ans.is_correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      {Array.isArray(ans.response) ? ans.response.join(", ") : String(ans.response ?? "(no response)")}
                    </div>
                  </div>
                  {correctOptions.length > 0 && (
                    <div>
                      <p className="text-xs text-blue-600 mb-1 font-semibold">{t("attempt.correctAnswer")}</p>
                      <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm font-mono text-blue-800">
                        {correctOptions.map(o => o.text).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Score override */}
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  {t("attempt.scoreOverride")} ({t("attempt.autoPoints").replace("{pts}", String(ans.points_awarded))}, {t("attempt.effectivePoints").replace("{pts}", String(effectivePoints))})
                  {ans.override_at && (
                    <span className="text-gray-400 font-normal ml-2">
                      — {t("attempt.scoreOverriddenAt").replace("{date}", new Date(ans.override_at).toLocaleString())}
                    </span>
                  )}
                </p>
                <div className="flex items-end gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{t("attempt.points")}</label>
                    <input
                      type="number" min={0} max={100}
                      value={formState.points}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [ans.id]: { ...formState, points: e.target.value } }))}
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">{lang === "cs" ? "Důvod" : "Reason"} <span className="text-gray-400">{t("common.optional")}</span></label>
                    <input
                      type="text"
                      value={formState.reason}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [ans.id]: { ...formState, reason: e.target.value } }))}
                      placeholder={t("attempt.reasonPlaceholder")}
                      className="border border-gray-300 rounded px-2 py-1 w-full text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => saveOverride(ans.id)}
                    disabled={savingId === ans.id}
                    className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {savingId === ans.id ? t("common.saving") : t("attempt.saveOverride")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
