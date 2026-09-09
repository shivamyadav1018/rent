# Firebase setup

KirayaBahi is offline-first: SQLite remains the on-device source for fast/offline use, and Firestore backs up and restores each signed-in user's records. Local changes are queued automatically, uploaded after edits, retried when the app returns to the foreground, and can also be sent with **Settings > Sync now**. Tenant ID proof files are kept in Firebase Storage rather than SQLite.

## Firebase Console

1. Create a Firebase project on the Spark plan.
2. Enable Authentication > Sign-in method > Google.
3. Open **Firestore Database**, select **Create database**, choose a region close to your users, and start in production mode. The region cannot be changed later.
4. Enable **Storage** and use the same region where possible. ID proofs accept images and PDFs up to 10 MB.
5. Enable **Cloud Messaging**. Android uses the included `rent-reminders` notification channel.
6. Upgrade the project to the Blaze plan and enable the Cloud Scheduler API. Firebase scheduled functions require billing, although Firebase includes a small Cloud Scheduler allowance.
7. Register Android and Apple apps in App Check. Use Play Integrity and App Attest with DeviceCheck fallback for production.
8. Add an Android app with package name `com.kirayabahi.landlord`.
9. Add the debug SHA-1 fingerprint shown below.
10. Download `google-services.json` to `android/app/google-services.json`.
11. Add an iOS app with bundle ID `com.kirayabahi.landlord`.
12. Download `GoogleService-Info.plist` to `ios/RentKhata/GoogleService-Info.plist` and add it to the RentKhata Xcode target.
13. In Apple Developer and Xcode, enable Push Notifications for the app ID and upload an APNs authentication key under **Firebase > Project settings > Cloud Messaging > Apple app configuration**. The repository already contains the push entitlement.

Debug SHA-1:

```text
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

## Application configuration

Copy the Web OAuth client ID (`client_type: 3` in `google-services.json`) into `GOOGLE_WEB_CLIENT_ID` in `src/config/firebase.ts`.

For iOS, add the `REVERSED_CLIENT_ID` from `GoogleService-Info.plist` as a URL scheme in the RentKhata target. The credential files must be added before enabling the JavaScript configuration so an incomplete setup falls back to offline mode instead of crashing.

Debug builds use the App Check debug provider. Run the app once and register the debug token printed in native logs before enforcing App Check in Firebase Console. Production Android builds use Play Integrity.

## Security rules

Install/login to the Firebase CLI and deploy the included Firestore and Storage rules, index, and scheduled function. The repository's `.firebaserc` already selects the `rentingkhata` project:

```sh
firebase login
npm install --prefix functions
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

The rules deny access by default. Firestore allows a signed-in user to access only documents below `users/{uid}`. Storage permits that same user to read/write only their own tenant proof files, with file type and size restrictions.

The `sendScheduledRentReminders` function runs daily at 9:00 AM in `Asia/Kolkata`. It creates a missing current-month cycle from the active tenant's rent/electricity defaults, then sends owner-device notifications three days before the due date, on the due date, one day overdue, and every third overdue day. Delivery records prevent concurrent scheduler runs from sending the same reminder twice. Invalid FCM registrations are removed.

FCM targets app installations, not mobile phone numbers. In Phase 1 these pushes remind the signed-in owner whom to collect from; use the tenant detail's WhatsApp reminder for direct tenant contact. A tenant-facing app and tenant FCM registration would be required for direct tenant pushes.

After deploying, sign in on a physical device and use **Settings > Enable reminders**. Android 13+ and iOS will ask for notification permission. iOS remote push delivery requires a physical device and correctly configured APNs credentials/provisioning.

## Cloud data layout

After the first successful sync, the Firebase console shows data under:

```text
users/{firebaseUid}
  properties/{propertyId}
  units/{unitId}
  tenants/{tenantId}
  rentCycles/{rentCycleId}
  payments/{paymentId}
  devices/{deviceId}
  reminderDeliveries/{deliveryId}
  profile/settings
```

ID proof objects are stored under `users/{firebaseUid}/tenant-id-proofs/{tenantId}/` in Firebase Storage. Firestore stores only the protected object path and display metadata.

The included `rentCycles` month/year index supports the daily scheduler query. If Firestore or App Check is not configured correctly, local SQLite data remains usable and **Settings > Cloud account** shows the sync error.
