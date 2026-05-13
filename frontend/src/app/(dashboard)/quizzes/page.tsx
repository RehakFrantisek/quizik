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
  Globe,
  Tag,
  Lock,
} from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { questionCountLabel } from "@/lib/i18n";

const PRESET_TAGS = [
  "biologie", "chemie", "fyzika", "matematika",
  "dějepis", "zeměpis", "čeština", "angličtina",
  "němčina", "ruština", "informatika",
  "hudební výchova", "výtvarná výchova", "tělesná výchova",
];

interface Quiz {
  id: string;
  title: string;
  status: string;
  share_slug?: string | null;
  clone_of_id?: string | null;
  is_imported?: boolean;
  is_public?: boolean;
  tags?: string[];
  cover_image_url?: string | null;
  description?: string | null;
  questions?: Array<{ body?: string }>;
  settings?: {
    cover_image_url?: string | null;
  };
}

import { Suspense } from "react";

export default function QuizzesDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Načítání…</div>}>
      <QuizzesDashboardInner />
    </Suspense>
  );
}

function QuizzesDashboardInner() {
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
  const [coverUploading, setCoverUploading] = useState(false);

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

  const [visibilityQuizId, setVisibilityQuizId] = useState<string | null>(null);
  const [visibilityPublic, setVisibilityPublic] = useState(false);
  const [visibilityTags, setVisibilityTags] = useState<string[]>([]);
  const [visibilityTagInput, setVisibilityTagInput] = useState("");
  const [visibilitySaving, setVisibilitySaving] = useState(false);

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
    const coverUrl = newQuizCoverUrl.trim() || null;
    setShowNewModal(false);
    setShowBlankForm(false);
    setNewQuizTitle("");
    setNewQuizCoverUrl("");
    try {
      const body: Record<string, unknown> = { title };
      if (coverUrl) body.cover_image_url = coverUrl;
      const data = await apiClient.post("/quizzes", body);
      router.push(`/quizzes/${data.id}/edit`);
    } catch (err) {
      console.error("Failed to create quiz", err);
    }
  };

  const uploadCoverImage = async (file: File) => {
    setCoverUploading(true);
    try {
      const { getToken } = await import("@/lib/auth");
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
      setNewQuizCoverUrl(json.url);
    } catch (err) {
      console.error("Cover upload failed", err);
    } finally {
      setCoverUploading(false);
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

  const openVisibility = (quiz: Quiz) => {
    setVisibilityQuizId(quiz.id);
    setVisibilityPublic(quiz.is_public ?? false);
    setVisibilityTags(quiz.tags ?? []);
    setVisibilityTagInput("");
  };

  const addVisibilityTag = (raw: string) => {
    const tag = raw.trim().replace(/,/g, "").toLowerCase();
    if (tag && !visibilityTags.includes(tag)) {
      setVisibilityTags((prev) => [...prev, tag]);
    }
    setVisibilityTagInput("");
  };

  const saveVisibility = async () => {
    if (!visibilityQuizId) return;
    setVisibilitySaving(true);
    try {
      const updated = await apiClient.patch(`/quizzes/${visibilityQuizId}`, {
        is_public: visibilityPublic,
        tags: visibilityTags,
      });
      setQuizzes((prev) => prev.map((q) => (q.id === visibilityQuizId ? { ...q, ...updated } : q)));
      setVisibilityQuizId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setVisibilitySaving(false);
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

  if (isLoading || !user) return <div className="p-8 text-gray-500 dark:text-gray-400">{t("common.loading")}</div>;
  if (fetching) return <div className="p-8 text-gray-500 dark:text-gray-400">{t("common.loading")}</div>;

  const statusColors: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700",
    archived: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600",
    draft: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700",
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-xl">
                <AlertTriangle size={20} className="text-red-500 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("quiz.deleteTitle")}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t("quiz.deleteConfirm")}</p>
            <div className="flex gap-3">
              <button onClick={confirmDelete} disabled={deleteLoading}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
                {deleteLoading ? t("common.deleting") : t("common.yesDelete")}
              </button>
              <button onClick={() => setDeletingId(null)}
                className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Quiz modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("quiz.addQuiz")}</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3">
              {showBlankForm ? (
                <form onSubmit={createQuiz} className="border-2 border-violet-200 dark:border-violet-700 rounded-xl p-4 bg-violet-50 dark:bg-violet-900/20">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("quiz.blankQuiz")}</p>
                  <input
                    type="text"
                    value={newQuizTitle}
                    onChange={(e) => setNewQuizTitle(e.target.value)}
                    placeholder={t("quiz.quizTitle")}
                    className="w-full border border-violet-300 dark:border-violet-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-400 outline-none mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    autoFocus
                    required
                  />
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={newQuizCoverUrl}
                      onChange={(e) => setNewQuizCoverUrl(e.target.value)}
                      placeholder={t("quiz.coverImageUrl")}
                      className="flex-1 border border-violet-200 dark:border-violet-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-300 outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <label className="flex items-center gap-1 px-3 py-2 bg-violet-100 dark:bg-violet-900/40 hover:bg-violet-200 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap">
                      <Upload size={14} />
                      {coverUploading ? "..." : t("quiz.uploadCover")}
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
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-violet-600 text-white py-2 rounded-lg font-semibold hover:bg-violet-700 text-sm transition-colors">
                      {t("quiz.createQuiz")}
                    </button>
                    <button type="button" onClick={() => setShowBlankForm(false)} className="px-3 py-2 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                      {t("common.back")}
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowBlankForm(true)}
                  className="flex items-start gap-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left group">
                  <div className="bg-violet-100 dark:bg-violet-900/40 p-2.5 rounded-xl group-hover:bg-violet-200 dark:group-hover:bg-violet-900/60 transition-colors">
                    <FileText size={20} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{t("quiz.blankQuiz")}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("quiz.blankQuizDesc")}</p>
                  </div>
                </button>
              )}
              <Link href="/import" onClick={() => setShowNewModal(false)}
                className="flex items-start gap-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2.5 rounded-xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60 transition-colors">
                  <Upload size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{t("quiz.importFile")}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("quiz.importFileDesc")}</p>
                </div>
              </Link>
              <button onClick={() => { setShowNewModal(false); setShowImportLink(true); }}
                className="flex items-start gap-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group">
                <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2.5 rounded-xl group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/60 transition-colors">
                  <Link2 size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{t("quiz.importByLink")}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("quiz.importByLinkDesc")}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import by link modal */}
      {showImportLink && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Link2 size={18} className="text-indigo-500 dark:text-indigo-400" /> {t("quiz.importQuizByLink")}
              </h2>
              <button onClick={() => { setShowImportLink(false); setImportError(""); setImportSlug(""); }}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("quiz.pasteShareLink")}</p>
            <form onSubmit={importByLink} className="space-y-3">
              <input
                type="text"
                value={importSlug}
                onChange={(e) => setImportSlug(e.target.value)}
                placeholder="e.g. abc123 or http://…/share/abc123"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                required
              />
              {importError && <p className="text-xs text-red-600 dark:text-red-400">{importError}</p>}
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("quiz.copyContents")}</h2>
              <button onClick={() => setCopyActionQuizId(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3">
              <button
                onClick={() => {
                  const targetId = copyActionQuizId;
                  setCopyActionQuizId(null);
                  if (targetId) void cloneQuiz(targetId);
                }}
                disabled={cloningId === copyActionQuizId}
                className="w-full flex items-center justify-between border-2 border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-60"
              >
                <span className="text-left">
                  <span className="block font-semibold text-gray-800 dark:text-gray-100">{t("quiz.cloneQuiz")}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t("quiz.cloneDesc")}</span>
                </span>
                <Copy size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              </button>
              <button
                onClick={() => {
                  if (!copyActionQuizId) return;
                  setMergeTargetId(copyActionQuizId);
                  setCopyActionQuizId(null);
                }}
                className="w-full flex items-center justify-between border-2 border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <span className="text-left">
                  <span className="block font-semibold text-gray-800 dark:text-gray-100">{t("quiz.mergeQuizzes")}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{t("quiz.mergeDesc")}</span>
                </span>
                <GitMerge size={16} className="text-blue-700 dark:text-blue-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {exportQuizId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("quiz.exportQuiz")}</h2>
              <button onClick={() => setExportQuizId(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("quiz.exportDesc")}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (!exportQuizId) return;
                  void downloadExport(exportQuizId, "json");
                  setExportQuizId(null);
                }}
                className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm text-gray-800 dark:text-gray-200"
              >
                JSON
              </button>
              <button
                onClick={() => {
                  if (!exportQuizId) return;
                  void downloadExport(exportQuizId, "csv");
                  setExportQuizId(null);
                }}
                className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm text-gray-800 dark:text-gray-200"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {visibilityQuizId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Globe size={18} className="text-emerald-500" /> {t("quiz.visibilityModal")}
              </h2>
              <button onClick={() => setVisibilityQuizId(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors mb-5 ${
              visibilityPublic
                ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}>
              <input type="checkbox" checked={visibilityPublic} onChange={(e) => setVisibilityPublic(e.target.checked)}
                className="mt-0.5 accent-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("quiz.publicToggle")}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("quiz.publicToggleDesc")}</p>
              </div>
            </label>

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <Tag size={12} /> {t("quiz.tagsLabel")}
            </p>

            {/* Preset subject chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESET_TAGS.map((tag) => {
                const active = visibilityTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setVisibilityTags((prev) =>
                      active ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
                      active
                        ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom (non-preset) tags */}
            {visibilityTags.filter((tag) => !PRESET_TAGS.includes(tag)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {visibilityTags.filter((tag) => !PRESET_TAGS.includes(tag)).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-full font-medium">
                    {tag}
                    <button onClick={() => setVisibilityTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-red-500 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input
              type="text"
              value={visibilityTagInput}
              onChange={(e) => setVisibilityTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addVisibilityTag(visibilityTagInput); }
                if (e.key === "Backspace" && !visibilityTagInput && visibilityTags.filter((t) => !PRESET_TAGS.includes(t)).length > 0) {
                  const custom = visibilityTags.filter((t) => !PRESET_TAGS.includes(t));
                  setVisibilityTags((prev) => prev.filter((t) => t !== custom[custom.length - 1]));
                }
              }}
              onBlur={() => visibilityTagInput.trim() && addVisibilityTag(visibilityTagInput)}
              placeholder={t("quiz.tagsPlaceholder")}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-1"
            />
            <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">{t("quiz.tagsHint")}</p>

            <div className="flex gap-2">
              <button onClick={() => void saveVisibility()} disabled={visibilitySaving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors">
                {visibilitySaving ? t("common.saving") : t("quiz.saveVisibility")}
              </button>
              <button onClick={() => setVisibilityQuizId(null)}
                className="flex-1 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {mergeTargetId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full mx-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{t("quiz.mergeInto")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("quiz.mergeDesc")}</p>
            <div className="space-y-2 max-h-56 overflow-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              {quizzes.filter((q) => q.id !== mergeTargetId).map((q) => (
                <label key={q.id} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
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
              <select value={mergeStrategy} onChange={(e) => setMergeStrategy(e.target.value as "append" | "interleave")} className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                <option value="append">Přidat na konec</option>
                <option value="interleave">Proložit s existujícími</option>
              </select>
              <label className="text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={mergeDeduplicate} onChange={(e) => setMergeDeduplicate(e.target.checked)} />
                Deduplikace
              </label>
            </div>
            {mergePreview && (
              <div className="mt-3 text-xs rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 p-3 text-indigo-800 dark:text-indigo-300 space-y-1">
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
              <button onClick={() => setMergeTargetId(null)} className="border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Zrušit</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-500 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
              <BookOpen size={22} className="text-white" />
            </div>
            {t("quiz.myQuizzes")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1.5 ml-16 font-medium">
            {user.display_name || user.email} · {quizzes.length} {quizzes.length === 1 ? "quiz" : "kvízů"}
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-all font-semibold whitespace-nowrap active:scale-95">
          <PlusCircle size={18} />
          <span>{t("quiz.newQuiz")}</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wide">{t("quiz.statTotal")}</p>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalQuizzes}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wide">{t("quiz.statDrafts")}</p>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{draftCount}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wide">{t("quiz.statPublished")}</p>
          <p className="text-3xl font-black text-fuchsia-600 dark:text-fuchsia-400 mt-1">{publishedCount}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wide">{t("quiz.statImported")}</p>
          <p className="text-3xl font-black text-slate-800 dark:text-gray-100 mt-1">{importedCount}</p>
        </div>
      </div>

      {quizzes.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
          <div className="inline-flex rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-1 flex-wrap">
            {[
              { key: "all", label: t("status.all") },
              { key: "published", label: t("status.published") },
              { key: "draft", label: t("status.draft") },
              { key: "archived", label: t("status.archived") },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  statusFilter === item.key
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-[360px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("quiz.searchPlaceholder")}
              className="w-full pl-9 pr-3 border border-slate-200 dark:border-gray-600 rounded-2xl py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
          <div className="text-center text-gray-500 dark:text-gray-400 py-16 border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-2xl bg-white/60 dark:bg-gray-800/60">
            <div className="bg-violet-100 dark:bg-violet-900/40 p-4 rounded-2xl inline-block mb-4">
              <BookOpen size={32} className="text-violet-400 dark:text-violet-500" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("quiz.noQuizzes")}</p>
          </div>
        );
        if (filtered.length === 0) return (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8">{t("quiz.noQuizzesFilter")}</div>
        );
        return (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((quiz) => (
              <div key={quiz.id}
                className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-3xl flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
                {/* Status accent bar */}
                <div className={`h-1 w-full ${
                  quiz.status === "published" ? "bg-gradient-to-r from-indigo-500 to-purple-500" :
                  quiz.status === "draft" ? "bg-gradient-to-r from-amber-400 to-orange-400" :
                  "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500"
                }`} />
                <div className="p-5 flex flex-col flex-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors tracking-tight leading-tight">{quiz.title}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border shrink-0 ${statusColors[quiz.status] || statusColors.draft}`}>
                      {t(`status.${quiz.status}`) || quiz.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {quiz.is_imported && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700 px-2 py-0.5 rounded-full font-medium">
                        {t("quiz.imported")}
                      </span>
                    )}
                    {quiz.clone_of_id && !quiz.is_imported && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {t("quiz.copy")}
                      </span>
                    )}
                    {quiz.is_public && (
                      <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        <Globe size={10} /> {t("quiz.public")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-gray-400 font-medium mb-4">
                    {questionCountLabel(lang, quiz.questions?.length ?? 0)}
                  </p>
                </div>
                <div className="mt-auto">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 dark:border-gray-600 bg-slate-50/80 dark:bg-gray-700/50 p-2">
                  {quiz.status === "published" && quiz.share_slug && (
                    <button onClick={() => copyShareLink(quiz.share_slug!)}
                      className="flex items-center justify-center gap-1.5 text-sm text-slate-600 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 px-2.5 py-2 rounded-xl transition-all"
                      title={copiedSlug === quiz.share_slug ? t("quiz.copied") : t("quiz.share")}>
                      <Share2 size={14} />
                      <span className="hidden sm:inline">{copiedSlug === quiz.share_slug ? t("quiz.copied") : t("quiz.share")}</span>
                    </button>
                  )}
                  <Link href={`/quizzes/${quiz.id}/edit`}
                    className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-500 dark:hover:bg-indigo-600 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-sm px-2.5 py-2 rounded-xl transition-all"
                    title={t("common.edit")}>
                    <Edit size={14} />
                    <span className="hidden sm:inline">{t("common.edit")}</span>
                  </Link>
                  <button
                    onClick={() => openVisibility(quiz)}
                    className={`flex items-center justify-center gap-1.5 text-sm px-2.5 py-2 rounded-xl transition-all ${
                      quiz.is_public
                        ? "bg-emerald-500 dark:bg-emerald-600 text-white border border-emerald-500 dark:border-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700"
                    }`}
                    title={t("quiz.visibility")}
                  >
                    {quiz.is_public ? <Globe size={14} /> : <Lock size={14} />}
                    <span className="hidden sm:inline">{quiz.is_public ? t("quiz.public") : t("quiz.visibility")}</span>
                  </button>
                  <button
                    onClick={() => setCopyActionQuizId(quiz.id)}
                    disabled={cloningId === quiz.id}
                    className="flex items-center justify-center gap-1.5 text-violet-700 dark:text-violet-400 hover:text-white hover:bg-violet-500 dark:hover:bg-violet-600 bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-700 text-sm px-2.5 py-2 rounded-xl transition-all disabled:opacity-50"
                    title={t("quiz.copyContents")}
                  >
                    <ArrowUpFromLine size={14} />
                    <span className="hidden sm:inline">{t("quiz.copy")}</span>
                  </button>
                  <button
                    onClick={() => setExportQuizId(quiz.id)}
                    className="flex items-center justify-center gap-1.5 text-slate-700 dark:text-gray-300 hover:text-white hover:bg-slate-600 dark:hover:bg-gray-600 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-sm px-2.5 py-2 rounded-xl transition-all"
                    title={t("quiz.export")}
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">{t("quiz.export")}</span>
                  </button>
                  <button onClick={() => setDeletingId(quiz.id)}
                    className="flex items-center justify-center gap-1.5 text-red-500 dark:text-red-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-sm px-3 py-2 rounded-xl transition-all">
                    <Trash2 size={14} />
                  </button>
                  </div>
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
