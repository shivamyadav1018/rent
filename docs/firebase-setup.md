# Firebase setup

KirayaBahi remains offline-first. Firebase Authentication establishes data ownership in this phase; Firestore upload is intentionally deferred until backup and restore are implemented.

## Firebase Console

1. Create a Firebase project on the Spark plan.
2. Enable Authentication > Sign-in method > Google.
3. Create a Firestore database in production mode.
4. Register Android and Apple apps in App Check. Use Play Integrity and App Attest with DeviceCheck fallback for production.
5. Add an Android app with package name `com.kirayabahi.landlord`.
6. Add the debug SHA-1 fingerprint shown below.
7. Download `google-services.json` to `android/app/google-services.json`.
8. Add an iOS app with bundle ID `com.kirayabahi.landlord`.
9. Download `GoogleService-Info.plist` to `ios/RentKhata/GoogleService-Info.plist` and add it to the RentKhata Xcode target.

Debug SHA-1:

```text
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

## Application configuration

Copy the Web OAuth client ID (`client_type: 3` in `google-services.json`) into `GOOGLE_WEB_CLIENT_ID` in `src/config/firebase.ts`.

For iOS, add the `REVERSED_CLIENT_ID` from `GoogleService-Info.plist` as a URL scheme in the RentKhata target. The credential files must be added before enabling the JavaScript configuration so an incomplete setup falls back to offline mode instead of crashing.

Debug builds use the App Check debug provider. Run the app once and register the debug token printed in native logs before enforcing App Check in Firebase Console.

## Security rules

Deploy `firestore.rules` before implementing backup:

```sh
firebase deploy --only firestore:rules
```

The rules deny access by default and allow a signed-in user to access only documents below `users/{uid}`.
