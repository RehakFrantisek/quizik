"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { PlusCircle, Edit } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  status: string;
  questions?: unknown[];
}

export default function QuizzesDashboard() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const data = await apiClient.get('/quizzes');
      if (Array.isArray(data)) {
        setQuizzes(data);
      } else {
        console.error("API did not return an array:", data);
        setQuizzes([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createQuiz = async () => {
    try {
      const data = await apiClient.post('/quizzes', { title: "Untitled Quiz" });
      router.push(`/quizzes/${data.id}/edit`);
    } catch (err) {
      console.error("Failed to create quiz", err);
    }
  };

  if (loading) return <div className="p-8">Loading quizzes...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Quizzes</h1>
        <button 
          onClick={createQuiz}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          <PlusCircle size={20} />
          Create New Quiz
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border rounded-lg bg-gray-50">
          No quizzes yet. Create one to get started!
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="border p-4 rounded-lg flex justify-between items-center shadow-sm">
              <div>
                <h3 className="text-xl font-semibold">{quiz.title}</h3>
                <p className="text-sm text-gray-500">Status: {quiz.status} • Questions: {quiz.questions?.length || 0}</p>
              </div>
              <Link 
                href={`/quizzes/${quiz.id}/edit`}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded"
              >
                <Edit size={16} />
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
