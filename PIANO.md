# PIANO — Ciurma

Documento vivo. Aggiornato ad ogni fase con cosa è stato fatto, cosa è
verificato automaticamente e cosa richiede verifica manuale (e come farla).

## Premessa importante sull'ambiente di sviluppo

Questa è la seconda iterazione, scritta nello stesso ambiente senza:
- un progetto Supabase reale collegato (nessuna credenziale disponibile);
- un Android SDK/emulatore o un dispositivo fisico;
- un secondo account Google per testare l'invito tra due persone;
- librerie immagine "vere" (niente PIL/ImageMagick/rsvg-convert — le icone
  sono generate pixel per pixel da script Node, vedi Fase 5).

Questo significa che tutto ciò che dipende da un backend vivo (RLS attiva,
Realtime multi-dispositivo, login Google reale, invito tra due account, APK
installato su un telefono) resta **scritto e testabile, ma non eseguito
contro un ambiente reale**. La differenza rispetto alla prima iterazione è
che questa volta è stato verificato *tutto ciò che era genuinamente
verificabile senza quei pezzi mancanti* — inclusa una verifica visiva reale
a 360px con Chromium headless, che ha già trovato un bug vero (i font del
marchio non venivano caricati).

## Terza iterazione — deploy reale

Su richiesta, l'app è stata **davvero messa online** con le CLI di Supabase
e Vercel (token forniti dall'utente, usati e non salvati nel repo):

- **Supabase**: progetto `ciurma-app` (ref `pmjuefvqjpuzyhqnqtgh`, org
  `pqnaaabtnjnwozcjapfw`, regione `eu-west-1`). `db/schema.sql` applicato
  via l'API di gestione Supabase (`POST /v1/projects/{ref}/database/query`,
  niente password del database necessaria con un access token). Verificato
  dopo l'applicazione: le 9 tabelle esistono, `rowsecurity = true` su tutte.
