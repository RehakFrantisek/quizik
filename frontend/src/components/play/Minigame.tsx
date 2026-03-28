"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { TypingRace } from "./TypingRace";
import { SliderGame } from "./SliderGame";

interface Props {
  onComplete: (score: number, meta?: { elapsedSec?: number }) => void;
  type?: "tap_sprint" | "typing_race" | "slider" | "memory_pairs" | "random";
  durationSec?: number;
  allowSkip?: boolean;
  config?: Record<string, unknown> | null;
}

const RANDOM_TYPES: Array<"tap_sprint" | "typing_race" | "slider"> = [
  "tap_sprint",
  "typing_race",
  "slider",
];

function resolveType(type: Props["type"]): "tap_sprint" | "typing_race" | "slider" | "memory_pairs" {
  if (type === "random") {
    return RANDOM_TYPES[Math.floor(Math.random() * RANDOM_TYPES.length)];
  }
  return type ?? "tap_sprint";
}

interface MemoryPair {
  front: string;
  back: string;
}

type MemoryTheme = "classic" | "cosmic" | "jungle" | "ocean" | "pixel";

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
  if (["classic", "cosmic", "jungle", "ocean", "pixel"].includes(raw)) return raw as MemoryTheme;
  return "classic";
}

export function Minigame({ onComplete, type = "tap_sprint", durationSec = 5, allowSkip = true, config = null }: Props) {
  const resolved = useRef(resolveType(type)).current;

  const content = (() => {
    if (resolved === "typing_race") {
      return <TypingRace onComplete={onComplete} durationSec={20} />;
    }
    if (resolved === "slider") {
      return <SliderGame onComplete={onComplete} durationSec={15} />;
    }
    if (resolved === "memory_pairs") {
      return <MemoryPairs onComplete={onComplete} pairs={getMemoryPairs(config)} theme={getMemoryTheme(config)} />;
    }

    // tap_sprint (default)
    return <TapSprint onComplete={onComplete} durationSec={durationSec} />;
  })();

  return (
    <div className="relative">
      {allowSkip && (
        <button
          onClick={() => onComplete(0)}
          className="absolute -top-3 right-0 z-10 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 border border-gray-200 text-gray-700 hover:bg-white shadow-sm"
        >
          Skip
        </button>
      )}
      {content}
    </div>
  );
}

function MemoryPairs({
  onComplete,
  pairs,
  theme,
}: {
  onComplete: (score: number, meta?: { elapsedSec?: number }) => void;
  pairs: MemoryPair[];
  theme: MemoryTheme;
}) {
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const startedAt = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  const cards = useMemo(() => {
    const selected = pairs.slice(0, 4);
    if (selected.length === 0) return [];
    const pool = selected.flatMap((p, idx) => ([
      { pairId: idx, label: p.front },
      { pairId: idx, label: p.back },
    ]));
    return [...pool].sort(() => Math.random() - 0.5);
  }, [pairs]);

  useEffect(() => {
    setFlipped([]);
    setMatched(new Set());
    startedAt.current = Date.now();
    setElapsedSec(0);
  }, [cards.length]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (cards.length === 0) return;
    if (matched.size === cards.length) {
      const score = pairs.length > 0 ? 100 : 0;
      const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      const timer = setTimeout(() => onComplete(score, { elapsedSec }), 600);
      return () => clearTimeout(timer);
    }
  }, [matched, cards.length, onComplete, pairs.length]);

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

  const longestTextLength = cards.reduce((max, c) => Math.max(max, c.label.length), 0);
  const cardHeightClass = longestTextLength > 95 ? "h-36" : longestTextLength > 65 ? "h-28" : "h-24";
  const themeBack: Record<MemoryTheme, { icon: string; className: string }> = {
    classic: { icon: "🃏", className: "bg-gradient-to-br from-indigo-600 to-violet-600 border-indigo-700 text-indigo-100" },
    cosmic: { icon: "🌌", className: "bg-gradient-to-br from-fuchsia-600 to-indigo-700 border-indigo-800 text-fuchsia-100" },
    jungle: { icon: "🌿", className: "bg-gradient-to-br from-emerald-600 to-green-700 border-green-800 text-emerald-100" },
    ocean: { icon: "🌊", className: "bg-gradient-to-br from-cyan-600 to-blue-700 border-blue-800 text-cyan-100" },
    pixel: { icon: "🕹️", className: "bg-gradient-to-br from-slate-700 to-slate-900 border-slate-950 text-slate-100" },
  };

  if (cards.length === 0) {
    return (
      <div className="bg-white border rounded-2xl p-6 text-center shadow-sm max-w-md mx-auto">
        <p className="text-sm text-gray-600">Pexeso nemá nastavené páry. Přeskakuji…</p>
        <button onClick={() => onComplete(0)} className="mt-3 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white">Continue</button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-indigo-200 rounded-3xl p-4 shadow-lg max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-indigo-700">🧠 Memory Pairs</p>
        <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
          ⏱ {elapsedSec}s
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cards.map((card, idx) => {
          const isOpen = matched.has(idx) || flipped.includes(idx);
          return (
            <button
              key={`${card.pairId}-${idx}`}
              onClick={() => clickCard(idx)}
              className={`${cardHeightClass} rounded-2xl border text-xs px-2 transition-all shadow-sm ${isOpen ? "bg-indigo-50 border-indigo-300 text-indigo-900" : themeBack[theme].className}`}
            >
              <span className="block leading-snug">
                {isOpen ? card.label : `${themeBack[theme].icon} ?`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500 mt-3">Pairs: {matched.size / 2}/{cards.length / 2}</p>
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
