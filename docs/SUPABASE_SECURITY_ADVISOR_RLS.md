# Supabase Security Advisor: `RLS Disabled in Public` and `Sensitive Columns Exposed`

Tento dokument vysvětluje chyby ze **Security Advisoru** v Supabase a dává bezpečný postup nápravy pro Quizik.

## Co znamenají chyby ze screenshotu

### 1) `RLS Disabled in Public`
Supabase hlásí, že tabulky ve schématu `public` jsou dostupné přes PostgREST API, ale nemají zapnuté **Row Level Security (RLS)**.

- Pokud by existovalo `GRANT` pro roli `anon` nebo `authenticated`, mohly by být řádky čitelné/zapisovatelné i bez tvých backend kontrol.
- I když API přímo nepoužíváš, Advisor to bere jako riziko, protože tabulky jsou ve veřejně exponovaném schématu.

### 2) `Sensitive Columns Exposed`
Advisor upozorňuje, že API-exponovaná tabulka obsahuje citlivá data (typicky osobní údaje, odpovědi, skóre, metadata apod.).

## Nejčastější příčina v tomto projektu

Quizik backend používá vlastní API (FastAPI) a přímé připojení do Postgresu. To znamená:

- Supabase Data API (PostgREST) často **není potřeba**.
- Advisor ale stále kontroluje `public` schéma, protože je standardně „exposed".

Prakticky tedy řešíš hlavně to, aby přes Supabase Data API nebyly tabulky čitelné/zapisovatelné mimo backend.

## Rychlá bezpečná oprava (doporučeno)

> Cíl: **zapnout RLS** a současně **zablokovat přístup `anon`/`authenticated`**, pokud Data API nepoužíváš.

Spusť v Supabase SQL editoru:

```sql
-- 1) Zapnout RLS na tabulkách z Advisoru
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

-- Technická tabulka migrací (pokud je ve tvém listu chyb)
ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;

-- 2) Odebrat přístup API rolím (bezpečný default)
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.groups FROM anon, authenticated;
REVOKE ALL ON TABLE public.quizzes FROM anon, authenticated;
REVOKE ALL ON TABLE public.questions FROM anon, authenticated;
REVOKE ALL ON TABLE public.answers FROM anon, authenticated;
REVOKE ALL ON TABLE public.attempts FROM anon, authenticated;
REVOKE ALL ON TABLE public.quiz_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.quiz_analytics FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.invitation_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_login_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.telemetry_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.alembic_version FROM anon, authenticated;
```

### Proč je to bezpečné

- Backend připojený přes server credentials (DB user / service role) bude dál fungovat.
- Klientské volání přes Supabase Data API od `anon`/`authenticated` bude zavřené.
- Security Advisor přestane hlásit nejkritičtější část problému.

## Když Data API opravdu chceš používat

Pak nestačí jen RLS zapnout. Musíš přidat explicitní policy podle ownership modelu (např. učitel vidí jen svoje kvízy):

```sql
-- Příklad pouze pro quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quizzes_select_own
ON public.quizzes
FOR SELECT
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY quizzes_insert_own
ON public.quizzes
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY quizzes_update_own
ON public.quizzes
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());
```

Stejně je potřeba navázat i ostatní tabulky (`questions`, `attempts`, `answers`...), jinak budou requesty padat na `RLS violation`.

## Jak ověřit, že je fix správně

1. V Supabase otevři **Advisors → Security Advisor** a dej **Refresh**.
2. Ověř, že zmizí `RLS Disabled in Public` chyby.
3. Pokud zůstane `Sensitive Columns Exposed`, buď:
   - drž tabulku neveřejně (bez grantů), nebo
   - vystav pro klienta jen bezpečný `VIEW` bez citlivých sloupců.

## Poznámky k provozu

- `public.alembic_version` je technická tabulka migrací — běžně ji nechceš přes API zveřejňovat.
- Dlouhodobě je čisté řešení rozdělit interní tabulky mimo API-exponované schéma (např. `internal`) nebo vypnout exponování `public`, pokud Supabase REST vůbec nevyužíváš.