- **Vercel**: progetto `badmotherfuckers-projects/ciurma-app`, collegato al
  repo GitHub (deploy automatico ai push su questo branch). Variabili
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` impostate su
  Production/Preview/Development e verificate con `vercel env pull`
  (valore reale, non solo che esistessero).
- **URL live**: **https://ciurma-app.vercel.app**
- Verificato dopo il deploy: `curl` restituisce 200, l'HTML include i
  `<link>` dei font (fix della fase 4 confermato in produzione), il bundle
  JS servito **non contiene** `service_role` né la stringa del progetto
  esposta oltre l'URL pubblico previsto.
- `site_url` e `uri_allow_list` di Supabase Auth aggiornati con l'URL
  Vercel reale (necessario perché i redirect OAuth funzionino quando Google
  sarà collegato).

**Non fatto, su scelta esplicita dell'utente**: il provider Google OAuth in
Supabase Auth resta disattivato (`external_google_enabled: false`). Creare
un client OAuth richiede la Google Cloud Console dell'utente, che non è
delegabile a un token API — l'utente ha scelto di rimandarlo. **Login e
onboarding non sono quindi ancora utilizzabili sul sito live**: il bottone
"Accedi con Google" è visibile ma non porta a nulla di funzionante finché
il provider non è configurato. Il resto dell'app (schema, RLS, build) è
comunque verificabile in produzione.

## Fase 1 — fondamenta

- [x] Scaffold Vite/React/TS/Tailwind, token in `brand/tokens.css` mappati su `@theme` (Tailwind v4)
- [x] Client Supabase (`src/lib/supabase.ts`) con storage via `@capacitor/preferences` (niente `localStorage` diretto, richiesto per Android)
- [x] `db/schema.sql`: tutte le entità, RLS su ogni tabella, funzione `case_dell_utente()` security definer, RPC `invito_da_token`/`accetta_invito`, ora anche Realtime su `membro` (vedi sotto)
- [x] Login Google (`src/pages/Login.tsx`) — unico metodo in produzione
- [x] Crea casa / Ho un invito (`src/pages/Onboarding.tsx`, `src/pages/InvitoAccetta.tsx`), con proposta dei dati di partenza (vedi Fase 4)
- [x] Bottom navigation a 4 voci + Impostazioni raggiungibile da Oggi

**Cambiato in questa iterazione**: `membro` è stato aggiunto alla
pubblicazione Realtime (non richiesto esplicitamente dalla specifica, che
elenca solo `completamento`/`prodotto`/`voce_spesa`, ma necessario perché
"due account entrano nella stessa casa e si vedono a vicenda" sia vero senza
un refresh manuale — annotato come nota tecnica nella prima iterazione,
risolto qui). Impostazioni.tsx si sottoscrive al canale corrispondente.

**Verificato in questa sessione:** typecheck, lint, build, unit test, e —
novità — un rendering reale della schermata Login con Chromium headless a
360×740 (vedi "Verifica visiva reale" più sotto).

**Da verificare a mano** (serve un progetto Supabase reale): applicare
`db/schema.sql`, configurare Google in Supabase Auth, e il giro completo con
due account Google veri (login OAuth reale non simulabile in questo
ambiente).

## Fase 2 — attività

- [x] CRUD categorie e attività: creazione, **modifica e archiviazione ora
      implementate in UI** (`DettaglioCategoria.tsx`, `DettaglioAttivita.tsx`)
- [x] Motore delle priorità `src/lib/priorita.ts`, **16 test unitari** in `src/lib/priorita.test.ts` e `src/lib/formattaRitardo.test.ts` (tutti verdi)
- [x] Schermata Oggi: "Oggi tocca a te", "Le più urgenti", "In casa manca"
- [x] Spunta (inserisce una riga in `completamento`, mai un update di stato)
- [x] **Annullamento spunta entro 5 minuti** — implementato in
      `src/components/BottoneSpunta.tsx`, condiviso da Oggi e Attività: se
      l'ultimo completamento di quell'attività fatto da quel membro è entro
      5 minuti, il pulsante "Fatto" diventa "Annulla" e cancella quella riga
      (mai una modifica: si toglie il fatto appena aggiunto, il resto dello
      storico resta). Passata la finestra torna "Fatto" da solo.
- [x] **Editor di assegnazione** (categoria → membro → giorni L M M G V S D)
      — `src/components/AssegnazioniCategoria.tsx` + `SelettoreGiorni.tsx`,
      dentro ogni categoria in Attività. **Vista riepilogativa settimanale**
      "Chi fa cosa" — `RiepilogoSettimanale.tsx`, toggle in alto in Attività.
- [x] Attività con giorni propri che scavalcano i giorni della categoria
      (caso "Lavatrice: martedì e giovedì") — coperto da test unitari
      **e ora anche da un test e2e dedicato** che passa dall'editor di
      assegnazione vero, non da SQL diretto (`e2e/attivita-oggi.spec.ts`)
- [x] Preset di cadenza (ogni giorno/2 giorni/settimanale/quindicinale/mensile)
      esposti come scelta rapida sia nella creazione sia nel dettaglio di
      un'attività (non solo nel seed)

**Verificato automaticamente**: la logica di stato/ritardo/visibilità per
giorno è coperta da test Vitest che replicano esattamente gli esempi del
prompt. I test e2e che esercitano l'editor di assegnazione sono scritti e
tipizzati correttamente, ma — come tutto ciò che parla con Supabase — non
eseguiti contro un backend reale in questa sessione (vedi sotto).

**Nessun gap noto rimasto in questa fase** a livello di funzionalità
implementata; resta solo la verifica end-to-end contro un Supabase reale.

## Fase 3 — dispensa e spesa

- [x] Dispensa con i due modi di conteggio (stepper interi per `countable`,
      livello Pieno/A metà/Agli sgoccioli/Finito per `uncountable`), mai
      nominati come "countable/uncountable" nell'interfaccia
- [x] Aggiunta rapida con inferenza del tipo dal nome (`inferisciTipo`, stessa
      logica del seed, ora condivisa via `src/lib/seedIniziale.ts`)
- [x] Badge scorta bassa / scadenza entro 3 giorni
- [x] Selezione multipla → "Aggiungi alla spesa"
- [x] Lista spesa: aggiunta libera, spunta, realtime su `voce_spesa`
- [x] Spuntare riporta la quantità in dispensa — lato database, via trigger
      `voce_spesa_ripristina_dispensa`
- [x] **"Aggiungi dalla dispensa" come schermata dedicata** —
      `src/components/AggiungiDallaDispensa.tsx`: selezione multipla con i
      prodotti sotto scorta o finiti proposti in cima, esclusi quelli che
      hanno già una voce aperta
- [x] **"Chiudi la spesa"** — segna in blocco tutte le voci aperte come
      prese (con conferma), invece di doverle spuntare una per una

**Nessun gap noto rimasto in questa fase** a livello funzionale.

**Da verificare a mano**: il realtime multi-dispositivo va comunque testato
con due browser/dispositivi reali contro lo stesso progetto Supabase.

## Fase 4 — seed e rifinitura

- [x] `db/seed.sql` (SQL puro) e `scripts/seed.ts` (end-to-end via service
      role), entrambi allineati agli stessi dati ora centralizzati in
      `src/lib/seedIniziale.ts`
- [x] **Onboarding con proposta dei dati di partenza**: creando una casa,
      "Partiamo da queste, poi le sistemi" (spuntato di default) applica
      Cucina + Faccende domestiche + dispensa di base via
      `src/lib/applicaSeedIniziale.ts`, tutto assegnato a chi crea la casa e
      riassegnabile dopo dall'editor di assegnazione
- [x] Stati vuoti scritti per Oggi, Dispensa, Spesa, Attività (inviti ad
      agire, non messaggi di errore)
- [x] **Gestione errori più strutturata**: banner condiviso
      (`src/components/BannerErrore.tsx`) e messaggi tradotti in italiano
      comprensibile (`src/lib/erroreGenerico.ts`, `Onboarding.tsx` per gli
      errori specifici sull'invito: scaduto/già usato/non trovato),
      agganciati alle mutazioni principali di Onboarding, Dispensa, Spesa,
      Attività
- [x] `prefers-reduced-motion` gestito in `src/index.css`
- [x] Focus visibile (`:focus-visible` con outline Cima) impostato globalmente
- [x] **Font del marchio caricati davvero** — bug trovato e corretto in
      questa iterazione: `index.css` dichiarava `font-family: Fraunces` /
      `Figtree` ma nessun `<link>` li caricava, quindi il testo ricadeva sul
      serif/sans-serif di sistema senza che si notasse guardando solo il
      codice. Trovato verificando la schermata Login a 360px con Chromium
      headless (screenshot + controllo `scrollWidth`), non "a occhio sul
      codice" come nella prima iterazione.
- [~] Contrasto: verificato visivamente sullo screenshot della schermata
      Login (Fondale su Salso, bottone Fondale con testo bianco — contrasto
      alto in entrambi i casi), **non con uno strumento automatico** (axe/
      Lighthouse non disponibili in questo ambiente headless); le altre
      schermate non sono state verificate visivamente perché richiedono una
      sessione autenticata contro un Supabase reale.
- [x] PWA installabile (`vite-plugin-pwa`, manifest, service worker generato
      nel build) — **icone reali del marchio**, non più placeholder a tinta
      unita: una ruota del timone (a tema con "Ciurma"/equipaggio) in Cima
      su Fondale, generata pixel per pixel da `scripts/genera-icona.cjs`
      (nessuna libreria immagine disponibile in questo ambiente)

### Verifica visiva reale (nuova in questa iterazione)

A differenza della prima iterazione, che dichiarava il mobile-first
"corretto per costruzione del CSS" senza averlo mai visto renderizzato,
qui è stato avviato il dev server con variabili Supabase fittizie ma valide
nella forma, e la schermata Login è stata aperta con Chromium headless
(`/opt/pw-browsers/chromium`, già presente nell'ambiente) a viewport
360×740:

- `document.documentElement.scrollWidth` (360) == `clientWidth` (360):
  **nessun overflow orizzontale**
- Zero errori in console/pagina
- Screenshot ispezionato: layout centrato, bottone "Accedi con Google" a
  piena leggibilità, contrasto adeguato — ma con i font di sistema anziché
  Fraunces/Figtree, da cui il fix sopra

Le altre schermate (Oggi, Attività, Dispensa, Spesa, Impostazioni)
richiedono una sessione autenticata e dati di una casa reale, quindi non
sono state verificate allo stesso modo in questa sessione: restano "scritte
per essere corrette" (mobile-first, `flex`, nessuna larghezza fissa oltre
360px, `touch-target` da 44×44px) ma non viste a schermo. Prossimo passo
naturale: ripetere la stessa verifica con un progetto Supabase di test una
volta disponibile.

## Fase 5 — Android

- [x] `npx cap add android` eseguito, progetto `android/` generato e
      **committato** (contiene modifiche manuali reali, vedi sotto)
- [x] `capacitor.config.ts` con `appId: app.ciurma`
- [x] Deep link `https://ciurma.app/invito/*` e custom scheme
      `ciurma://auth-callback` configurati in `AndroidManifest.xml`,
      gestiti da `src/lib/useDeepLink.ts` (`@capacitor/app`)
