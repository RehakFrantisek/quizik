"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Copy,
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
  questions?: unknown[];
}

function QuizzesDashboard() {
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

  const [showImportLink, setShowImportLink] = useState(false);
  const [importSlug, setImportSlug] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");

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
    setShowNewModal(false);
    setShowBlankForm(false);
    setNewQuizTitle("");
    try {
      const data = await apiClient.post("/quizzes", { title });
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

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;
  if (fetching) return <div className="p-8">{t("common.loading")}</div>;

  const statusColors: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700 border-emerald-200",
    archived: "bg-gray-100 text-gray-500 border-gray-200",
    draft: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
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

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-indigo-500 p-2.5 rounded-xl shadow-md">
              <BookOpen size={22} className="text-white" />
            </div>
            {t("quiz.myQuizzes")}
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 ml-14">
            {user.display_name || user.email} · {quizzes.length} {quizzes.length === 1 ? "quiz" : "kvízů"}
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-md hover:opacity-90 transition-opacity font-semibold whitespace-nowrap">
          <PlusCircle size={18} />
          <span className="hidden sm:inline">{t("quiz.newQuiz")}</span>
        </button>
      </div>

      {quizzes.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("quiz.searchPlaceholder")}
              className="w-full pl-9 pr-3 border border-gray-200 rounded-xl py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          >
            <option value="all">{t("status.all")}</option>
            <option value="draft">{t("status.draft")}</option>
            <option value="published">{t("status.published")}</option>
            <option value="archived">{t("status.archived")}</option>
          </select>
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
          <div className="grid gap-3">
            {filtered.map((quiz) => (
              <div key={quiz.id}
                className="bg-white border border-gray-100 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:shadow-md hover:border-violet-200 transition-all group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-violet-700 transition-colors">{quiz.title}</h3>
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
                  <p className="text-sm text-gray-400">
                    {questionCountLabel(lang, quiz.questions?.length ?? 0)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0 flex-wrap justify-end">
                  {quiz.status === "published" && quiz.share_slug && (
                    <button onClick={() => copyShareLink(quiz.share_slug!)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl transition-all"
                      title={copiedSlug === quiz.share_slug ? t("quiz.copied") : t("quiz.share")}>
                      <Share2 size={14} />
                      <span className="hidden sm:inline">{copiedSlug === quiz.share_slug ? t("quiz.copied") : t("quiz.share")}</span>
                    </button>
                  )}
                  <button onClick={() => cloneQuiz(quiz.id)} disabled={cloningId === quiz.id}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-white hover:bg-indigo-500 bg-indigo-50 border border-indigo-200 text-sm px-2.5 py-1.5 rounded-xl transition-all disabled:opacity-50"
                    title={t("quiz.clone")}>
                    <Copy size={14} />
                    <span className="hidden sm:inline">{cloningId === quiz.id ? t("quiz.cloning") : t("quiz.clone")}</span>
                  </button>
                  <Link href={`/quizzes/${quiz.id}/edit`}
                    className="flex items-center gap-1.5 text-violet-600 hover:text-white hover:bg-violet-500 bg-violet-50 border border-violet-200 text-sm px-2.5 py-1.5 rounded-xl transition-all"
                    title={t("common.edit")}>
                    <Edit size={14} />
                    <span className="hidden sm:inline">{t("common.edit")}</span>
                  </Link>
                  <button onClick={() => setDeletingId(quiz.id)}
                    className="flex items-center gap-1.5 text-red-400 hover:text-white hover:bg-red-500 bg-red-50 border border-red-200 text-sm px-3 py-1.5 rounded-xl transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

export default function QuizzesDashboardPage() {
  return (
    <Suspense fallback={null}>
      <QuizzesDashboard />
    </Suspense>
  );
}
