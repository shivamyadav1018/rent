# Firebase setup

KirayaBahi is offline-first: SQLite remains the on-device source for fast/offline use, and Firestore backs up and restores each signed-in user's records. Local changes are queued automatically, uploaded after edits, retried when the app returns to the foreground, and can also be sent with **Settings > Sync now**.

## Firebase Console

1. Create a Firebase project on the Spark plan.
2. Enable Authentication > Sign-in method > Google.
3. Open **Firestore Database**, select **Create database**, choose a region close to your users, and start in production mode. The region cannot be changed later.
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

Debug builds use the App Check debug provider. Run the app once and register the debug token printed in native logs before enforcing App Check in Firebase Console. Production Android builds use Play Integrity.

## Security rules

Install/login to the Firebase CLI and deploy the included rules. The repository's `.firebaserc` already selects the `rentingkhata` project:

```sh
firebase login
firebase deploy --only firestore:rules
```

The rules deny access by default and allow a signed-in user to access only documents below `users/{uid}`.

## Cloud data layout

After the first successful sync, the Firebase console shows data under:

```text
users/{firebaseUid}
  properties/{propertyId}
  units/{unitId}
  tenants/{tenantId}
  rentCycles/{rentCycleId}
  payments/{paymentId}
  profile/settings
```

No composite Firestore indexes are required for this sync design. If Firestore or App Check is not configured correctly, local SQLite data remains usable and **Settings > Cloud account** shows the sync error.
