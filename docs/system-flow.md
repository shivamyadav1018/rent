# KirayaBahi system flow

This document is a visual guide to how KirayaBahi works. The application is an
offline-first React Native rent manager: normal owner operations are saved to
SQLite first, and authenticated accounts synchronize those records with
Firebase when a network connection is available.

For implementation details about every module, see
[Architecture and module workflows](architecture.md).

## 1. Complete system overview

```mermaid
flowchart TB
  Owner[Landlord] --> App[React Native app]
  Tenant[Tenant applicant] --> App

  subgraph Mobile[Mobile application]
    App --> Startup[Startup and migrations]
    Startup --> Navigation[Role-based navigation]
    Navigation --> Screens[Feature screens]
    Screens --> Stores[Zustand stores]
    Screens --> Services[Business services]
    Stores --> Repositories[SQLite repositories]
    Services --> Repositories
    Repositories --> SQLite[(Local SQLite database)]
    Repositories --> Queue[(Pending sync queue)]
  end

  subgraph Firebase[Firebase platform]
    Auth[Authentication]
    Firestore[(Cloud Firestore)]
    Storage[(Cloud Storage)]
    Scheduler[Cloud Scheduler]
    Function[Reminder Cloud Function]
    FCM[Firebase Cloud Messaging]
  end

  Services <--> Auth
  Queue -->|signed in and online| Firestore
  Firestore -->|remote changes| SQLite
  Services <--> Storage
  Scheduler -->|09:00 IST daily| Function
  Function --> Firestore
  Function --> FCM
  FCM -->|owner reminder| App
```

The important rule is **local first**. The UI confirms a normal save after the
SQLite transaction succeeds. Firestore is a synchronized cloud copy, not a
requirement for day-to-day offline work.

## 2. Application startup and navigation

```mermaid
flowchart TD
  Launch[Launch app] --> OpenDB[Open rent_khata.db]
  OpenDB --> Migrate[Run database migrations]
  Migrate --> InitAuth[Initialize Firebase authentication]
  InitAuth --> Role{Account role and access}

  Role -->|tenant signed in| TenantCode[Enter tenant invite code]
  TenantCode --> TenantForm[Tenant application form]
  TenantForm --> TenantResult[Submission status]

  Role -->|owner not signed in| Welcome[Welcome screen]
  Welcome --> OwnerAuth[Sign in, create account, or offline mode]
  OwnerAuth --> SetupCheck{Owner profile complete?}

  Role -->|owner signed in or offline| SetupCheck
  SetupCheck -->|no| Setup[Landlord setup]
  SetupCheck -->|yes| Tabs[Main tabs]
  Setup --> Tabs

  Tabs --> Dashboard[Dashboard]
  Tabs --> Tenants[Tenants]
  Tabs --> Ledger[Monthly ledger]
  Tabs --> Properties[Properties]
  Tabs --> Settings[Settings]
```

On startup, `useAppStartup` opens SQLite before rendering navigation. The auth
store then observes Firebase authentication, starts cloud sync for a signed-in
owner, or loads local records when offline mode is selected.

## 3. Owner's main business flow

```mermaid
flowchart LR
  Profile[Landlord profile] --> Property[Create property]
  Property --> Unit[Add rentable unit]
  Unit --> Tenant[Assign tenant]
  Tenant --> Cycle[Create monthly rent cycle]
  Cycle --> Bill[Rent plus electricity bill]
  Bill --> Payment[Record full or partial payment]
  Payment --> Balance[Recalculate paid amount and balance]
  Balance --> Receipt[Preview, share, or save PDF receipt]

  Tenant --> Reminder[WhatsApp or scheduled reminder]
  Tenant --> MoveOut[Move-out settlement]
  MoveOut --> Vacant[Mark unit vacant]
```

The core hierarchy is:

```text
Property -> Unit -> Tenant -> Monthly rent cycle -> Payment -> Receipt
```

## 4. Local write and cloud synchronization

```mermaid
sequenceDiagram
  actor User
  participant Screen
  participant Repository
  participant SQLite
  participant Queue as Sync queue
  participant Sync as Cloud sync service
  participant Cloud as Firestore
  participant Store as App store

  User->>Screen: Submit a valid form
  Screen->>Repository: Create or update record
  Repository->>SQLite: Begin atomic write
  Repository->>SQLite: Save record and derived values
  Repository->>Queue: Add pending upsert or delete
  SQLite-->>Repository: Commit transaction
  Repository-->>Screen: Local save succeeded
  Screen->>Store: Reload visible data
  Store-->>User: Show updated UI immediately

  alt Owner is signed in and online
    Queue->>Sync: Pending changes detected
    Sync->>Cloud: Upload user-scoped documents
    Cloud-->>Sync: Acknowledge write
    Sync->>Queue: Remove completed queue item
  else Offline or cloud unavailable
    Queue-->>Queue: Keep item for a later retry
  end
```

Cloud sync also listens for Firestore changes. A remote update is pulled into
SQLite and then the app store reloads the screen data. Synchronization retries
after local writes, when the app becomes active, and when the owner chooses
**Sync now** in Settings.

## 5. Monthly rent, payment, and receipt flow

