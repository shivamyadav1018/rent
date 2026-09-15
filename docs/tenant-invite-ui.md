# Tenant invite and approval UX

## Product decision

Build tenant onboarding in two releases. Release 1 gives the landlord a useful invite-code and WhatsApp workflow without changing the application's owner-only authentication boundary. Release 2 lets a tenant redeem that code, submit details, and wait for landlord approval.

This split keeps the current offline-first rent workflow stable. It also prevents tenant-submitted data from becoming an active tenancy before the owner checks it.

## Experience principles

- The landlord always chooses the property and vacant unit before sharing an invite.
- An invite is private, short-lived, and can be cancelled.
- WhatsApp carries only the invitation and basic instructions. Government ID images must not be requested in chat.
- Tenant submissions are applications, not tenant records. Only owner approval creates a tenant and activates the rent ledger.
- Every screen has one clear primary action and preserves useful progress after network failure.
- Status is communicated with text and color: active, submitted, approved, rejected, expired, or cancelled.

## Navigation architecture

```text
Tenants tab
  |
  +-- Tenant invites
        |
        +-- Create invite
        +-- Invite details (Release 2)
              |
              +-- Review application
                    |
                    +-- Approve and create tenant
                    +-- Request changes
                    +-- Reject

Signed-out tenant entry (Release 2)
  |
  +-- Enter invite code / open invite link
        |
        +-- Verify mobile number
        +-- Tenant details
        +-- Address and identity proof
        +-- Review and submit
        +-- Waiting for approval
```

## Release 1: implemented owner flow

### Tenants entry point

The existing Tenants tab keeps direct tenant creation for owners. A separate **Invite tenant via WhatsApp** action opens invite management, so manual entry and assisted onboarding remain distinct workflows.

### Tenant invites screen

```text
+------------------------------------------------+
| <  Tenant Invites                         [+]  |
|    Create, track and re-share codes            |
|                                                |
| [ Active 2 ] [ History 4 ]                     |
|                                                |
| Rahul Sharma                         [ACTIVE]  |
| Lake House - Flat 101                          |
| +--------------------------------------------+ |
| | INVITE CODE                         [copy] | |
| | RK7M2P                                     | |
| +--------------------------------------------+ |
| WhatsApp: 9876543210       Expires 22 Sep 2026 |
| [ WhatsApp  Share again ]              [x]    |
+------------------------------------------------+
```

Layout rules:

- The plus icon is a stable 48 x 48 primary action with an accessibility label.
- Active and history are segmented filters, not separate pages.
- Each repeated invite is one card. No card is nested inside another card.
- The code sits in a high-contrast inset band with a copy icon.
- Cancel is an icon command with a confirmation dialog.
- Empty, loading, error, active, expired, and cancelled states have dedicated copy.

### Create invite screen

```text
+------------------------------------------------+
| <  Invite Tenant                               |
|                                                |
| [icon] Invite a tenant                         |
|        Choose a unit and send a private code   |
|                                                |
| Vacant unit                                    |
| (o) Lake House - Flat 101                      |
| ( ) Market Building - Shop 3                   |
|                                                |
| Tenant contact                                 |
| [ Tenant name (optional)                     ] |
| [ WhatsApp mobile number *                   ] |
|                                                |
| Code validity                                  |
| [ 3 days ] [ 7 days ] [ 14 days ]             |
|                                                |
| [shield] Privacy first                         |
|                                                |
| [ WhatsApp  Create & open WhatsApp           ] |
+------------------------------------------------+
```

Validation and behavior:

- Only vacant units are selectable.
- A unit can have only one unexpired active invite.
- WhatsApp numbers accept 10 to 15 digits after punctuation is removed.
- Codes contain six uppercase, non-ambiguous characters and expire after 3, 7, or 14 days.
- The invite is saved locally before WhatsApp opens. Sharing time is recorded afterward.
- The message asks for basic details and explicitly says not to send identity documents in WhatsApp.

## Release 2: tenant registration and owner approval

This guest registration and approval flow is now implemented. It uses an anonymous Firebase session in the background, so the tenant does not create a visible account and does not need email, password, SMS, or OTP. The owner must treat the submitted mobile number as unverified and confirm it by WhatsApp or call.

### Public invite boundary

