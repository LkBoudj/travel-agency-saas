# Travel Agency SaaS — MVP v0.1 Agent-Executable PRD

**Document type:** Product Requirements Document + Engineering Execution Contract  
**Version:** 0.1  
**Status:** Active MVP source of truth  
**Date:** 2026-09-19  
**Repository:** `https://github.com/LkBoudj/travel-agency-saas.git`  
**Primary objective:** Ship a secure, usable multi-tenant Travel Agency SaaS MVP without scope drift.

---

## 0. How to Use This Document

This document is written so that a capable coding agent — paid or free, CLI or IDE-based — can execute work consistently without depending on a specific model vendor.

It is both:

1. a product PRD defining what the MVP must do; and
2. an engineering contract defining how an agent must inspect, implement, test, verify, and report work.

An agent must **not** treat this document as permission to implement the whole MVP in one pass. Work is performed one bounded slice at a time.

### Source-of-truth precedence

When information conflicts, use this order:

1. The user's newest explicit decision for the current task.
2. This PRD.
3. Root and app-specific `AGENTS.md` / `PROJECT_MAP.md` files.
4. Applied database migrations and current Prisma schema.
5. Current API contracts, tests, guards, and service behavior.
6. Older reports, comments, placeholders, or assumptions.

If a material conflict remains after inspection, **stop and report the conflict instead of guessing**.

### Agent behavior contract

Every agent must:

- inspect before modifying;
- preserve existing working behavior unless the task explicitly changes it;
- avoid broad refactors unrelated to the active slice;
- never fabricate tests, browser verification, migrations, API behavior, or production readiness;
- never expose hidden chain-of-thought as a deliverable;
- provide concise evidence: files changed, tests run, real verification performed, blockers, and deferred work;
- stop at the agreed task boundary.

---

# PART I — PRODUCT DEFINITION

## 1. Product Vision

Travel Agency SaaS is a multi-tenant operating system for travel agencies.

The MVP must allow a real agency to manage its operational flow from team access through customer booking and payment tracking, while the platform operator manages agencies and platform-level access.

The product is **not** an online travel marketplace in MVP v0.1.

### Core value proposition

A travel agency should be able to use one system to:

- access its own isolated workspace;
- manage team access safely;
- manage customers;
- define tours and itineraries;
- schedule departures;
- configure pricing;
- create bookings and travelers;
- record payments and remaining balances.

---

## 2. MVP Success Scenario

MVP v0.1 is successful when this end-to-end flow works reliably:

```text
Platform Admin
  -> creates or approves Agency
  -> Agency receives an Owner

Agency Owner
  -> logs in
  -> opens the correct Agency workspace
  -> invites Employee

Employee
  -> receives invitation
  -> accepts invitation
  -> becomes ACTIVE EMPLOYEE
  -> receives configured Agency Roles

Agency
  -> creates Customer
  -> creates Tour
  -> adds Destination / Itinerary
  -> creates Departure
  -> configures Price(s)
  -> creates Booking
  -> adds Traveler(s)
  -> records Payment(s)
  -> sees paid amount and remaining balance
```

The MVP is not complete until this path passes real end-to-end verification with tenant isolation and authorization enabled.

---

## 3. Product Actors

### 3.1 Platform Admin User

A platform-side AppUser who has one or more PLATFORM roles.

Responsibilities:

- manage platform identities and platform roles where authorized;
- create/manage Agencies;
- review Agency Applications where applicable;
- manage platform reference data needed by MVP;
- support the platform without implicitly becoming an Agency member.

Platform authorization is always based on `Permission.key`.

### 3.2 Agency Owner

An AppUser with an AgencyMembership where:

```text
membershipType = OWNER
```

Ownership is a domain relationship, not an authorization shortcut.

The owner must still receive effective permissions through Agency Roles.

### 3.3 Agency Employee

An AppUser with:

```text
membershipType = EMPLOYEE
```

An Employee may have:

```text
0 roles
1 role
multiple roles
```

Zero-role membership is valid and means the user has no business permissions in that Agency.

### 3.4 Customer

A business entity owned by an Agency.

A Customer is not automatically an AppUser and should not be forced into the authentication model.

### 3.5 Traveler

A person attached to a Booking. A Traveler may or may not be the Customer who created the booking.

---

## 4. MVP Scope

### 4.1 Included

#### Platform foundation

- Authentication
- Platform RBAC
- Platform Admin Agency management
- Agency creation / approval flow required by current product
- Agency ACTIVE / SUSPENDED lifecycle

#### Agency foundation

- Agency discovery after login
- Agency selection for multi-agency users
- URL-scoped Agency context
- Agency authorization
- Agency member management
- Secure member invitations

#### Business MVP

- Customers
- Tours
- Tour Destinations
- Tour Itinerary
- Departures
- Pricing
- Bookings
- Booking Travelers
- Manual Payments
- Paid / remaining balance calculation

### 4.2 Explicitly excluded from MVP v0.1

