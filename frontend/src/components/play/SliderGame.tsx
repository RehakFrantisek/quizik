"use client";

import { useEffect, useRef, useState } from "react";
import { Target } from "lucide-react";

interface Props {
  onComplete: (score: number) => void;
  durationSec?: number;
}

const TARGET_WIDTH = 0.22; // fraction of bar width
const TARGET_CENTER = 0.5;
const TARGET_LEFT = TARGET_CENTER - TARGET_WIDTH / 2;
const TARGET_RIGHT = TARGET_CENTER + TARGET_WIDTH / 2;
const SPEED = 0.35; // bar widths per second

export function SliderGame({ onComplete, durationSec = 15 }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [pos, setPos] = useState(0); // 0..1
  const [hits, setHits] = useState(0);
  const [feedback, setFeedback] = useState<"hit" | "miss" | null>(null);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeRef = useRef<number>(0);

  const tick = (ts: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = ts;
    const dt = (ts - lastTimeRef.current) / 1000;
    lastTimeRef.current = ts;

    posRef.current += dirRef.current * SPEED * dt;
    if (posRef.current >= 1) { posRef.current = 1; dirRef.current = -1; }
    if (posRef.current <= 0) { posRef.current = 0; dirRef.current = 1; }
    setPos(posRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    setPhase("playing");
    setHits(0);
    setFeedback(null);
    posRef.current = 0;
    dirRef.current = 1;
    lastTimeRef.current = 0;
    setTimeLeft(durationSec);
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          cancelAnimationFrame(rafRef.current!);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => onComplete(hits * 10), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, hits, onComplete]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleHit = () => {
    if (phase !== "playing") return;
    const inZone = posRef.current >= TARGET_LEFT && posRef.current <= TARGET_RIGHT;
    if (inZone) {
      setHits((n) => n + 1);
      setFeedback("hit");
    } else {
      setFeedback("miss");
    }
    setTimeout(() => setFeedback(null), 300);
  };

  const progress = ((durationSec - timeLeft) / durationSec) * 100;
  const dotPct = pos * 100;

  return (
    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-8 text-white text-center shadow-xl max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Target size={20} className="text-yellow-200" />
        <span className="text-sm font-bold uppercase tracking-widest text-cyan-100">Mini Game</span>
      </div>

      {phase === "ready" && (
        <>
          <p className="text-2xl font-black mb-2">Aim & Hit!</p>
          <p className="text-sm text-cyan-100 mb-6">
            Tap HIT when the dot is inside the{" "}
            <span className="text-green-300 font-bold">green zone</span> — {durationSec}s.
          </p>
          <button
            onClick={start}
            className="bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-xl text-lg hover:bg-yellow-300 transition-colors shadow-lg"
          >
            Start!
          </button>
        </>
      )}

      {phase === "playing" && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-black tabular-nums">{hits}</span>
            <span className="text-lg font-bold text-yellow-200">{timeLeft}s</span>
          </div>
          <div className="w-full bg-blue-800/50 rounded-full h-2 mb-5 overflow-hidden">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Slider bar */}
          <div className="relative w-full h-10 bg-blue-900/60 rounded-full mb-5 overflow-hidden">
            {/* Target zone */}
            <div
              className="absolute top-0 h-full bg-emerald-400/40 border-x-2 border-emerald-400"
              style={{
                left: `${TARGET_LEFT * 100}%`,
                width: `${TARGET_WIDTH * 100}%`,
              }}
            />
            {/* Moving dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-lg transition-none"
              style={{ left: `calc(${dotPct}% - 14px)` }}
            />
          </div>

          <button
            onPointerDown={handleHit}
            className={`font-black px-12 py-5 rounded-2xl text-2xl transition-all shadow-lg select-none active:scale-95 ${
              feedback === "hit"
                ? "bg-emerald-400 text-gray-900 scale-105"
                : feedback === "miss"
                ? "bg-red-400 text-white"
                : "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
            }`}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {feedback === "hit" ? "✓ HIT!" : feedback === "miss" ? "✗ MISS" : "HIT!"}
          </button>
        </>
      )}

      {phase === "done" && (
        <>
          <p className="text-2xl font-black mb-1">
            {hits >= 5 ? "Sharpshooter! 🎯" : hits >= 2 ? "Nice! 👍" : "Keep practicing 😅"}
          </p>
          <p className="text-5xl font-black mb-1 text-yellow-300">{hits}</p>
          <p className="text-cyan-200 text-sm">hits in {durationSec}s</p>
          <p className="text-xs text-cyan-300 mt-3 animate-pulse">Continuing…</p>
        </>
      )}
    </div>
  );
}
