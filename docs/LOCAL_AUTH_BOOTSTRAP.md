# Local auth bootstrap (Google OAuth + invitation-code lockout)

Pokud se na localhostu dostaneš do stavu:

- Google OAuth účet není admin,
- nemáš invitation code,
- nemůžeš vytvořit nový účet,

nově má backend dev bootstrap mechanismus.

## Co je nově zapnuté

V neprodukčním prostředí (`environment != production`) jsou aktivní 2 věci:

1. **First user becomes admin**
   - když v DB neexistuje žádný admin, první nově vytvořený uživatel dostane roli `admin`.
   - funguje pro registraci i Google OAuth.

2. **Dev invitation bypass code**
   - při registraci lze použít kód `LOCAL-DEV-BYPASS` místo standardního invite kódu.

## Konfigurace (.env)

```env
ENVIRONMENT=development
BOOTSTRAP_FIRST_ADMIN_ENABLED=true
DEV_INVITATION_BYPASS_CODE=LOCAL-DEV-BYPASS
```

## Produkce

V produkci tento bypass nepoužívej:

```env
ENVIRONMENT=production
BOOTSTRAP_FIRST_ADMIN_ENABLED=false
```

A používej standardní invitation flow + ruční admin onboarding.