- public marketplace
- agency website builder
- custom domains and DNS verification
- mobile application
- AI features
- advanced analytics dashboards
- CRM / marketing automation
- public user registration
- social login
- external payment gateway integration
- automated refunds
- advanced notification center
- ownership transfer
- advanced audit UI
- custom Agency Role CRUD unless it becomes necessary to complete the MVP success flow
- complex reporting suite
- multi-currency accounting engine
- review/rating marketplace features
- full CMS

If a proposed feature does not directly help the MVP success scenario, it defaults to Post-MVP unless the user explicitly promotes it.

---

# PART II — VERIFIED CURRENT STATE

## 5. Current Implementation Status

The following status reflects the latest verified project reports and decisions available as of this PRD version.

### Foundation

| Area | Status |
|---|---|
| Authentication | Complete |
| Platform RBAC | Complete |
| Agency Foundation | Complete |
| Agency Authorization | Complete |
| Agency Dashboard Foundation | Complete |
| Agency Members backend | Complete |
| Agency Members frontend | Complete |
| Identity-enumeration security hardening | Complete |
| Member Invitations backend core | Complete |
| Member Invitation SMTP/Mailpit delivery | In progress / must be verified before marking complete |
| Member Invitations frontend | Not started |
| Invitation acceptance frontend | Not started |

### Business MVP

| Module | Status |
|---|---|
| Customers | Not yet accepted as complete |
| Tours | Not yet accepted as complete |
| Departures | Not yet accepted as complete |
| Pricing | Not yet accepted as complete |
| Bookings | Not yet accepted as complete |
| Travelers | Not yet accepted as complete |
| Payments | Not yet accepted as complete |

An agent must not infer that an unlisted feature is complete from placeholder UI or schema presence alone.

---

## 6. Important Security History That Must Not Regress

The project previously contained an Agency-side member candidate search capable of querying AppUsers globally. It was removed because it created cross-tenant privacy and account-enumeration risk.

These capabilities must **never be reintroduced** into Agency context:

- global AppUser search;
- partial email search across all AppUsers;
- partial name search across all AppUsers;
- partial AppUser code search across all AppUsers;
- `member-candidates` directory behavior;
- direct Agency attachment of arbitrary EXISTING AppUsers;
- direct Agency creation of NEW AppUsers as members without invitation consent;
- public `/auth/register` unless a future approved product design makes it non-enumerating.

Platform-level global identity search is a separate capability and must remain protected by PLATFORM permissions.

---

# PART III — ENGINEERING ARCHITECTURE

## 7. System Architecture

### 7.1 Monorepo shape

The intended architecture is:

```text
travel-agency-saas/
  backend/                 NestJS API
  frontend/
    admin/                 Platform Admin SPA
    dashboard/             Agency Dashboard SPA
    storefront/            future/public storefront context; not MVP-critical unless explicitly promoted
```

One backend serves distinct product contexts. Do not collapse Platform Admin and Agency Dashboard authorization into one ambiguous context.

### 7.2 Backend stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL / Neon
- Zod / Standard Schema validation
- Passport authentication
- JWT identity-only session token
- HttpOnly cookie
- CASL-based permission evaluation where current architecture uses it
- Swagger for API documentation/verification, environment-gated
- SMTP delivery via Nest-compatible mail abstraction for invitation email

### 7.3 Frontend stack

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- shadcn/ui / existing UI primitives
- react-i18next

### 7.4 Infrastructure used in development

- Neon PostgreSQL
- Docker where useful for local services
- Mailpit for local SMTP testing
- GitHub for source control, issues, PRs, milestones, and project tracking

---

## 8. Authentication Contract

### 8.1 Session model

Authentication uses an HttpOnly cookie.

JWT remains identity-only:

```json
{ "sub": "<AppUser.id>" }
```

Never embed into JWT:

- agency id;
- agency code;
- membership;
- roles;
- permissions;
- owner flag;
- platform admin flag.

### 8.2 Client rules

Never store auth tokens in:

- `localStorage`;
- `sessionStorage`;
- Zustand persistence;
- URL query parameters.

HTTP requests use `credentials: "include"`.

### 8.3 Public registration

Public registration is out of MVP and currently disabled by design.

Do not restore it as a shortcut for invitation acceptance.

---

## 9. Authorization Contract

### 9.1 Universal rule

Authorization is based on:

```text
Permission.key
```

Never authorize using:

- Role ID;
- Role name;
- Role key as a privilege shortcut;
- `isAdmin`;
- `membershipType`;
- `OWNER`;
- `systemKey` directly as an access decision.

### 9.2 Platform authorization

```text
AppUser
  -> PlatformRoleAssignment
  -> PLATFORM Role
  -> RolePermission
  -> Permission.key
```

### 9.3 Agency authorization

```text
JWT AppUser
  -> route :agencyCode
  -> Agency
  -> ACTIVE AgencyMembership
  -> AgencyRoleAssignment[]
  -> valid AGENCY Role(s)
  -> RolePermission[]
  -> AGENCY Permission.key[]
  -> guard decision
```

