"use client";

import Link from "next/link";
import {
  Play,
  Users,
  Share2,
  BarChart2,
  Download,
  FileText,
  SlidersHorizontal,
  GraduationCap,
  Globe2,
  MessageSquarePlus,
} from "lucide-react";
import { useLang } from "@/contexts/LangContext";

interface GuideCardProps {
  number: string;
  icon: React.ReactNode;
  title: string;
  steps: string[];
  chips?: string[];
  extra?: React.ReactNode;
}

function GuideCard({ number, icon, title, steps, chips, extra }: GuideCardProps) {
  return (
    <div className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-3xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <span className="font-extrabold text-4xl text-gray-200 dark:text-gray-700 leading-none select-none">
          {number}
        </span>
        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
          {icon}
        </div>
      </div>

      <h2 className="font-bold text-[1rem] text-gray-900 dark:text-gray-100 leading-snug -mt-1">
        {title}
      </h2>

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 w-[18px] h-[18px] rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{step}</span>
          </div>
        ))}
      </div>

      {extra && <div className="mt-auto">{extra}</div>}

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {chips.map((chip) => (
            <span
              key={chip}
              className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const { t } = useLang();

  const cards = [
    {
      number: "01",
      icon: <FileText size={18} />,
      title: t("guide.step1.title"),
      steps: [
        t("guide.step1.s1"),
        t("guide.step1.s2"),
        t("guide.step1.s3"),
        t("guide.step1.s4"),
      ],
      chips: [t("guide.step1.sub1"), t("guide.step1.sub2"), t("guide.step1.sub3")],
    },
    {
      number: "02",
      icon: <Share2 size={18} />,
      title: t("guide.step2.title"),
      steps: [
        t("guide.step2.s1"),
        t("guide.step2.s2"),
        t("guide.step2.s3"),
      ],
      extra: (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 font-mono">
          <span className="flex-1 truncate">qvizovna.app/q/abc-1234</span>
          <button className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold uppercase tracking-wide">
            COPY
          </button>
        </div>
      ),
      chips: [t("guide.step2.sub1")],
    },
    {
      number: "03",
      icon: <Play size={18} />,
      title: t("guide.step3.title"),
      steps: [
        t("guide.step3.s1"),
        t("guide.step3.s2"),
        t("guide.step3.s3"),
        t("guide.step3.s4"),
      ],
      chips: [t("guide.step3.sub1"), t("guide.step3.sub2")],
    },
    {
      number: "04",
      icon: <Users size={18} />,
      title: t("guide.step4.title"),
      steps: [
        t("guide.step4.s1"),
        t("guide.step4.s2"),
        t("guide.step4.s3"),
      ],
    },
    {
      number: "05",
      icon: <BarChart2 size={18} />,
      title: t("guide.step5.title"),
      steps: [
        t("guide.step5.s1"),
        t("guide.step5.s2"),
        t("guide.step5.s3"),
      ],
    },
    {
      number: "06",
      icon: <SlidersHorizontal size={18} />,
      title: t("guide.step6.title"),
      steps: [
        t("guide.step6.s1"),
        t("guide.step6.s2"),
        t("guide.step6.s3"),
        t("guide.step6.s4"),
      ],
      chips: [t("guide.step6.sub1"), t("guide.step6.sub2"), t("guide.step6.sub3"), t("guide.step6.sub4")],
    },
    {
      number: "07",
      icon: <Download size={18} />,
      title: t("guide.step7.title"),
      steps: [
        t("guide.step7.s1"),
        t("guide.step7.s2"),
        t("guide.step7.s3"),
      ],
      chips: [t("guide.step7.sub1"), t("guide.step7.sub2"), t("guide.step7.sub3")],
    },
    {
      number: "08",
      icon: <GraduationCap size={18} />,
      title: t("guide.step8.title"),
      steps: [
        t("guide.step8.s1"),
        t("guide.step8.s2"),
        t("guide.step8.s3"),
        t("guide.step8.s4"),
      ],
      chips: [t("guide.step8.sub1"), t("guide.step8.sub2")],
    },
    {
      number: "09",
      icon: <Globe2 size={18} />,
      title: t("guide.step9.title"),
      steps: [
        t("guide.step9.s1"),
        t("guide.step9.s2"),
        t("guide.step9.s3"),
        t("guide.step9.s4"),
      ],
      chips: [t("guide.step9.sub1"), t("guide.step9.sub2")],
    },
    {
      number: "10",
      icon: <MessageSquarePlus size={18} />,
      title: t("guide.step10.title"),
      steps: [
        t("guide.step10.s1"),
        t("guide.step10.s2"),
        t("guide.step10.s3"),
        t("guide.step10.s4"),
      ],
      chips: [t("guide.step10.sub1"), t("guide.step10.sub2")],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 px-8 py-10 text-white shadow-xl shadow-violet-900/20">
        <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-violet-200 mb-4">
          {t("guide.hero.badge")}
        </p>
        <h1 className="font-extrabold text-3xl md:text-4xl leading-tight mb-3 tracking-tight">
          {t("guide.hero.title")}
        </h1>
        <p className="text-violet-100 text-sm md:text-base max-w-lg leading-relaxed">
          {t("guide.hero.subtitle")}
        </p>
        {/* decorative circle */}
        <div className="pointer-events-none absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-4 -bottom-14 w-72 h-72 rounded-full bg-white/[0.04]" />
      </div>

      {/* 6-card grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <GuideCard key={card.number} {...card} />
        ))}
      </div>

      {/* CTA */}
      <div className="text-center py-8">
        <h2 className="font-extrabold text-2xl text-gray-900 dark:text-gray-100 mb-2">
          {t("guide.cta.title")}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {t("guide.cta.desc")}
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link
            href="/quizzes"
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 transition-colors"
          >
            {t("guide.cta.btn")}
          </Link>
          <Link
            href="/groups"
            className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
          >
            {t("guide.cta.btn2")}
          </Link>
        </div>
      </div>
    </div>
  );
}
