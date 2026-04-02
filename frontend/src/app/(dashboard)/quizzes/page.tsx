"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowUpFromLine,
  Copy,
  Download,
  Edit,
  PlusCircle,
  Trash2,
  Share2,
  Link2,
  Upload,
  X,
  AlertTriangle,
  FileText,
  Search,
  BookOpen,
  GitMerge,
} from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { questionCountLabel } from "@/lib/i18n";

interface Quiz {
  id: string;
  title: string;
  status: string;
  share_slug?: string | null;
  clone_of_id?: string | null;
  is_imported?: boolean;
  questions?: Array<{ body?: string }>;
  settings?: {
    cover_image_url?: string | null;
  };
}

export default function QuizzesDashboard() {
  const { t, lang } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [fetching, setFetching] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showNewModal, setShowNewModal] = useState(false);
  const [showBlankForm, setShowBlankForm] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizCoverUrl, setNewQuizCoverUrl] = useState("");
  const [quizCoverMap, setQuizCoverMap] = useState<Record<string, string>>({});

  const [showImportLink, setShowImportLink] = useState(false);
  const [importSlug, setImportSlug] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [copyActionQuizId, setCopyActionQuizId] = useState<string | null>(null);
  const [exportQuizId, setExportQuizId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [mergeSourceIds, setMergeSourceIds] = useState<string[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<"append" | "interleave">("append");
  const [mergeDeduplicate, setMergeDeduplicate] = useState(true);
  const [mergeLoading, setMergeLoading] = useState(false);

  const mergePreview = (() => {
    if (!mergeTargetId) return null;
    const target = quizzes.find((q) => q.id === mergeTargetId);
    if (!target) return null;
    const sources = quizzes.filter((q) => mergeSourceIds.includes(q.id));
    const targetBodies = new Set((target.questions ?? []).map((qq) => (qq.body ?? "").trim().toLowerCase()).filter(Boolean));
    const sourceQuestions = sources.flatMap((s) => s.questions ?? []);
    const sourceBodies = sourceQuestions.map((qq) => (qq.body ?? "").trim().toLowerCase()).filter(Boolean);
    const uniqueSourceCount = mergeDeduplicate
      ? sourceBodies.filter((b, i) => !targetBodies.has(b) && sourceBodies.indexOf(b) === i).length
      : sourceQuestions.length;
    const targetCount = target.questions?.length ?? 0;
    return { targetCount, sourceCount: sourceQuestions.length, uniqueSourceCount, finalCount: targetCount + uniqueSourceCount };
  })();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user && searchParams.get("new") === "1") {
      setShowNewModal(true);
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("quizik_quiz_cover_map");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setQuizCoverMap(parsed as Record<string, string>);
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  const loadQuizzes = async () => {
    try {
      const data = await apiClient.get("/quizzes");
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newQuizTitle.trim() || "Untitled Quiz";
    setShowNewModal(false);
    setShowBlankForm(false);
    setNewQuizTitle("");
    setNewQuizCoverUrl("");
    try {
      const data = await apiClient.post("/quizzes", {
        title,
      });
      if (newQuizCoverUrl.trim()) {
        const nextMap = { ...quizCoverMap, [data.id]: newQuizCoverUrl.trim() };
        setQuizCoverMap(nextMap);
        if (typeof window !== "undefined") {
          localStorage.setItem("quizik_quiz_cover_map", JSON.stringify(nextMap));
        }
      }
      router.push(`/quizzes/${data.id}/edit`);
    } catch (err) {
      console.error("Failed to create quiz", err);
    }
  };

  const cloneQuiz = async (quizId: string) => {
    setCloningId(quizId);
    try {
      const data = await apiClient.post(`/quizzes/${quizId}/clone`, {});
      router.push(`/quizzes/${data.id}/edit`);
    } catch (err) {
      console.error("Failed to clone quiz", err);
      alert("Failed to clone quiz");
    } finally {
      setCloningId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/quizzes/${deletingId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== deletingId));
      setDeletingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete quiz");
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyShareLink = (shareSlug: string) => {
    const url = `${window.location.origin}/share/${shareSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(shareSlug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  };

  const importByLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError("");
    if (!importSlug.trim()) return;
    setImportLoading(true);
    try {
      const raw = importSlug.trim();
      const slug = raw.includes("/") ? raw.split("/").pop() ?? raw : raw;
      const data = await apiClient.post("/quizzes/import-from-slug", { share_slug: slug });
      setShowImportLink(false);
      setImportSlug("");
      router.push(`/quizzes/${data.id}/edit`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Quiz not found. Check the link or slug.");
    } finally {
      setImportLoading(false);
    }
  };

  const downloadExport = async (quizId: string, format: "json" | "csv") => {
    const token = localStorage.getItem("quizik_token");
    const res = await fetch(`/api/v1/quizzes/${quizId}/export/${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      alert("Export failed");
      return;
    }
    if (format === "json") {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `quiz-${quizId}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `quiz-${quizId}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };

  const runMerge = async () => {
    if (!mergeTargetId || mergeSourceIds.length === 0) return;
    setMergeLoading(true);
    try {
      await apiClient.post(`/quizzes/${mergeTargetId}/merge`, {
        source_quiz_ids: mergeSourceIds,
        strategy: mergeStrategy,
        deduplicate: mergeDeduplicate,
      });
      setMergeTargetId(null);
      setMergeSourceIds([]);
      await loadQuizzes();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMergeLoading(false);
    }
  };

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;
  if (fetching) return <div className="p-8">{t("common.loading")}</div>;

  const statusColors: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700 border-emerald-200",
    archived: "bg-gray-100 text-gray-500 border-gray-200",
    draft: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const totalQuizzes = quizzes.length;
  const draftCount = quizzes.filter((q) => q.status === "draft").length;
  const publishedCount = quizzes.filter((q) => q.status === "published").length;
  const importedCount = quizzes.filter((q) => q.is_imported).length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10">
      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-100 p-2 rounded-xl">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">{t("quiz.deleteTitle")}</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">{t("quiz.deleteConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} disabled={deleteLoading}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deleteLoading ? t("common.deleting") : t("common.yesDelete")}
              </button>
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Quiz modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">{t("quiz.addQuiz")}</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3">
              {showBlankForm ? (
                <form onSubmit={createQuiz} className="border-2 border-violet-200 rounded-xl p-4 bg-violet-50">
                  <p className="font-semibold text-gray-800 mb-2">{t("quiz.blankQuiz")}</p>
                  <input
                    type="text"
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    placeholder={t("quiz.quizTitle")}
                    className="w-full border border-violet-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none mb-2"
                    autoFocus
                    required
                  />
                  <input
                    type="url"
                    value={newQuizCoverUrl}
                    onChange={(e) => setNewQuizCoverUrl(e.target.value)}
                    placeholder="https://... (volitelný cover obrázek)"
                    className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 outline-none mb-2"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-700 text-sm transition-colors">
                      {t("quiz.createQuiz")}
                    </button>
                    <button type="button" onClick={() => setShowBlankForm(false)} className="px-3 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                      {t("common.back")}
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowBlankForm(true)}
                  className="flex items-start gap-4 border-2 border-gray-100 rounded-xl p-4 hover:border-violet-300 hover:bg-violet-50 transition-all text-left group">
                  <div className="bg-violet-100 p-2.5 rounded-xl group-hover:bg-violet-200 transition-colors">
                    <FileText size={20} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{t("quiz.blankQuiz")}</p>
                    <p className="text-sm text-gray-500">{t("quiz.blankQuizDesc")}</p>
                  </div>
                </button>
              )}
              <Link href="/import" onClick={() => setShowNewModal(false)}
                className="flex items-start gap-4 border-2 border-gray-100 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
                <div className="bg-emerald-100 p-2.5 rounded-xl group-hover:bg-emerald-200 transition-colors">
                  <Upload size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{t("quiz.importFile")}</p>
                  <p className="text-sm text-gray-500">{t("quiz.importFileDesc")}</p>
                </div>
              </Link>
              <button onClick={() => { setShowNewModal(false); setShowImportLink(true); }}
                className="flex items-start gap-4 border-2 border-gray-100 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group">
                <div className="bg-indigo-100 p-2.5 rounded-xl group-hover:bg-indigo-200 transition-colors">
                  <Link2 size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{t("quiz.importByLink")}</p>
                  <p className="text-sm text-gray-500">{t("quiz.importByLinkDesc")}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import by link modal */}
      {showImportLink && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Link2 size={18} className="text-indigo-500" /> {t("quiz.importQuizByLink")}
              </h2>
              <button onClick={() => { setShowImportLink(false); setImportError(""); setImportSlug(""); }}
                className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{t("quiz.pasteShareLink")}</p>
            <form onSubmit={importByLink} className="space-y-3">
              <input
                type="text"
                value={importSlug}
                onChange={(e) => setImportSlug(e.target.value)}
                placeholder="e.g. abc123 or http://…/share/abc123"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                required
              />
              {importError && <p className="text-xs text-red-600">{importError}</p>}
              <button type="submit" disabled={importLoading}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {importLoading ? t("quiz.importing") : t("quiz.import")}
              </button>
            </form>
          </div>
        </div>
      )}

      {copyActionQuizId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Kopírovat obsah kvízu</h2>
              <button onClick={() => setCopyActionQuizId(null)}
                className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Vyber, jestli chceš vytvořit kopii (klon), nebo sloučit další kvízy do tohoto kvízu.
            </p>
            <div className="grid gap-3">
              <button
                onClick={() => {
                  const targetId = copyActionQuizId;
                  setCopyActionQuizId(null);
                  if (targetId) void cloneQuiz(targetId);
                }}
                disabled={cloningId === copyActionQuizId}
                className="w-full flex items-center justify-between border-2 border-indigo-100 rounded-xl px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50 transition-all disabled:opacity-60"
              >
                <span className="text-left">
                  <span className="block font-semibold text-gray-800">Klonovat kvíz</span>
                  <span className="block text-xs text-gray-500">Vytvoří novou kopii, kterou můžeš dál upravovat.</span>
                </span>
                <Copy size={16} className="text-indigo-600 shrink-0" />
              </button>
              <button
                onClick={() => {
                  if (!copyActionQuizId) return;
                  setMergeTargetId(copyActionQuizId);
                  setCopyActionQuizId(null);
                }}
                className="w-full flex items-center justify-between border-2 border-blue-100 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <span className="text-left">
                  <span className="block font-semibold text-gray-800">Sloučit kvízy</span>
                  <span className="block text-xs text-gray-500">Vybereš zdrojové kvízy a spojíš jejich otázky.</span>
                </span>
                <GitMerge size={16} className="text-blue-700 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {exportQuizId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Export kvízu</h2>
              <button onClick={() => setExportQuizId(null)}
                className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Vyber formát, ve kterém chceš kvíz stáhnout.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (!exportQuizId) return;
                  void downloadExport(exportQuizId, "json");
                  setExportQuizId(null);
                }}
                className="border border-gray-200 rounded-xl px-3 py-2.5 hover:bg-gray-50 font-semibold text-sm"
              >
                JSON
              </button>
              <button
                onClick={() => {
                  if (!exportQuizId) return;
                  void downloadExport(exportQuizId, "csv");
                  setExportQuizId(null);
                }}
                className="border border-gray-200 rounded-xl px-3 py-2.5 hover:bg-gray-50 font-semibold text-sm"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {mergeTargetId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Sloučit do tohoto kvízu</h2>
            <p className="text-sm text-gray-500 mb-3">Vyber zdrojové kvízy, strategii a deduplikaci.</p>
            <div className="space-y-2 max-h-56 overflow-auto border rounded-lg p-3">
              {quizzes.filter((q) => q.id !== mergeTargetId).map((q) => (
                <label key={q.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={mergeSourceIds.includes(q.id)}
                    onChange={(e) => setMergeSourceIds((prev) => e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id))}
                  />
                  {q.title}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <select value={mergeStrategy} onChange={(e) => setMergeStrategy(e.target.value as "append" | "interleave")} className="border rounded-lg px-3 py-2 text-sm">
                <option value="append">Přidat na konec</option>
                <option value="interleave">Proložit s existujícími</option>
              </select>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={mergeDeduplicate} onChange={(e) => setMergeDeduplicate(e.target.checked)} />
                Deduplikace
              </label>
            </div>
            {mergePreview && (
              <div className="mt-3 text-xs rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-indigo-800 space-y-1">
                <p>Aktuálně v cíli: <b>{mergePreview.targetCount}</b> otázek</p>
                <p>Vybráno ze zdrojů: <b>{mergePreview.sourceCount}</b> otázek</p>
                <p>Po deduplikaci přibude: <b>{mergePreview.uniqueSourceCount}</b> otázek</p>
                <p>Výsledný odhad: <b>{mergePreview.finalCount}</b> otázek</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={runMerge} disabled={mergeLoading || mergeSourceIds.length === 0} className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                {mergeLoading ? "Slučuji..." : "Sloučit"}
              </button>
              <button onClick={() => setMergeTargetId(null)} className="border px-4 py-2 rounded-lg">Zrušit</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-500 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
              <BookOpen size={22} className="text-white" />
            </div>
            {t("quiz.myQuizzes")}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 ml-16 font-medium">
            {user.display_name || user.email} · {quizzes.length} {quizzes.length === 1 ? "quiz" : "kvízů"}
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-all font-semibold whitespace-nowrap active:scale-95">
          <PlusCircle size={18} />
          <span>{t("quiz.newQuiz")}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><p className="text-xs text-slate-500 font-semibold uppercase">Total Quizzes</p><p className="text-3xl font-black text-indigo-600 mt-1">{totalQuizzes}</p></div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><p className="text-xs text-slate-500 font-semibold uppercase">Drafts</p><p className="text-3xl font-black text-blue-600 mt-1">{draftCount}</p></div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><p className="text-xs text-slate-500 font-semibold uppercase">Published</p><p className="text-3xl font-black text-fuchsia-600 mt-1">{publishedCount}</p></div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><p className="text-xs text-slate-500 font-semibold uppercase">Imported</p><p className="text-3xl font-black text-slate-800 mt-1">{importedCount}</p></div>
      </div>

      {quizzes.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
          <div className="inline-flex rounded-2xl bg-white border border-slate-200 p-1 flex-wrap">
            {[
              { key: "all", label: t("status.all") },
              { key: "published", label: t("status.published") },
              { key: "draft", label: t("status.draft") },
              { key: "archived", label: t("status.archived") },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${statusFilter === item.key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-[360px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("quiz.searchPlaceholder")}
              className="w-full pl-9 pr-3 border border-slate-200 rounded-2xl py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
          </div>
        </div>
      )}

      {(() => {
        const filtered = quizzes.filter((q) =>
          (statusFilter === "all" || q.status === statusFilter) &&
          (!search.trim() || q.title.toLowerCase().includes(search.toLowerCase()))
        );
        if (quizzes.length === 0) return (
          <div className="text-center text-gray-500 py-16 border-2 border-dashed border-violet-200 rounded-2xl bg-white/60">
            <div className="bg-violet-100 p-4 rounded-2xl inline-block mb-4">
              <BookOpen size={32} className="text-violet-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">{t("quiz.noQuizzes")}</p>
          </div>
        );
        if (filtered.length === 0) return (
          <div className="text-center text-gray-400 py-8">{t("quiz.noQuizzesFilter")}</div>
        );
        return (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((quiz) => (
              <div key={quiz.id}
                className="bg-white border border-slate-200 p-4 rounded-3xl flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="h-40 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-cyan-900 mb-4 relative overflow-hidden">
                  {quizCoverMap[quiz.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={quizCoverMap[quiz.id]} alt={quiz.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.35),transparent_55%)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors tracking-tight">{quiz.title}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusColors[quiz.status] || statusColors.draft}`}>
                      {t(`status.${quiz.status}`) || quiz.status}
                    </span>
                    {quiz.is_imported && (
                      <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                        {t("quiz.imported")}
                      </span>
                    )}
                    {quiz.clone_of_id && !quiz.is_imported && (
                      <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                        {t("quiz.copy")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-4">
                    {questionCountLabel(lang, quiz.questions?.length ?? 0)}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                  {quiz.status === "published" && quiz.share_slug && (
                    <button onClick={() => copyShareLink(quiz.share_slug!)}
                      className="flex items-center justify-center gap-1.5 text-sm text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 bg-white border border-slate-200 px-2.5 py-2 rounded-xl transition-all"
                      title={copiedSlug === quiz.share_slug ? t("quiz.copied") : t("quiz.share")}>
                      <Share2 size={14} />
                      <span className="hidden sm:inline">{copiedSlug === quiz.share_slug ? t("quiz.copied") : t("quiz.share")}</span>
                    </button>
                  )}
                  <Link href={`/quizzes/${quiz.id}/edit`}
                    className="flex items-center justify-center gap-1.5 text-indigo-600 hover:text-white hover:bg-indigo-500 bg-white border border-indigo-200 text-sm px-2.5 py-2 rounded-xl transition-all"
                    title={t("common.edit")}>
                    <Edit size={14} />
                    <span className="hidden sm:inline">{t("common.edit")}</span>
                  </Link>
                  <button
                    onClick={() => setCopyActionQuizId(quiz.id)}
                    disabled={cloningId === quiz.id}
                    className="flex items-center justify-center gap-1.5 text-violet-700 hover:text-white hover:bg-violet-500 bg-white border border-violet-200 text-sm px-2.5 py-2 rounded-xl transition-all disabled:opacity-50"
                    title="Kopírovat / Sloučit"
                  >
                    <ArrowUpFromLine size={14} />
                    <span className="hidden sm:inline">Kopírovat</span>
                  </button>
                  <button
                    onClick={() => setExportQuizId(quiz.id)}
                    className="flex items-center justify-center gap-1.5 text-slate-700 hover:text-white hover:bg-slate-600 bg-white border border-slate-200 text-sm px-2.5 py-2 rounded-xl transition-all"
                    title="Export"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button onClick={() => setDeletingId(quiz.id)}
                    className="flex items-center justify-center gap-1.5 text-red-500 hover:text-white hover:bg-red-500 bg-white border border-red-200 text-sm px-3 py-2 rounded-xl transition-all">
                    <Trash2 size={14} />
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