### 9.4 Valid Agency Role

A role contributes to an Agency context only when:

```text
scope = AGENCY
AND
(
  agencyId IS NULL
  OR
  agencyId = currentAgency.id
)
```

A custom role from another Agency must never contribute permissions.

### 9.5 Owner rule

`membershipType = OWNER` identifies ownership only.

There must never be:

```ts
if (membershipType === 'OWNER') return allowEverything;
```

The owner receives access from assigned Agency permissions.

---

# PART IV — DOMAIN MODEL AND INVARIANTS

## 10. Core Identity and RBAC Entities

### AppUser

Central identity shared across product contexts.

An AppUser may simultaneously be:

- a Platform user;
- an Owner in one Agency;
- an Employee in another Agency.

No persisted `userType` should be required to classify these contexts.

### Role

Supports PLATFORM and AGENCY scopes.

`systemKey` is reserved for stable protected system-role identity where required. It is not the authorization decision itself.

### Permission

Code-owned catalog identified by stable `Permission.key`.

### PlatformRoleAssignment

Associates AppUser with PLATFORM roles.

### AgencyMembership

Associates AppUser with one Agency and classifies the relationship:

```text
OWNER | EMPLOYEE
```

### AgencyRoleAssignment

Associates one AgencyMembership with one valid Agency Role.

---

## 11. Agency Invariants

### Agency fields in MVP

The Agency profile is intentionally small:

- `code` — backend-generated, immutable external identifier
- `name` — required, editable
- `status` — ACTIVE / SUSPENDED; managed separately from profile edits
- `country`
- `description`
- `createdAt`
- `updatedAt`

Derived information may include:

- owner;
- members count.

Do not add `website`, `domain`, or `customDomain` to the Agency foundation in MVP.

### Ownership invariants

- exactly one OWNER per Agency;
- OWNER membership must remain ACTIVE;
- owner cannot be suspended through normal member management;
- owner cannot be removed through normal member management;
- normal member endpoints cannot transfer ownership;
- owner must retain the protected canonical Agency Admin system role required by current DB invariant;
- employees may receive high-level Agency Admin permissions without becoming OWNER.

---

## 12. Member Invitation Invariants

Member invitations are consent-based.

Lifecycle:

```text
PENDING
  -> ACCEPTED
  -> terminal

PENDING
  -> REVOKED
  -> terminal

PENDING + expiresAt <= now
  -> EXPIRED
  -> terminal
```

Rules:

- no AgencyMembership before acceptance;
- invitation keyed to normalized email, not pre-resolved AppUser identity;
- inviter must not learn whether the email already maps to an AppUser;
- token is high-entropy and single-use;
- only a hash of the token is persisted;
- roles are captured by server-side invitation role references;
- accepted membership is always `EMPLOYEE` and `ACTIVE`;
- recipient cannot alter invitation roles during acceptance;
- wrong authenticated identity cannot claim an invitation belonging to another existing AppUser email;
- new-account creation must reuse `AppUserIdentityService`;
- invitation acceptance must be atomic;
- duplicate/concurrent acceptance must not create duplicate memberships, AppUsers, or role assignments.

---

# PART V — MVP MODULE REQUIREMENTS

## 13. Module A — Platform Agency Management

### Goal

Platform operators can create, review, activate, suspend, and inspect Agencies without becoming members of those Agencies.

### Required capabilities

- list Agencies;
- view Agency details;
- create Agency;
- assign/create initial Owner through authorized Platform flow;
- update Agency profile fields;
- suspend/reactivate Agency;
- preserve Agency Application audit relationship where current flow uses applications.

### Acceptance criteria

- external API uses Agency `code`, not DB id;
- create flow produces exactly one ACTIVE OWNER;
- owner receives canonical Agency admin role required by current invariant;
- new owner does not receive a Platform role unless separately assigned;
- suspending Agency does not globally suspend owner AppUser;
- Platform Admin can still inspect/manage a suspended Agency;
- Agency-side business access is denied while Agency is suspended.

---

## 14. Module B — Agency Dashboard Foundation

### Goal

An authenticated AppUser can discover only their Agencies and operate in an Agency context determined by URL.

### Routes

Conceptual route family:

```text
/agencies/:agencyCode/dashboard
/agencies/:agencyCode/team
/agencies/:agencyCode/customers
/agencies/:agencyCode/tours
/agencies/:agencyCode/bookings
...
```

### Agency discovery

`GET /v1/me/agencies` returns only memberships belonging to the caller.

Expected UX:

- zero enterable Agencies -> honest empty state;
- one enterable Agency -> automatic navigation;
- multiple enterable Agencies -> chooser;
- suspended Agency/membership -> visible explanatory unavailable state where appropriate.

### Invariant

There is no globally persisted “active Agency”.

Two browser tabs may safely use different Agency URLs and different React Query cache keys.

---

