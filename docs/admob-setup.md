# AdMob integration

## Current ad strategy

- An anchored adaptive banner appears on the owner Dashboard after quick actions.
- An anchored adaptive banner appears on the owner Tenants screen after filters.
- App-open ads are enabled only in the signed-in/offline owner app flow and are rate-limited when the app returns to the foreground.
- Interstitial ads are enabled only in the owner tab navigator and are rate-limited across tab changes.
- Rewarded ads are opt-in from Settings as a support action.
- Tenant invitation, registration, application review, data-entry, payment, reminder, and receipt screens remain free of inline ad placements.
- Ads initialize only for an owner session. Anonymous tenant sessions do not initialize AdMob.

## Development configuration

The app currently uses Google's sample AdMob app IDs in `app.json` and these test ad units in `src/config/ads.ts`:

- `TestIds.APP_OPEN`
- `TestIds.BANNER`
- `TestIds.INTERSTITIAL`
- `TestIds.REWARDED`

These ads produce no revenue and are safe for development testing.

## Before a production release

1. Create Android and iOS apps in AdMob.
2. Create app-open, banner, interstitial, and rewarded ad units for each platform.
3. Replace the sample app IDs in `app.json` with the platform app IDs from AdMob.
4. Replace all `TestIds.*` values in `src/config/ads.ts` with the correct platform ad unit IDs.
5. Rebuild the native apps. Run `bundle exec pod install` from `ios` after changing iOS native configuration.
6. In Play Console, open **Policy and programmes > App content > Ads** and declare that the app contains ads.
7. Publish an `app-ads.txt` file for the developer website listed in the store entry.
8. Configure Privacy & messaging in AdMob. The app requests the Google consent form before initializing ads when it is required.

Never publish a revenue build that uses test ad units, and never click live ads while testing.