```mermaid
flowchart TD
  SelectMonth[Select month] --> Ensure[Ensure an eligible tenant has a rent cycle]
  Ensure --> Total[Total payable = rent + electricity]
  Total --> Due{Balance and due date}
  Due -->|balance is zero| Paid[Paid]
  Due -->|partially paid| Partial[Partial]
  Due -->|due date not passed| Unpaid[Unpaid]
  Due -->|due date passed| Overdue[Overdue]

  Partial --> Record[Record payment]
  Unpaid --> Record
  Overdue --> Record
  Record --> Validate[Validate amount, date, mode, and reference]
  Validate --> Transaction[Atomic SQLite transaction]
  Transaction --> SavePayment[Save payment snapshot]
  Transaction --> UpdateCycle[Update total paid, balance, and status]
  Transaction --> QueueSync[Queue payment and cycle sync]
  SavePayment --> Receipt[Open permanent receipt]
  Receipt --> Share[Share or save PDF]
  Receipt -->|entry was incorrect| Void[Void with a reason]
  Void --> Audit[Keep audit history and recalculate cycle]
```

Voiding does not delete payment history. The original record is retained with
the void reason, and only non-voided payments count toward the cycle total.

## 6. Tenant invite and application flow

```mermaid
sequenceDiagram
  actor Owner
  participant OwnerApp as Owner app
  participant Cloud as Firestore
  actor Applicant
  participant TenantApp as Tenant app

  Owner->>OwnerApp: Select a vacant unit
  OwnerApp->>Cloud: Publish six-character invite code
  OwnerApp-->>Applicant: Share invite message
  Applicant->>TenantApp: Enter invite code
  TenantApp->>Cloud: Validate active, unexpired invite
  Applicant->>TenantApp: Submit name, phone, address, and move-in date
  TenantApp->>Cloud: Create tenant application
  Cloud-->>OwnerApp: Show submitted request
  Owner->>OwnerApp: Approve or reject
  alt Approved and unit is still vacant
    OwnerApp->>Cloud: Create tenant atomically
    OwnerApp->>Cloud: Mark unit occupied and invite used
    Cloud-->>TenantApp: Application approved
  else Rejected or no longer valid
    Cloud-->>TenantApp: Show final status
  end
```

Invite approval is performed in a Firestore transaction so two approvals
cannot occupy the same unit or reuse the same invite.

## 7. Reminder flow

```mermaid
flowchart TD
  Cycle[Unpaid rent cycle] --> Manual[Manual reminder]
  Manual --> Preview[Build reminder message]
  Preview --> WhatsApp[Open WhatsApp share sheet]

  Cycle --> Automatic[Automatic owner reminder]
  Scheduler[Cloud Scheduler at 09:00 IST] --> Function[Scheduled reminder function]
  Function --> CreateCycles[Create missing current-month cycles]
  CreateCycles --> Check[Check due, before-due, or overdue rule]
  Automatic --> Check
  Check --> Skip{Paid, settled, deleted, or already sent?}
  Skip -->|yes| Stop[Do not send]
  Skip -->|no| Guard[Create unique delivery guard]
  Guard --> FCM[Send FCM notification]
  FCM --> OwnerDevice[Notify landlord device]
```

Scheduled push notifications go to the landlord's registered device. Direct
tenant contact happens through the manual WhatsApp flow.

## 8. Main data relationships

```mermaid
erDiagram
  PROPERTY ||--o{ UNIT : contains
  UNIT ||--o{ TENANT : houses
  TENANT ||--o{ RENT_CYCLE : receives
  RENT_CYCLE ||--o{ PAYMENT : records
  TENANT ||--o| SETTLEMENT : closes_with
  PROPERTY ||--o{ TENANT_INVITE : offers
  UNIT ||--o{ TENANT_INVITE : targets
  TENANT_INVITE ||--o| TENANT_APPLICATION : produces

  PROPERTY {
    string id
    string name
    string address
  }
  UNIT {
    string id
    string property_id
    string status
    number monthly_rent
  }
  TENANT {
    string id
    string unit_id
    string status
    number monthly_rent
    number security_deposit
  }
  RENT_CYCLE {
    string id
    string tenant_id
    number total_payable
    number total_paid
    number balance
    string status
  }
  PAYMENT {
    string id
    string rent_cycle_id
    number amount
    string payment_mode
    string voided_at
  }
  SETTLEMENT {
    string id
    string tenant_id
    number balance
  }
  TENANT_INVITE {
    string id
    string unit_id
    string code
    string status
  }
  TENANT_APPLICATION {
    string id
    string invite_id
    string applicant_id
    string status
  }
```

## 9. Code map

| Area | Location | Purpose |
| --- | --- | --- |
| App startup and navigation | `App.tsx`, `src/app` | Opens the database and chooses the correct role-based flow. |
| Screens | `src/modules` | Implements all user-facing workflows. |
| Shared UI | `src/components`, `src/theme` | Reusable controls, cards, typography, and styling. |
| Application state | `src/store` | Holds authentication, sync status, and screen-ready data. |
| Business logic | `src/services` | Sync, authentication, rent cycles, invites, receipts, reminders, and file uploads. |
| Local persistence | `src/database` | SQLite migrations, repositories, transactions, and sync queue. |
| Scheduled backend | `functions` | Creates missing cycles and sends owner reminders. |
| Firebase access control | `firestore.rules`, `storage.rules` | Protects each owner's cloud records and files. |

## 10. Failure behavior

- If Firebase is unavailable, existing owner data remains usable from SQLite.
- If a cloud upload fails, its queue entry remains pending for retry.
- If a SQLite transaction fails, none of that transaction's related changes
  are committed.
- If startup cannot open or migrate SQLite, the app shows an error with a
  retry action.
- If an invite is expired, cancelled, used, or its unit is occupied, the tenant
  application cannot be approved.
- Duplicate scheduled reminders are prevented by a unique delivery record.

