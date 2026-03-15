"use client";

import { DashboardNav } from "@/components/DashboardNav";
import { useTheme } from "@/contexts/ThemeContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-900" : "bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50"}`}>
      <DashboardNav />
      <main className="flex-1">{children}</main>
      <footer className={`text-center text-xs py-4 border-t ${isDark ? "border-slate-700 text-slate-500" : "border-violet-100 text-gray-400"}`}>
        © 2026 Qvízovna, postavilo FJ
      </footer>
    </div>
  );
}
