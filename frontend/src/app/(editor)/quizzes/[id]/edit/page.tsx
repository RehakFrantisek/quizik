"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { QuestionForm } from "@/components/editor/QuestionForm";
import { ArrowLeft, Plus, Check } from "lucide-react";
import Link from "next/link";

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
  status: string;
  questions: Question[];
}

export default function QuizEditor() {
  const { id } = useParams();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  useEffect(() => {
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
        description: quiz.description
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save quiz metadata");
    } finally {
      setSaving(false);
    }
  };

  const publishQuiz = async () => {
    try {
      await apiClient.post(`/quizzes/${id}/publish`, {});
      alert("Quiz published!");
      loadQuiz();
    } catch (err: unknown) {
      alert(`Publish failed: ${err instanceof Error ? err.message : String(err)}`);
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
    if (!confirm("Delete question?")) return;
    try {
      await apiClient.delete(`/quizzes/${id}/questions/${qId}`);
      loadQuiz();
    } catch (err) {
      console.error(err);
      alert("Failed to delete question");
    }
  };

  if (loading) return <div className="p-8">Loading editor...</div>;
  if (!quiz) return <div className="p-8 text-red-500">Quiz not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <Link href="/quizzes" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border">
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${quiz.status === 'published' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}>
            {quiz.status}
          </span>
          {quiz.status !== 'published' && (
            <button onClick={publishQuiz} className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-colors">
              Publish Quiz
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Quiz Meta Form */}
        <form onSubmit={saveQuizMeta} className="bg-white p-6 md:p-8 rounded-xl shadow border border-gray-100">
          <h2 className="text-2xl font-black text-gray-800 mb-6 border-b pb-4">Quiz Details</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Quiz Title</label>
              <input 
                type="text" 
                value={quiz.title} 
                onChange={e => setQuiz({...quiz, title: e.target.value})}
                className="w-full border border-gray-300 p-3 rounded-lg text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
              <textarea 
                value={quiz.description || ''} 
                onChange={e => setQuiz({...quiz, description: e.target.value})}
                className="w-full border border-gray-300 p-3 rounded-lg h-28 resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                placeholder="Briefly describe what this quiz is about..."
              />
            </div>
            <button type="submit" disabled={saving} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium transition-colors w-full md:w-auto mt-2">
              {saving ? 'Saving...' : 'Save Description'}
            </button>
          </div>
        </form>

        {/* Questions Section */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow border border-gray-100">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 border-b pb-4 gap-4">
            <h2 className="text-2xl font-black text-gray-800">Questions <span className="text-gray-400 font-medium text-lg ml-2">({quiz.questions.length})</span></h2>
            {!isAddingQuestion && !editingQuestionId && (
              <button 
                onClick={() => setIsAddingQuestion(true)}
                className="flex justify-center items-center gap-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 font-bold transition-colors w-full md:w-auto"
              >
                <Plus size={18} /> Add New Question
              </button>
            )}
          </div>

          <div className="space-y-6">
            {quiz.questions.map((q: Question, i: number) => (
              <div key={q.id}>
                {editingQuestionId === q.id ? (
                  <QuestionForm 
                    initialData={q} 
                    onSave={handleSaveQuestion} 
                    onCancel={() => setEditingQuestionId(null)} 
                  />
                ) : (
                  <div className="border border-gray-200 p-5 rounded-xl flex gap-5 bg-white hover:border-indigo-300 hover:shadow-md transition-all relative group">
                    <div className="text-indigo-200 font-black text-3xl w-8 shrink-0 flex items-start">{i + 1}.</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md uppercase tracking-wide">
                          {q.type.replace('_', ' ')}
                        </span>
                        <span className="text-sm border bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md font-semibold">{q.points} pt</span>
                      </div>
                      <p className="font-semibold text-gray-800 text-lg whitespace-pre-wrap mb-4">{q.body}</p>
                      
                      {q.type !== 'short_answer' && (
                        <div className="space-y-2 pl-4 border-l-4 border-gray-100">
                          {q.options.map((opt: Option, idx: number) => (
                            <div key={idx} className={`text-sm flex items-center gap-3 p-2 rounded-md ${opt.is_correct ? 'bg-green-50 text-green-800 font-bold border border-green-200' : 'text-gray-600'}`}>
                              <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${opt.is_correct ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-700'}`}>{opt.id.toUpperCase()}</span>
                              <span className="flex-1">{opt.text}</span>
                              {opt.is_correct && <Check size={16} className="text-green-600 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Floating Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingQuestionId(q.id)} className="text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 border border-blue-200 text-sm font-medium px-3 py-1.5 rounded shadow-sm transition-colors">
                        Edit
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} className="text-red-600 hover:text-white hover:bg-red-600 bg-red-50 border border-red-200 text-sm font-medium px-3 py-1.5 rounded shadow-sm transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isAddingQuestion && (
              <QuestionForm 
                onSave={handleSaveQuestion} 
                onCancel={() => setIsAddingQuestion(false)} 
              />
            )}

            {!isAddingQuestion && quiz.questions.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-gray-500 py-16 px-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <div className="bg-gray-200 p-4 rounded-full mb-4">
                   <Plus size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-700 mb-2">No questions yet</h3>
                <p className="max-w-sm mb-6">Start building your quiz by adding single choice, multiple choice, true/false, or short answer questions.</p>
                <button 
                  onClick={() => setIsAddingQuestion(true)}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-semibold shadow-sm transition-colors"
                >
                  Create First Question
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