## 15. Module C — Agency Members

### Goal

Authorized Agency users can manage existing members of their own Agency.

### Required capabilities

- list Owner + Employees;
- search only within current Agency membership population;
- member details;
- view roles;
- replace Employee role set;
- allow zero roles;
- suspend/reactivate Employee membership;
- remove Employee membership.

### Prohibited capabilities

- global user search;
- cross-tenant identity discovery;
- direct arbitrary AppUser attachment;
- direct account creation as a membership shortcut;
- owner suspend/remove/normal role mutation that breaks owner invariant.

### Acceptance criteria

- list returns each person once regardless of role count;
- search cannot return an AppUser who is not a member of current Agency;
- membership suspension affects this Agency only;
- removing member preserves AppUser and other Agency memberships;
- Platform roles remain untouched;
- owner destructive actions are rejected by backend and not offered in UI.

---

## 16. Module D — Member Invitations

### Goal

Restore “Add member” safely through a consent-based email invitation flow.

### Backend endpoints

Exact routes should follow existing implementation, but the API must support:

- create invitation for current Agency;
- list current Agency invitations;
- revoke pending invitation;
- inspect invitation by token;
- accept invitation.

### Email delivery

For local development:

```text
NestJS Mailer abstraction
  -> SMTP
  -> Mailpit localhost:1025
  -> Mailpit UI localhost:8025
```

Production provider selection is Post-MVP deployment work unless explicitly promoted.

### Frontend requirements

Agency Dashboard:

- `Invite member` action;
- email field;
- optional zero/one/multiple Agency roles;
- pending invitations section/list;
- status display;
- revoke pending invitation;
- no user search.

Acceptance UI:

- token route;
- show safe Agency context;
- existing account -> authenticate and accept only matching email identity;
- new account -> create account using invitation email + name/password fields;
- expired/revoked/accepted token states;
- successful acceptance navigates to usable Agency context when appropriate.

### Definition of Done

A real Mailpit-delivered invitation can be opened, accepted, and produces one EMPLOYEE/ACTIVE membership with correct roles; the token cannot be reused.

---

## 17. Module E — Customers

### Goal

Each Agency manages its own customer records.

### Minimum capabilities

- create Customer;
- list Customers;
- search Customers;
- view Customer;
- edit Customer;
- link Customer to Booking.

### Minimum data

Use the existing schema as source of truth. At product level, MVP should support enough identity/contact information to create and manage a booking without forcing Customer to be an AppUser.

### Security

Every read/write must be Agency-scoped.

### Acceptance criteria

- Agency A cannot read/search/update/delete Agency B Customer;
- no client-supplied `agencyId` is trusted;
- external API uses safe identifiers according to current code conventions;
- customer creation works without AppUser creation.

---

## 18. Module F — Tours

### Goal

Agency can define a reusable travel product.

### Minimum capabilities

- create Tour;
- edit Tour;
- view/list/search Tours;
- set lifecycle/status using existing schema conventions;
- manage destinations;
- manage itinerary days.

### Minimum product data

Follow current schema as source of truth. Product-level minimum includes:

- external Tour identifier/code;
- title/name;
- description;
- status;
- destination information;
- itinerary sequence.

### Non-goals

- advanced CMS;
- public marketplace publishing workflow;
- SEO management;
- AI itinerary generation.

---

## 19. Module G — Departures

### Goal

Schedule bookable instances of a Tour.

### Minimum capabilities

- create Departure for Tour;
- edit dates/status/capacity where supported;
- list departures by Tour;
- show operational availability required by booking flow.

Conceptual model:

```text
Tour
  -> Departure 1
  -> Departure 2
  -> Departure 3
```

### Acceptance criteria

- Departure always belongs to current Agency through valid Tour relationship;
- cross-tenant Tour/Departure linking impossible;
- date validation enforced server-side;
- booking cannot target an unrelated Agency departure.

---

## 20. Module H — Pricing

### Goal

Configure prices for a Departure using existing PricingOption / DeparturePrice model.

### Minimum capabilities

- create/manage pricing option definitions required by current Agency;
- assign price to a Departure;
- retrieve applicable price options during booking;
- prevent cross-tenant price assignment.

Examples:

- Adult
- Child
- Single room
- Double room

Do not build dynamic pricing, promotion engines, or exchange-rate logic in MVP.

---

## 21. Module I — Bookings

### Goal

Create and manage an Agency booking for a Customer and Departure.

### Minimum capabilities

- create Booking;
- select Customer;
- select valid Departure;
- add one or more Travelers;
- apply supported pricing selections;
- compute/store amounts according to existing schema conventions;
- update booking status;
- cancel using existing cancellation model if required by schema/business flow;
- maintain BookingStatusHistory where current design requires it.

### Minimum states

At minimum the business flow needs equivalents of:

```text
PENDING
CONFIRMED
CANCELLED
```

If schema defines richer canonical states, use the schema rather than inventing duplicates.

### Acceptance criteria

