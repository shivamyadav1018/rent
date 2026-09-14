# Payment reliability — priority 1

Implemented 11 September 2026.

- A payment, its optional electricity change, balance/status updates, and SQLite sync-queue entries commit in one native `sqlBatch` transaction. A failed statement rolls back the batch. A sync notification failure after commit does not report the payment as failed.
- Receipt numbers use the full persisted payment ID (`KB-<payment ID>`), so regenerating a receipt or restoring it on another device retains its identity without an offline counter.
- New payments capture rent, electricity, balance after payment, and landlord/tenant/property/unit labels. Subsequent bills and payments do not alter that receipt snapshot.
- The success screen passes the exact saved payment ID. Tenant history exposes each payment's receipt, including earlier partial payments.
- To correct a payment, open Tenant → Payment history → View receipt / correct, enter a reason, and choose Void payment. Record a replacement separately if needed. Voiding retains the amount, date, original snapshot, correction reason, and timestamp; totals exclude the void. It does not issue a bank refund.
- Snapshot and void fields are included in cloud backup/restore. Use the updated app on all devices; older app versions do not understand voids or these snapshot fields.

## Existing records

Migration adds nullable columns without rewriting old amounts. Existing payments receive deterministic receipt identities when displayed. Old generated receipt numbers were not stored with payments and cannot be recovered. Historical receipts explicitly omit the uncaptured original bill breakdown/balance rather than substituting current values. Previously shared PDF files cannot be recalled or changed; share a newly generated VOID receipt when correcting an entry.

## Verification

`npm run check` covers TypeScript, lint, app tests, and scheduled-function tests. New regression coverage includes SQLite rollback (including sync-queue writes), correction rollback/idempotence, cloud field round trips, native batch commit notification, stable receipt snapshots, legacy receipt handling, and HTML escaping.

Physical-device PDF generation/sharing and live Firebase multi-device restore still need a device pass. Deposit settlements and meter-reading billing remain subsequent priorities.