- [x] **Icona e splash dal marchio** — non più placeholder: icona legacy,
      icona adattiva (sfondo Fondale + glifo Cima nella safe zone) e splash
      screen, tutti generati da `scripts/genera-icona*.cjs` e
      `genera-splash.cjs`. Scartato `@capacitor/assets` come dipendenza:
      porta una vulnerabilità critica nota in `node-tar` senza fix
      disponibile e avrebbe retrocesso `@capacitor/cli` — non ne valeva il
      rischio per delle icone.
- [x] **Bug reale trovato e corretto**: `values/styles.xml` referenziava
      `@color/colorPrimary`, `@color/colorPrimaryDark`, `@color/colorAccent`
      ma `colors.xml` non esisteva nello scaffold generato da Capacitor —
      build-breaking, mai notato prima perché la build reale non era mai
      stata eseguita. Aggiunto `values/colors.xml` con i colori del marchio.
- [ ] OAuth Google nativo — configurazione documentata in `docs/android.md`
      ma non eseguita (serve una Google Cloud Console e un progetto
      Supabase reali)
- [ ] Notifiche locali per il turno di oggi — non implementate
- [ ] Build APK firmata — non eseguita: nessun Android SDK/keystore in
      questo ambiente. Procedura completa documentata in `docs/android.md`,
      incluso perché il deep link `autoVerify` richiede `assetlinks.json`
      pubblicato sul dominio.

