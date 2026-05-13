"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Zap, Users, BarChart2, Shield, Repeat, Globe, LogOut, UserCircle, Sparkles, FileText } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Živé kvízy v reálném čase",
    desc: "Spouštějte kvízy přímo v hodině a sledujte odpovědi studentů sekundu po sekundě.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    icon: Users,
    title: "Skupiny a třídy",
    desc: "Organizujte studenty do tříd, přiřazujte kvízy a budujte dlouhodobé learning pathy.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart2,
    title: "Žebříček a přehledy",
    desc: "Získejte detailní výsledky a datové přehledy pro každou otázku i každého studenta.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: Shield,
    title: "Anticheat monitoring",
    desc: "Automatická detekce podezřelého chování při testu a transparentní audit pokusů.",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    icon: Repeat,
    title: "Import a klonování",
    desc: "Importujte otázky z XLSX/CSV nebo klonujte šablony mezi kolegy během pár sekund.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    icon: Globe,
    title: "Čeština i angličtina",
    desc: "Lokalizované prostředí pro české školy i mezinárodní programy.",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
];

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [quizCount, setQuizCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/health/stats`)
      .then((r) => r.json())
      .then((d: { quiz_count: number; user_count: number }) => {
        setQuizCount(d.quiz_count);
        setUserCount(d.user_count);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#f3eefb] text-slate-900">
      <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">Qvízovna</span>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/quizzes" className="hidden sm:flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-semibold" title={user.display_name || user.email}>
                  <UserCircle size={18} />
                  <span>{user.display_name || user.email}</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-rose-600 transition-colors font-semibold" title="Odhlásit se">
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Odhlásit se</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-semibold">Přihlásit se</Link>
                <Link href="/register" className="text-sm bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-5 py-2 rounded-full font-semibold shadow-lg shadow-indigo-500/25 active:scale-95 transition-transform">Registrovat se</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-14 pb-12 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] uppercase text-indigo-700 bg-indigo-100 rounded-full px-3 py-1.5 mb-5">
            <Sparkles size={14} /> Vzdělávání 2.0
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-4">Qvízovna</h1>
          <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-xl mb-8">
            Interaktivní kvízová platforma navržená speciálně pro školy a studenty. Moderní způsob, jak testovat znalosti a zapojit celou třídu do výuky.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={user ? "/quizzes" : "/register"} className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-7 py-3 rounded-full font-semibold shadow-xl shadow-indigo-500/25 active:scale-95 transition-transform">
              {user ? "Přejít na kvízy" : "Registrovat se"} <ArrowRight size={18} />
            </Link>
            <Link href={user ? "/guide" : "/login"} className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-md text-indigo-700 px-7 py-3 rounded-full font-semibold border border-white/80 hover:bg-white transition-colors">
              {user ? "Prohlédnout průvodce" : "Přihlásit se"}
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-3 shadow-sm border border-white/80">
          <div className="rounded-[1.5rem] h-[320px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(99,102,241,0.45),transparent_60%)]" />

            {/* Mini quiz question preview */}
            <div className="absolute top-5 left-5 right-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-2">Ukázka otázky</p>
              <p className="text-sm font-semibold text-white mb-3 leading-snug">Hlavní město Francie je…?</p>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-emerald-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/30 text-[9px] font-black flex items-center justify-center">A</span> Paříž
                </div>
                <div className="bg-white/10 text-white/70 text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-[9px] font-black flex items-center justify-center">B</span> Lyon
                </div>
                <div className="bg-white/10 text-white/70 text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-[9px] font-black flex items-center justify-center">C</span> Nice
                </div>
                <div className="bg-white/10 text-white/70 text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-white/10 text-[9px] font-black flex items-center justify-center">D</span> Marseille
                </div>
              </div>
            </div>

            {/* Stats card */}
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/90 backdrop-blur-md p-3.5 border border-white/80 flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 text-white flex items-center justify-center shrink-0"><FileText size={15} /></div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Vytvořených kvízů</p>
                  <p className="text-lg font-black text-slate-800 leading-none mt-0.5">{quizCount !== null ? quizCount : "—"}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Učitelů na platformě</p>
                  <p className="text-lg font-black text-slate-800 leading-none mt-0.5">{userCount !== null ? userCount : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-[#eee8f8] rounded-[2rem] p-8 md:p-10">
          <h2 className="text-4xl font-bold tracking-tight text-center text-slate-900 mb-3">Vše, co potřebujete pro moderní výuku</h2>
          <p className="text-center text-slate-600 font-medium mb-10">Nástroje navržené učiteli pro učitele, zaměřené na efektivitu a zapojení studentů.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-3xl p-6 shadow-sm border border-white/80 hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${f.bg} mb-4`}>
                  <f.icon size={20} className={f.color} />
                </div>
                <h3 className="font-bold tracking-tight text-slate-900 mb-2 text-xl">{f.title}</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-500 rounded-[2rem] p-10 text-center shadow-xl shadow-indigo-600/25">
          <h2 className="text-5xl font-bold tracking-tight text-white mb-4">Připraveni začít?</h2>
          <p className="text-indigo-100 mb-8 text-lg font-medium">Vytvořte svůj první kvíz během několika minut. Registrace je zdarma pro všechny učitele.</p>
          <Link href={user ? "/quizzes" : "/register"} className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-full font-bold shadow hover:bg-indigo-50 transition-colors active:scale-95">
            {user ? "Přejít na kvízy" : "Začít zdarma"} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="bg-slate-100/90 border-t border-slate-200 text-slate-500">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="font-bold text-slate-700 mb-2">Qvízovna</p>
            <p className="text-slate-500">Kvízová platforma pro moderní školy.</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-2">Produkt</p>
            <ul className="space-y-1">
              <li><a href="/quizzes" className="hover:text-slate-700 transition-colors">Kvízy</a></li>
              <li><a href="/sessions" className="hover:text-slate-700 transition-colors">Spuštění</a></li>
              <li><a href="/groups" className="hover:text-slate-700 transition-colors">Skupiny</a></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-2">Zdroje</p>
            <ul className="space-y-1">
              <li><a href="/guide" className="hover:text-slate-700 transition-colors">Průvodce</a></li>
              <li><a href="/import" className="hover:text-slate-700 transition-colors">Import</a></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-2">Účet</p>
            <ul className="space-y-1">
              <li><a href="/login" className="hover:text-slate-700 transition-colors">Přihlásit se</a></li>
              <li><a href="/register" className="hover:text-slate-700 transition-colors">Registrovat se</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-6 text-xs text-slate-400 border-t border-slate-200 pt-4">
          © 2026 Qvízovna. Všechna práva vyhrazena.
        </div>
      </footer>
    </div>
  );
}
