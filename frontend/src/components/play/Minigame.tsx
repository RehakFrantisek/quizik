"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { TypingRace } from "./TypingRace";
import { SliderGame } from "./SliderGame";
import { useLang } from "@/contexts/LangContext";

interface Props {
  onComplete: (score: number, meta?: { elapsedSec?: number }) => void;
  type?: "tap_sprint" | "typing_race" | "slider" | "memory_pairs" | "speed_match" | "risk_reward" | "random";
  durationSec?: number;
  allowSkip?: boolean;
  config?: Record<string, unknown> | null;
}

const RANDOM_TYPES: Array<"tap_sprint" | "typing_race" | "slider"> = [
  "tap_sprint",
  "typing_race",
  "slider",
];

function resolveType(type: Props["type"]): "tap_sprint" | "typing_race" | "slider" | "memory_pairs" | "speed_match" | "risk_reward" {
  if (type === "random") {
    return RANDOM_TYPES[Math.floor(Math.random() * RANDOM_TYPES.length)];
  }
  return type ?? "tap_sprint";
}

interface MemoryPair {
  front: string;
  back: string;
}

type MemoryTheme = "classic" | "cosmic" | "jungle" | "ocean" | "pixel" | "custom";
interface MemorySettings {
  pairsPerRound: number;
  rounds: number;
}

function getMemoryPairs(config: Record<string, unknown> | null | undefined): MemoryPair[] {
  if (!config || !Array.isArray(config.pairs)) return [];
  return config.pairs
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const front = typeof (item as { front?: unknown }).front === "string" ? (item as { front: string }).front : "";
      const back = typeof (item as { back?: unknown }).back === "string" ? (item as { back: string }).back : "";
      if (!front.trim() || !back.trim()) return null;
      return { front, back };
    })
    .filter((p): p is MemoryPair => p !== null);
}

function getMemoryTheme(config: Record<string, unknown> | null | undefined): MemoryTheme {
  const raw = typeof config?.theme === "string" ? config.theme : "classic";
  if (["classic", "cosmic", "jungle", "ocean", "pixel", "custom"].includes(raw)) return raw as MemoryTheme;
  return "classic";
}

function getMemoryCustomImage(config: Record<string, unknown> | null | undefined): string | null {
  return typeof config?.custom_image_url === "string" && config.custom_image_url.trim().length > 0
    ? config.custom_image_url
    : null;
}

function getMemorySettings(config: Record<string, unknown> | null | undefined, totalPairs: number): MemorySettings {
  const rawPairsPerRound = Number(config?.pairs_per_round ?? 4);
  const rawRounds = Number(config?.rounds ?? 1);
  const pairPool = Math.max(1, totalPairs);
  const pairsPerRound = Math.min(4, pairPool, Math.max(1, Number.isFinite(rawPairsPerRound) ? Math.floor(rawPairsPerRound) : 4));
  const maxRounds = Math.max(1, Math.floor(pairPool / pairsPerRound));
  const rounds = Math.min(maxRounds, Math.max(1, Number.isFinite(rawRounds) ? Math.floor(rawRounds) : 1));
  return { pairsPerRound, rounds };
}

export function Minigame({ onComplete, type = "tap_sprint", durationSec = 5, allowSkip = true, config = null }: Props) {
  const { t } = useLang();
  const resolved = useRef(resolveType(type)).current;

  const content = (() => {
    if (resolved === "typing_race") {
      return <TypingRace onComplete={onComplete} durationSec={20} />;
    }
    if (resolved === "slider") {
      return <SliderGame onComplete={onComplete} durationSec={15} />;
    }
    if (resolved === "memory_pairs") {
      const pairs = getMemoryPairs(config);
      return <MemoryPairs onComplete={onComplete} pairs={pairs} theme={getMemoryTheme(config)} customImageUrl={getMemoryCustomImage(config)} settings={getMemorySettings(config, pairs.length)} />;
    }
    if (resolved === "speed_match") {
      const pairs = getMemoryPairs(config);
      return <SpeedMatch onComplete={onComplete} pairs={pairs} />;
    }
    if (resolved === "risk_reward") {
      return <RiskReward onComplete={onComplete} />;
    }

    // tap_sprint (default)
    return <TapSprint onComplete={onComplete} durationSec={durationSec} />;
  })();

  return (
    <div className="relative">
      {allowSkip && (
        <button
          onClick={() => onComplete(0)}
          className="absolute -top-3 right-0 z-10 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 shadow-sm"
        >
          {t("play.skip")}
        </button>
      )}
      {content}
    </div>
  );
}

