"use client";

import { DashboardNav } from "@/components/DashboardNav";
import { useTheme } from "@/contexts/ThemeContext";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-slate-900" : "bg-gray-50"}`}>
      <DashboardNav />
      <main>{children}</main>
    </div>
  );
}
