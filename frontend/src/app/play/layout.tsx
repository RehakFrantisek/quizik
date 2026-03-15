"use client";

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Non-clickable logo header */}
      <header className="z-40 flex items-center justify-center py-3 border-b border-gray-100 bg-white/90 backdrop-blur shrink-0">
        <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent select-none">
          Qvízovna
        </span>
      </header>

      {/* Play content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs py-3 border-t border-gray-100 text-gray-400 bg-white/60 shrink-0">
        © 2026 Qvízovna, postavilo FJ Media
      </footer>
    </div>
  );
}
