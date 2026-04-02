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
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      <DashboardNav />
      <main className="flex-1">{children}</main>
      <footer className={`text-center text-xs py-4 border-t ${isDark ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-500"}`}>
        © 2026 Qvízovna, postavilo FJ
      </footer>
    </div>
  );
}
