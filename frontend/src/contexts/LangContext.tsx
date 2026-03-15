"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { tr } from "@/lib/i18n";

type Lang = "en" | "cs";

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  /** Translate a key, replacing {placeholder} tokens with vars values. */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  toggleLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("quizik_lang") as Lang | null;
    if (stored === "en" || stored === "cs") setLang(stored);
  }, []);

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === "en" ? "cs" : "en";
      localStorage.setItem("quizik_lang", next);
      return next;
    });
  };

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let str = tr(lang, key);
    if (vars) {
      str = Object.entries(vars).reduce(
        (s, [k, v]) => s.replace(`{${k}}`, String(v)),
        str
      );
    }
    return str;
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