- booking is tenant-scoped;
- customer and departure belong to same Agency context;
- monetary calculations are server-authoritative;
- client cannot submit privileged computed fields without validation;
- history/audit data remains coherent after status changes.

---

## 22. Module J — Travelers

### Goal

Store people traveling under a Booking.

### Minimum capabilities

- add Traveler to Booking;
- edit Traveler where allowed;
- list Booking Travelers;
- preserve Booking tenant boundary.

Use current schema as source of truth for exact fields.

Do not expand MVP into document storage, passport scanning, visa workflows, or OCR unless explicitly promoted.

---

## 23. Module K — Payments

### Goal

Allow Agency staff to record manual payments and see the remaining booking balance.

### MVP behavior

No external payment gateway.

Example:

```text
Booking total: 120,000 DZD
Paid:           50,000 DZD
Remaining:      70,000 DZD
```

### Minimum capabilities

- record Payment;
- amount;
- payment date;
- payment method/reference where existing schema supports it;
- list payment history;
- calculate paid total;
- calculate remaining balance;
- prevent overpayment or invalid negative amounts according to approved domain rules.

### Security / accounting integrity

- monetary totals are server-authoritative;
- Payment belongs to same Agency as Booking;
- cross-tenant posting impossible;
- immutable/audited payment behavior should follow existing DB protections;
- no gateway integration in MVP.

---

## 24. Refunds and Extras

The current database design includes Refund and Extra Service concepts.

For MVP:

- implement only the minimum needed if a completed Booking/Payment flow requires them;
- otherwise defer them rather than allowing them to delay the core success scenario.

No automated gateway refund is required.

---

# PART VI — API AND DATA CONTRACT STANDARDS

## 25. External Identifiers

Do not expose internal database IDs unnecessarily.

Prefer existing external `code` identifiers for routable business entities.

Rules:

- backend generates codes;
- client does not invent codes;
- codes are immutable unless the domain explicitly says otherwise;
- API contracts intentionally serialize safe fields instead of returning Prisma models directly.

---

## 26. Validation

Backend request validation uses the project’s established Zod/Standard Schema approach.

Rules:

- use strict schemas for security-sensitive writes;
- reject privilege fields not part of the public contract;
- normalize email once using shared identity logic;
- validate money/date/status values server-side;
- never trust hidden frontend fields as security controls.

Do not introduce `class-validator` / `class-transformer` unless the architecture is explicitly changed by the user.

---

## 27. Error Contract

Follow the existing structured error convention:

```json
{
  "statusCode": 403,
  "message": "...",
  "errorCode": "DOMAIN_ERROR_CODE"
}
```

Frontend maps stable `errorCode` values to user-friendly copy.

Never leak:

- Prisma error names;
- constraint names;
- SQL;
- stack traces;
- password hashes;
- internal IDs;
- token hashes;
- secret environment values.

---

## 28. Query and Cache Rules

Frontend server state belongs in TanStack Query.

Agency query keys must include `agencyCode`.

Do not use a shared global mutable “current agency” store.

Mutation invalidation should be narrow and tenant-aware.

---

# PART VII — SECURITY BASELINE

## 29. Tenant Isolation

Tenant isolation applies to both **writes and reads**.

Every Agency resource must be resolved through current Agency context or a relation proven to belong to that context.

A route body must never be able to switch tenant by supplying an `agencyId`.

Tests must cover:

```text
Agency A actor
  -> Agency B resource
  -> deny / not found according to contract
```

This requirement applies to:

- members;
- invitations;
- customers;
- tours;
- departures;
- pricing;
- bookings;
- travelers;
- payments.

---

## 30. Identity Privacy

Agency context must never become a platform identity directory.

Allowed Agency identity visibility:

- people already related to that Agency;
- invitation target email that the Agency itself supplied;
- no global browse.

Platform search remains a separate privileged capability.

---

## 31. Sensitive Tokens and Secrets

Invitation tokens:

- plaintext only transiently for delivery;
- hash persisted;
- never audit plaintext;
- never normal-log plaintext in production;
- single-use;
- expire.

Environment secrets:

- `.env` files never committed;
- `.env.example` contains names/default-safe placeholders only;
- credentials are not copied into docs, issues, or commits.

---

## 32. Rate Limiting

Sensitive endpoints must use the existing rate-limit architecture.

At minimum protect:

- login;
- platform global identity search;
- invitation creation;
- invitation token inspection;
- invitation acceptance.

Thresholds should be environment-configurable.

---

## 33. Audit

Reuse existing AuditService / AuditLog infrastructure.

Security-relevant events should include, where appropriate:

- platform identity lookup;
- invitation create/revoke/accept;
- member role replacement;
- member suspend/reactivate/remove;
- sensitive administrative changes;
- payment mutations where auditability is required by current model.

Do not store unnecessary raw sensitive data when a hash/redaction is sufficient.

---

# PART VIII — UX PRODUCT RULES

## 34. Form Philosophy

The product should not feel like filling government forms.

