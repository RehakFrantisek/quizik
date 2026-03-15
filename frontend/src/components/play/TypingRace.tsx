"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";

const WORDS = [
  "quiz", "speed", "type", "fast", "race", "win", "cool", "vibe", "fire",
  "goat", "epic", "flex", "hype", "chill", "drop", "bold", "crisp", "snap",
  "flow", "peak", "wild", "rush", "glow", "mode", "wave", "sharp", "quick",
];

function pickWord(exclude?: string): string {
  const pool = WORDS.filter((w) => w !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

interface Props {
  onComplete: (score: number) => void;
  durationSec?: number;
}

export function TypingRace({ onComplete, durationSec = 20 }: Props) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [currentWord, setCurrentWord] = useState(() => pickWord());
  const [typed, setTyped] = useState("");
  const [correctChars, setCorrectChars] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [shake, setShake] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setPhase("playing");
    setTyped("");
    setCorrectChars(0);
    setWordsCompleted(0);
    setCurrentWord(pickWord());
    setTimeLeft(durationSec);
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => onComplete(correctChars), 1500);
      return () => clearTimeout(t);
    }
  }, [phase, correctChars, onComplete]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTyped(val);
    if (val === currentWord) {
      setCorrectChars((n) => n + currentWord.length);
      setWordsCompleted((n) => n + 1);
      setCurrentWord(pickWord(currentWord));
      setTyped("");
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " && typed.trim() !== currentWord) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const progress = ((durationSec - timeLeft) / durationSec) * 100;

  // Colour-code each letter of the target word
  const renderWord = () =>
    currentWord.split("").map((ch, i) => {
      const t = typed[i];
      const cls =
        t === undefined
          ? "text-white/60"
          : t === ch
          ? "text-emerald-300 font-black"
          : "text-red-400 font-black";
      return (
        <span key={i} className={cls}>
          {ch}
        </span>
      );
    });

  return (
    <div className="bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl p-8 text-white text-center shadow-xl max-w-sm mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Keyboard size={20} className="text-yellow-200" />
        <span className="text-sm font-bold uppercase tracking-widest text-pink-100">Mini Game</span>
      </div>

      {phase === "ready" && (
        <>
          <p className="text-2xl font-black mb-2">Typing Race!</p>
          <p className="text-sm text-pink-100 mb-6">
            Type as many words correctly as you can in {durationSec}s.
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl font-black tabular-nums">{wordsCompleted}</span>
            <span className="text-lg font-bold text-yellow-200">{timeLeft}s</span>
          </div>
          <div className="w-full bg-pink-800/50 rounded-full h-2 mb-5 overflow-hidden">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className={`text-3xl font-mono tracking-[0.15em] mb-4 transition-transform ${
              shake ? "animate-[shake_0.3s_ease]" : ""
            }`}
          >
            {renderWord()}
          </div>
          <input
            ref={inputRef}
            value={typed}
            onChange={handleInput}
            onKeyDown={handleKey}
            className="w-full bg-white/20 border-2 border-white/40 rounded-xl px-4 py-3 text-white text-xl font-mono text-center placeholder-white/40 focus:outline-none focus:border-yellow-400 transition-colors"
            placeholder="type here…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <p className="text-xs text-pink-200 mt-2">{correctChars} chars</p>
        </>
      )}

      {phase === "done" && (
        <>
          <p className="text-2xl font-black mb-1">GG! 🔥</p>
          <p className="text-5xl font-black mb-1 text-yellow-300">{wordsCompleted}</p>
          <p className="text-pink-200 text-sm">words · {correctChars} chars</p>
          <p className="text-xs text-pink-300 mt-3 animate-pulse">Continuing…</p>
        </>
      )}
    </div>
  );
}
