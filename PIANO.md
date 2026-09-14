# PIANO — Ciurma

Documento vivo. Aggiornato ad ogni fase con cosa è stato fatto, cosa è
verificato automaticamente e cosa richiede verifica manuale (e come farla).

## Premessa importante sull'ambiente di sviluppo

Questa prima iterazione è stata scritta in un ambiente **senza**:
- un progetto Supabase reale collegato (nessuna credenziale disponibile);
- un Android SDK/emulatore o un dispositivo fisico;
- un secondo account Google per testare l'invito tra due persone;
- strumenti di conversione immagini (niente ImageMagick/librerie immagine).

Questo significa che tutto ciò che dipende da un backend vivo (RLS attiva,
Realtime, login Google reale, invito tra due account, APK installato su un
telefono) è stato **scritto e reso testabile**, ma non eseguito qui contro
un ambiente reale. Sotto, per ogni voce, è indicato esplicitamente se è
"verificato automaticamente in questa sessione" o "da verificare a mano"
con la procedura esatta.

## Fase 1 — fondamenta

- [x] Scaffold Vite/React/TS/Tailwind, token in `brand/tokens.css` mappati su `@theme` (Tailwind v4)
- [x] Client Supabase (`src/lib/supabase.ts`) con storage via `@capacitor/preferences` (niente `localStorage` diretto, richiesto per Android)
- [x] `db/schema.sql` riscritto da zero con tutte le entità, RLS su ogni tabella, funzione `case_dell_utente()` security definer, RPC `invito_da_token`/`accetta_invito` per l'eccezione controllata sull'invito
- [x] Login Google (`src/pages/Login.tsx`) — unico metodo in produzione
- [x] Crea casa / Ho un invito (`src/pages/Onboarding.tsx`, `src/pages/InvitoAccetta.tsx`)
- [x] Bottom navigation a 4 voci + Impostazioni raggiungibile da Oggi

**Verificato in questa sessione:** typecheck, lint, build, unit test.
**Da verificare a mano** (serve un progetto Supabase reale):
1. Applicare `db/schema.sql` a un progetto Supabase pulito.
2. Configurare il provider Google in Supabase Auth.
3. Aprire l'app con due account Google diversi, creare una casa con il primo,
   generare un invito da Impostazioni, aprirlo con il secondo account, e
   verificare che entrambi compaiano nella lista membri di entrambi (con
   Realtime disabilitato su `membro`, serve un refresh manuale — non è tra le
   tabelle con Realtime abilitato per scelta, vedi nota sotto).

Nota tecnica: `membro` non è nell'elenco Realtime richiesto dal prompt
(`completamento`, `prodotto`, `voce_spesa`), quindi il criterio di uscita
"si vedono a vicenda" è verificato con un refresh, non in realtime. Se questo
non va bene, va detto esplicitamente: aggiungere `membro` alla pubblicazione
realtime è una riga in più in `db/schema.sql`.

## Fase 2 — attività

- [x] CRUD categorie e attività (creazione; modifica/archiviazione **non ancora implementate in UI**, solo a schema/RPC pronte via update diretto)
- [x] Motore delle priorità `src/lib/priorita.ts`, **16 test unitari** in `src/lib/priorita.test.ts` e `src/lib/formattaRitardo.test.ts` (tutti verdi)
- [x] Schermata Oggi: "Oggi tocca a te", "Le più urgenti", "In casa manca"
- [x] Spunta (inserisce una riga in `completamento`, mai un update di stato)
- [ ] Annullamento spunta entro 5 minuti — **non implementato**. Lo storico e
      il modello (append-only) sono corretti per supportarlo, ma manca il
      pulsante/azione "Annulla" nell'UI. Prossimo passo.
- [ ] Editor di assegnazione (categoria → membro → giorni L M M G V S D) con
      selettore visuale e vista riepilogativa settimanale — **non
      implementato in UI**. Lo schema (`assegnazione`) e la logica
      (`categorieOggiPerMembro`, `attivitaVisibileOggi`) sono pronti e
      testati; oggi le assegnazioni vanno create via SQL/seed. Questo è il
      gap più importante rimasto in questa fase.
- [x] Attività con giorni propri che scavalcano i giorni della categoria
      (caso "Lavatrice: martedì e giovedì") — **logica coperta da test
      unitari** (`priorita.test.ts`, caso `attivitaVisibileOggi`)
- [x] Preset di cadenza definiti (ogni giorno/2 giorni/settimanale/quindicinale/mensile) ma non ancora esposti come scelta rapida nel form di creazione attività (oggi la cadenza va scritta a mano); i preset sono usati dal seed.

