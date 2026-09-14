# Ciurma su Android

## Stato

Il progetto `android/` è stato generato con Capacitor (`npx cap add android`)
e configurato con:

- deep link `https://ciurma.app/invito/*` (intent filter `autoVerify="true"`)
- custom URL scheme `ciurma://auth-callback` per il ritorno dell'OAuth Google
- `src/lib/useDeepLink.ts` che traduce entrambi in navigazione React Router /
  scambio sessione Supabase

**Non verificato in questa sessione**: non c'è un Android SDK/emulatore né un
dispositivo fisico disponibili nell'ambiente in cui è stato scritto questo
codice, quindi la build reale (`./gradlew assembleRelease`), l'installazione
su un telefono e il login Google nativo **non sono stati testati qui**. La
procedura sotto è quella corretta per Capacitor 8 ma va verificata a mano
prima di consegnare l'APK.

## Build di sviluppo

```bash
npm run build
npx cap sync android
npx cap open android   # apre Android Studio
```

Da Android Studio: Run ▶ su un emulatore o dispositivo connesso via USB
(debug abilitato).

## Icona e splash dal marchio

Servono asset reali generati dai colori/tipografia in `brand/tokens.css`
(Fondale `#0E2A33` come sfondo, wordmark "Ciurma" o l'icona da
`public/favicon.svg`). Usa `@capacitor/assets`:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```

Questo passaggio **non è stato eseguito**: mancano ancora asset sorgente ad
alta risoluzione (icona 1024×1024, splash) — vedi PIANO.md.

## OAuth Google nativo

1. Nella Google Cloud Console, crea un client OAuth di tipo **Android**,
   con package name `app.ciurma` e l'impronta SHA-1 del keystore di firma
   (debug in sviluppo, release in produzione: `keytool -list -v -keystore
   <path> -alias <alias>`).
2. In Supabase → Authentication → Providers → Google, aggiungi il client ID
   Android tra i "Additional Client IDs" del provider Google esistente (lo
   stesso provider usato per il flusso web).
3. Il redirect nativo usa lo scheme `ciurma://auth-callback` configurato nel
   manifest: Supabase deve avere questo URL tra i redirect consentiti.

## Deep link per l'invito

L'intent filter con `autoVerify="true"` per `https://ciurma.app/invito/*`
funziona solo se `https://ciurma.app/.well-known/assetlinks.json` è
pubblicato con l'impronta SHA-256 del certificato di firma dell'app:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.ciurma",
    "sha256_cert_fingerprints": ["<SHA-256 DEL CERTIFICATO DI FIRMA>"]
  }
}]
```

Senza questo file, Android non promuove il link ad "apri l'app": il link si
apre nel browser (il criterio di uscita della fase 5 richiede che si apra
l'app, quindi questo passaggio è bloccante per quel criterio, non opzionale).

## Firma e build di release

1. Genera un keystore (una volta sola, **mai committarlo**):

   ```bash
   keytool -genkeypair -v -keystore ciurma-release.keystore \
     -alias ciurma -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configura `android/keystore.properties` (file locale, in `.gitignore`,
   mai committato):

   ```properties
   storeFile=/percorso/assoluto/ciurma-release.keystore
   storePassword=...
   keyAlias=ciurma
   keyPassword=...
   ```

3. In `android/app/build.gradle`, aggiungi la `signingConfig` che legge
   `keystore.properties` (pattern standard Capacitor/Android, non incluso di
   default nello scaffold — va aggiunto a mano seguendo la guida ufficiale
   Capacitor "Android Deployment").

4. Build firmata:

   ```bash
   cd android
   ./gradlew assembleRelease
   # oppure, per l'App Bundle richiesto dal Play Store:
   ./gradlew bundleRelease
   ```

   L'APK firmato si trova in
   `android/app/build/outputs/apk/release/app-release.apk`.

5. Installazione fuori dal Play Store (sideload):

   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

## Notifiche locali per il turno di oggi

Non ancora implementate. Richiedono `@capacitor/local-notifications` e un
job che, per ogni membro, calcoli le attività "da fare oggi"/"in ritardo"
(riusando `src/lib/priorita.ts`, già coperto da test) e pianifichi una
notifica giornaliera. Annotato come lavoro rimanente in PIANO.md.