For simple actions prefer:

```text
Button
  -> compact Dialog/Sheet
  -> only necessary fields
  -> Save
  -> return to context
```

Avoid giant standalone forms unless the business operation genuinely requires one.

### Progressive disclosure examples

- Agency status -> separate action;
- Domain -> future Agency Settings;
- Role permissions -> separate Manage Permissions flow;
- Member invitation -> email + optional roles, not identity internals;
- technical codes -> hidden from normal forms.

---

## 35. Permission-Aware UI

Frontend may hide/disable unavailable controls based on effective permission keys.

This is UX only.

Backend guards remain authoritative.

Never infer UI authorization from role names.

---

## 36. Responsive and Accessibility Expectations

MVP UI must:

- work on typical laptop/desktop widths;
- remain usable on smaller screens;
- avoid forms with actions pushed off-screen;
- use labels for inputs;
- provide loading, empty, error, and pending states;
- prevent duplicate submits;
- preserve entered values after recoverable errors where practical.

---

# PART IX — TESTING AND VERIFICATION

## 37. Testing Pyramid

### Backend

Each completed slice should include focused tests for:

- validation;
- authorization;
- tenant isolation;
- service/domain behavior;
- error contracts;
- security regressions;
- transaction rollback where atomicity matters.

Full regression suite must remain green before task completion.

### Frontend

Use the testing stack currently approved for the app.

For `frontend/dashboard`, current baseline includes `node --test --experimental-strip-types` for pure logic where render tooling is not installed.

Do not claim render/browser tests that were not run.

### Build gates

At minimum run the relevant app’s:

- real TypeScript check;
- lint;
- production build;
- test suite.

---

## 38. Real Verification Rule

A task touching a business flow should not be marked complete solely because unit tests pass if a real safe verification path is available.

Examples:

- create and query a real Agency fixture;
- perform HTTP requests against dev backend;
- verify persisted rows in Neon;
- verify Mailpit receives an invitation email;
- clean all synthetic data afterwards.

If visual/browser automation is unavailable, explicitly say so.

---

## 39. Database Migration Rules

- never edit an already-applied migration;
- create a new migration for schema changes;
- run migration status;
- run schema/database drift check;
- verify the generated Prisma client if required;
- use PostgreSQL constraints for critical invariants when they are cleaner and safer than application-only checks;
- do not add trigger complexity without a real invariant that requires it.

---

# PART X — AGENT EXECUTION PROTOCOL

## 40. Mandatory Task Workflow

Every implementation task follows this sequence:

```text
1. Inspect
2. Plan the smallest compatible change
3. Implement
4. Focused tests
5. Full regression
6. Build/lint/typecheck
7. Real verification
8. Update project map/docs if architecture changed
9. Report
10. STOP
```

Do not jump to Frontend before the required Backend contract is verified unless the task explicitly combines them.

---

## 41. Mandatory Pre-Change Inspection

Before changing code, an agent should inspect at minimum:

- `git status`;
- current branch;
- root `AGENTS.md`;
- root `PROJECT_MAP.md`;
- target app `AGENTS.md`;
- target app project map;
- current implementation files;
- related schema/migrations;
- relevant tests;
- existing API/error conventions.

Do not ask the user to repeat information that is already available in repository context.

---

## 42. Git Safety

Rules:

- preserve unrelated uncommitted work;
- do not reset or discard files without explicit approval;
- do not silently stash user work;
- one feature group should use its own branch when requested;
- do not commit/push unless the task authorizes it;
- commits should be focused and explain one coherent change.

Suggested commit convention:

```text
feat(scope): ...
fix(scope): ...
refactor(scope): ...
test(scope): ...
docs(scope): ...
```

---

## 43. Dependency Policy

Do not install a new dependency simply because it makes implementation easier.

Before installing:

1. inspect whether an existing dependency already solves the problem;
2. explain the need if approval is required by current AGENTS rules;
3. avoid dependency churn for trivial helpers.

Never invent a fake implementation to avoid a legitimate dependency blocker.

---

## 44. No-Fabrication Policy

An agent must never claim:

- tests passed if not run;
- browser UI was visually verified if no browser was used;
- an email was delivered if only a console log occurred;
- a migration is drift-free without checking;
- production readiness from dev-only mocks;
- a feature is complete when a required external integration remains unconfigured.

Use split statuses when appropriate, e.g.:

```text
MEMBER INVITATIONS BACKEND CORE: COMPLETE
EMAIL DELIVERY: NOT CONFIGURED
```

---

## 45. Scope Control

The active task defines the implementation boundary.

An agent may fix a directly blocking defect discovered while implementing the task, but must report it.

Do not opportunistically implement adjacent modules.

Examples:

- Members task does not start Customers;
- Customers task does not redesign Dashboard overview;
- Payments task does not integrate Stripe;
- Invitation task does not add public registration.

---

## 46. Agent Final Report Template

Every coding task should return a report using this structure:

