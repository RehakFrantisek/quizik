# Minihry mezi otázkami (Gen Z vibes) + záznam, co bylo řešeno

## Co jsem v posledních krocích udělal (rychlý log)

Abychom na nic nezapomněli:

1. Přidal jsem dokument k Supabase alertům a bezpečnému RLS fixu:
   - `docs/SUPABASE_SECURITY_ADVISOR_RLS.md`
2. Opravil jsem frontend type error u telemetry `fast_answer` času:
   - `frontend/src/app/(dashboard)/sessions/[id]/attempts/[attemptId]/page.tsx`
3. Přidal jsem předchozí nápad na no-engine minihru (`Timeline Sprint`):
   - `docs/MINIGAME_IDEA_NO_ENGINE.md`

---

## Co teď chceš: minihry **mezi otázkami** (jako fast tapping / speed writing)

Níže jsou návrhy, které jdou implementovat bez game enginu a fungují jako krátký "booster" mezi otázkami (5–20 s).

## 1) Beat Tap (rytmický tap)

### Jak to funguje
- 6–10 beatů (vizuální pulz + jednoduchý zvuk klik).
- Hráč tapuje do rytmu (space / tap na mobilu).
- Vyhodnotíš timing error (`ms off-beat`).

### Proč to bude bavit
- instant dopamine, skill based, "just one more" efekt.
- dá se skinovat přes témata (lo-fi / neon / retro).

### Score
- `accuracy = 1 - avg_abs_timing_error / tolerance`
- + combo bonus za streak správných beatů.

### Náročnost
- střední (timer přes `performance.now()`, anti-jitter).

---

## 2) Emoji Memory Flash

### Jak to funguje
- Na 2 sekundy se ukáže sekvence 3–6 emoji (např. 🔥🎧⚡🧠).
- Schová se, hráč ji má naklikat ve správném pořadí.

### Proč to bude bavit
- rychlé, vizuální, meme-friendly.
- super i na mobil.

### Score
- správná pozice + speed bonus.

### Náročnost
- nízká.

---

## 3) Color Switch (Stroop chaos)

### Jak to funguje
- Na obrazovce je slovo barvy (např. "ČERVENÁ") obarvené jinou barvou (např. zeleně).
- Zadání: klikni na **barvu textu**, ne na význam slova.
- 5 rychlých kol za sebou.

### Proč to bude bavit
- brain-lag efekt, směšně těžké pod tlakem.
- krátké session, vysoká replayability.

### Score
- počet správných za čas + penalizace za missclick.

### Náročnost
- nízká.

---

## 4) Swipe Dodge

### Jak to funguje
- Na ose X běží "překážky" a hráč swipe vlevo/vpravo, aby se jim vyhnul.
- Délka 8–12 sekund.

### Proč to bude bavit
- mobile-first feel, jednoduchý reflex gameplay.

### Score
- přežitý čas + close-call bonus.

### Náročnost
- střední (animace přes CSS transform + requestAnimationFrame).

---

## 5) Typing Burst (vylepšený speed writing)

### Jak to funguje
- Ne celé věty, ale krátké "burst" challenge:
  - slovo pozpátku,
  - bez samohlásek,
  - CAPS only,
  - random glitch znak navíc.
- 8–15 sekund.

### Proč to bude bavit
- chaos + skill + virální momenty.

### Score
- WPM + accuracy + modifikátor dle challenge typu.

### Náročnost
- nízká až střední.

---

## 6) One-Second Guess

### Jak to funguje
- Hráč vidí otázku/obrázek jen 1 sekundu.
- Pak 3 možnosti, musí rychle vybrat.
- Je to mini reflex + paměť.

### Proč to bude bavit
- short-form styl, "blink and miss it".

### Score
- správnost + reakční čas.

### Náročnost
- nízká.

---

## 7) Risk Button (cashout)

### Jak to funguje
- Metr se plní (0→100), ale je tam hidden crash point.
- Hráč má kliknout "cashout" dřív, než to spadne.
- Čím později cashout, tím víc bonus bodů.

### Proč to bude bavit
- high tension, streamer/game feel.

### Score
- `bonus = base * multiplier_at_cashout`, crash = 0 bonus.

### Náročnost
- nízká.

---

## 8) Aim Pop (bubble pop)

### Jak to funguje
- Krátce se objeví 8–15 targetů (bubliny/ikonky).
- Hráč musí trefit jen "správný" typ targetu.

### Proč to bude bavit
- instant arcade pocit bez složité grafiky.

### Score
- hit rate - penalty za špatný target.

### Náročnost
- nízká až střední.

---

## Doporučení co dát jako první (best effort/value)

1. **Emoji Memory Flash** (nejrychlejší implementace, velká zábavnost)
2. **Color Switch** (levné, ale skillově výrazné)
3. **Risk Button** (silný engagement loop)
4. **Beat Tap** (největší wow, ale o trochu víc ladění)

---

## Rychlý technický pattern pro všechny minihry

- Jeden společný wrapper `MicroGameOverlay`:
  - `start()`
  - `tick()`
  - `submit(result)`
  - timeout auto-submit
- Výstup sjednotit:
  - `{ game_type, duration_ms, score_delta, metadata }`
- Telemetry sjednotit:
  - `microgame_started`
  - `microgame_submitted`
  - `microgame_timeout`
  - `microgame_abandoned`

Tím přidáš nové minihry rychleji a nebudeš duplikovat logiku.
