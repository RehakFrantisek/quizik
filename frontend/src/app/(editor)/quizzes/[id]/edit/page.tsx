"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { QuestionForm } from "@/components/editor/QuestionForm";
import { ArrowLeft, Plus, Check, ChevronUp, ChevronDown, Upload, X } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/contexts/LangContext";
import { getToken } from "@/lib/auth";

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  type: "single_choice" | "multiple_choice" | "true_false" | "short_answer";
  body: string;
  explanation?: string;
  points: number;
  options: Option[];
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string | null;
  status: string;
  questions: Question[];
}

interface MemoryPairPreview {
  questionId: string;
  questionText: string;
  answerText: string;
  questionDisplay: string;
  answerDisplay: string;
  questionTrimmed: boolean;
  answerTrimmed: boolean;
}

type GamePreviewType = "memory_pairs" | "beat_tap" | "color_switch" | "risk_button";

const MEMORY_TEXT_LIMIT = 64;

function trimForCard(text: string, limit = MEMORY_TEXT_LIMIT): { display: string; trimmed: boolean } {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= limit) return { display: normalized, trimmed: false };
  return { display: normalized.slice(0, limit - 1) + "…", trimmed: true };
}

function getMemoryPairsPreview(questions: Question[]): MemoryPairPreview[] {
  return questions
    .filter((q) => q.type === "single_choice")
    .map((q) => {
      const correct = q.options.find((o) => o.is_correct && o.text.trim().length > 0);
      if (!correct) return null;
      const qTrim = trimForCard(q.body);
      const aTrim = trimForCard(correct.text);
      return {
        questionId: q.id,
        questionText: q.body,
        answerText: correct.text,
        questionDisplay: qTrim.display,
        answerDisplay: aTrim.display,
        questionTrimmed: qTrim.trimmed,
        answerTrimmed: aTrim.trimmed,
      };
    })
    .filter((pair): pair is MemoryPairPreview => pair !== null);
}