```markdown
# <TASK NAME> REPORT

## Branch / Git State
## Existing Architecture Reused
## Changes Implemented
## API / Contract Changes
## Database / Migration Changes
## Authorization / Security
## Tests
## Real Verification
## Typecheck / Lint / Build
## Documentation Updated
## Deferred Work
## Remaining Risks
## Blockers

STATUS: COMPLETE | PARTIAL | BLOCKED
```

The report must distinguish:

- implemented;
- tested;
- real-verified;
- deferred.

---

# PART XI — MVP DELIVERY PLAN

## 47. Execution Order

### Phase 0 — Foundation

```text
Authentication                         COMPLETE
Platform RBAC                         COMPLETE
Agency Foundation                     COMPLETE
Agency Authorization                  COMPLETE
Agency Dashboard Foundation           COMPLETE
Agency Members                        COMPLETE
Identity Security Hardening           COMPLETE
Member Invitations Backend Core       COMPLETE
Member Invitation SMTP/Mailpit        CURRENT
Member Invitations Frontend           NEXT
```

### Phase 1 — Business Core

Execute in this order unless a discovered dependency requires adjustment:

```text
1. Customers
2. Tours
3. Tour Destinations / Itinerary
4. Departures
5. Pricing
6. Bookings
7. Travelers
8. Payments
```

### Phase 2 — MVP Closure

```text
End-to-end happy path verification
Cross-tenant security regression
Permission regression
Data cleanup / seed strategy
MVP documentation
Deployment readiness checklist
GitHub issue/milestone closure
```

---

## 48. GitHub MVP Structure

Recommended milestone:

```text
MVP v0.1
```

Recommended issue groups:

```text
Foundation
Security
Member Invitations
Customers
Tours
Departures
Pricing
Bookings
Travelers
Payments
MVP E2E
Deployment Readiness
```

Recommended labels:

```text
backend
frontend
database
security
feature
bug
mvp
post-mvp
blocked
```

Recommended board states:

```text
Backlog -> Ready -> In Progress -> Review -> Done
```

GitHub should become the operational source of truth for what is open, in progress, blocked, and complete.

---

# PART XII — MODULE DEFINITION OF DONE

## 49. Definition of Done for Every Backend Slice

A backend slice is complete only when all applicable items are true:

- API contract implemented;
- strict validation implemented;
- authorization implemented with Permission.key;
- tenant isolation proven;
- safe serialization/no Prisma model leakage;
- migration created/applied if needed;
- migration status clean;
- drift check clean;
- focused tests pass;
- full backend regression passes;
- lint passes except explicitly documented pre-existing warnings;
- build passes;
- real verification passes when feasible;
- synthetic data cleaned;
- project map updated if architecture changed.

---

## 50. Definition of Done for Every Frontend Slice

A frontend slice is complete only when all applicable items are true:

- uses real backend contracts;
- no fake success / mock business data in wired flows;
- Agency routes preserve `agencyCode`;
- TanStack Query owns server state;
- permission-aware UX uses Permission.key;
- backend remains authoritative;
- loading/empty/error/pending states handled;
- forms are compact and responsive;
- technical/internal fields are not exposed;
- real TypeScript check passes;
- lint passes;
- production build passes;
- existing tests pass;
- new pure-logic/contract tests added where practical;
- browser/render limitations honestly reported.

---

# PART XIII — MVP ACCEPTANCE SUITE

## 51. Final End-to-End Acceptance Scenario

The MVP release candidate must pass this exact product scenario:

### Platform setup

1. Platform Admin logs in.
2. Platform Admin creates or approves an Agency.
3. Exactly one ACTIVE Owner exists.
4. Owner has valid Agency permissions.

### Team onboarding

5. Owner logs in.
6. Owner opens correct Agency Dashboard.
7. Owner invites Employee by email.
8. Real local SMTP delivery reaches Mailpit in development verification.
9. Employee opens acceptance link.
10. Existing AppUser path is verified.
11. New AppUser path is verified.
12. Employee becomes EMPLOYEE/ACTIVE.
13. Invited roles are assigned.
14. Token cannot be reused.

### Customer and product setup

15. Authorized user creates Customer.
16. Creates Tour.
17. Adds destinations / itinerary.
18. Creates Departure.
19. Configures price(s).

### Booking

20. Creates Booking for Customer + Departure.
21. Adds Traveler(s).
22. Booking total is correct.
23. Booking status can reach confirmed state according to business rules.

### Payment

24. Records first manual Payment.
25. Paid total updates.
26. Remaining balance updates correctly.
27. Records additional payment if allowed.
28. Final balance is correct.

### Security regression

29. Agency A cannot see Agency B Customer.
30. Agency A cannot mutate Agency B Tour/Departure/Booking/Payment.
31. Employee without permission receives 403.
32. Suspended Agency-side membership loses Agency access.
33. Platform permissions do not grant Agency business access.
34. Agency permissions do not grant Platform Admin access.
35. No Agency endpoint provides global AppUser discovery.

