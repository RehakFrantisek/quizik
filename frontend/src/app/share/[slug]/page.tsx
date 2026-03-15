"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Copy, Loader, AlertTriangle } from "lucide-react";

interface QuizPreview {
  share_slug: string;
  title: string;
  description: string | null;
  question_count: number;
  status: string;
}

export default function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [preview, setPreview] = useState<QuizPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/quizzes/preview/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Quiz not found");
        return r.json();
      })
      .then(setPreview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const addToLibrary = async () => {
    if (!user) {
      router.push(`/login?next=/share/${slug}`);
      return;
    }
    setImporting(true);
    try {
      const data = await apiClient.post("/quizzes/import-from-slug", { share_slug: slug });
      router.push(`/quizzes/${data.id}/edit`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import quiz");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md text-center shadow">
          <AlertTriangle size={36} className="mx-auto text-red-400 mb-3" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Quiz Not Found</h2>
          <p className="text-gray-500 text-sm">{error || "This share link is invalid or the quiz no longer exists."}</p>
          <Link href="/" className="mt-4 inline-block text-blue-500 hover:underline text-sm">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border rounded-xl p-8 max-w-md w-full shadow">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-blue-100 p-2.5 rounded-lg">
            <BookOpen size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Shared Quiz</p>
            <h1 className="text-xl font-black text-gray-800">{preview.title}</h1>
          </div>
        </div>

        {preview.description && (
          <p className="text-sm text-gray-600 mb-4">{preview.description}</p>
        )}

        <p className="text-sm text-gray-500 mb-6">
          <span className="font-semibold">{preview.question_count}</span> question{preview.question_count !== 1 ? "s" : ""}
        </p>

        <button
          onClick={addToLibrary}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 mb-3"
        >
          {importing ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <Copy size={16} />
          )}
          {importing ? "Adding to library..." : user ? "Add to My Library" : "Sign in to Add to Library"}
        </button>

        {!user && !isLoading && (
          <p className="text-xs text-center text-gray-400">You&apos;ll be redirected to sign in first.</p>
        )}
      </div>
    </div>
  );
}
