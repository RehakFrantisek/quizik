"use client";

import Link from "next/link";
import { BookOpen, Play, Users, Trophy, Settings, Share2, Upload, PlusCircle, Zap, ShieldCheck, Sparkles, Link2, QrCode } from "lucide-react";
import { useLang } from "@/contexts/LangContext";

const Section = ({ icon, title, number, children, tone = "bg-white" }: { icon: React.ReactNode; title: string; number: string; children: React.ReactNode; tone?: string }) => (
  <div className={`${tone} rounded-3xl border border-white/70 shadow-sm p-7`}>
    <div className="flex items-center justify-between mb-5">
      <span className="text-5xl font-bold tracking-tight text-indigo-200">{number}</span>
      <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-2xl text-white shadow-lg shadow-indigo-500/25">{icon}</div>
    </div>
    <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">{title}</h2>
    {children}
  </div>
);

export default function GuidePage() {
  const { t } = useLang();

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
      <div className="rounded-[2rem] overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xl shadow-indigo-900/20">
        <div className="grid lg:grid-cols-2">
          <div className="p-10">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-[0.14em] uppercase mb-6"><Sparkles size={14} /> Knowledge reimagined</p>
            <h1 className="text-6xl font-bold tracking-tight mb-4">How Scholar Works</h1>
            <p className="text-indigo-100 text-xl font-medium leading-relaxed">{t("guide.subtitle")}</p>
          </div>
          <div className="hidden lg:block bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_55%)]" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section icon={<BookOpen size={20} />} number="01" title="Create Quiz">
          <p className="text-slate-600 font-medium mb-6">Craft professional assessments with AI-assisted editor. Choose from 10+ question formats.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-indigo-50 rounded-2xl p-4 text-center text-sm font-bold text-indigo-700">AI Draft</div>
            <div className="bg-indigo-50 rounded-2xl p-4 text-center text-sm font-bold text-indigo-700">Rich Media</div>
            <div className="bg-indigo-50 rounded-2xl p-4 text-center text-sm font-bold text-indigo-700">Import</div>
          </div>
        </Section>

        <Section icon={<Share2 size={20} />} number="02" title="Share Quiz" tone="bg-[#f1ecfb]">
          <p className="text-slate-600 font-medium mb-6">Seamlessly distribute your content via links, codes, or direct invitations.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-white p-4 text-sm font-medium text-slate-600"><span className="inline-flex items-center gap-2"><Link2 size={14} className="text-indigo-500" /> scholar.edu/q/v3-8921-j</span><span className="text-indigo-600 font-bold">COPY</span></div>
            <div className="flex items-center justify-between rounded-2xl bg-white p-4 text-sm font-medium text-slate-700"><span className="inline-flex items-center gap-2"><QrCode size={14} className="text-indigo-500" /> Generate QR Code</span><span>›</span></div>
          </div>
        </Section>

        <Section icon={<Play size={20} />} number="03" title="Start Session" tone="bg-slate-950 text-white border-slate-900">
          <p className="text-slate-300 font-medium mb-6">Go live in seconds. Host synchronous learning experiences with real-time feedback loops.</p>
          <button className="w-full rounded-full bg-white text-slate-900 py-3 font-semibold">Launch Dashboard</button>
        </Section>

        <Section icon={<Users size={20} />} number="04" title="Groups">
          <div className="grid sm:grid-cols-2 gap-3 text-sm font-medium text-slate-700">
            <div className="rounded-2xl bg-indigo-50 p-4"><h3 className="font-bold mb-1">Classroom Hubs</h3>Centralized folders for classes and subjects.</div>
            <div className="rounded-2xl bg-indigo-50 p-4"><h3 className="font-bold mb-1">Member Roles</h3>Assign leaders, editors, and viewers.</div>
          </div>
        </Section>
      </div>

      <div className="text-center py-10">
        <h2 className="text-5xl font-bold tracking-tight text-slate-900 mb-4">Ready to start your journey?</h2>
        <p className="text-slate-600 font-medium text-lg mb-7">The Scholar environment is designed for clarity. Join thousands of educators and students today.</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link href="/quizzes" className="bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-7 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-transform">Create My First Quiz</Link>
          <Link href="/groups" className="bg-indigo-100 text-indigo-700 px-7 py-3 rounded-full font-bold">Explore Community</Link>
        </div>
      </div>

      <div className="hidden">
        <Trophy />
        <Settings />
        <Upload />
        <PlusCircle />
        <Zap />
        <ShieldCheck />
      </div>
    </div>
  );
}