MVP v0.1 is not accepted until this suite is green.

---

# PART XIV — NON-FUNCTIONAL REQUIREMENTS

## 52. Security

Priority: Critical.

Requirements:

- strong tenant isolation;
- least privilege;
- strict validation;
- HttpOnly auth;
- no global Agency identity discovery;
- rate limiting for sensitive paths;
- audit for sensitive operations;
- secure invitation tokens;
- production Swagger restricted;
- no debug business-count endpoint.

---

## 53. Reliability and Data Integrity

- transactions for multi-row business invariants;
- fail closed on authorization ambiguity;
- no orphan AppUsers from failed invitation acceptance;
- no partial role replacement;
- no duplicate ownership;
- no cross-tenant role assignment;
- payment amount integrity enforced server-side.

---

## 54. Performance

MVP does not require premature optimization.

Agents should still avoid obvious issues:

- N+1 permission queries;
- unbounded global scans;
- unnecessary full-app React Query invalidation;
- loading entire directories when server-side search/pagination is appropriate.

Add indexes only when justified by query patterns and existing schema design.

---

## 55. Observability

For MVP:

- structured backend errors;
- audit events for security-critical operations;
- meaningful operational logging without secrets;
- no plaintext invitation token in production logs;
- failures should be diagnosable without leaking sensitive information to clients.

Advanced APM/metrics dashboards are Post-MVP unless deployment requires them.

---

# PART XV — OPEN DECISIONS / DEFERRED DECISIONS

## 56. Decisions Intentionally Deferred

The following should not block MVP unless promoted by the user:

- production email provider (Resend/Brevo/SES/etc.);
- ownership transfer;
- custom Agency role creation UI;
- payment gateway;
- marketplace;
- website/domain management;
- advanced analytics;
- refund automation;
- mobile app;
- AI functionality.

---

## 57. Current Immediate Task

The next active task at the time of this PRD is:

```text
Complete Member Invitation SMTP delivery with Mailpit
  -> verify real email receipt
  -> verify acceptance URL
  -> preserve token security
  -> full backend regression
```

After that:

```text
Member Invitations Frontend
  -> Invite member
  -> Pending invitations
  -> Revoke
  -> Invitation acceptance UI
  -> E2E verification
```

Only after Member Invitations are fully closed should the team move into the Business MVP modules.

---

# APPENDIX A — UNIVERSAL AGENT START PROMPT

Use the following wrapper when handing any scoped MVP task to an agent:

```text
You are implementing one scoped task in the Travel Agency SaaS MVP.

Repository:
https://github.com/LkBoudj/travel-agency-saas.git

First read:
- root AGENTS.md
- root PROJECT_MAP.md
- the relevant app AGENTS.md
- the relevant app project map
- TRAVEL_AGENCY_SAAS_MVP_v0.1_AGENT_PRD.md

Then inspect the current branch, git status, schema/migrations, related services,
controllers, guards, frontend API/query patterns, and tests.

Rules:
- preserve unrelated work;
- do not reset/stash/discard user changes;
- do not expand scope;
- reuse existing architecture;
- authorization uses Permission.key;
- preserve tenant isolation for both reads and writes;
- never return Prisma models directly;
- never fabricate tests or verification;
- do not commit/push unless explicitly requested.

Execution:
1. inspect;
2. implement the smallest compatible change;
3. add focused tests;
4. run full relevant regression;
5. run real typecheck/lint/build;
6. perform safe real verification where feasible;
7. update project map only when architecture/contracts changed;
8. return the standard final report;
9. STOP.

If the PRD, migrations, and current code disagree materially, stop and report the
conflict instead of inventing a new architecture.
```

---

# APPENDIX B — TASK SPEC TEMPLATE

```markdown
# <TASK NAME>

## Goal
One clear product outcome.

## In Scope
- ...

## Out of Scope
- ...

## Existing Architecture to Reuse
- ...

## API / UI Contract
- ...

## Security / Tenant Rules
- ...

## Data / Migration Rules
- ...

## Test Requirements
- ...

## Real Verification
- ...

## Definition of Done
- ...

## Final Report Required
Use the standard project report template and STOP.
```

---

# APPENDIX C — MVP RELEASE GATE

Release `MVP v0.1` only when:

```text
Product happy path                  PASS
Platform/Agency auth separation     PASS
Cross-tenant read isolation         PASS
Cross-tenant write isolation        PASS
Member invitation consent flow      PASS
No Agency global identity search    PASS
Backend regression                  PASS
Frontend builds                     PASS
Real TypeScript checks              PASS
Database migration status           CLEAN
Database drift                      NONE
Real E2E smoke test                 PASS
Critical secrets absent from Git    PASS
MVP docs                             CURRENT
```

---

## Final Product Rule

**Do not optimize for feature count. Optimize for one secure, complete, real travel-agency operating flow.**

Any feature that does not help complete or protect that flow belongs in Post-MVP unless explicitly promoted.
