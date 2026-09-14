# Ciurma

Gestione condivisa di una casa: turni e responsabilità tra familiari,
dispensa, lista della spesa. Web app installabile (PWA) e, in seguito, app
Android — un'unica codebase React.

Vedi `PIANO.md` per lo stato di avanzamento fase per fase e cosa resta
aperto.

## Stack

React 18 + TypeScript + Vite, Tailwind CSS, Supabase (Postgres + Auth +
Realtime + RLS), TanStack Query, React Router, Zod, Vitest + Playwright,
Capacitor per Android.

## Sviluppo

```bash
npm install
cp .env.example .env.local   # valorizza con il tuo progetto Supabase
npm run dev
```

Applica lo schema al progetto Supabase:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Popola una casa di prova (richiede `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`,
mai committata):

```bash
npm run seed
```

## Verifica

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e   # richiede un progetto Supabase di test, vedi e2e/README.md
```

## Struttura

- `brand/` — token di design (colori, tipografia)
- `db/` — schema SQL, RLS, seed
- `src/lib/priorita.ts` — motore delle priorità (cuore dell'app, coperto da test)
- `src/pages/` — le schermate
- `e2e/` — test end-to-end Playwright
- `docs/android.md` — procedura di build/firma dell'APK
