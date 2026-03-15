"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LangContext";
import { LogOut, Moon, Sun, PlusCircle, Users, LayoutDashboard, Play, UserCircle, BookOpen, Menu, X, ShieldCheck } from "lucide-react";

export function DashboardNav() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = theme === "dark";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/quizzes", label: t("nav.home"), icon: <LayoutDashboard size={15} /> },
    { href: "/sessions", label: t("nav.sessions"), icon: <Play size={15} /> },
    { href: "/groups", label: t("nav.groups"), icon: <Users size={15} /> },
    { href: "/guide", label: t("nav.guide"), icon: <BookOpen size={15} /> },
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: <ShieldCheck size={15} /> }] : []),
  ];

  const navLink = (href: string, label: string, icon: React.ReactNode, onClick?: () => void) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        onClick={onClick}
        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition-all ${
          active
            ? isDark ? "bg-violet-900/50 text-violet-300" : "bg-violet-100 text-violet-700"
            : isDark ? "text-gray-400 hover:bg-slate-700 hover:text-violet-300" : "text-gray-600 hover:bg-violet-50 hover:text-violet-600"
        }`}
      >
        {icon} {label}
      </Link>
    );
  };

  const btnClass = `flex items-center gap-1.5 text-sm px-2.5 py-2 rounded-lg border ml-0.5 transition-colors ${
    isDark ? "text-gray-400 border-slate-700 hover:bg-slate-700 hover:text-violet-300" : "text-gray-500 border-gray-200 hover:bg-violet-50 hover:text-violet-600"
  }`;

  return (
    <>
      <nav className={`sticky top-0 z-40 ${isDark ? "bg-slate-900/95 border-slate-700" : "bg-white/90 border-violet-100"} backdrop-blur border-b px-4 md:px-6 py-3 flex items-center justify-between shadow-sm`}>
        <div className="flex items-center gap-2">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className={`md:hidden p-1.5 rounded-lg ${isDark ? "text-gray-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100"}`}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link
            href="/"
            className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            Qvízovna
          </Link>

          <div className="hidden md:flex items-center gap-1 ml-2">
            {navLinks.map((l) => navLink(l.href, l.label, l.icon))}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Link
            href="/quizzes?new=1"
            className="hidden md:flex items-center gap-1.5 text-sm bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-4 py-2 rounded-lg hover:opacity-90 mr-1 transition-opacity font-semibold shadow-sm whitespace-nowrap"
          >
            <PlusCircle size={15} /> {t("nav.newQuiz")}
          </Link>

          <Link
            href="/profile"
            className={btnClass}
            title={user?.display_name || "My Profile"}
          >
            <UserCircle size={16} />
          </Link>

          <button
            onClick={toggleLang}
            className={`text-xs font-bold px-2.5 py-2 rounded-lg border ml-0.5 transition-colors min-w-[40px] ${
              isDark ? "text-gray-400 border-slate-700 hover:bg-slate-700 hover:text-violet-300" : "text-gray-500 border-gray-200 hover:bg-violet-50 hover:text-violet-600"
            }`}
            title={lang === "en" ? "Switch to Czech" : "Přepnout na angličtinu"}
          >
            {lang === "en" ? "CZ" : "EN"}
          </button>

          <button
            onClick={toggleTheme}
            className={btnClass}
            title={theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border ml-0.5 transition-colors ${
              isDark ? "text-gray-400 border-slate-700 hover:bg-red-900/30 hover:text-red-400" : "text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600"
            }`}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className={`md:hidden fixed top-[57px] left-0 right-0 z-30 border-b shadow-lg ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-violet-100"}`}>
          <div className="flex flex-col p-3 gap-1">
            {navLinks.map((l) => navLink(l.href, l.label, l.icon, () => setMobileOpen(false)))}
            <Link
              href="/quizzes?new=1"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 text-sm bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-4 py-2 rounded-lg hover:opacity-90 mt-1 transition-opacity font-semibold"
            >
              <PlusCircle size={15} /> {t("nav.newQuiz")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