export default function QuizEditor() {
  const { id } = useParams();
  const { t, lang } = useLang();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ newStatus: string; confirmKey: string } | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [showMemoryPreview, setShowMemoryPreview] = useState(false);
  const [selectedGamePreview, setSelectedGamePreview] = useState<GamePreviewType>("memory_pairs");
  const [coverUploading, setCoverUploading] = useState(false);
  const addQuestionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!isAddingQuestion) return;
    const timer = setTimeout(() => {
      addQuestionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(timer);
  }, [isAddingQuestion]);

  const loadQuiz = async () => {
    try {
      const data = await apiClient.get(`/quizzes/${id}`);
      setQuiz({
        ...data,
        questions: data.questions || []
      });
    } catch (err) {
      console.error(err);
      alert("Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const saveQuizMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    setSaving(true);
    try {
      await apiClient.patch(`/quizzes/${id}`, {
        title: quiz.title,
        description: quiz.description,
        cover_image_url: quiz.cover_image_url ?? null,
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save quiz metadata");
    } finally {
      setSaving(false);
    }
  };

  const uploadCoverImage = async (file: File) => {
    setCoverUploading(true);
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
      if (quiz) setQuiz({ ...quiz, cover_image_url: json.url });
    } catch (err) {
      console.error("Cover upload failed", err);
    } finally {
      setCoverUploading(false);
    }
  };

  const changeStatus = async (newStatus: string, confirmKey: string) => {
    setStatusConfirm({ newStatus, confirmKey });
  };

  const executeStatusChange = async () => {
    if (!statusConfirm) return;
    const newStatus = statusConfirm.newStatus;
    setStatusConfirm(null);
    setStatusChanging(true);
    try {
      await apiClient.patch(`/quizzes/${id}`, { status: newStatus });
      loadQuiz();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change status");
    } finally {
      setStatusChanging(false);
    }
  };

  const publishQuiz = async () => {
    try {
      await apiClient.post(`/quizzes/${id}/publish`, {});
      loadQuiz();
      setInfoMsg(t("editor.publishedSuccess"));
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : String(err);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error?.toLowerCase().includes("no questions")) {
          msg = t("editor.publishErrorNoQuestions");
        } else {
          msg = parsed.error ?? msg;
        }
      } catch { /* not JSON, use as-is */ }
      setInfoMsg(msg);
    }
  };

  const handleSaveQuestion = async (data: unknown) => {
    try {
      if (editingQuestionId) {
        await apiClient.patch(`/quizzes/${id}/questions/${editingQuestionId}`, data as Record<string, unknown>);
      } else {
        await apiClient.post(`/quizzes/${id}/questions`, data as Record<string, unknown>);
      }
      setIsAddingQuestion(false);
      setEditingQuestionId(null);
      loadQuiz();
    } catch (err) {
      console.error(err);
      alert("Failed to save question");
    }
  };

  const deleteQuestion = async (qId: string) => {
    setDeleteConfirmId(qId);
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteConfirmId) return;
    try {
      await apiClient.delete(`/quizzes/${id}/questions/${deleteConfirmId}`);
      setDeleteConfirmId(null);
      loadQuiz();
    } catch (err) {
      console.error(err);
      setDeleteConfirmId(null);
      setInfoMsg("Failed to delete question");
    }
  };

  const moveQuestion = async (idx: number, direction: "up" | "down") => {
    if (!quiz) return;
    const qs = [...quiz.questions];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= qs.length) return;
    [qs[idx], qs[swapIdx]] = [qs[swapIdx], qs[idx]];
    setQuiz({ ...quiz, questions: qs });
    try {
      await apiClient.patch(`/quizzes/${id}/questions/reorder`, {
        ordered_ids: qs.map((q) => q.id),
      });
    } catch (err) {
      console.error("Failed to reorder", err);
      loadQuiz(); // revert on error
    }
  };

  const memoryPairsPreview = useMemo(() => getMemoryPairsPreview(quiz?.questions ?? []), [quiz?.questions]);
  const skippedForMemory = (quiz?.questions ?? []).filter((q) => q.type !== "single_choice").length;
  const hasTrimmed = memoryPairsPreview.some((pair) => pair.questionTrimmed || pair.answerTrimmed);

  if (loading) return <div className="p-8">{t("editor.loadingEditor")}</div>;
  if (!quiz) return <div className="p-8 text-red-500">{t("editor.quizNotFound")}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 page-bg">
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Status change confirm modal */}
      {statusConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">{t(`editor.${statusConfirm.newStatus === "draft" ? "revertToDraft" : statusConfirm.newStatus === "archived" ? "archiveQuiz" : "unarchiveQuiz"}`)}</h2>
            <p className="text-sm text-gray-500 mb-5">{t(statusConfirm.confirmKey)}</p>
            <div className="flex gap-3">
              <button onClick={executeStatusChange} className="flex-1 bg-violet-600 text-white py-2 rounded-xl font-semibold hover:bg-violet-700 transition-colors">{t("common.ok")}</button>
              <button onClick={() => setStatusConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-50 transition-colors">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
      {/* Info modal */}
      {infoMsg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center">
            <p className="text-gray-800 font-medium mb-4">{infoMsg}</p>
            <button onClick={() => setInfoMsg(null)} className="bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-6 py-2 rounded-xl font-semibold hover:opacity-90">{t("common.ok")}</button>
          </div>
        </div>
      )}
      {/* Delete question confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">{t("editor.deleteQuestion")}</h2>
            <p className="text-sm text-gray-500 mb-5">{t("editor.deleteQuestionConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteQuestion} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-semibold hover:bg-red-600 transition-colors">{t("common.delete")}</button>
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl hover:bg-gray-50 transition-colors">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <Link href="/quizzes" className="inline-flex items-center gap-2 text-gray-600 hover:text-violet-700 font-medium transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 hover:border-violet-200">
          <ArrowLeft size={18} /> Qvízovna
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${
            quiz.status === 'published' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
            quiz.status === 'archived' ? 'bg-gray-100 text-gray-500 border-gray-300' :
            'bg-amber-100 text-amber-700 border-amber-200'
          }`}>
            {t(`status.${quiz.status}`) || quiz.status}
          </span>
          {quiz.status === 'draft' && (
            <button onClick={publishQuiz} disabled={statusChanging} className="bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-5 py-2 rounded-xl hover:opacity-90 font-semibold shadow-md transition-opacity disabled:opacity-50">
              {t("editor.publishQuiz")}
            </button>
          )}
          {quiz.status === 'published' && (
            <>
              <button
                onClick={() => changeStatus("draft", "editor.confirmRevertDraft")}
                disabled={statusChanging}
                className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl hover:bg-amber-100 font-semibold disabled:opacity-50"
              >
                {t("editor.revertToDraft")}
              </button>
              <button
                onClick={() => changeStatus("archived", "editor.confirmArchive")}
                disabled={statusChanging}
                className="text-sm text-gray-600 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-100 font-semibold disabled:opacity-50"
              >
                {t("editor.archiveQuiz")}
              </button>
            </>
          )}
          {quiz.status === 'archived' && (
            <button
              onClick={() => changeStatus("draft", "editor.confirmRevertDraft")}
              disabled={statusChanging}
              className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl hover:bg-amber-100 font-semibold disabled:opacity-50"
            >
              {t("editor.unarchiveQuiz")}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Quiz Meta Form */}
        <form onSubmit={saveQuizMeta} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-violet-100">
          <h2 className="text-2xl font-black text-gray-800 mb-6 border-b border-violet-100 pb-4">{t("editor.quizDetails")}</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t("editor.quizTitle")}</label>
              <input
                type="text"
                value={quiz.title}
                onChange={e => setQuiz({...quiz, title: e.target.value})}
                className="w-full border border-gray-200 p-3 rounded-xl text-lg focus:ring-2 focus:ring-violet-400 outline-none transition-shadow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t("editor.description")}</label>
              <textarea
                value={quiz.description || ''}
                onChange={e => setQuiz({...quiz, description: e.target.value})}
                className="w-full border border-gray-200 p-3 rounded-xl h-28 resize-none focus:ring-2 focus:ring-violet-400 outline-none transition-shadow"
                placeholder={t("editor.descriptionPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t("editor.coverImage")}</label>
              <p className="text-xs text-gray-400 mb-2">{t("editor.coverImageHint")}</p>
              {quiz.cover_image_url ? (
                <div className="relative inline-block">
                  <img src={quiz.cover_image_url} alt="cover" className="h-28 rounded-xl object-cover border border-violet-200 shadow-sm" />
                  <button
                    type="button"
                    onClick={() => setQuiz({ ...quiz, cover_image_url: null })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    type="url"
                    value={quiz.cover_image_url ?? ""}
                    onChange={e => setQuiz({ ...quiz, cover_image_url: e.target.value || null })}
                    placeholder={t("editor.coverImageUrl")}
                    className="flex-1 border border-gray-200 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                  />
                  <label className="flex items-center gap-1.5 px-3 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap">
                    <Upload size={14} />
                    {coverUploading ? "…" : t("editor.uploadCover")}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={coverUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCoverImage(file);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
            <button type="submit" disabled={saving} className="bg-gray-800 text-white px-6 py-2.5 rounded-xl hover:bg-gray-900 disabled:opacity-50 font-semibold transition-colors w-full md:w-auto">
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>

        {/* Questions Section */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-violet-100">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b border-violet-100 pb-4 gap-4">
            <h2 className="text-2xl font-black text-gray-800">{t("editor.questions")} <span className="text-gray-400 font-medium text-lg ml-2">({quiz.questions.length})</span></h2>
          </div>

          {/* Game mode preview from existing questions */}
          <div className="mb-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-indigo-900">
                  {lang === "cs" ? "Zobrazit návrh v herním režimu" : "Show game mode proposal"}
                </h3>
                <p className="text-xs text-indigo-700 mt-1">{lang === "cs" ? "Vyber hru a podívej se, jak by obsah vypadal ve výukovém game režimu." : "Pick a game and preview how your content would look in game mode."}</p>
              </div>
              <button
                onClick={() => setShowMemoryPreview((v) => !v)}
                className="text-sm font-semibold px-4 py-2 rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100 transition-colors w-full md:w-auto"
              >
                {showMemoryPreview
                  ? (lang === "cs" ? "Skrýt náhled" : "Hide preview")
                  : (lang === "cs" ? "Zobrazit náhled" : "Show preview")}
              </button>
            </div>

            {showMemoryPreview && (
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  {[
                    { id: "memory_pairs", label: "🧠 Pexeso", status: "implemented" },
                    { id: "beat_tap", label: "🎵 Beat Tap", status: "planned" },
                    { id: "color_switch", label: "🎨 Color Switch", status: "planned" },
                    { id: "risk_button", label: "🎲 Risk Button", status: "planned" },
                  ].map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGamePreview(game.id as GamePreviewType)}
                      className={`text-left border rounded-xl px-3 py-2 transition-colors ${selectedGamePreview === game.id ? "border-indigo-400 bg-white" : "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"}`}
                    >
                      <p className="text-sm font-semibold text-indigo-900">{game.label}</p>
                      <p className={`text-[11px] font-semibold ${game.status === "implemented" ? "text-green-600" : "text-amber-600"}`}>
                        {game.status === "implemented" ? (lang === "cs" ? "Implementováno" : "Implemented") : (lang === "cs" ? "Návrh (připraveno)" : "Planned (ready)")}
                      </p>
                    </button>
                  ))}
                </div>

                {selectedGamePreview === "memory_pairs" ? (
                  memoryPairsPreview.length === 0 ? (
                    <div className="text-sm text-indigo-800 bg-white border border-indigo-200 rounded-xl p-3">
                      {lang === "cs"
                        ? "Pro pexeso zatím nemáš použitelné single-choice otázky se správnou odpovědí."
                        : "No usable single-choice questions with correct answers for memory yet."}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-indigo-700 mb-2">
                        {lang === "cs"
                          ? `Použitelné páry: ${memoryPairsPreview.length}. Přeskočeno (není single choice): ${skippedForMemory}.`
                          : `Usable pairs: ${memoryPairsPreview.length}. Skipped (not single choice): ${skippedForMemory}.`}
                      </p>
                      {hasTrimmed && (
                        <p className="text-xs text-amber-700 mb-2">
                          {lang === "cs"
                            ? "Některé karty jsou zkrácené. Najetím myší uvidíš plný text (title)."
                            : "Some cards are trimmed. Hover to see full text (title)."}
                        </p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {memoryPairsPreview.map((pair, idx) => (
                          <div key={pair.questionId} className="grid grid-cols-2 gap-2 bg-white border border-indigo-100 rounded-xl p-3">
                            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3" title={pair.questionText}>
                              <p className="text-[10px] uppercase tracking-wide font-bold text-violet-700 mb-1">Q{idx + 1}</p>
                              <p className="text-xs text-violet-900 leading-snug">{pair.questionDisplay}</p>
                              {pair.questionTrimmed && <p className="text-[10px] text-amber-700 mt-1">Truncated</p>}
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3" title={pair.answerText}>
                              <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-700 mb-1">A{idx + 1}</p>
                              <p className="text-xs text-emerald-900 leading-snug">{pair.answerDisplay}</p>
                              {pair.answerTrimmed && <p className="text-[10px] text-amber-700 mt-1">Truncated</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                ) : (
                  <div className="bg-white border border-indigo-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-indigo-900 mb-1">
                      {selectedGamePreview === "beat_tap" ? "🎵 Beat Tap" : selectedGamePreview === "color_switch" ? "🎨 Color Switch" : "🎲 Risk Button"}
                    </p>
                    <p className="text-xs text-indigo-700">
                      {lang === "cs"
                        ? "Tato hra je zatím v návrhu. UI a datový model jsou připravené pro budoucí implementaci."
                        : "This game is currently planned. UI and data model hooks are prepared for future implementation."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {quiz.questions.map((q: Question, i: number) => (
              <div key={q.id}>
                {editingQuestionId === q.id ? (
                  <QuestionForm
                    initialData={q}
                    onSave={handleSaveQuestion}
                    onCancel={() => setEditingQuestionId(null)}
                  />
                ) : (
                  <div className="border border-gray-100 p-5 rounded-2xl flex gap-5 bg-white hover:border-violet-200 hover:shadow-md transition-all relative group">
                    {/* Reorder controls */}
                    <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                      <button
                        onClick={() => moveQuestion(i, "up")}
                        disabled={i === 0}
                        className="text-gray-300 hover:text-violet-500 disabled:opacity-20 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <span className="text-violet-300 font-black text-xl text-center leading-none">{i + 1}</span>
                      <button
                        onClick={() => moveQuestion(i, "down")}
                        disabled={i === quiz.questions.length - 1}
                        className="text-gray-300 hover:text-violet-500 disabled:opacity-20 transition-colors"
                        title="Move down"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                          {q.type.replace('_', ' ')}
                        </span>
                        <span className="text-sm border bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg font-semibold">{q.points} pt</span>
                      </div>
                      <p className="font-semibold text-gray-800 text-lg whitespace-pre-wrap mb-4">{q.body}</p>

                      {q.type !== 'short_answer' && (
                        <div className="space-y-2 pl-4 border-l-4 border-violet-100">
                          {q.options.map((opt: Option, idx: number) => (
                            <div key={idx} className={`text-sm flex items-center gap-3 p-2 rounded-xl ${opt.is_correct ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'text-gray-600'}`}>
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${opt.is_correct ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-600'}`}>{opt.id.toUpperCase()}</span>
                              <span className="flex-1">{opt.text}</span>
                              {opt.is_correct && <Check size={16} className="text-emerald-600 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Floating Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingQuestionId(q.id)} className="text-violet-600 hover:text-white hover:bg-violet-600 bg-violet-50 border border-violet-200 text-sm font-medium px-3 py-1.5 rounded-xl shadow-sm transition-all">
                        {t("common.edit")}
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 border border-red-200 text-sm font-medium px-3 py-1.5 rounded-xl shadow-sm transition-all">
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isAddingQuestion && (
              <div ref={addQuestionRef}>
                <QuestionForm
                  onSave={handleSaveQuestion}
                  onCancel={() => setIsAddingQuestion(false)}
                />
              </div>
            )}

            {!isAddingQuestion && !editingQuestionId && quiz.questions.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setIsAddingQuestion(true)}
                  className="w-full flex justify-center items-center gap-2 text-sm bg-violet-50 text-violet-700 border border-violet-200 px-4 py-2 rounded-xl hover:bg-violet-100 font-bold transition-colors"
                >
                  <Plus size={18} /> {t("editor.addQuestion")}
                </button>
              </div>
            )}

            {!isAddingQuestion && quiz.questions.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-gray-500 py-16 px-4 border-2 border-dashed border-violet-200 rounded-2xl bg-violet-50/50">
                <div className="bg-violet-100 p-4 rounded-2xl mb-4">
                   <Plus size={32} className="text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">{t("editor.noQuestions")}</h3>
                <p className="max-w-sm mb-6 text-sm">{t("editor.noQuestionsDesc")}</p>
                <button
                  onClick={() => setIsAddingQuestion(true)}
                  className="bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-6 py-2.5 rounded-xl hover:opacity-90 font-semibold shadow-md transition-opacity"
                >
                  {t("editor.createFirst")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