Questa resta la fase meno completa, ma per una ragione strutturale (manca
l'SDK), non per lavoro rimandato: tutto ciò che si poteva scrivere,
verificare o correggere senza una build reale (manifest, icone, bug dello
scaffold) è stato fatto. Non un APK installabile e testato su un telefono,
che resta il criterio di uscita esplicito e **non è raggiungibile in questo
ambiente**.

## Ciclo di verifica eseguito in questa sessione

```
npm run typecheck   → 0 errori
npm run lint        → 0 errori, 0 warning
npm run test        → 16/16 test verdi (motore priorità + formattaRitardo)
npm run build       → build di produzione ok (un solo warning non bloccante: bundle >500kB, non è un errore di build)
grep -r "service_role" dist/   → nessun risultato
```

Più, nuovo in questa iterazione: verifica visiva reale a 360px con
Chromium headless sulla schermata Login (vedi Fase 4).

`npm run test:e2e` **non è stato eseguito**: i test in `e2e/` (login/invito
tra due account, categoria+attività+assegnazione+caso "Lavatrice",
spunta/annulla con ricalcolo del ritardo, dispensa a pezzi/a livello,
dispensa→spesa→dispensa con "Aggiungi dalla dispensa" e "Chiudi la spesa",
isolamento RLS) sono stati **riscritti in questa iterazione per usare
davvero l'editor di assegnazione** (non più un lavoro-intorno al gap, che
ora è chiuso), ma richiedono comunque un progetto Supabase di test reale
con `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`
e `VITE_E2E_TEST_AUTH=true` (bypass di login solo per e2e, mai in
produzione — vedi `e2e/README.md`). Senza queste variabili
`npx playwright test` fallisce alla creazione del client Supabase, per
costruzione, non per un errore nei test.

