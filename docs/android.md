# Ciurma su Android

## Stato

Il progetto `android/` è stato generato con Capacitor (`npx cap add android`)
e configurato con:

- deep link `https://ciurma-app.vercel.app/invito/*` (intent filter `autoVerify="true"`)
- custom URL scheme `ciurma://auth-callback` per il ritorno dell'OAuth Google
- `src/lib/useDeepLink.ts` che traduce entrambi in navigazione React Router /
  scambio sessione Supabase

**Build debug eseguita e verificata** (23/09/2026): Android SDK installato
da riga di comando (command-line tools + `platforms;android-36` +
`build-tools;36.0.0`, quelli richiesti da `variables.gradle`),
`./gradlew assembleDebug` completato, APK da 4,2 MB. Controlli fatti
sull'artefatto: `apksigner verify` ok, `aapt dump badging` → package
`app.ciurma`, minSdk 24, targetSdk 36; il manifest compilato contiene
entrambi gli intent filter; il bundle web dentro l'APK è quello con gli
ultimi fix. **Non ancora provato su un telefono fisico** (nessun
dispositivo/emulatore qui): installazione, login e apertura del deep link
restano da verificare a mano.

Lo stesso comando riproduce l'APK in locale, senza Android Studio:

```bash
# una tantum: SDK a riga di comando
mkdir -p $ANDROID_HOME/cmdline-tools && cd $ANDROID_HOME/cmdline-tools
curl -L -o t.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q t.zip && mv cmdline-tools latest && rm t.zip
yes | latest/bin/sdkmanager --licenses
latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"

# ogni build
npm run build && npx cap sync android
echo "sdk.dir=$ANDROID_HOME" > android/local.properties   # non committato
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

## Build di sviluppo

```bash
npm run build
npx cap sync android
npx cap open android   # apre Android Studio
```

Da Android Studio: Run ▶ su un emulatore o dispositivo connesso via USB
(debug abilitato).

## Icona e splash dal marchio

Fatto: icona (una ruota del timone, a tema con "Ciurma"/equipaggio) in Cima
su sfondo Fondale, generata dai token del marchio. Niente più placeholder a
tinta unita.

`@capacitor/assets` (che useremmo normalmente per generare tutte le
risoluzioni da un sorgente) dipende da `sharp`/`tar` con una vulnerabilità
critica nota (node-tar, nessuna fix disponibile compatibile) e avrebbe
anche retrocesso `@capacitor/cli`: non vale il rischio per un'icona. Al suo
posto, `scripts/genera-icona.cjs` e `scripts/genera-icona-adattiva.cjs`
disegnano l'icona a livello di pixel (nessuna libreria immagine) e
producono:

- `public/pwa-192.png` / `public/pwa-512.png` (PWA)
- `android/app/src/main/res/mipmap-*/ic_launcher.png` e `ic_launcher_round.png`
  (icona legacy, pre-Android 8)
- `android/app/src/main/res/mipmap-*/ic_launcher_foreground.png` (icona
  adattiva, sfondo trasparente entro la "safe zone" del 66%)
- `android/app/src/main/res/drawable*/splash.png` via `scripts/genera-splash.cjs`

Il colore di sfondo dell'icona adattiva (`values/ic_launcher_background.xml`)
è impostato su Fondale. Per rigenerare dopo un cambio di palette:

```bash
node scripts/genera-icona.cjs public/pwa-512.png 512
node scripts/genera-icona-adattiva.cjs android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png 432
# vedi i tre script in scripts/ per l'elenco completo delle dimensioni
```

Nota: `android/app/src/main/res/values/colors.xml` non esisteva nello
scaffold generato da Capacitor pur essendo referenziato da `styles.xml`
(`@color/colorPrimary` ecc.) — build-breaking se non aggiunto. Corretto in
questa sessione con i colori del marchio.

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

L'intent filter con `autoVerify="true"` per
`https://ciurma-app.vercel.app/invito/*` funziona solo se
`https://ciurma-app.vercel.app/.well-known/assetlinks.json` è
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
