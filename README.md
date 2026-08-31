# Rent Khata

Rent Khata is an offline-first React Native app for landlords to manage properties, units, tenants, monthly rent, payments, WhatsApp reminders, and PDF receipts. Phase 1 stores all data locally in SQLite and has no login, backend, cloud sync, or online payments.

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
# rent