## Checklist finale — stato onesto

- [ ] Login Google: progetto Supabase reale online (https://ciurma-app.vercel.app), ma il provider Google **non è ancora configurato** (scelta dell'utente, rimandata) — bottone visibile, non funzionante; su Android *non testato* (nessun SDK)
- [~] Invito via link: creazione/condivisione/ingresso implementati e ora *anche* testati e2e (scritti); scadenza e "già usato" hanno messaggi dedicati; **non eseguiti contro un DB reale**
- [x] Categorie e attività: creazione, modifica **e archiviazione** implementate
- [x] Assegnazione a membro con giorni della settimana: **editor implementato** (`AssegnazioniCategoria`/`SelettoreGiorni`), coperto da test e2e (scritti, non eseguiti)
- [x] Attività con giorni propri che scavalcano i giorni della categoria: coperto da test unitari **e da un test e2e dedicato**
- [x] Oggi mostra le categorie del giorno per l'utente corrente
- [x] Oggi mostra le urgenti ordinate per ritardo, con testo in italiano corretto (testo narrativo resta generico, non su misura per ogni attività — nota in `Oggi.tsx`)
- [x] Spunta per singola attività dentro la categoria, con storico **e annullamento** entro 5 minuti
- [x] Dispensa: due modi di conteggio, mai nominati nell'interfaccia
- [x] Lista spesa generata selezionando dalla dispensa (schermata dedicata) + voci libere, con chiusura in blocco
- [x] Spunta realtime su più dispositivi: canale sottoscritto (**non testato su due dispositivi fisici**)
- [x] Seed: Cucina (4 attività), Faccende domestiche (21 attività), due membri con assegnazione, dispensa senza quantità — script pronto, **non eseguito contro un progetto reale**; stessa proposta ora disponibile in onboarding
- [ ] RLS verificata con test che tenta l'accesso incrociato: test scritto (`e2e/rls-isolamento.spec.ts`), **non eseguito**
- [x] Nessun segreto nel bundle: verificato (`grep` vuoto)
- [~] 360px/focus/contrasto: **verificato visivamente per la schermata Login** (Chromium headless, screenshot, zero overflow); le altre schermate restano "scritte per essere corrette", non viste a schermo (richiedono un backend reale)
- [x] PWA installabile, con icona reale del marchio
- [ ] APK firmato: non fatto (nessun Android SDK in questo ambiente); icone/splash e fix dello scaffold sono pronti per quando lo sarà
- [x] `PIANO.md` aggiornato e onesto

## Cosa resta, in ordine di priorità

1. Collegare un vero progetto Supabase di test e far girare `npm run
   test:e2e` per davvero — è l'unico modo per passare da "scritto" a
   "verificato" su RLS, invito tra due account, realtime multi-dispositivo
2. Ripetere la verifica visiva a 360px (fatta finora solo su Login) sulle
   altre schermate, con un utente autenticato reale
3. Notifiche locali Android per il turno di oggi
4. OAuth Google nativo su Android, poi build APK firmata e installazione su
   un telefono reale (l'unico blocco è l'assenza di un Android SDK qui)
5. Frasi narrative su misura per attività in "Le più urgenti" (oggi un
   template generico, grammaticalmente corretto ma non specifico come negli
   esempi del prompt)

## Decisioni prese senza chiedere, e perché

- **Login e2e**: aggiunto un bypass email/password attivo solo con
  `VITE_E2E_TEST_AUTH=true`, perché il prodotto ha come unico metodo Google
  OAuth, non automatizzabile in CI/sandbox senza un vero IdP di test.
- **Icone**: scartato `@capacitor/assets` (vulnerabilità critica in
  `node-tar` senza fix, avrebbe anche retrocesso `@capacitor/cli`) a favore
  di script Node che disegnano l'icona pixel per pixel — nessuna libreria
  immagine esterna nella dipendenze di sviluppo.
- **Realtime su `membro`**: aggiunto oltre a quanto richiesto esplicitamente
  dalla specifica, per coerenza con il criterio di uscita della fase 1
  ("si vedono a vicenda" senza refresh).
