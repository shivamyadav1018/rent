# App review and modularization

Reviewed on 8 September 2026. The app already implemented the main rent-management screens; its original 30 tests, TypeScript check, and lint passed. This change addresses uncovered lifecycle, error-handling, and data-read defects without changing the SQLite schema or adding dependencies.

## Fixed issues

| Issue | Result |
| --- | --- |
| Database startup rejection left a permanent spinner; an unmounted app could still start auth. | Startup has an error/retry state and cancels subscription setup after unmount. Concurrent startup calls share database opening and migration work. |
| OAuth configuration alone enabled Firebase even when no native default app existed. | Native Firebase registration determines availability, allowing an unconfigured build to use offline mode. |
| Delayed sign-in callbacks could reactivate a signed-out session. | Auth callbacks check session identity after asynchronous work and ignore disposed subscriptions. |
| Stopped cloud requests could continue restoring records or publish state into a newer session. | Each sync session owns its callbacks, listeners, pending promise, and retry timer. Transfer operations check session identity before and after I/O. |
| Initial sync suppressed UI updates, and later updates refreshed rent records without reloading settings. | Restored records and profile changes trigger application bootstrap, including onboarding/settings, before potentially slow uploads. |
| Equal profile timestamps caused repeated profile writes. | An unchanged profile is skipped. |
| Payment totals, receipts, and lists included records marked deleted by sync. | Read queries exclude deleted records and relevant deleted parents; deleted rent-cycle tombstones prevent regeneration. Inactive tenants retain historical ledger entries. |
| Property, receipt, reminder, and edit-form failures looked like loading forever or left incomplete editable forms. | Loading, failure, missing-record, and retry states are explicit. Stale requests cannot replace the selected resource. |
| Tenant-list failures appeared as an empty payment form. | The payment form reports the load failure and allows retrying. |
| Choosing tenant units used racing database reads to fill monthly rent. | Selection uses the already-loaded unit data. |
| A successful property/unit/tenant save could be reported as failed when a subsequent refresh failed. | Refresh failures no longer invite repeating a successful insert. |
| Settings save and reminder-share failures could escape without user feedback. | Failures are handled; settings saves also reject repeated taps while pending. |
| Partially paid overdue rent used the ordinary reminder wording. | Reminder wording checks the due date and remaining balance. |

## Module boundaries

- `src/app/useAppStartup.ts`: database startup and auth subscription lifetime. `App.tsx` composes providers and startup UI.
- `src/modules/payments/useRecordPayment.ts`: payment selection, loading, validation, saving, and retries. `RecordPaymentScreen.tsx` renders the form.
- `src/hooks/useFocusedResource.ts`: focused-screen loading with cancellation and retry.
- `src/components/ResourceState.tsx`: shared loading/error/retry presentation.
- `src/services/cloudSyncService.ts`: sync scheduling, listeners, session state, and orchestration.
- `src/services/sync/operations.ts`: Firestore entity/profile transfer and conflict comparison.
- `src/services/sync/session.ts`: guards asynchronous work against stopped/replaced sessions.
- `src/services/sync/waitForInitialSync.ts`: bounded startup wait with timer cleanup.
- `src/services/authErrors.ts`: authentication error messages.
- `src/services/rentStatus.ts`: one rent-status calculation for local reconciliation and cloud reconciliation.
- `src/database/repositories`: SQLite access, including consistent deleted-record filters.

## Validation

- TypeScript and ESLint pass.
- 54 tests across 13 suites pass, including real SQLite repository-query tests using Node's built-in SQLite module.
- Android `assembleDebug` succeeds.
- Metro generates the production Android JavaScript bundle successfully.

The added tests cover startup failure/retry/unmount, concurrent database startup, native Firebase availability, delayed auth and sync work, session replacement, profile restoration, deleted records, and resource loading/retry. Existing payment-screen and rent-cycle tests still pass.

## Remaining validation and design limits

- No Android device or emulator was connected. Google/email authentication, live Firestore restore, native PDF generation, and WhatsApp sharing still need an end-to-end device pass.
- This checkout has no iOS `GoogleService-Info.plist`. iOS cloud authentication requires the native configuration described in `firebase-setup.md`; no iOS build was verified.
- Cancellation prevents subsequent work and stale callbacks; a native write already submitted before cancellation cannot be withdrawn.
- Tenant/unit changes and payment/aggregate changes still span multiple database statements. A future transaction-focused change should make those mutations atomic and test injected write failures. Rent totals already reconcile on the next load.
- Existing dependency warnings remain: React Native Elements uses deprecated `ImageBackground`; SQLite storage reports old iOS CLI configuration; the Android build reports Gradle deprecations. The SQLite integration tests emit Node's experimental SQLite warning.
