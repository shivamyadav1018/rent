# iOS Firebase Setup

To enable Firebase on iOS you need to add the `GoogleService-Info.plist` file:

1. Go to the [Firebase console](https://console.firebase.google.com/) and open your project.
2. Click **Project settings** (gear icon) → **Your apps** → select the iOS app (bundle ID `com.rentkhata`).
3. Click **Download GoogleService-Info.plist**.
4. Place the downloaded file in this directory: `ios/RentKhata/GoogleService-Info.plist`.
5. Open Xcode: `open ios/RentKhata.xcodeproj`.
6. In the Project navigator, right-click the `RentKhata` group → **Add Files to "RentKhata"**.
7. Select `GoogleService-Info.plist` and make sure **Copy items if needed** is checked.
8. Confirm the file appears under **Build Phases → Copy Bundle Resources**.
9. Run `pod install` from the `ios/` directory, then rebuild.

Without this file the app will crash on launch when Firebase is initialised.
