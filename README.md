# KirayaBahi

KirayaBahi is an offline-first React Native rent manager for landlords to manage properties, units, tenants, monthly rent, payments, WhatsApp reminders, and PDF receipts. SQLite keeps records available offline while authenticated accounts back up and restore their data through Cloud Firestore.

## Run on Android

Requirements: Node.js 22.13+, JDK 17, Android Studio, and either an emulator or connected Android device.

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
npm run typecheck
npm run lint
npm test -- --runInBand
```

## Architecture

- `src/database`: SQLite schema and repositories
- `src/services`: rent-cycle, WhatsApp share, receipt PDF, and authentication logic
- `src/services/sync`: session guards and cloud transfer operations
- `src/hooks`: reusable resource loading and retry logic
- `src/app`: startup lifecycle, providers, and navigation
- `src/store`: Zustand application state
- `src/modules`: feature screens and feature-specific hooks (including payment form state)
- `src/components`: shared UI controls

`patch-package` replaces the obsolete `jcenter()` declaration in `react-native-sqlite-storage` with `mavenCentral()` after each install so current Android Gradle versions can build the dependency.

Firebase console and security-rule setup is documented in [`docs/firebase-setup.md`](docs/firebase-setup.md).

The [app review](docs/app-review.md) records fixed issues, module boundaries, validation, and remaining device checks. Run `npm run check` for TypeScript, lint, and all tests. Repository integration tests use Node 22.13+ built-in SQLite.
