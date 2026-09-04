# KirayaBahi

KirayaBahi is an offline-first React Native rent manager for landlords to manage properties, units, tenants, monthly rent, payments, WhatsApp reminders, and PDF receipts. SQLite keeps records available offline while authenticated accounts back up and restore their data through Cloud Firestore.

## Run on Android

Requirements: Node.js 22+, JDK 17, Android Studio, and either an emulator or connected Android device.

```sh
npm install
npm start
```

In a second terminal:

```sh
npm run android
```

Build a debug APK without launching a device:

```sh
cd android
./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## Signed release APK

Release builds require a private `android/rent-khata-release.keystore` and an ignored `android/keystore.properties` file containing `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`.

```sh
npm run build:android:release
```

The standalone, minified APK is written to `android/app/build/outputs/apk/release/app-release.apk`. Keep the release keystore and its credentials backed up securely; future app updates must use the same key.

## Checks

```sh
npx tsc --noEmit
npm run lint
npm test -- --runInBand
```

## Architecture

- `src/database`: SQLite schema and repositories
- `src/services`: rent-cycle, WhatsApp share, and receipt PDF logic
- `src/store`: Zustand application state
- `src/modules`: the 15 Phase 1 screens
- `src/components`: shared UI controls

`patch-package` replaces the obsolete `jcenter()` declaration in `react-native-sqlite-storage` with `mavenCentral()` after each install so current Android Gradle versions can build the dependency.

Firebase console and security-rule setup is documented in [`docs/firebase-setup.md`](docs/firebase-setup.md).
# rent
