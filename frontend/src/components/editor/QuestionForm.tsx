"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash, Eye, Edit, X, ImagePlus, Loader } from "lucide-react";
import { useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { useLang } from "@/contexts/LangContext";

type QuestionType = "single_choice" | "multiple_choice" | "true_false" | "short_answer";

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
}

interface QuestionFormData {
  type: QuestionType;
  body: string;
  explanation: string;
  points: number;
  options: Option[];
  accepted_answers: string[];
  image_url: string | null;
}

interface Props {
  initialData?: Partial<QuestionFormData> & { id?: string };
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
}

const DEFAULT_OPTION_IDS = ["a", "b", "c", "d"];

function defaultChoiceOptions(): Option[] {
  return DEFAULT_OPTION_IDS.map((id, idx) => ({ id, text: "", is_correct: idx === 0 }));
}

function nextOptionId(existing: Option[]): string {
  const used = new Set(existing.map((o) => o.id.toLowerCase()));
  for (const id of DEFAULT_OPTION_IDS) {
    if (!used.has(id)) return id;
  }
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  for (const ch of alphabet) {
    if (!used.has(ch)) return ch;
  }
  return `opt${existing.length + 1}`;
}

export function QuestionForm({ initialData, onSave, onCancel }: Props) {
  const { t } = useLang();
  const [preview, setPreview] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, watch, setValue } = useForm<QuestionFormData>({
    defaultValues: initialData
      ? { ...initialData, accepted_answers: (initialData as QuestionFormData).accepted_answers ?? [], image_url: (initialData as QuestionFormData).image_url ?? null }
      : {
          type: "single_choice",
          body: "",
          explanation: "",
          points: 1,
          options: defaultChoiceOptions(),
          accepted_answers: [],
          image_url: null,
        },
  });

  const imageUrl = watch("image_url");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getToken();
      const res = await fetch("/api/v1/uploads/question-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setValue("image_url", data.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const { fields, append, remove } = useFieldArray({ control, name: "options" });
  const questionType = watch("type");
  const acceptedAnswers: string[] = watch("accepted_answers") ?? [];

  const addAlias = () => {
    const trimmed = newAlias.trim();
    if (!trimmed || acceptedAnswers.includes(trimmed)) return;
    setValue("accepted_answers", [...acceptedAnswers, trimmed]);
    setNewAlias("");
  };

  const removeAlias = (idx: number) => {
    setValue("accepted_answers", acceptedAnswers.filter((_, i) => i !== idx));
  };

  if (preview) {
    const data = watch();
    return (
      <div className="border p-4 rounded-lg shadow-sm bg-white pb-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded">{data.type.replace(/_/g, " ")}</span>
          <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">{data.points} b.</span>
        </div>
        <p className="text-lg font-medium text-gray-800 mb-6 whitespace-pre-wrap">{data.body || "Question body..."}</p>
        {data.type !== "short_answer" && (
          <div className="space-y-3 mb-6">
            {data.options.map((opt, i) => (
              <div key={i} className={`p-3 border rounded-lg flex items-center transition-all ${opt.is_correct ? "bg-green-50 border-green-300 shadow-sm" : "bg-gray-50 border-gray-200"}`}>
                <div className={`w-8 h-8 rounded flex justify-center items-center text-sm font-bold mr-3 ${opt.is_correct ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                  {opt.id.toUpperCase() || "?"}
                </div>
                <span className="text-gray-700">{opt.text || t("qform.emptyOption")}</span>
              </div>
            ))}
          </div>
        )}
        {data.explanation && (
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r text-sm mb-4">
            <strong className="block mb-1 text-blue-900">{t("qform.explanation")}:</strong> {data.explanation}
          </div>
        )}
        <button type="button" onClick={() => setPreview(false)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mt-4 font-medium transition-colors">
          <Edit size={16} /> {t("qform.editQuestion")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-gray-200 p-6 rounded-xl shadow-sm bg-white space-y-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h3 className="font-bold text-xl text-gray-800">{initialData ? t("qform.editQuestion") : t("editor.addQuestion")}</h3>
        <button type="button" onClick={() => setPreview(true)} className="flex items-center gap-2 text-sm bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 font-medium transition-colors">
          <Eye size={16} /> {t("qform.previewMode")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t("qform.questionType")}</label>
          <select {...register("type")} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            onChange={(e) => {
              const val = e.target.value as QuestionType;
              setValue("type", val);
              if (val === "true_false") {
                setValue("options", [
                  { id: "true", text: "True", is_correct: true },
                  { id: "false", text: "False", is_correct: false },
                ]);
              } else if (val === "single_choice" || val === "multiple_choice") {
                const current = watch("options");
                if (!current || current.length === 0 || current.every((o) => o.id === "true" || o.id === "false")) {
                  setValue("options", defaultChoiceOptions());
                }
              }
            }}>
            <option value="single_choice">{t("qform.typeSingle")}</option>
            <option value="multiple_choice">{t("qform.typeMultiple")}</option>
            <option value="true_false">{t("qform.typeTrueFalse")}</option>
            <option value="short_answer">{t("qform.typeShortAnswer")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t("qform.pointsAwarded")}</label>
          <input type="number" {...register("points", { valueAsNumber: true })} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" min="1" max="100" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t("qform.questionBody")}</label>
        <textarea {...register("body", { required: true })} className="w-full border border-gray-300 p-3 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" placeholder="e.g. What is the capital of France?" />
      </div>

      {/* Question image (optional) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t("qform.imageOptional")}</label>
        {imageUrl ? (
          <div className="relative inline-block">
            <img src={imageUrl} alt="Question image" className="max-h-40 rounded-lg border border-gray-200 object-contain" />
            <button
              type="button"
              onClick={() => setValue("image_url", null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-2 text-sm border border-dashed border-gray-300 text-gray-500 px-4 py-2 rounded-lg hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
            >
              {uploadingImage ? <Loader size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {uploadingImage ? "…" : t("qform.uploadImage")}
            </button>
          </div>
        )}
        <input type="hidden" {...register("image_url")} />
      </div>

      {questionType !== "short_answer" && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t("qform.options")}</label>
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white p-2 rounded shadow-sm border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer pl-2" title="Mark as Correct Answer">
                <input type="checkbox" {...register(`options.${index}.is_correct`)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase">{t("qform.correct")}</span>
              </label>
              <input type="text" {...register(`options.${index}.id`)} className="w-16 border border-gray-300 p-2 rounded text-center uppercase font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ID (A, B)" />
              <input type="text" {...register(`options.${index}.text`)} className="flex-1 min-w-[200px] border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Option text..." />
              {questionType !== "true_false" && (
                <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-red-500 p-2 rounded transition-colors" title="Remove Option">
                  <Trash size={18} />
                </button>
              )}
            </div>
          ))}
          {questionType !== "true_false" && (
            <button type="button" onClick={() => append({ id: nextOptionId(watch("options") ?? []), text: "", is_correct: false })} className="flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors mt-3">
              <Plus size={16} /> {t("qform.addAnotherOption")}
            </button>
          )}
        </div>
      )}

      {/* Short answer: correct answer field + accepted aliases */}
      {questionType === "short_answer" && (
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t("qform.correctAnswer")}</label>
            <input
              type="text"
              {...register("options.0.text")}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={t("qform.correctAnswerPlaceholder")}
            />
            <input type="hidden" {...register("options.0.id")} value="correct" />
            <input type="hidden" {...register("options.0.is_correct")} value="true" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t("qform.acceptedAliases")}</label>
            <p className="text-xs text-gray-500 mb-2">{t("qform.acceptedAliasesHint")}</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
                placeholder="e.g. A. Hitler, Adolf H."
                className="flex-1 border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button type="button" onClick={addAlias} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100">
                <Plus size={14} /> {t("qform.addAlias")}
              </button>
            </div>
            {acceptedAnswers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {acceptedAnswers.map((alias, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 text-xs px-2 py-1 rounded-lg">
                    {alias}
                    <button type="button" onClick={() => removeAlias(idx)} className="text-gray-400 hover:text-red-500 ml-0.5">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{t("qform.explanation")}</label>
        <textarea {...register("explanation")} className="w-full border border-gray-300 p-3 rounded-lg h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" placeholder={t("qform.explanationPlaceholder")} />
      </div>

      <div className="flex gap-3 justify-end pt-6 border-t mt-4">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">{t("common.cancel")}</button>
        <button type="submit" className="px-5 py-2.5 font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">{t("qform.saveQuestion")}</button>
      </div>
    </form>
  );
}