The current Firestore tree under `users/{ownerId}` remains owner-only. The signed-in owner app publishes a minimal projection to a separate protected collection. The public payload exposes only code status, property and unit display names, expiry, and the IDs required for one submission.

```text
Owner SQLite tenant_invites
          |
          | owner cloud sync
          v
users/{ownerId}/tenantInvites/{inviteId}       owner-private
          |
          | authenticated owner publishes
          v
publicTenantInvites/{hashedCode}               minimal projection
          |
          | tenant submits with authenticated phone/user ID
          v
tenantApplications/{inviteId}                  owner review queue
          |
          | owner app approves in a Firestore transaction
          v
users/{ownerId}/tenants/{id} + unit occupied + rent cycle
```

Security requirements:

- Keep the invite code outside the readable owner path and disallow collection listing. A code can only be fetched by its exact document ID.
- Require Firebase App Check and tenant authentication before accepting an application.
- Use anonymous Firebase Authentication as an invisible tenant session. Server-side rate limiting remains a future hardening step if abuse appears.
- Permit one active application per invite and make approval idempotent.
- Upload identity documents to an application-specific Storage path. The owner may read it; unrelated users may not.
- Firestore rules allow only the owning landlord account to approve an application or write the private unit and tenant records.

### Tenant details screen

```text
+------------------------------------------------+
| Tenant registration                   Step 1/3 |
| Lake House - Flat 101                          |
|                                                |
| Personal details                               |
| [ Full name *                                ] |
| [ Mobile number (verified)                   ] |
| [ Move-in date *                             ] |
| [ Current address *                          ] |
|                                                |
| [ Continue                                   ] |
+------------------------------------------------+
```

The following step collects an ID type and secure upload. The review step shows every submitted value, consent, and a final **Submit for approval** command. After submission, fields are locked unless the owner requests changes.

### Owner review screen

```text
+------------------------------------------------+
| <  Review application                          |
|                                                |
| [SUBMITTED] Rahul Sharma                       |
| Lake House - Flat 101                          |
|                                                |
| Personal details                               |
| Phone, move-in date, current address           |
|                                                |
| Identity document                       [view] |
|                                                |
| Rental terms                                   |
| Rent, due day, deposit      [owner can adjust] |
|                                                |
| [ Request changes ]                            |
| [ Approve & activate tenant                  ] |
| Reject application                             |
+------------------------------------------------+
```

Approval rechecks that the unit is vacant and both invite records are active. A Firestore transaction creates the tenant, marks the unit occupied, marks both invite records used, and approves the application atomically. The existing offline sync then pulls those records and creates the current rent cycle. If any transaction check fails, nothing is partially activated.

## Data model

`tenant_invites` fields implemented in Release 1:

| Field | Purpose |
| --- | --- |
| `id` | Offline-safe internal identifier |
| `code` | Six-character human-readable invite code |
| `property_id`, `unit_id` | Reserved destination selected by owner |
| `tenant_name`, `tenant_phone` | Optional name and WhatsApp destination |
| `status` | `active`, `expired`, `cancelled`, or `used` |
| `expires_at`, `last_shared_at` | Validity and sharing audit |
| sync metadata | Owner, tombstone, version, and sync state |

Release 2 adds `tenant_applications` with applicant identity, form fields, review status, owner feedback, immutable submission timestamps, and approval audit fields. Sensitive document content stays in Firebase Storage; only metadata and the protected storage path belong in Firestore.

## Accessibility and responsive checks

- All icon-only actions need explicit labels and a minimum 44 x 44 touch target.
- Long property, unit, and tenant names wrap inside flexible text columns.
- Buttons keep stable heights; loading labels do not shift surrounding layout.
- Forms use native keyboard types, visible labels, inline errors, and screen-reader state for radio choices.
- Verify 320 px wide Android, standard Android, and large-text layouts before release.

## Delivery sequence

1. Owner invite creation, local persistence, cloud sync, WhatsApp share, history, and cancellation.
2. Public invite projection, App Check, and anonymous tenant authentication. Implemented without OTP; server-side rate limiting remains future hardening.
3. Tenant registration form and submission state. Implemented; secure document upload remains intentionally deferred until after approval.
4. Owner review queue and transactional approval. Implemented; request-changes remains a later enhancement.
5. Reminder notifications for unopened invites, pending applications, and requested changes.
