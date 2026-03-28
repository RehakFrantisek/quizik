# Minihra bez game enginu: "Timeline Sprint"

## Proč zrovna tato hra

`Timeline Sprint` je jednoduchá minihra postavená čistě nad Reactem + DOM (drag&drop / klikání), bez potřeby Phaser/Unity/canvas enginu.

Hráč dostane 4–8 položek (události, kroky procesu, letopočty) a má je seřadit ve správném pořadí co nejrychleji.

## Proč je to dobrý fit pro Quizik

- sedí k výuce (dějepis, biologie, fyzika, procesy v IT),
- dá se hrát na mobilu i desktopu,
- používá stejný datový model jako klasické otázky (options + correct order),
- nepotřebuje realtime backend ani engine.

## Herní loop (MVP)

1. Zobrazí se zamíchané kartičky.
2. Hráč je přeskládá (drag&drop nebo šipkami nahoru/dolů).
3. Potvrdí odpověď tlačítkem „Hotovo".
4. Vyhodnotíš počet správných pozic + čas.
5. Body = přesnost + bonus za rychlost.

## Datový model (návrh)

Do `question.options` uložit pole objektů:

```json
[
  { "id": "a", "text": "První světová válka", "order": 1 },
  { "id": "b", "text": "Druhá světová válka", "order": 2 },
  { "id": "c", "text": "Studená válka", "order": 3 }
]
```

`order` je správná pozice. Frontend si položky jen zamíchá.

## Bodování (jednoduchá verze)

- `accuracy = correct_positions / total_items`
- `speed_bonus = max(0, 1 - elapsed_sec / time_limit)`
- `score = round(max_points * (0.8 * accuracy + 0.2 * speed_bonus))`

Tím zajistíš, že přesnost je důležitější než rychlost.

## Implementace ve frontendu (bez enginu)

- Nová komponenta: `frontend/src/components/play/TimelineSprint.tsx`
- Stav:
  - `items` (aktuální pořadí),
  - `startedAt`,
  - `locked` (po odeslání),
  - `result`.
- Ovládání:
  - desktop: native HTML5 drag&drop,
  - mobil/accessibility fallback: tlačítka "↑" a "↓".

## Integrace do existující architektury

1. Přidat nový `minigame_type`, třeba `timeline_sprint`.
2. V `Minigame.tsx` doplnit větev renderu pro nový typ.
3. Odeslat výsledek stejným flow jako ostatní minihry (`onComplete(points, metadata)`).
4. Do telemetry přidat eventy:
   - `timeline_reorder`
   - `timeline_submit`
   - `timeline_timeout` (pokud bude časový limit).

## Odhad práce

- MVP (single player, bez animací): cca 1 den.
- Vyladění UX + lokalizace + telemetry: +0.5 až 1 den.

## Alternativy, pokud chceš ještě jednodušší variantu

- `Odd One Out` (najdi vetřelce) — extrémně rychlá implementace.
- `Speed Match` (spáruj dvojice pojmů) — pořád bez enginu, jen více UI state.