function SpeedMatch({ onComplete, pairs }: { onComplete: (score: number, meta?: { elapsedSec?: number }) => void; pairs: MemoryPair[] }) {
  const { t } = useLang();
  const startedAt = useRef<number>(Date.now());
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const right = useMemo(() => pairs.map((p, idx) => ({ idx, label: p.back })).sort(() => Math.random() - 0.5), [pairs]);
  const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));

  if (pairs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center shadow-sm max-w-md mx-auto">
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("play.memoryNoPairs")}</p>
        <button onClick={() => onComplete(0)} className="mt-3 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white">{t("play.continue")}</button>
      </div>
    );
  }

  const onPick = (rightIdx: number) => {
    if (selectedLeft == null || matched.has(selectedLeft) || matched.has(rightIdx)) return;
    if (selectedLeft === rightIdx) {
      const next = new Set(matched).add(rightIdx);
      setMatched(next);
      if (next.size === pairs.length) {
        onComplete(100, { elapsedSec });
      }
    }
    setSelectedLeft(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-cyan-200 dark:border-cyan-900 rounded-3xl p-4 shadow-lg max-w-3xl mx-auto">
      <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300 mb-3">⚡ Speed Match</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map((p, idx) => (
            <button key={`l-${idx}`} onClick={() => setSelectedLeft(idx)} disabled={matched.has(idx)}
              className={`w-full text-left px-3 py-2 rounded-lg border ${matched.has(idx) ? "bg-green-50 border-green-200 text-green-700" : selectedLeft === idx ? "bg-cyan-50 border-cyan-300 text-cyan-700" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"}`}>
              {p.front}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((r) => (
            <button key={`r-${r.idx}`} onClick={() => onPick(r.idx)} disabled={matched.has(r.idx)}
              className={`w-full text-left px-3 py-2 rounded-lg border ${matched.has(r.idx) ? "bg-green-50 border-green-200 text-green-700" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-cyan-300"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskReward({ onComplete }: { onComplete: (score: number, meta?: { elapsedSec?: number }) => void }) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(50);
  const maxRounds = 5;
  const finish = (finalScore: number) => onComplete(Math.max(0, Math.min(100, finalScore)));
  const play = (stake: number) => {
    const success = Math.random() < 0.55;
    const next = success ? score + stake : score - stake;
    if (round >= maxRounds) return finish(next);
    setScore(next);
    setRound((r) => r + 1);
  };
  return (
    <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900 rounded-3xl p-5 shadow-lg max-w-md mx-auto text-center">
      <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-1">🎲 Risk / Reward Quiz</p>
      <p className="text-xs text-gray-500 mb-3">Kolo {round}/{maxRounds}</p>
      <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-3">{score}</p>
      <div className="grid grid-cols-3 gap-2">
        {[5, 10, 20].map((stake) => (
          <button key={stake} onClick={() => play(stake)} className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold">
            Vsadit {stake}
          </button>
        ))}
      </div>
    </div>
  );
}

function MemoryPairs({
  onComplete,
  pairs,
  theme,
  customImageUrl,
  settings,
}: {
  onComplete: (score: number, meta?: { elapsedSec?: number }) => void;
  pairs: MemoryPair[];
  theme: MemoryTheme;
  customImageUrl: string | null;
  settings: MemorySettings;
}) {
  const { t } = useLang();
  const [roundIndex, setRoundIndex] = useState(0);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const startedAt = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  const rounds = useMemo(() => {
    if (pairs.length === 0) return [];
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    const needed = settings.pairsPerRound * settings.rounds;
    const limited = shuffled.slice(0, needed);
    const output: MemoryPair[][] = [];
    for (let i = 0; i < settings.rounds; i += 1) {
      output.push(limited.slice(i * settings.pairsPerRound, (i + 1) * settings.pairsPerRound));
    }
    return output.filter((r) => r.length > 0);
  }, [pairs, settings.pairsPerRound, settings.rounds]);

  const activeRoundPairs = rounds[roundIndex] ?? [];
  useEffect(() => {
    setRoundIndex(0);
  }, [settings.pairsPerRound, settings.rounds, pairs.length]);

  const cards = useMemo(() => {
    if (activeRoundPairs.length === 0) return [];
    const pool = activeRoundPairs.flatMap((p, idx) => ([
      { pairId: idx, label: p.front },
      { pairId: idx, label: p.back },
    ]));
    return [...pool].sort(() => Math.random() - 0.5);
  }, [activeRoundPairs, roundIndex]);

  useEffect(() => {
    setFlipped([]);
    setMatched(new Set());
    if (roundIndex === 0) {
      startedAt.current = Date.now();
      setElapsedSec(0);
    }
  }, [cards.length, roundIndex]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (cards.length === 0 || rounds.length === 0) return;
    if (matched.size === cards.length) {
      if (roundIndex < rounds.length - 1) {
        const timer = setTimeout(() => {
          setRoundIndex((prev) => prev + 1);
        }, 450);
        return () => clearTimeout(timer);
      }
      const score = rounds.length > 0 ? 100 : 0;
      const elapsedSecFinal = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const timer = setTimeout(() => onComplete(score, { elapsedSec: elapsedSecFinal }), 600);
      return () => clearTimeout(timer);
    }
  }, [matched, cards.length, onComplete, roundIndex, rounds.length]);

  const clickCard = (idx: number) => {
    if (matched.has(idx) || flipped.includes(idx) || flipped.length >= 2) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      const [a, b] = next;
      if (cards[a].pairId === cards[b].pairId) {
        setMatched((prev) => new Set(prev).add(a).add(b));
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 550);
      }
    }
  };

  const themeBack: Record<Exclude<MemoryTheme, "custom">, { icon: string; className: string }> = {
    classic: { icon: "🃏", className: "bg-gradient-to-br from-indigo-600 to-violet-600 border-indigo-700 text-indigo-100" },
    cosmic: { icon: "🌌", className: "bg-gradient-to-br from-fuchsia-600 to-indigo-700 border-indigo-800 text-fuchsia-100" },
    jungle: { icon: "🌿", className: "bg-gradient-to-br from-emerald-600 to-green-700 border-green-800 text-emerald-100" },
    ocean: { icon: "🌊", className: "bg-gradient-to-br from-cyan-600 to-blue-700 border-blue-800 text-cyan-100" },
    pixel: { icon: "🕹️", className: "bg-gradient-to-br from-slate-700 to-slate-900 border-slate-950 text-slate-100" },
  };

  if (cards.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center shadow-sm max-w-md mx-auto">
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("play.memoryNoPairs")}</p>
        <button onClick={() => onComplete(0)} className="mt-3 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white">{t("play.continue")}</button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900/70 rounded-3xl p-4 shadow-lg max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">🧠 {t("play.memoryPairsTitle")}</p>
        <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 rounded-full px-3 py-1">
          ⏱ {elapsedSec}s
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 place-items-center">
        {cards.map((card, idx) => {
          const isOpen = matched.has(idx) || flipped.includes(idx);
          return (
            <button
              key={`${card.pairId}-${idx}`}
              onClick={() => clickCard(idx)}
              className="w-32 h-28 md:w-36 md:h-32 rounded-2xl border border-indigo-200 dark:border-gray-700 shadow-sm transition-transform duration-200 active:scale-[0.98] overflow-hidden"
            >
              {isOpen ? (
                <span className="w-full h-full bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-900 text-indigo-900 dark:text-indigo-100 flex items-center justify-center px-2 text-xs md:text-sm leading-snug">
                  {card.label}
                </span>
              ) : (
                customImageUrl && theme === "custom" ? (
                  <img src={customImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className={`w-full h-full ${themeBack[(theme === "custom" ? "classic" : theme)].className} flex items-center justify-center text-4xl md:text-5xl`}>
                    {themeBack[(theme === "custom" ? "classic" : theme)].icon}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3">
        {t("play.memoryPairsProgress", { matched: matched.size / 2, total: cards.length / 2, round: Math.min(roundIndex + 1, rounds.length), rounds: rounds.length })}
      </p>
    </div>
  );
}

// ── Tap Sprint (original) ──────────────────────────────────────────────────────

function TapSprint({ onComplete, durationSec = 5 }: { onComplete: (score: number, meta?: { elapsedSec?: number }) => void; durationSec?: number }) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setPhase("playing");
    setTaps(0);
    setTimeLeft(durationSec);
    intervalRef.current = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => onComplete(taps, { elapsedSec: durationSec }), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, taps, onComplete]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const progress = ((durationSec - timeLeft) / durationSec) * 100;

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white text-center shadow-xl max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Zap size={20} className="text-yellow-300" />
        <span className="text-sm font-bold uppercase tracking-widest text-indigo-200">Mini Game</span>
      </div>

      {phase === "ready" && (
        <>
          <p className="text-2xl font-black mb-2">Tap Sprint!</p>
          <p className="text-sm text-indigo-200 mb-6">Tap as fast as you can for {durationSec} seconds.</p>
          <button onClick={start} className="bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-xl text-lg hover:bg-yellow-300 transition-colors shadow-lg">
            Start!
          </button>
        </>
      )}
      {phase === "playing" && (
        <>
          <p className="text-6xl font-black mb-1 tabular-nums">{taps}</p>
          <p className="text-indigo-200 text-sm mb-4">taps</p>
          <div className="w-full bg-indigo-800 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-yellow-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-indigo-200 text-sm mb-5">{timeLeft}s remaining</p>
          <button
            onClick={() => setTaps((n: number) => n + 1)}
            className="bg-yellow-400 text-gray-900 font-black px-12 py-6 rounded-2xl text-2xl hover:bg-yellow-300 active:scale-95 transition-all shadow-lg select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            TAP!
          </button>
        </>
      )}
      {phase === "done" && (
        <>
          <p className="text-2xl font-black mb-2">Nice!</p>
          <p className="text-5xl font-black mb-1 text-yellow-300">{taps}</p>
          <p className="text-indigo-200 text-sm">taps in {durationSec}s</p>
          <p className="text-xs text-indigo-300 mt-3 animate-pulse">Continuing to next question…</p>
        </>
      )}
    </div>
  );
}