**Verificato automaticamente**: la logica di stato/ritardo/visibilità per
giorno è coperta da test Vitest che replicano esattamente gli esempi del
prompt (spazzatura cadenza 2, lavatrice martedì/giovedì, caso "5 giorni senza
spuntare → molto in ritardo").

**Da verificare a mano**: il flusso UI end-to-end "creo categoria+attività,
assegno un membro il martedì, martedì lo vede in Oggi" richiede prima
l'editor di assegnazione (sopra). `e2e/attivita-oggi.spec.ts` è scritto ma
copre solo la parte già implementata (creazione categoria/attività, spunta);
annota esplicitamente il gap.

## Fase 3 — dispensa e spesa

- [x] Dispensa con i due modi di conteggio (stepper interi per `countable`,
      livello Pieno/A metà/Agli sgoccioli/Finito per `uncountable`), mai
      nominati come "countable/uncountable" nell'interfaccia
- [x] Aggiunta rapida con inferenza del tipo dal nome (`inferisciTipo`, stessa
      logica del seed)
- [x] Badge scorta bassa / scadenza entro 3 giorni
- [x] Selezione multipla → "Aggiungi alla spesa"
- [x] Lista spesa: aggiunta libera, spunta, realtime su `voce_spesa` (canale
      Supabase Realtime sottoscritto in `src/pages/Spesa.tsx`)
- [x] Spuntare riporta la quantità in dispensa — **lato database**, via
      trigger `voce_spesa_ripristina_dispensa` (non lato client: è
      l'automatismo richiesto dal prompt)
- [ ] "Aggiungi dalla dispensa" come schermata dedicata dentro Spesa (oggi il
      percorso è solo dalla Dispensa verso la Spesa, non il contrario) —
      **non implementato**
- [ ] Azione "Chiudi la spesa" che archivia le voci prese in blocco — **non
      implementata**: oggi ogni voce si spunta singolarmente (che di per sé
      soddisfa "riporta la quantità in dispensa", ma manca l'azione di
      chiusura/archiviazione esplicita del giro spesa)

**Da verificare a mano**: il realtime multi-dispositivo va testato con due
browser/dispositivi reali contro lo stesso progetto Supabase (con Realtime
abilitato su `voce_spesa`/`prodotto`/`completamento`, già nello schema).
`e2e/dispensa-spesa.spec.ts` copre il percorso in un solo contesto browser
più una verifica diretta sul database per il trigger; non simula due
dispositivi in parallelo.

## Fase 4 — seed e rifinitura

- [x] `db/seed.sql` (SQL puro, richiede UUID di utenti auth già esistenti) e
      `scripts/seed.ts` (end-to-end via service role: crea utenti, casa,
      categorie, 4+21 attività, 2 assegnazioni, ~85 prodotti in dispensa)
- [ ] Onboarding con proposta delle categorie iniziali — **non
      implementato**: `Onboarding.tsx` crea solo una casa vuota, non offre
      "Partiamo da queste, poi le sistemi" con i dati del seed
- [x] Stati vuoti scritti per Oggi, Dispensa, Spesa (testi da invito ad
      agire, non da errore)
- [ ] Gestione errori più strutturata (oggi solo messaggi minimi su
      Onboarding/Invito) — parziale
- [x] `prefers-reduced-motion` gestito in `src/index.css`
- [x] Focus visibile (`:focus-visible` con outline Cima) impostato globalmente
- [ ] Contrasto verificato **solo a occhio**, non con uno strumento
      automatico (nessun tool di contrasto disponibile in questa sessione) —
      da verificare con axe/Lighthouse
- [x] PWA installabile (`vite-plugin-pwa`, manifest, service worker generato
      nel build) — icone `public/pwa-192.png`/`pwa-512.png` sono
      **placeholder** (quadrati in tinta Fondale generati via script, non
      il marchio reale): da sostituire con asset veri prima del rilascio

## Fase 5 — Android

- [x] `npx cap add android` eseguito, progetto `android/` generato
- [x] `capacitor.config.ts` con `appId: app.ciurma`
- [x] Deep link `https://ciurma.app/invito/*` e custom scheme
      `ciurma://auth-callback` configurati in `AndroidManifest.xml`,
      gestiti da `src/lib/useDeepLink.ts`
- [ ] Icona e splash dal marchio — **non fatto** (servono asset sorgente ad
      alta risoluzione, vedi `docs/android.md`)
- [ ] OAuth Google nativo — **configurazione documentata** in
      `docs/android.md` ma non eseguita (serve una Google Cloud Console e un
      progetto Supabase reali)
- [ ] Notifiche locali per il turno di oggi — **non implementate**
- [ ] Build APK firmata — **non eseguita**: nessun Android SDK/keystore in
      questo ambiente. Procedura completa documentata in `docs/android.md`,
      incluso perché il deep link `autoVerify` richiede
      `assetlinks.json` pubblicato sul dominio.

Questa fase è la meno completa: è infrastruttura reale (manifest, scheme,
config) ma **non un APK installabile e testato su un telefono**, che è il
criterio di uscita esplicito del prompt. Va trattata come lavoro aperto, non
come "fatto".

## Ciclo di verifica eseguito in questa sessione

```
npm run typecheck   → 0 errori
npm run lint        → 0 errori, 0 warning
npm run test        → 16/16 test verdi (motore priorità + formattaRitardo)
npm run build       → build di produzione ok (un solo warning non bloccante: bundle >500kB, non è un errore di build)
grep -r "service_role" dist/   → nessun risultato
```

`npm run test:e2e` **non è stato eseguito**: i 6 test richiesti sono scritti
in `e2e/` (login/invito, categoria+attività+assegnazione, spunta/annulla con
ritardo, dispensa countable/uncountable, dispensa→spesa→dispensa, isolamento
RLS) ma richiedono un progetto Supabase di test reale con
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` e il
flag `VITE_E2E_TEST_AUTH=true` (bypass di login solo per e2e, spiegato in
`e2e/README.md` — mai attivo in produzione). Senza queste variabili
`npx playwright test` fallisce subito alla creazione del client Supabase, per
costruzione: è già stato verificato che questo è l'unico motivo del
fallimento (`e2e/fixtures.ts:11`, `supabaseUrl is required`), non un errore
nei test.

360px: le schermate sono scritte mobile-first con Tailwind (`flex`, niente
larghezze fisse superiori a 360px, `touch-target` per il minimo 44×44px);
**non verificato con un browser reale a 360px** in questa sessione (nessun
ambiente grafico), solo per costruzione del CSS.

## Checklist finale — stato onesto

- [ ] Login Google: funziona su web *da verificare a mano*, su Android *non testato*
- [ ] Invito via link: creazione/condivisione/ingresso implementati; scadenza e "già usato" gestiti dalla RPC `accetta_invito` ma **non testati contro un DB reale**
- [~] Categorie e attività: creazione sì, modifica/archiviazione no
- [ ] Assegnazione a membro con giorni della settimana: **UI non implementata** (solo schema+logica+seed)
- [x] Attività con giorni propri che scavalcano i giorni della categoria: **coperto da test unitari**
- [~] Oggi mostra le categorie del giorno: sì, ma non verificabile end-to-end finché manca l'editor di assegnazione
- [x] Oggi mostra le urgenti ordinate per ritardo, testo in italiano: **testato**, testo narrativo è generico (non frasi su misura per attività, vedi nota in `Oggi.tsx`)
- [~] Spunta con storico: sì; annullamento entro 5 minuti: no
- [x] Dispensa: due modi di conteggio, mai nominati nell'interfaccia
- [~] Lista spesa da dispensa + voci libere: la direzione dispensa→spesa c'è, manca la schermata dedicata dentro Spesa e "Chiudi la spesa"
- [x] Spunta realtime: canale sottoscritto, **non testato su due dispositivi reali**
- [x] Seed: Cucina (4), Faccende domestiche (21), 2 membri con assegnazione, dispensa senza quantità — **script pronto, non eseguito contro un progetto reale**
- [ ] RLS verificata con test che tenta l'accesso incrociato: **test scritto** (`e2e/rls-isolamento.spec.ts`), **non eseguito**
- [x] Nessun segreto nel bundle: verificato (`grep` vuoto)
- [~] 360px/focus/contrasto: scritto per essere corretto, non verificato con strumenti/browser reale
- [x] PWA installabile (build genera service worker + manifest); icone placeholder
- [ ] APK firmato: non fatto
- [x] `PIANO.md` aggiornato e onesto

## Cosa farei come prossimo passo, in ordine di priorità

1. Editor di assegnazione in `Attivita.tsx` (sblocca metà della checklist)
2. Collegare un vero progetto Supabase e far girare `npm run test:e2e` per
   davvero, correggendo quello che emerge (RLS in primis)
3. Annullamento spunta (5 minuti)
4. "Chiudi la spesa" + "Aggiungi dalla dispensa" come schermata dedicata
5. Icone/splash reali e build Android su un ambiente con SDK
