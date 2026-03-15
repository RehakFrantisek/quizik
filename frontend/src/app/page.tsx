"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight, Zap, Users, BarChart2, Shield, Repeat, Globe, LogOut, UserCircle } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Živé kvízy v reálném čase",
    desc: "Spusť kvíz a studenti se připojí přes QR kód nebo odkaz — žádná instalace, žádná registrace.",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Users,
    title: "Skupiny a třídy",
    desc: "Organizuj studenty do skupin. Každé spuštění lze přiřadit konkrétní třídě.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: BarChart2,
    title: "Žebříček a přehledy",
    desc: "Okamžité výsledky, žebříček po každém kole a detailní přehled odpovědí.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: Shield,
    title: "Anticheat monitoring",
    desc: "Volitelné sledování přepínání karet, rychlých odpovědí a dalších podezřelých vzorců.",
    color: "text-red-500",
    bg: "bg-red-50",
  },
  {
    icon: Repeat,
    title: "Import a klonování",
    desc: "Nahraj otázky z Excelu nebo CSV. Klonuj existující kvízy jedním klikem.",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    icon: Globe,
    title: "Čeština i angličtina",
    desc: "Plně lokalizovaná platforma. Přepni jazyk rozhraní kdykoliv.",
    color: "text-indigo-500",
    bg: "bg-indigo-50",
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-violet-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
            Qvízovna
          </span>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/quizzes"
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
                  title={user.display_name || user.email}
                >
                  <UserCircle size={18} />
                  <span className="hidden sm:inline">{user.display_name || user.email}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
                  title="Odhlásit se"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Odhlásit se</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                  Přihlásit se
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Registrovat se
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-500 w-20 h-20 rounded-3xl shadow-xl mb-6">
          <Sparkles size={36} className="text-white" />
        </div>
        <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent tracking-tight mb-4">
          Qvízovna
        </h1>
        <p className="text-xl text-gray-600 max-w-xl mx-auto mb-8">
          Kvízová platforma pro školy a studenty. Vytvářej interaktivní testy, spouštěj živá kola a sleduj výsledky v reálném čase.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {user ? (
            <Link
              href="/quizzes"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity text-lg"
            >
              Přejít na kvízy <ArrowRight size={20} />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg hover:opacity-90 transition-opacity text-lg"
              >
                Registrovat se <ArrowRight size={20} />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 border border-violet-200 text-violet-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-violet-50 transition-colors text-lg"
              >
                Přihlásit se
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-black text-gray-800 text-center mb-10">
          Vše, co potřebuješ
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-violet-100 hover:shadow-md transition-shadow">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${f.bg} mb-4`}>
                <f.icon size={20} className={f.color} />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-500 rounded-3xl p-10 text-center shadow-xl">
          <h2 className="text-3xl font-black text-white mb-3">Připraveno ke spuštění</h2>
          <p className="text-violet-100 mb-6 text-lg">Zaregistruj se a vytvoř první kvíz za méně než 5 minut.</p>
          <Link
            href={user ? "/quizzes" : "/register"}
            className="inline-flex items-center gap-2 bg-white text-violet-700 px-8 py-3.5 rounded-xl font-bold shadow hover:bg-violet-50 transition-colors text-lg"
          >
            {user ? "Přejít na kvízy" : "Začít zdarma"} <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs py-6 border-t border-violet-100 text-gray-400">
        © 2026 Qvízovna, postavilo FJ Media
      </footer>
    </div>
  );
}
