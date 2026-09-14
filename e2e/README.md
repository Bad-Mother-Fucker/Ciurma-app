# Test e2e (Playwright)

Questi test guidano l'app vera contro un **progetto Supabase reale** (uno
dedicato ai test, mai quello di produzione), con lo schema di `db/schema.sql`
applicato.

## Perché servono variabili d'ambiente

Il login in produzione è solo Google OAuth, non automatizzabile in CI senza
un vero identity provider. Per questo `src/pages/Login.tsx` espone un bypass
di test (email/password via Supabase Auth) attivo **solo** quando la build
imposta `VITE_E2E_TEST_AUTH=true`. In produzione questa variabile non è
definita e il blocco di codice relativo non viene mai mostrato.

## Variabili richieste

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_E2E_TEST_AUTH=true
SUPABASE_SERVICE_ROLE_KEY=...   # per creare gli utenti di test via API admin
```

## Stato in questa sessione

Questi test sono stati scritti ma **non eseguiti**: la sessione non ha un
progetto Supabase reale collegato (nessuna credenziale disponibile). Vanno
lanciati con `npm run test:e2e` una volta configurato un progetto Supabase di
test. Vedi `PIANO.md` per la lista di cosa è verificato automaticamente e
cosa richiede questo passaggio manuale.
