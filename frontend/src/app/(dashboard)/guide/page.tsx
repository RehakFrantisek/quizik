"use client";

import Link from "next/link";
import { BookOpen, Play, Users, Trophy, Settings, Share2, Upload, PlusCircle, Zap, ShieldCheck } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-violet-100 rounded-xl text-violet-600">{icon}</div>
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
    {children}
  </div>
);

const Step = ({ n, text }: { n: number; text: string }) => (
  <div className="flex items-start gap-3">
    <span className="shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center">{n}</span>
    <p className="text-sm text-gray-600 pt-0.5">{text}</p>
  </div>
);

const Tag = ({ color, text }: { color: string; text: string }) => (
  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>{text}</span>
);

export default function GuidePage() {
  const { t } = useLang();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center py-8 bg-gradient-to-br from-violet-600 to-indigo-500 rounded-3xl text-white shadow-lg">
        <p className="text-4xl mb-3">📚</p>
        <h1 className="text-3xl font-black mb-2">{t("guide.title")}</h1>
        <p className="text-violet-200 text-sm">{t("guide.subtitle")}</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/quizzes", icon: "📝", label: "Moje kvízy", sub: "My Quizzes" },
          { href: "/sessions", icon: "🎮", label: "Sessions", sub: "Quiz Sessions" },
          { href: "/groups", icon: "👥", label: "Skupiny", sub: "Groups" },
          { href: "/quizzes?new=1", icon: "✨", label: "Nový kvíz", sub: "New Quiz" },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex flex-col items-center gap-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-violet-300 hover:shadow-md transition-all text-center">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-bold text-gray-700">{item.label}</span>
            <span className="text-xs text-gray-400">{item.sub}</span>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Vytvoření kvízu */}
        <Section icon={<BookOpen size={20} />} title="1. Vytvoř kvíz (Quiz Template)">
          <div className="space-y-3 mb-4">
            <Step n={1} text='Jdi do "Moje kvízy" a klikni na "Nový kvíz".' />
            <Step n={2} text="Vyber prázdný kvíz nebo importuj ze souboru (CSV, XLSX) či sdíleného odkazu." />
            <Step n={3} text="V editoru přidávej otázky: výběr z možností, true/false, krátká odpověď." />
            <Step n={4} text='Jakmile je hotový, klikni "Publikovat" — kvíz je připraven k použití.' />
          </div>
          <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-700">
            <strong>Typy otázek:</strong> Jednoduchý výběr · Více správných · Pravda/lež · Krátká odpověď
          </div>
        </Section>

        {/* Sdílení kvízu */}
        <Section icon={<Share2 size={20} />} title="2. Sdílej kvíz (Clone & Share)">
          <div className="space-y-3 mb-4">
            <Step n={1} text='Na kartičce kvízu klikni na ikonu sdílení (🔗) — dostaneš krátký sdílecí kód.' />
            <Step n={2} text="Jiný učitel ho může importovat přes sdílecí kód a získá vlastní kopii." />
            <Step n={3} text="Klonování zkopíruje všechny otázky — každý má pak svou nezávislou verzi." />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Tag color="bg-blue-50 text-blue-700 border-blue-200" text="🔗 Sdílení odkazem" />
            <Tag color="bg-green-50 text-green-700 border-green-200" text="📋 Klonování" />
          </div>
        </Section>

        {/* Sessions */}
        <Section icon={<Play size={20} />} title="3. Spusť session (Quiz Session)">
          <div className="space-y-3 mb-4">
            <Step n={1} text='Jdi do "Spuštění" a klikni "Nové spuštění" — vyber publikovaný kvíz.' />
            <Step n={2} text="Nastav čas otevření/zavření, max. počet pokusů, zobrazení správných odpovědí." />
            <Step n={3} text="Sdílej odkaz /play/[kód] se studenty — přistupují bez přihlášení." />
            <Step n={4} text="Student zadá jméno, vybere avatara a hraje kvíz." />
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-xs text-green-700 space-y-1">
            <p><strong>Stavy session:</strong></p>
            <p><Tag color="bg-green-50 text-green-700 border-green-200" text="active" /> — studenti mohou hrát</p>
            <p><Tag color="bg-gray-100 text-gray-600 border-gray-200" text="closed" /> — session uzavřena, lze znovu otevřít</p>
            <p><Tag color="bg-gray-100 text-gray-500 border-gray-200" text="archived" /> — archivováno, jen pro čtení, nelze otevřít</p>
          </div>
        </Section>

        {/* Skupiny */}
        <Section icon={<Users size={20} />} title="4. Skupiny (Groups)">
          <div className="space-y-3 mb-4">
            <Step n={1} text='Jdi do "Skupiny" a vytvoř skupinu (např. třída 7.A).' />
            <Step n={2} text="Ve skupině spouštěj sessions — přehledně vidíš všechny kvízy dané třídy." />
            <Step n={3} text="Sessiony ve skupině lze mazat, otevírat nebo editovat přímo z detailu skupiny." />
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            Skupiny jsou ideální pro organizaci výuky po třídách nebo předmětech.
          </div>
        </Section>

        {/* Žebříček a výsledky */}
        <Section icon={<Trophy size={20} />} title="5. Výsledky a žebříček">
          <div className="space-y-3 mb-4">
            <Step n={1} text="V detailu session vidíš všechny pokusy — jméno, skóre, čas, procenta." />
            <Step n={2} text="Klikni na jméno studenta pro detailní přehled jeho odpovědí." />
            <Step n={3} text='Pokud je žebříček zapnut, sdílej odkaz /play/[kód]/leaderboard — vidí ho i studenti.' />
            <Step n={4} text="Nechtěný výsledek? Skryj ho z žebříčku ikonkou oka." />
          </div>
          <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700">
            Skóre = součet bodů za správné odpovědi + bonusové body z miniher.
          </div>
        </Section>

        {/* Nastavení session */}
        <Section icon={<Settings size={20} />} title="6. Pokročilá nastavení session">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <Zap size={15} className="text-indigo-500 shrink-0 mt-0.5" />
              <div><strong>Minihry (Gamifikace)</strong> — mezi otázkami se zobrazují rychlé minihry (Tap Sprint, Typing Race…). Nasbírané body se připočítají ke skóre.</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">🎯</span>
              <div><strong>Bonusy (Power-upy)</strong> — student dostane power-upy: 50/50, druhá šance, oprava jedné špatné odpovědi. Lze nastavit kdy se odemknou (hned / po X otázkách / náhodně).</div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck size={15} className="text-orange-500 shrink-0 mt-0.5" />
              <div><strong>Anti-cheat</strong> — záznamy přepnutí záložky, rychlých odpovědí nebo copy/paste jsou viditelné v detailu pokusu.</div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">🔀</span>
              <div><strong>Míchání</strong> — otázky i odpovědi lze náhodně zamíchat v každém pokusu.</div>
            </div>
          </div>
        </Section>

        {/* Import */}
        <Section icon={<Upload size={20} />} title="7. Import ze souboru">
          <div className="space-y-3 mb-4">
            <Step n={1} text="V Moje kvízy → Nový kvíz → Import ze souboru nahraj CSV nebo XLSX." />
            <Step n={2} text="Formát CSV: první sloupec = otázka, další sloupce = možnosti, poslední sloupec = správná odpověď (text)." />
            <Step n={3} text="Po importu zkontroluj otázky v editoru a publikuj." />
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-xs text-orange-700">
            <strong>CSV formát (příklad):</strong><br />
            <code className="font-mono block mt-1 whitespace-pre">Hlavní město ČR?,Praha,Brno,Ostrava,Praha</code>
          </div>
        </Section>

        {/* Jak hrát — pro studenty */}
        <Section icon={<PlusCircle size={20} />} title="8. Jak hrát — pro studenty">
          <div className="space-y-3 mb-4">
            <Step n={1} text="Otevři odkaz od učitele (nebo naskenuj QR kód)." />
            <Step n={2} text="Zadej své jméno a vyber avatara." />
            <Step n={3} text="Odpovídej na otázky — sleduj progress bar nahoře." />
            <Step n={4} text="Na konci uvidíš výsledek, správné odpovědi a (pokud je zapnut) žebříček." />
          </div>
          <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-700">
            Pokud jsou bonusy zapnuty, uvidíš tlačítka 🎯 50/50, 🔄 2. šance nebo ✏️ oprava na konci.
          </div>
        </Section>

      </div>

      {/* Footer CTA */}
      <div className="text-center py-6">
        <p className="text-gray-500 text-sm mb-4">Připraven/a začít?</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/quizzes" className="bg-gradient-to-r from-violet-600 to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-sm">
            Vytvořit první kvíz
          </Link>
        </div>
      </div>
    </div>
  );
}
