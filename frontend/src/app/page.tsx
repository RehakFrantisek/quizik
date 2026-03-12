export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-6">
      <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">Quizik Editor</h1>
      <p className="text-lg text-gray-600">Phase 4 Implementation Foundation</p>
      <a href="/quizzes" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition">
        Open Dashboard
      </a>
    </div>
  );
}
