# Návrh: jednoduché propojení quiz režimu, herního režimu a správy obsahu

Tento návrh cílí na:

1. **držet systém co nejjednodušší**,
2. umožnit přepínání mezi "čistým quiz" a "game layer" nad stejným obsahem,
3. umožnit sloučení více quizů,
4. přidat export/import tak, aby šlo obsah snadno recyklovat.

---

## 1) Základní princip: "Content first, mode second"

Neudržuj dva oddělené světy (quiz data vs game data). Udržuj jeden zdroj pravdy:

- `Quiz`
- `Question`
- `Option`

A nad tím jen přidej **režim hraní**.

### Doporučené režimy

- `classic_quiz` (současné chování)
- `mixed_arcade` (mezi otázkami microgames)
- `microgame_only` (jen minihry z dat quizu)

Režim nastavíš na úrovni `Quiz` nebo `QuizSession`.

---

## 2) Herní režim jako "adaptér" nad existujícími otázkami

Místo duplikace obsahu zaveď **adaptační vrstvu**:

- vstup: standardní `Question` (single choice, multi choice, text...)
- výstup: `GameRound` (co přesně vykreslit jako minihru)

### Příklad: pexeso z existujícího quizu

Ano, jde to dobře udělat.

#### Pravidlo mapování (MVP)

Vezmi jen otázky typu `single_choice`:

- karta A = zkrácený text otázky,
- karta B = správná odpověď (`option.is_correct = true`).

Z toho vygeneruješ páry do pexesa.

#### Fallbacky

- otázky bez validní správné odpovědi přeskočit,
- příliš dlouhé texty oříznout,
- minimální počet párů (např. 4), jinak minihru přeskočit.

---

## 3) Nejjednodušší datový model (bez velkého refactoru)

Přidej jen lehké konfigurace:

### `quiz.settings`

- `play_mode`: `classic_quiz | mixed_arcade | microgame_only`
- `microgames_enabled`: `string[]`
- `microgame_frequency`: třeba `every_2_questions`

### volitelně `session.settings`

- override režimu pro konkrétní spuštění ve třídě.

Tím nemusíš překopávat tabulky hned teď.

---

## 4) Orchestrace v runtime (jednoduchý flow)

1. Načteš otázky quizu.
2. Podle `play_mode` rozhodneš, co renderovat:
   - `classic_quiz`: jen otázky,
   - `mixed_arcade`: otázka -> microgame -> otázka -> ...
   - `microgame_only`: jen game roundy vygenerované z otázek.
3. Každé kolo vrací normalizovaný výstup:
   - `{ round_type, source_question_id, score_delta, metadata }`

To drží analytics i leaderboard konzistentní.

---

## 5) Návrh ovládacího menu (UX)

## A) V editoru quizu (nová sekce "Režim hraní")

1. **Přepínač režimu**
   - Classic
   - Mixed Arcade
   - Arcade Only

2. **Microgames checklist**
   - Beat Tap
   - Emoji Memory
   - Pexeso (Q/A)
   - Typing Burst
   - atd.

3. **Frekvence microher**
   - Po každé otázce
   - Každé 2 otázky
   - Náhodně (např. 30 %)

4. **Náhled kompatibility**
   - "Pexeso použije 12/20 otázek"
   - "8 otázek přeskočeno (není single choice)"

## B) V session setupu (před spuštěním)

- "Použít default z quizu" / "Přepsat režim pro tuto session"
- Rychlý preset:
  - `Exam` (classic, bez miniher)
  - `Class fun` (mixed)
  - `Arcade challenge` (microgame only)

---

## 6) Sloučení dvou quizů do jednoho (tohle bych dal vysoko)

Přidej akci **"Merge into this quiz"**:

- vybereš source quiz(e),
- zvolíš strategii:
  - append na konec,
  - proložit náhodně,
- při konfliktu duplicit nabídneš:
  - keep both,
  - skip duplicates (podle normalizovaného textu otázky).

Technicky je to v zásadě copy `questions + options` do cílového `quiz_id`.

---

## 7) Export/Import bez velké bolesti

## MVP export

- `Quiz JSON` (full fidelity, nejlepší pro interní backup + merge)
- `Questions CSV` (interoperabilita)

## MVP import (důležité)

Při importu dej volbu:

- `Create new quiz`
- `Append to existing quiz`

To je klíčové, protože přesně řeší tvůj use case "přidat do již existujícího".

---

## 8) Priorita implementace (doporučení)

1. **Append import do existujícího quizu** (okamžitá hodnota)
2. **Merge quizů**
3. **Play mode přepínač + mixed orchestrace**
4. **První adaptér: Pexeso z single-choice**
5. **Rozšíření o další microgames**

---

## 9) Risky a jak je udržet pod kontrolou

- **Přílišná komplexita UI** → řešit presety (`Exam`, `Class fun`, `Arcade`).
- **Nekonzistentní scoring** → jednotné `score_delta` API pro všechny roundy.
- **Nekompatibilní otázky pro minihry** → kompatibility report v editoru.
- **Obsahový chaos po merge/importu** → preview + možnost rollback (draft merge).

---

## 10) Stručná odpověď na tvoji otázku

Ano, jde to implementovat tak, že z již existujícího quizu vygeneruješ herní režim (např. pexeso z `single_choice` otázka/správná odpověď),
bez toho, aby ses musel pouštět do game enginu nebo dělat druhý separátní content systém.

Nejlepší je držet jeden content model a přidat nad ním lehkou orchestrace vrstvu + jednoduché režimové menu.
