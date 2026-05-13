"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { Search, Globe, X, Copy, Tag } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { questionCountLabel } from "@/lib/i18n";

interface PublicQuiz {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  tags: string[];
  question_count: number;
  author_name: string;
  share_slug: string | null;
  created_at: string;
}

const PRESET_TAGS = [
  "biologie", "chemie", "fyzika", "matematika",
  "dějepis", "zeměpis", "čeština", "angličtina",
  "němčina", "ruština", "informatika",
  "hudební výchova", "výtvarná výchova", "tělesná výchova",
];

export default function DiscoverPage() {
  const { t, lang } = useLang();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => void fetchPublicQuizzes(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tagFilter, user]);

  const fetchPublicQuizzes = async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      tagFilter.forEach((tag) => params.append("tags", tag));
      const url = `/api/v1/quizzes/public?${params.toString()}`;
      const data = await fetch(url).then((r) => r.json() as Promise<PublicQuiz[]>);
      setQuizzes(Array.isArray(data) ? data : []);
    } catch {
      setQuizzes([]);
    } finally {
      setFetching(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,/g, "").toLowerCase();
    if (tag && !tagFilter.includes(tag)) setTagFilter((prev) => [...prev, tag]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTagFilter((prev) => prev.filter((t) => t !== tag));

  const customTags = tagFilter.filter((t) => !PRESET_TAGS.includes(t));

  const cloneToLibrary = async (quizId: string) => {
    setCloningId(quizId);
    try {
      const data = await apiClient.post(`/quizzes/${quizId}/clone`, {});
      router.push(`/quizzes/${(data as { id: string }).id}/edit`);
    } catch {
      alert("Failed to clone quiz");
    } finally {
      setCloningId(null);
    }
  };

  if (isLoading || !user) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">{t("common.loading")}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-gray-100 flex items-center gap-3 tracking-tight mb-2">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Globe size={22} className="text-white" />
          </div>
          {t("discover.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 font-medium ml-16">
          {t("discover.subtitle")}
        </p>
      </div>

      {/* Search + Tag filter */}
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-3xl p-5 shadow-sm mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("discover.searchPlaceholder")}
            className="w-full pl-9 pr-3 border border-slate-200 dark:border-gray-600 rounded-2xl py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Preset subject tags */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
            <Tag size={12} /> {t("discover.subjects")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((tag) => {
              const active = tagFilter.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                    active
                      ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
                      : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            <button
              onClick={() => setShowCustomInput((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                showCustomInput || customTags.length > 0
                  ? "bg-slate-600 text-white border-slate-600 dark:bg-slate-500 dark:border-slate-500"
                  : "bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {t("discover.otherTag")}
            </button>
          </div>

          {/* Custom tag input + custom tag chips */}
          {(showCustomInput || customTags.length > 0) && (
            <div className="mt-3 space-y-2">
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {customTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-full font-medium">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {showCustomInput && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
                  }}
                  onBlur={() => tagInput.trim() && addTag(tagInput)}
                  placeholder={t("discover.tagPlaceholder")}
                  autoFocus
                  className="w-full border border-slate-300 dark:border-gray-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {fetching ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">{t("common.loading")}</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-2xl bg-white/60 dark:bg-gray-800/60">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-2xl inline-block mb-4">
            <Globe size={32} className="text-emerald-400 dark:text-emerald-500" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">{t("discover.noResults")}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {quizzes.map((quiz) => (
            <div key={quiz.id}
              className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-3xl flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="h-36 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 mb-4 relative overflow-hidden">
                {quiz.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={quiz.cover_image_url} alt={quiz.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.35),transparent_55%)]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-gray-100 tracking-tight mb-1 line-clamp-2">{quiz.title}</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mb-2">
                  {t("discover.by")} {quiz.author_name} · {questionCountLabel(lang, quiz.question_count)}
                </p>
                {quiz.description && (
                  <p className="text-sm text-slate-500 dark:text-gray-400 mb-3 line-clamp-2">{quiz.description}</p>
                )}
                {quiz.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {quiz.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => !tagFilter.includes(tag) && setTagFilter((prev) => [...prev, tag])}
                        className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 rounded-full font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => void cloneToLibrary(quiz.id)}
                disabled={cloningId === quiz.id}
                className="w-full flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 mt-auto"
              >
                <Copy size={14} />
                {cloningId === quiz.id ? t("quiz.cloning") : t("discover.clone")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
