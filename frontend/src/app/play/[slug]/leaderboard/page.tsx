"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Trophy, Medal, Loader, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/contexts/LangContext";
import { useTheme } from "@/contexts/ThemeContext";

interface LeaderboardEntry {
  rank: number;
  participant_name: string;
  score: number;
  max_score: number;
  percentage: number;
  time_spent_sec: number | null;
  completed_at: string;
}

export default function LeaderboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLang();
  const { theme } = useTheme();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    // Apply theme class to html element for this public page
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    // Fetch session title
    fetch(`/api/v1/play/${slug}`)
      .then((r) => r.json())
      .then((d) => setTitle(d.title ?? ""))
      .catch(() => {});

    // Fetch leaderboard
    fetch(`/api/v1/play/${slug}/leaderboard`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load leaderboard");
        return res.json();
      })
      .then((data) => {
        if (!data.leaderboard_enabled) {
          setError(t("leaderboard.notEnabled"));
          return;
        }
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (sec: number | null) => {
    if (sec == null) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={18} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={18} className="text-gray-400" />;
    if (rank === 3) return <Medal size={18} className="text-amber-600" />;
    return <span className="text-sm font-bold text-gray-400 dark:text-gray-500 w-[18px] text-center">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader className="animate-spin text-gray-400" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/play/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft size={14} /> {t("leaderboard.backToQuiz")}
          </Link>
          <div className="flex items-center gap-3">
            <Trophy size={28} className="text-yellow-500" />
            <div>
              <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">{t("leaderboard.title")}</h1>
              {title && <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {!error && entries.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
            {t("leaderboard.noAttempts")}
          </div>
        )}

        {entries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow overflow-hidden">
            {/* Top 3 podium */}
            {entries.length >= 2 && (
              <div className="bg-gradient-to-b from-blue-50 dark:from-blue-950 to-white dark:to-gray-800 px-6 pt-6 pb-2 flex items-end justify-center gap-4">
                {/* 2nd */}
                {entries[1] && (
                  <div className="flex flex-col items-center pb-2">
                    <Medal size={24} className="text-gray-400 mb-1" />
                    <div className="bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 rounded-lg px-3 py-2 text-center w-28">
                      <p className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate">{entries[1].participant_name}</p>
                      <p className="text-lg font-black text-gray-800 dark:text-gray-100">{entries[1].percentage}%</p>
                    </div>
                    <div className="h-12 w-28 bg-gray-200 dark:bg-gray-700 rounded-b-lg" />
                  </div>
                )}
                {/* 1st */}
                <div className="flex flex-col items-center">
                  <Trophy size={28} className="text-yellow-500 mb-1" />
                  <div className="bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-700 rounded-lg px-3 py-2 text-center w-32">
                    <p className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate">{entries[0].participant_name}</p>
                    <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{entries[0].percentage}%</p>
                  </div>
                  <div className="h-16 w-32 bg-yellow-100 dark:bg-yellow-900/30 rounded-b-lg" />
                </div>
                {/* 3rd */}
                {entries[2] && (
                  <div className="flex flex-col items-center pb-4">
                    <Medal size={22} className="text-amber-600 mb-1" />
                    <div className="bg-amber-50 dark:bg-amber-900/30 border dark:border-amber-700/50 rounded-lg px-3 py-2 text-center w-28">
                      <p className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate">{entries[2].participant_name}</p>
                      <p className="text-lg font-black text-gray-800 dark:text-gray-100">{entries[2].percentage}%</p>
                    </div>
                    <div className="h-8 w-28 bg-amber-100 dark:bg-amber-900/20 rounded-b-lg" />
                  </div>
                )}
              </div>
            )}

            {/* Full table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">{t("leaderboard.colName")}</th>
                  <th className="px-4 py-3 text-right">{t("leaderboard.colScore")}</th>
                  <th className="px-4 py-3 text-right">{t("leaderboard.colPercent")}</th>
                  <th className="px-4 py-3 text-right">{t("leaderboard.colTime")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {entries.map((e) => (
                  <tr
                    key={e.rank}
                    className={`transition-colors ${e.rank <= 3 ? "bg-white dark:bg-gray-800 font-semibold" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">{rankIcon(e.rank)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{e.participant_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {e.score} / {e.max_score}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-bold ${
                          e.percentage >= 80
                            ? "text-green-600"
                            : e.percentage >= 50
                            ? "text-yellow-600"
                            : "text-red-500"
                        }`}
                      >
                        {e.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{formatTime(e.time_spent_sec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
          {t("leaderboard.footer")}
        </p>
      </div>
    </div>
  );
}
