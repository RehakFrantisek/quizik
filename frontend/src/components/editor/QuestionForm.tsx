"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash, Eye, Edit } from "lucide-react";
import { useState } from "react";

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
}

interface Props {
  initialData?: Partial<QuestionFormData> & { id?: string };
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
}

export function QuestionForm({ initialData, onSave, onCancel }: Props) {
  const [preview, setPreview] = useState(false);
  
  const { register, control, handleSubmit, watch, setValue } = useForm<QuestionFormData>({
    defaultValues: initialData || {
      type: "single_choice",
      body: "",
      explanation: "",
      points: 1,
      options: [
        { id: "a", text: "", is_correct: true },
        { id: "b", text: "", is_correct: false },
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options"
  });

  const questionType = watch("type");

  if (preview) {
    const data = watch();
    return (
      <div className="border p-4 rounded-lg shadow-sm bg-white pb-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded">{data.type.replace('_', ' ')}</span>
          <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">{data.points} points</span>
        </div>
        <p className="text-lg font-medium text-gray-800 mb-6 whitespace-pre-wrap">{data.body || "Question body..."}</p>
        
        {data.type !== "short_answer" && (
          <div className="space-y-3 mb-6">
            {data.options.map((opt, i) => (
              <div key={i} className={`p-3 border rounded-lg flex items-center transition-all ${opt.is_correct ? 'bg-green-50 border-green-300 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`w-8 h-8 rounded flex justify-center items-center text-sm font-bold mr-3 ${opt.is_correct ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                   {opt.id.toUpperCase() || '?'}
                </div> 
                <span className="text-gray-700">{opt.text || "Empty Option"}</span>
              </div>
            ))}
          </div>
        )}
        
        {data.explanation && (
          <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r text-sm mb-4">
            <strong className="block mb-1 text-blue-900">Explanation:</strong> {data.explanation}
          </div>
        )}
        
        <button type="button" onClick={() => setPreview(false)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mt-4 font-medium transition-colors">
          <Edit size={16} /> Edit Question
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="border border-gray-200 p-6 rounded-xl shadow-sm bg-white space-y-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h3 className="font-bold text-xl text-gray-800">{initialData ? 'Edit Question' : 'Add Question'}</h3>
        <button type="button" onClick={() => setPreview(true)} className="flex items-center gap-2 text-sm bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 font-medium transition-colors">
          <Eye size={16} /> Preview Mode
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type</label>
          <select {...register("type")} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" onChange={(e) => {
            const val = e.target.value as QuestionType;
            setValue("type", val);
            if (val === "true_false") {
              setValue("options", [
                { id: "true", text: "True", is_correct: true },
                { id: "false", text: "False", is_correct: false }
              ]);
            }
          }}>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True / False</option>
            <option value="short_answer">Short Answer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Points Awarded</label>
          <input type="number" {...register("points", { valueAsNumber: true })} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" min="1" max="100" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Question Body</label>
        <textarea {...register("body", { required: true })} className="w-full border border-gray-300 p-3 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" placeholder="e.g. What is the capital of France?" />
      </div>

      {questionType !== "short_answer" && (
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Options</label>
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white p-2 rounded shadow-sm border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer pl-2" title="Mark as Correct Answer">
                <input type="checkbox" {...register(`options.${index}.is_correct`)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase">Correct</span>
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
            <button type="button" onClick={() => append({ id: "", text: "", is_correct: false })} className="flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors mt-3">
              <Plus size={16} /> Add Another Option
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Explanation <span className="text-gray-400 font-normal">(Optional)</span></label>
        <textarea {...register("explanation")} className="w-full border border-gray-300 p-3 rounded-lg h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" placeholder="This will be shown after the user answers..." />
      </div>

      <div className="flex gap-3 justify-end pt-6 border-t mt-4">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <button type="submit" className="px-5 py-2.5 font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">Save Question</button>
      </div>
    </form>
  );
}
