"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { useLang } from "@/contexts/LangContext";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Loader,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface ParsedOption {
  id: string;
  text: string;
  is_correct: boolean;
}

interface ParsedQuestion {
  type: string;
  body: string;
  options: ParsedOption[];
  points: number;
  explanation?: string | null;
}

type JobStatus = "pending" | "processing" | "completed" | "failed";

interface ImportJob {
  id: string;
  status: JobStatus;
  file_name: string;
  result?: {
    parsed_questions?: ParsedQuestion[];
    warnings?: string[];
    error?: string;
  } | null;
}

type Phase = "upload" | "processing" | "review" | "done" | "error";

export default function ImportPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>("upload");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getToken();
      const res = await fetch("/api/v1/import/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      setJob({ id: data.job_id, status: "pending", file_name: file.name });
      setPhase("processing");
      pollJob(data.job_id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    } finally {
      setUploading(false);
    }
  };

  const pollJob = (jobId: string) => {
    const check = async () => {
      try {
        const data = await apiClient.get(`/import/jobs/${jobId}`);
        setJob(data);
        if (data.status === "completed") {
          const qs: ParsedQuestion[] = data.result?.parsed_questions ?? [];
          setQuestions(qs);
          setWarnings(data.result?.warnings ?? []);
          setQuizTitle(data.file_name.replace(/\.[^/.]+$/, ""));
          setPhase("review");
        } else if (data.status === "failed") {
          setErrorMsg(data.result?.error ?? "Import failed");
          setPhase("error");
        } else {
          pollRef.current = setTimeout(check, 1500);
        }
      } catch {
        setErrorMsg("Failed to check import status");
        setPhase("error");
      }
    };
    pollRef.current = setTimeout(check, 1000);
  };

  const confirmImport = async () => {
    if (!job || questions.length === 0) return;
    setConfirming(true);
    try {
      const data = await apiClient.post(`/import/jobs/${job.id}/confirm`, {
        title: quizTitle,
        description: quizDesc || null,
        questions,
      } as Record<string, unknown>);
      setPhase("done");
      setTimeout(() => router.push(`/quizzes/${data.quiz_id}/edit`), 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const ALLOWED_EXTS = /\.(xlsx|xls|csv)$/i;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_EXTS.test(file.name)) {
      return `Nepodporovaný formát: ${file.name}. Povoleny jsou: .xlsx, .xls, .csv`;
    }
    if (file.size > 10 * 1024 * 1024) {
      return "Soubor je příliš velký (max 10 MB).";
    }
    return null;
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setErrorMsg(err); setPhase("error"); return; }
    uploadFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setErrorMsg(err); setPhase("error"); return; }
    uploadFile(file);
    // Reset input so same file can be re-selected after error
    e.target.value = "";
  };

  if (isLoading || !user) return <div className="p-8">{t("common.loading")}</div>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-6">
        <Link href="/quizzes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={14} /> {t("import.backToQuizzes")}
        </Link>
        <h1 className="text-2xl font-black text-gray-800">{t("import.title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("import.subtitle")}</p>
      </div>

      {/* Upload phase */}
      {phase === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
          {uploading ? (
            <Loader size={36} className="mx-auto text-blue-400 animate-spin mb-3" />
          ) : (
            <FileSpreadsheet size={40} className="mx-auto text-gray-400 mb-3" />
          )}
          <p className="font-semibold text-gray-700 mb-1">
            {uploading ? t("import.uploading") : t("import.dropHere")}
          </p>
          <p className="text-sm text-gray-500">{t("import.supports")}</p>
        </div>
      )}

      {/* Processing phase */}
      {phase === "processing" && (
        <div className="bg-white border rounded-xl p-10 text-center shadow-sm">
          <Loader size={36} className="mx-auto text-blue-400 animate-spin mb-4" />
          <p className="font-semibold text-gray-700">{t("import.parsing").replace("{filename}", job?.file_name ?? "")}</p>
          <p className="text-sm text-gray-500 mt-1">{t("import.parsingSub")}</p>
        </div>
      )}

      {/* Review phase */}
      {phase === "review" && (
        <div className="space-y-5">
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-yellow-600" />
                <span className="font-semibold text-yellow-800 text-sm">
                  {t("import.warningCount").replace("{n}", String(warnings.length)).replace("{s}", warnings.length !== 1 ? "s" : "")}
                </span>
              </div>
              <ul className="text-xs text-yellow-700 space-y-0.5 list-disc list-inside">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-800">{t("import.quizDetails")}</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("import.titleLabel")} <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t("import.descLabel")} <span className="text-gray-400 font-normal">{t("common.optional")}</span></label>
              <input
                type="text"
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-800">
                {t("import.questionsLabel").replace("{n}", String(questions.length)).replace("{s}", questions.length !== 1 ? "s" : "")}
              </h2>
              <span className="text-xs text-gray-500">{t("import.removeHint")}</span>
            </div>
            <ul className="divide-y">
              {questions.map((q, i) => (
                <li key={i} className="px-5 py-3 flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{q.body}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {q.type.replace("_", " ")} · {q.points} pt{q.points !== 1 ? "s" : ""}
                      {q.options.length > 0 && ` · ${q.options.filter(o => o.is_correct).length} correct`}
                    </p>
                  </div>
                  <button
                    onClick={() => removeQuestion(i)}
                    className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                    title="Remove question"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={confirmImport}
              disabled={confirming || questions.length === 0 || !quizTitle.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {confirming ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
              {confirming ? t("import.creating") : t("import.createQuiz").replace("{n}", String(questions.length))}
            </button>
            <button
              onClick={() => { setPhase("upload"); setJob(null); }}
              className="text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              {t("import.startOver")}
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="bg-white border rounded-xl p-10 text-center shadow-sm">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <p className="font-semibold text-gray-700 text-lg">{t("import.quizCreated")}</p>
          <p className="text-sm text-gray-500 mt-1">{t("import.redirecting")}</p>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertTriangle size={36} className="mx-auto text-red-400 mb-3" />
          <p className="font-semibold text-red-700">{errorMsg || t("import.somethingWrong")}</p>
          <button
            onClick={() => { setPhase("upload"); setErrorMsg(""); setJob(null); }}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            {t("import.tryAgain")}
          </button>
        </div>
      )}

      {/* Format hint */}
      {phase === "upload" && (
        <div className="mt-6 bg-gray-50 border rounded-xl p-5 text-sm text-gray-600 space-y-4">
          <div>
            <p className="font-semibold mb-2 text-gray-800">{t("import.requiredColumns")}</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Column</th>
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-700">Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["type", "single_choice | multiple_choice | true_false | short_answer"],
                    ["body", "Question text (any string)"],
                    ["option_a", "Text of option A (leave blank for short_answer)"],
                    ["option_b", "Text of option B"],
                    ["option_c", "Text of option C (optional)"],
                    ["option_d", "Text of option D (optional)"],
                    ["correct", "\"a\", \"b\", \"c\", \"d\" or \"a,c\" for multiple / \"true\" or \"false\" for T/F"],
                    ["points", "Number (default: 1)"],
                    ["explanation", "Optional — shown after answer"],
                  ].map(([col, desc]) => (
                    <tr key={col}>
                      <td className="py-1.5 px-2 font-mono text-gray-700 whitespace-nowrap">{col}</td>
                      <td className="py-1.5 px-2 text-gray-500">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2 text-gray-800">{t("import.exampleRows")}</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="text-xs w-full bg-white">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-700 font-bold">
                    {["type","body","option_a","option_b","option_c","option_d","correct","points","explanation"].map(h => (
                      <th key={h} className="py-1.5 px-2 text-left whitespace-nowrap border-b border-gray-200 font-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-mono text-purple-700">single_choice</td>
                    <td className="py-1.5 px-2">Capital of France?</td>
                    <td className="py-1.5 px-2">Berlin</td>
                    <td className="py-1.5 px-2 text-green-700 font-semibold">Paris</td>
                    <td className="py-1.5 px-2">Rome</td>
                    <td className="py-1.5 px-2">Madrid</td>
                    <td className="py-1.5 px-2 font-mono font-semibold">b</td>
                    <td className="py-1.5 px-2">1</td>
                    <td className="py-1.5 px-2 text-gray-400">Paris is the capital</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-mono text-purple-700">multiple_choice</td>
                    <td className="py-1.5 px-2">Which are planets?</td>
                    <td className="py-1.5 px-2 text-green-700 font-semibold">Earth</td>
                    <td className="py-1.5 px-2">Moon</td>
                    <td className="py-1.5 px-2 text-green-700 font-semibold">Mars</td>
                    <td className="py-1.5 px-2">Sun</td>
                    <td className="py-1.5 px-2 font-mono font-semibold">a,c</td>
                    <td className="py-1.5 px-2">2</td>
                    <td className="py-1.5 px-2 text-gray-400"></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-mono text-purple-700">true_false</td>
                    <td className="py-1.5 px-2">The sky is blue.</td>
                    <td className="py-1.5 px-2 text-gray-400">True</td>
                    <td className="py-1.5 px-2 text-gray-400">False</td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2 font-mono font-semibold">true</td>
                    <td className="py-1.5 px-2">1</td>
                    <td className="py-1.5 px-2 text-gray-400"></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-1.5 px-2 font-mono text-purple-700">short_answer</td>
                    <td className="py-1.5 px-2">Who wrote Hamlet?</td>
                    <td className="py-1.5 px-2 text-green-700 font-semibold">Shakespeare</td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2"></td>
                    <td className="py-1.5 px-2 font-mono font-semibold">a</td>
                    <td className="py-1.5 px-2">1</td>
                    <td className="py-1.5 px-2 text-gray-400"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{t("import.greenCorrect")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
