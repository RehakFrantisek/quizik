"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Zap, Users, BarChart2, Shield, Repeat, Globe, LogOut, UserCircle, Sparkles, Trophy } from "lucide-react";

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
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/90 backdrop-blur-md p-4 border border-white/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 text-white flex items-center justify-center"><Trophy size={18} /></div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Top skóre</p>
                  <p className="text-sm font-semibold text-slate-800">Jan Novák · 98%</p>
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
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm">© 2026 Luminescent Scholar. Curating the future of wisdom.</div>
      </footer>
    </div>
  );
}
