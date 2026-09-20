# Backend Project Map

Backend-local architecture and state source of truth. Companion to
`backend/AGENTS.md` (how to work) and root `PROJECT_MAP.md` (system-level).
Maps answer "what is"; this file records what is SELECTED, IMPLEMENTED, and
PENDING for the backend.

## [STATUS]

- Backend OpenCode environment exists: `backend/AGENTS.md`, `backend/opencode.json`,
  `backend/.opencode/skills/`.
- NestJS 12 runtime application scaffolded (official `nest new`) and dependencies
  installed: `package.json`, `package-lock.json`, `node_modules/`, `src/`, `test/`
  exist.
- Version source of truth: installed `backend/package.json` + `package-lock.json`.
- `prisma/` (schema + `prisma.config.ts`), `.env.example` (tracked), `.env`
  (gitignored) now exist.
- Agency Foundation (backend) complete: explicit ownership
  (`agency_membership.membership_type` = OWNER | EMPLOYEE), the protected
  `role.system_key` system identity (`AGENCY_ADMIN`), database-enforced
  ownership invariants, one shared agency provisioning path, and the platform
  Agency lifecycle API (list/details/create/update/suspend/reactivate).
  See [AGENCY_OWNERSHIP].
- Current phase = Group 1 backend RBAC + Platform Users slice complete:
  canonical scoped permission catalog (31 PLATFORM + 38 AGENCY = 69
  code-owned permissions), 11 default role presets (5 PLATFORM + 6 Global
  AGENCY), PLATFORM Role CRUD, Global Agency Role CRUD,
  available-permissions, Role↔Permission API, CASL-backed `PermissionGuard`,
  idempotent seed and Swagger, on top of the Identity + RBAC database
  foundation and M2, plus Platform User CRUD + platform-role assignment +
  ACTIVE/SUSPENDED status (see [PLATFORM_USERS]).
- Customers vertical slice (backend + frontend/dashboard) complete:
  agency-scoped `customer` model, REST CRUD + one-way archive under
  `/v1/agencies/:agencyCode/customers`, and the Agency Dashboard Customers
  feature (list/search/create/edit/archive/details, i18n EN+AR) — see
  [CUSTOMERS].
- Tours vertical slice (backend + frontend/dashboard) complete (Module F):
  agency-scoped `tour` aggregate with ordered destinations + itinerary,
  REST CRUD + explicit publish/unpublish + one-way archive under
  `/v1/agencies/:agencyCode/tours`, and the Agency Dashboard Trips feature
  wired to it (list/create/editor/readiness) — see [AGENCY_TOURS].
- Departures vertical slice (backend + frontend/dashboard) complete (Module G):
  per-tour scheduled occurrences under `/v1/agencies/:agencyCode/tours/:tourCode/departures`,
  with a live Dashboard DeparturesManager — see [AGENCY_DEPARTURES].
  Module G scope: pricing options (Module H) are still NOT part of the Tour
  contract; a SCHEDULED tour publishes only while it has ≥ 1 OPEN departure.
- Pricing vertical slice (backend + frontend/dashboard) complete (Module H):
  tour-owned pricing options + per-departure whole-set prices under
  `/v1/agencies/:agencyCode/tours/:tourCode/pricing-options` (and
  `.../departures/:departureCode/prices`), single currency per tour,
  one-way deactivate, with a live Dashboard PricingManager + per-departure
  price dialogs and a real `startingPrice` — see [AGENCY_PRICING].

### Group 1 closure verification (verified reality)

The former M1 baseline checks are now executed and passing:

- build verification (`npm run build`) — passes
- lint verification (`npm run lint`) — passes with 3 pre-existing
  `no-unused-vars` warnings in the agency-applications module
- unit/HTTP tests (`npm test`) — 330 tests pass (18 files)
- e2e verification (`npm run test:e2e`) — 6 tests pass against the
  `configureApp`-configured app (versioned `GET /v1` serves, unversioned `/`
  is 404) plus the live-PostgreSQL bookings concurrency suite
  (`test/bookings-concurrency.e2e-spec.ts`)
- seed idempotency — `npx prisma db seed` run twice, both succeed
- migration status — `npx prisma migrate status` reports "Database schema is
  up to date!" (21 migrations — Tours, Departures, Pricing and Bookings module
  migrations applied to the live Neon dev database)
- ownership invariants verified directly against the Neon dev database: 19/19
  checks, every scenario inside a rolled-back transaction with
  `SET CONSTRAINTS ALL IMMEDIATE` so the deferred triggers really run
  (valid provisioning accepted; zero-owner, second-owner, suspended-owner,
  owner-without-AGENCY_ADMIN, role-removed-from-owner, custom-role and
  look-alike-key cases all rejected; system role undeletable, its identity
  unclearable and unconvertible; agency suspension leaves the OWNER ACTIVE;
  demote-then-promote in one transaction commits). No probe data persisted.
- runtime boot + HTTP — backend boots on `:3000`; Swagger UI `/docs` and
  `/docs-json` return 200
- live end-to-end — login, HttpOnly cookie, `/me`, PLATFORM role CRUD, role↔
  permission management, 409 assigned-role delete conflict, logout and
  protected-route redirect verified against the running backend +
  `frontend/admin`
- live Platform Users end-to-end (real Neon) — list/search/order, create with
  platform roles, permission-guarded create/assign (403 for a read-only
  operator), profile edit, role replace, duplicate email → 409
  `EMAIL_ALREADY_REGISTERED`, AGENCY role key → 400
  `AGENCY_ROLE_NOT_ASSIGNABLE`, unknown key → 400 `UNKNOWN_PLATFORM_ROLE_KEYS`,
  self-suspension → 400 `CANNOT_SUSPEND_OWN_ACCOUNT`, suspend → login 401 and
  previously issued JWT 401, reactivate → login 200, no `passwordHash`/`id`
  leakage; synthetic verification users removed afterwards
- Customers slice — `npm test`: 382 tests pass (21 files), lint 0 errors,
  build passes. The 20 customers controller specs (in-memory) cover tenant
  scoping (foreign/unknown `CUS-` code → 404), create with partial data
  (blank → `null`, email trimmed + lowercased), update clear-semantics,
  one-way archive + 409 `CUSTOMER_ALREADY_ARCHIVED`, list search and
  pagination-free ACTIVE-only ordering. Throwaway real-Neon smoke: create →
  archived record leaves the listing but stays readable by code; raw SQL
  `UPDATE customer SET status='BOGUS'` rejected by `customer_status_check`
  (temporary spec/scripts removed, no residue). Migration applied — 16
  total, `migrate status` "up to date", `migrate diff` "No difference".
- Bookings module (Module I) — `npm test`: 499 tests pass (25 files), lint 0
  errors (4 pre-existing warnings), build passes. 34 bookings controller specs
  cover list/get/search, create (pricing basis per_person/per_booking, frozen
  price lines, one currency), capacity accounting (derived seats,
  `BOOKING_CAPACITY_EXCEEDED`), departures guards, cancel, and the
  readiness-gated confirm (`BOOKING_TRAVELERS_REQUIRED`). Live concurrency
  e2e (`npm run test:e2e`, 4 tests): two concurrent bookings for the last seat
  → exactly one succeeds; concurrent cancel + booking never breaks the ledger;
  20/20 burst lands all seats with zero lost updates; 20+1 burst → exactly 20
  succeed and the overflow is rejected. This runs against the real Neon
  database and proves the `SELECT ... FOR UPDATE` seat lock really serializes.
  Required infrastructure change to `PrismaService`: interactive-transaction
  defaults raised (`maxWait`/`timeout` 30s) because Prisma's 5s/2s defaults
  aborted legitimately-queued row-lock waiters (P2028). Migrations applied
  (21 total, `migrate status` "up to date").

## [SELECTED_STACK]

SELECTED — approved architecture; implemented portions tracked in [IMPLEMENTED].

- Runtime: Node.js 24 LTS (patch must satisfy the current Nest CLI/schematics
  requirement).
- Framework: NestJS 12 · TypeScript (strict) · ESM · Express adapter.
- Package manager: npm.
- Persistence: Prisma 7 (stable line; Prisma 8 requires a separate reviewed
  migration decision).
- Database: PostgreSQL, managed by Neon.
- Driver adapter: `@prisma/adapter-neon`.
- Validation: Zod 4 + NestJS Standard Schema support.
- Configuration: `@nestjs/config` with Zod-backed progressive env validation.
- HTTP: REST · Nest official URI versioning · business API under `/v1` ·
  operational `GET /health` version-neutral.
- API contract: `@nestjs/swagger` → OpenAPI 3.0-compatible output → generated
  TypeScript contract (`openapi-typescript`); `openapi-fetch` selected strategy
  for frontend typed transport.
- Logging: Nest built-in Logger for foundation.

Do not invent exact package patch versions before installation.

## [ARCHITECTURE]

- Feature-based modular monolith.
- Per feature: `Controller` = HTTP boundary; `Service`/provider = application/
  business orchestration; Prisma = persistence.
- `Repository` layer: optional only when a concrete need (query complexity,
  reuse, real abstraction) justifies it.
- `AppModule` = composition root; explicit module imports; no
  `CoreModule`/`SharedModule` dumping grounds.
- No speculative architectural layers.

## [HTTP_API]

- REST; business endpoints under `/v1`; Nest official URI versioning —
  controllers do not hand-write `v1` into paths.
- IMPLEMENTED (auth): URI versioning enabled via
  `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`
  in `src/setup-app.ts` (`configureApp`, shared by `main.ts` and tests);
  business routes live under `/v1` (`/v1/auth/...`; existing `/` and
  `/prisma-check` now serve at `/v1` and `/v1/prisma-check`).
- Operational `GET /health` is version-neutral and liveness-only — still
  NOT implemented.
- Operational routes are excluded from the frontend business API contract.

## [API_CONTRACT]

Approved flow:

```text
Nest routes
+ Zod HTTP schemas
+ HTTP/OpenAPI metadata
→ OpenAPI
→ repository-level packages/api-contract/
→ generated TypeScript contract
→ app-specific frontend clients
```

- `packages/api-contract/` lives at repository root — OUTSIDE `backend/`.
  Backend owns contract generation; the repository-level contract is consumed
  by multiple applications.
- OpenAPI is the integration boundary between backend and frontends.
- Contract shares types/spec only; every frontend owns its own runtime HTTP
  client (no universal client in api-contract).
- Type-boundary rule: Prisma model ≠ application/domain representation ≠ HTTP
  request schema ≠ HTTP response schema ≠ OpenAPI contract ≠ frontend
  presentation model. Field similarity does not collapse boundaries; map only
  when two boundaries genuinely need different representations.

## [CONFIGURATION]

- `@nestjs/config` + Zod (Standard Schema); progressive validation — runtime
  validates only what the running application needs.
  - Foundation/boot: `NODE_ENV`, `PORT`.
  - DB milestone: `DATABASE_URL` (pooled runtime connection) added to runtime
    config.
  - Auth milestone: `JWT_SECRET` (required, >= 32 chars — from validated env,
    never hardcoded) and `JWT_EXPIRES_IN` (default `15m`, short-lived access
    token) added to runtime config.
- Prisma tooling/migrations: `DATABASE_URL_UNPOOLED` (direct/unpooled) via
  Prisma CLI configuration; NOT required for Nest application boot.
- No `process.env` scattered through feature code.
- IMPLEMENTED (M2): Zod 4 `validateEnv` (`NODE_ENV`, `PORT`, `DATABASE_URL`)
  wired via `ConfigModule.forRoot({ isGlobal: true, validate })`; `PORT` consumed
  via `ConfigService.getOrThrow` in `main.ts`; `DATABASE_URL` consumed by
  `PrismaService` via `ConfigService`.
- Env files: `backend/.env.example` tracked with placeholders only;
  `backend/.env` (gitignored) holds local values.

## [DATABASE]

- PostgreSQL, managed by Neon.
- Runtime app connection: `DATABASE_URL` (pooled).
- Prisma CLI/migrations: `DATABASE_URL_UNPOOLED` (direct/unpooled).
- Neon development database connected and verified: real `SELECT 1` through the
  actual `PrismaService` (M2-E). Business schema, migrations and seed now exist
  (see [PRISMA] / [IDENTITY_AND_RBAC]); live state after the canonical RBAC
  bootstrap is 69 permissions (31 PLATFORM + 38 AGENCY), 11 default roles
  (5 PLATFORM + 6 Global AGENCY), 204 role↔permission links and 1 platform
  role assignment.

## [PRISMA]

- Prisma 7 selected (stable line). Prisma 8, even after GA, requires a separate
  explicit migration decision.
- Generated client target: `src/generated/prisma/` (regenerated, not
  hand-maintained).
- `PrismaModule`: `providers: [PrismaService]` + `exports: [PrismaService]`;
  feature modules `imports: [PrismaModule]`; NOT `@Global()`.
- No `IPrismaRepository` / `BaseRepository` / generic repository layers without
  a concrete need.
- IMPLEMENTED (M2): `prisma/schema.prisma` (generator `prisma-client` →
  `src/generated/prisma/`, datasource `postgresql`, no models);
  `prisma.config.ts` (Prisma 7 `defineConfig` + `env('DATABASE_URL_UNPOOLED')`);
  generated client verified at `src/generated/prisma/`; `PrismaModule`/
  `PrismaService` implemented with `@prisma/adapter-neon` runtime adapter
  (pooled `DATABASE_URL`).
- IMPLEMENTED (Group 1): business Prisma migrations
  `20260916101639_identity_rbac_foundation`, `20260916102901_drop_role_permission_code`,
  `20260916103945_refine_rbac_identifiers`, `20260916104751_role_scope_name_unique`,
  `20260916195827_platform_role_assignment`, `20260917051422_scoped_platform_permissions`,
  `20260917061114_role_agency_ownership`, `20260917071337_add_role_key`,
  `20260917100000_add_app_user_status`,
  `20260919191328_agency_customers`,
  `20260920100000_tours_module`,
  `20260920101000_tour_origin`,
  `20260920120000_departures_module`.
  Customized migration history:
  manually adds `CREATE EXTENSION IF NOT EXISTS citext;` and the
  `role_scope_check` / `permission_scope_check` CHECK constraints
  (`scope IN ('PLATFORM','AGENCY')`);
  `role` additionally constrained by unique `(scope, name)`
  (`role_scope_name_key`), so a role name is allowed once per scope;
  no `postgresqlExtensions` preview feature or `extensions` datasource field.
  Uses `BIGSERIAL` for BIGINT autoincrement PKs (Prisma's supported
  PostgreSQL autoincrement mapping).
- `20260917051422_scoped_platform_permissions` adds `permission.scope`
  VARCHAR(16) NOT NULL, `permission.resource` VARCHAR(64) NOT NULL and
  `permission.action` VARCHAR(32) NOT NULL (+ `permission_scope_idx`),
  backfills legacy rows and renames legacy key `X` → `PLATFORM_<RESOURCE>_<ACTION>`
  in two phases so existing `role_permission` links (which reference
  `permission.id`) are preserved.
- `20260919191328_agency_customers` adds the agency-owned `customer` table:
  BIGSERIAL id, `code` VARCHAR(24) UNIQUE (backend-generated `CUS-…`,
  `generateCustomerCode()` = `CUS-` + 6 crypto.randomBytes hex chars),
  non-null `agency_id` BIGINT FK → `agency` ON DELETE CASCADE (indexed),
  nullable `first_name`/`last_name` VARCHAR(100), nullable `email` CITEXT
  (NOT unique — a customer record is a record, not an identity), nullable
  `phone` VARCHAR(32), nullable `notes` TEXT (length capped at 2000 by the
  request schema), `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' pinned by
  the hand-added `customer_status_check` CHECK constraint to
  ACTIVE | ARCHIVED, timestamptz created_at/updated_at. Comment convention
  matches the other customized migrations.
- `20260920100000_tours_module` adds the agency-owned `tour` aggregate and its
  two ordered children. `tour`: code `TUR-…` (`generateTourCode()`, unique),
  agency_id FK → `agency` ON DELETE CASCADE (indexed), name, optional internal_ref,
  format/scopes/availability/participation/guidance enum strings, days/nights/hours,
  is_flexible, min_travelers, languages/themes/activities/audiences/
  transport_modes/accommodation_types string arrays, `activity_requirements`
  Json, short_description/description, highlights/included/not_included Json,
  important_information/cancellation_policy/meeting_point/meeting_instructions,
  cover_image_url, gallery Json, `status` pinned to DRAFT | PUBLISHED | ARCHIVED
  by `tour_status_check`. `tour_destination` (position, wilaya_code, locality,
  place; unique `(tour_id, position)`) and `tour_itinerary_day` (position,
  title, location, description; unique `(tour_id, position)`) cascade with the
  tour.
- `20260920101000_tour_origin` adds the JSON `origin` column (wilayaCode /
  cityId / place) on `tour` for the trip origin location.
- `20260920120000_departures_module` adds the per-tour `departure` table:
  BIGSERIAL id, `code` VARCHAR(24) UNIQUE (backend-generated `DEP-…`,
  `generateDepartureCode()` = `DEP-` + 6 crypto.randomBytes hex chars),
  non-null `tour_id` BIGINT FK → `tour` ON DELETE CASCADE (indexed)
  — the Departure is scoped through its tour, never by its own agency_id —
  non-null timestamptz `start_at`/`end_at`, `capacity` integer NOT NULL,
  nullable timestamptz `booking_deadline`, nullable `notes` TEXT,
  `status` VARCHAR(16) NOT NULL DEFAULT 'OPEN' pinned by the hand-added
  `departure_status_check` CHECK constraint to OPEN | CLOSED | CANCELLED,
  timestamptz created_at/updated_at. Three more hand-added CHECKs:
  `departure_end_after_start_check`, `departure_capacity_check`
  (capacity > 0), `departure_deadline_before_start_check`.
- Migrations: `prisma/migrations/` existing; migration order authoritative.
- Seed: `prisma/seed.ts` (`seedRbacBootstrap`, run via `prisma db seed` →
  `prisma/seed.command.ts` → Vitest, wrapped in one interactive transaction
  with a 60s timeout). Idempotently syncs the code-owned permission catalog
  metadata, prunes stale catalog keys, always synchronizes `PLATFORM_ADMIN` to
  every PLATFORM permission, and creates the remaining default role presets
  with their canonical permission sets only when missing (existing preset
  names, descriptions and permission mappings are never overwritten).
  Optionally assigns `PLATFORM_ADMIN` to the `RBAC_BOOTSTRAP_EMAIL` user when
  that user already exists (no hardcoded personal emails).

## [IDENTITY_AND_RBAC]

IMPLEMENTED (Group 1) — database foundation:

- Unified identity + RBAC database foundation on PostgreSQL (Neon dev).
- One user identity: `app_user` (id BIGINT identity, code VARCHAR(24) unique
  user-facing identifier, email CITEXT unique login identifier, password_hash
  VARCHAR(255), optional first_name/last_name, status VARCHAR(16) NOT NULL
  DEFAULT 'ACTIVE' constrained by `app_user_status_check` to ACTIVE | SUSPENDED
  (see [PLATFORM_USERS] status model), timestamptz created_at/updated_at).
  No separate `platform_admin`/agency-owner/staff identity tables.
- `app_user` connects to PLATFORM roles through `platform_role_assignment`.
  There is no generic `user_role`; AGENCY-side membership is Group 2+.
- Unified RBAC: `role` (id, name, scope VARCHAR(16), nullable `agency_id`
  ownership discriminator, description, timestamptz created_at/updated_at),
  `permission` (id,
  key VARCHAR(64) unique technical authorization identity, name,
  description, scope VARCHAR(16), resource VARCHAR(64), action VARCHAR(32),
  created_at — no updated_at),
  `role_permission` (composite PK role_id+permission_id, permission_id index,
  FKs ON DELETE CASCADE). No `user_permission`/overrides. No `code` business
  keys on `role`/`permission`; `permission.key` is a technical authorization
  key, not a business identifier.
- Role scope: `PLATFORM` | `AGENCY`, enforced in DB by `role_scope_check`
  CHECK constraint (verified by name in DB; no PostgreSQL ENUM).
- Role ownership (migration `20260917061114_role_agency_ownership`): `scope` +
  nullable `agency_id` encode the three role kinds with no extra `isGlobal`/
  `isSystem` boolean — PLATFORM + NULL = Platform Role, AGENCY + NULL = Global
  Agency Role (Platform-Admin-managed), AGENCY + X = Custom Agency Role owned
  by agency X. `role_agency_scope_check` forbids a non-null `agency_id` on
  PLATFORM roles. Name uniqueness moved from `role_scope_name_key` to two
  partial unique indexes: `role_global_name_key` UNIQUE `(scope, name)` WHERE
  `agency_id IS NULL` (Platform + Global Agency names unique per scope) and
  `role_agency_name_key` UNIQUE `(agency_id, name)` WHERE `agency_id IS NOT
  NULL` (the same custom role name may exist in two different agencies).
  `agency_id` is intentionally NOT yet a foreign key — the `agency` table does
  not exist (Group 2); the FK is added by the migration that introduces
  `agency`. Live-verified: PLATFORM role + `agency_id` rejected, duplicate
  global names rejected, same custom name for two agencies allowed.
- Permission scope: same `PLATFORM` | `AGENCY` values, enforced by
  `permission_scope_check`; permission keys follow
  `<SCOPE>_<RESOURCE>_<ACTION>` (e.g. `PLATFORM_ROLE_VIEW`). A role may only
  receive permissions of its own scope (`CROSS_SCOPE_PERMISSION_KEYS`), checked
  against the role's actual `scope`.
- `platform_role_assignment` (unique `app_user_id` + `role_id`, reverse index
  on `role_id`, cascade FKs) connects `app_user` to PLATFORM `role`s.
- Case-insensitive email identity via PostgreSQL `citext` extension
  (`app_user.email CITEXT UNIQUE`); activation versioned in the migration.
- Catalog seeded from code: `RBAC_PERMISSION_CATALOG` defines the canonical
  69 permissions (31 PLATFORM + 38 AGENCY), and
  `DEFAULT_PLATFORM_ROLES` / `DEFAULT_GLOBAL_AGENCY_ROLES` define 11 default
  role presets. `PLATFORM_ADMIN` owns all PLATFORM permissions and
  `AGENCY_OWNER` owns all AGENCY permissions. `validateRbacCatalog()` enforces
  key shape, uniqueness, known scope/resource/action, same-scope references and
  the two baseline sets at startup (`RbacModule.onModuleInit`), at seed time and
  in tests. The catalog is code-owned — there is no Permission CRUD API.

## [AGENCY_OWNERSHIP]

IMPLEMENTED (Agency Foundation backend slice). Ownership is explicit and is
kept strictly separate from authorization.

- `agency_membership.membership_type` = `OWNER` | `EMPLOYEE` (DB CHECK
  `agency_membership_type_check`). Ownership is NEVER inferred from a role key,
  and holding the canonical role never makes a member the owner.
- The canonical global agency role is identified by `role.system_key`
  (`AGENCY_ADMIN`), not by `key`/`name`, which stay editable business metadata.
  It is carried by the existing `AGENCY_OWNER` preset
  (`DEFAULT_GLOBAL_AGENCY_ROLES`) — no second full-permission agency role was
  introduced. `SYSTEM_ROLE_KEYS` / `SYSTEM_ROLE_SHAPES` in `rbac.types.ts` keep
  the concept deliberately minimal (one identity today).
- `system_key` is NOT an authorization mechanism. Authorization stays
  `permission.key` only; nothing is ever granted because a role carries a
  system identity.

Database invariants (migration `20260918120000_agency_ownership_foundation`),
all live-verified against the Neon dev database:

- `role_system_key_key` UNIQUE (`system_key`) WHERE NOT NULL — one role per
  identity.
- `role_system_key_shape_check` — a non-null `system_key` must be a known
  identity AND satisfy its shape (`AGENCY_ADMIN` => `scope = 'AGENCY'` AND
  `agency_id IS NULL`). This is what forbids converting the canonical role into
  a custom agency role.
- `role_protect_system_identity` BEFORE UPDATE/DELETE trigger — a non-null
  `system_key` can never be changed or cleared, and such a role can never be
  deleted.
- `agency_membership_owner_key` UNIQUE (`agency_id`) WHERE
  `membership_type = 'OWNER'` — at most one OWNER. A partial unique index is
  always immediate and can never be DEFERRABLE, which is why "at least one" is
  a separate deferred check.
- `agency_membership_owner_active_check` — an OWNER row must be `ACTIVE`. An
  OWNER membership can therefore never be SUSPENDED; suspending the BUSINESS is
  `agency.status`.
- `agency_ownership_invariants` DEFERRED constraint triggers on `agency`,
  `agency_membership` and `agency_role_assignment` — at COMMIT every agency has
  exactly one OWNER, that OWNER is ACTIVE, and that OWNER holds the role whose
  `system_key = 'AGENCY_ADMIN'`. Deferral is what allows
  create-agency -> create-membership -> assign-role in one transaction, and
  keeps a future ownership transfer (demote -> promote -> COMMIT) possible
  without loosening the invariant.

Service layer (`AgencyProvisioningService`, `AgenciesService`) rejects the same
states early with explicit `errorCode`s (`AGENCY_ADMIN_ROLE_MISSING`,
`AGENCY_ADMIN_ROLE_INVALID`, `OWNER_APP_USER_NOT_FOUND`,
`OWNER_APP_USER_NOT_ACTIVE`, `AGENCY_NOT_FOUND`, `SYSTEM_ROLE_PROTECTED`);
`mapOwnershipError` translates a trigger that still fires at COMMIT
(`AGENCY_REQUIRES_OWNER`, `OWNER_CANNOT_BE_SUSPENDED`,
`OWNER_REQUIRES_AGENCY_ADMIN`, ...) into the same contract, so a raw PostgreSQL
error is never returned.

`AgencyProvisioningService.provision()` is the single way an Agency is created.
Platform creation (`POST /v1/agencies`) and agency application approval both call
it, so an approved agency and a platform-created one get an identical structure.
An agency is never created orphaned; any failure rolls the whole transaction
back.

`POST /v1/agencies` takes a discriminated `owner`:

- `{ type: 'EXISTING', appUserCode }` - an account already on the platform. It
  must exist and be ACTIVE (`OWNER_APP_USER_NOT_FOUND` / `OWNER_APP_USER_NOT_ACTIVE`).
- `{ type: 'NEW', email, password, firstName?, lastName? }` - the account is
  created in the SAME transaction as the agency, through
  `AppUserIdentityService`. A duplicate address is rejected with
  `EMAIL_ALREADY_REGISTERED` and creates neither a second account nor a partial
  agency. A NEW owner receives NO `PlatformRoleAssignment`: an AppUser whose only
  context is an OWNER membership is a valid, fully supported state.

`AppUserIdentityService` (`src/auth/`) owns generic identity creation - code
generation, argon2id hashing and the unique-email conflict contract - and is
shared by self-registration, Platform User administration and agency creation.
It knows nothing about roles or memberships, so nothing about it grants access.

The Agency profile is deliberately minimal: `code` (backend-generated,
immutable), `name`, `status`, `country`, `description`, `createdAt`,
`updatedAt`. `website` was DROPPED by migration
`20260918160000_agency_drop_website` and no `domain` replacement was added:
custom domains belong to the future Agency Dashboard -> Settings -> Domain
feature (configuration + DNS verification). `agency_application.website` is kept
- an application is a permanent record of what the applicant submitted - but it
is no longer copied onto the agency at approval time.

`GET /v1/app-users/search?search=` (`AppUserLookupController`,
`PLATFORM_AGENCY_CREATE`) backs the owner picker. It searches EVERY AppUser by
name, email or code - `/v1/platform-users` cannot serve this, because it only
returns accounts holding a platform role and an agency owner normally holds
none. It is deliberately not a directory: `search` is required (>= 2 characters)
and results are capped at `APP_USER_LOOKUP_LIMIT`. The response carries only
`{ code, firstName, lastName, email, status }`.

NOT in this slice (deferred): AgencyPermissionsService / AgencyPermissionGuard /
agency CASL / agency-scoped request authorization, member management (add,
remove, suspend employee, change membershipType), transfer ownership,
customer counts (the Customer model itself is implemented later — see
[CUSTOMERS]).

## [AGENCY_MEMBERS]

IMPLEMENTED (backend only). Agency-side member administration, entirely inside
one agency and authorized by AGENCY `Permission.key` through the existing
`AgencyPermissionGuard`.

Routes, all under `/v1/agencies/:agencyCode`:

- `GET  members` (`AGENCY_MEMBER_VIEW`) - owner and employees in one list, one
  row per person however many roles they hold; search by name/email/code
- `GET  members/:userCode` (`AGENCY_MEMBER_VIEW`)
- `PUT  members/:userCode/roles` (`AGENCY_MEMBER_ROLE_MANAGE`) - atomic full
  replacement
- `PATCH members/:userCode/status` (`AGENCY_MEMBER_UPDATE`)
- `DELETE members/:userCode` (`AGENCY_MEMBER_REMOVE`) - 204
- `GET  available-roles` (`AGENCY_MEMBER_ROLE_MANAGE`) - global agency roles plus
  THIS agency's custom ones; never PLATFORM or another agency's

Deliberately NOT implemented (identity-enumeration exposure): `POST members`
(adding a person by picking an existing account) and `GET member-candidates`
(the account lookup behind it). Both were built, then removed: a lookup over
`/v1/app-users/search` semantics from an agency dashboard would hand a business
operator a searchable directory of accounts outside their agency. The
replacement IS the Member Invitations flow — email → pending invite →
acceptance → membership — implemented and live under [MEMBER_INVITATIONS].
`AGENCY_MEMBER_INVITE` is the permission consumed by that flow.

Domain rules:

- The server always creates `membershipType = EMPLOYEE`, `status = ACTIVE`.
  `membershipType`, `agencyId`, role ids, `systemKey`, account status and OWNER
  are rejected outright (`.strict()`).
- Roles are OPTIONAL and an empty set is valid: `membershipType = EMPLOYEE`
  already classifies the person, so no placeholder "Employee" role is invented.
  An ACTIVE employee with zero roles is a valid member with zero business
  permissions.
- OWNER is readable but never managed here: suspend, remove and role replacement
  all return 409 (`OWNER_CANNOT_BE_SUSPENDED`, `OWNER_CANNOT_BE_REMOVED`,
  `OWNER_ROLES_IMMUTABLE`). Ownership transfer stays a separate future operation.
- Membership status is access to ONE agency. It never touches `AppUser.status`,
  memberships in other agencies, or platform access.
- Removing a member removes the membership and its role assignments from THIS
  agency only; the account and its other memberships survive.
- Role assignment accepts only roles valid for this agency
  (`isRoleValidForAgency`), with the `agency_role_assignment_scope` trigger as
  the final protection.

NOT in this slice: custom role CRUD (backend), ownership transfer, and any
frontend. (Member invitations and their tokens/emails are implemented — see
[MEMBER_INVITATIONS].)

## [MEMBER_INVITATIONS]

IMPLEMENTED (backend only). Consent-based membership joining for one agency:
an invited EMAIL accepts a one-time token and becomes an EMPLOYEE member with
the roles the invitation offered. Authorized by `AGENCY_MEMBER_INVITE` through
the existing `AgencyPermissionGuard`; acceptance is anonymous (token-only) for
a new account or signed-in (identity matching) for an existing account.

Routes:

- `POST   /v1/agencies/:agencyCode/member-invitations`
  (`AGENCY_MEMBER_INVITE`) - create a PENDING invitation for an EMAIL (NOT an
  account) with optional `roleKeys` (1..50). Response is the public invitation
  (code, email, status PENDING, offered roles, expiry) — never the token.
  Idempotent: an outstanding PENDING invitation for the same email/agency is
  returned as-is, no second delivery. `roleKeys` accept global AGENCY roles and
  THIS agency's custom roles; PLATFORM roles, unknown keys and another agency's
  custom roles are rejected.
- `GET    /v1/agencies/:agencyCode/member-invitations`
  (`AGENCY_MEMBER_VIEW`) - pending and lately-accepted invitations of THIS
  agency only, newest first.
- `DELETE /v1/agencies/:agencyCode/member-invitations/:code`
  (`AGENCY_MEMBER_INVITE`) - revoke a still-PENDING invitation (204).
- `GET    /v1/member-invitations/:token` - inspect before accepting (public,
  rate-limited per IP, no session needed). 404 for unknown/revoked/expired.
- `POST   /v1/member-invitations/:token/accept` - consume the one-time token:
  - existing account → requires the matching signed-in account
    (`INVITATION_AUTH_REQUIRED`/`INVITATION_EMAIL_MISMATCH`);
  - no account yet → requires `{ password }` and an interactive email-race
    guard (the email comes from the invitation, never from the body);
  - grants `membershipType = EMPLOYEE`, `status = ACTIVE` + the offered roles,
    atomically, one redemption only.

Lifecycle: PENDING → ACCEPTED | REVOKED | EXPIRED (a.DB CHECK pins the
values). Non-enumeration: creating for an existing account looks byte-for-byte
identical to an unknown one, the response never signals whether the address has
an account, and `POST members`/`GET member-candidates` stay absent. The
platform-only global AppUser search stays on `PLATFORM_AGENCY_CREATE`.

Token security: 256-bit `crypto.randomBytes` token, delivered out-of-band via
`MemberInvitationDeliveryService` (never in any API response); the DB stores
only the SHA-256 digest (`tokenHash`, unique, with the service-side
`crypto.timingSafeEqual` compare); no welcome email yet —
`MEMBER_INVITE_DELIVERY` defaults to `none` (hard no-op), `dev` provably refuses
to email in production (NODE_ENV check), delivery itself is NOT configured.

Audit: every lifecycle transition logs an `AGENCY_MEMBER_INVITATION_*` event
(SUCCESS/FAILURE) with `targetHash = SHA-256(email)` and metadata that never
contains the token, its hash or any password. Database table
`agency_member_invitation` (+ `agency_member_invitation_role`) in migration
`20260919150000_agency_member_invitation`, with the partial unique
`(agency_id, email) WHERE status = 'PENDING'` and the
`agency_member_invitation_role_scope` trigger mirroring role tenancy.

NOT in this slice: real email delivery, custom role CRUD, ownership transfer,
and any frontend. Verified by 46 unit/HTTP tests (in-memory), plus a throwaway
real-DB HTTP smoke covering all 20 required behavioral points (cleaned up, no
residue: re-verified 0 rows after).

## [CUSTOMERS]

IMPLEMENTED (backend + Agency Dashboard). Agency business customer records —
a Customer is deliberately NOT an identity: no `app_user` link, no
credentials, no database id in the API contract. The only stable external key
is the backend-generated `code` (`CUS-…`).

Database (migration `20260919191328_agency_customers`, see [PRISMA]):
`customer` table with `agency_id` FK → `agency` ON DELETE CASCADE, nullable
contact fields, CITEXT email (not unique), and `status` constrained to
ACTIVE | ARCHIVED by `customer_status_check`.

Routes, all under `/v1/agencies/:agencyCode/customers`, guarded by
`JwtAuthGuard` + `AgencyPermissionGuard`; every query is re-scoped by the
route's resolved `agency_id`:

- `GET   customers?search=` (`AGENCY_CUSTOMER_VIEW`) — ACTIVE only, newest
  first; search matches code / first name / last name / email / phone
  (insensitive contains)
- `GET   customers/:customerCode` (`AGENCY_CUSTOMER_VIEW`) — archived records
  stay readable, so a stored link to a customer keeps working
- `POST  customers` (`AGENCY_CUSTOMER_CREATE`) — all fields optional; blank →
  `null`, email trimmed + lowercased by `normalizeCustomerEmail`
- `PATCH customers/:customerCode` (`AGENCY_CUSTOMER_UPDATE`) — partial
  update: omitted fields untouched, `null`/blank clears
- `PATCH customers/:customerCode/archive` (`AGENCY_CUSTOMER_ARCHIVE`) —
  one-way soft-delete; re-archiving → 409 `CUSTOMER_ALREADY_ARCHIVED`

Error contract: `CUSTOMER_NOT_FOUND` (404, tenant-scoped — a foreign or
stale `CUS-` code never leaks existence), `CUSTOMER_ALREADY_ARCHIVED` (409).
Every mutation writes an `AGENCY_CUSTOMER_CREATED/UPDATED/ARCHIVED` audit
event. The four permissions are pre-existing catalog entries — no RBAC change
was needed. Swagger documents the module.

Frontend (`frontend/dashboard` customers feature): list page with backend
search (debounced) + shared create/edit form dialog, a details route keyed by
the `CUS-` code (`customers/:customerCode`), edit dialog, and one-way archive
through `ConfirmDialog`. Row actions and buttons are gated on
`AGENCY_CUSTOMER_VIEW/CREATE/UPDATE/ARCHIVE` via `useCustomerCapabilities`
(UX only — the backend guards are authoritative). Pure display/payload/action
helpers are covered by Node's built-in `node --test` (23 customer specs; 100
across the app). UI strings live in a dedicated `customers` i18n namespace
(EN + AR, RTL-correct). No restore is offered anywhere: an archived customer
leaves the listing and only its details page (by code) still resolves it.

NOT in this slice: linking Customers to Bookings (Module I), customer counts
in platform views, custom field sets.

## [AGENCY_TOURS]

IMPLEMENTED (backend + Agency Dashboard) — Module F of the trips roadmap. The
reusable travel product aggregate for ONE agency; the Dashboard calls it a
Trip at the UI layer. Children are stored ordered (position 0..n) and are
fully owned by the aggregate.

Database (migrations `20260920100000_tours_module`,
`20260920101000_tour_origin`, see [PRISMA]): `tour` (TUR-… code, agency_id FK
cascade, status DRAFT | PUBLISHED | ARCHIVED via `tour_status_check`) with
`tour_destination` (position, wilaya_code, locality, place) and
`tour_itinerary_day` (position, title, location, description) children —
both with unique `(tour_id, position)`. The wire uses `cityId` for the
stored `locality` column.

Routes, all under `/v1/agencies/:agencyCode/tours`, guarded by `JwtAuthGuard` +
`AgencyPermissionGuard`; every query is re-scoped by the route's resolved
`agency_id`, so a foreign or stale `TUR-` code is a 404 and never leaks
existence:

- `GET   tours?search=&status=` (`AGENCY_TOUR_VIEW`) — newest first, ARCHIVED
  excluded unless `status=ARCHIVED`; search matches code / name / internalRef /
  destination locality/place (insensitive contains)
- `GET   tours/:tourCode` (`AGENCY_TOUR_VIEW`) — archived stay readable
- `POST  tours` (`AGENCY_TOUR_CREATE`) — always lands DRAFT; the backend never
  auto-publishes
- `PUT   tours/:tourCode` (`AGENCY_TOUR_UPDATE`) — full aggregate replacement
  in ONE transaction: scalar fields overwritten, destinations + itinerary
  deleted and re-created (positions 0..n)
- `POST  tours/:tourCode/publish` (`AGENCY_TOUR_PUBLISH`) — explicit only;
  idempotent when already PUBLISHED; runs a server-side readiness gate
- `POST  tours/:tourCode/unpublish` (`AGENCY_TOUR_PUBLISH`) — idempotent when
  already DRAFT
- `PATCH tours/:tourCode/archive` (`AGENCY_TOUR_DELETE`) — one-way, like
  customers

Publish readiness gate (`computeTourPublishBlockers`, Module F + G): what the Tour
aggregate itself owns — NAME, a resolved DESTINATION (domestic → wilayaCode,
international → place), SHORT_DESCRIPTION, COVER_IMAGE, and
SCHEDULED_DEPARTURES_REQUIRED, which now counts OPEN departures through the
Departures module: a SCHEDULED tour publishes only while it holds ≥ 1 OPEN
departure (CLOSED / CANCELLED don't count) — see [AGENCY_DEPARTURES]. Pricing is
NOT checked (Module H). ON_REQUEST / CUSTOM_QUOTE publish once the Tour-owned
required fields are ready. Blocked publish → 409
`TOUR_PUBLISH_READINESS_BLOCKED` (with `metadata.blockers`); archived cannot be
(un)published → 409 `TOUR_PUBLISH_STATE_BLOCKED`; re-archiving → 409
`TOUR_ALREADY_ARCHIVED`; a foreign or stale `TUR-` code → 404 `TOUR_NOT_FOUND`
(tenant-scoped, never leaks existence). Publishing an already-PUBLISHED tour is
idempotent, so an already-published tour stays PUBLISHED even if its last open
departure is later closed or cancelled — the readiness gate guards the
transition, it never retroactively unpublishes.

Every mutation writes an `AGENCY_TOUR_CREATED/UPDATED/PUBLISHED/UNPUBLISHED/
ARCHIVED` audit event. The five permissions (`AGENCY_TOUR_VIEW/CREATE/UPDATE/
DELETE/PUBLISH`) are pre-existing catalog entries, consumed by the
`AGENCY_TOUR_MANAGER` preset — no RBAC change was needed. Swagger documents the
module. Verified by 25 controller specs (in-memory) covering tenant scoping,
lifecycle transitions and the readiness gate.

NOT in this slice: pricing options (Module H); status is never part of the write
payload — it moves only through the explicit publish/unpublish/archive actions.

## [AGENCY_DEPARTURES]

IMPLEMENTED (backend + Agency Dashboard) — Module G of the trips roadmap. One
departure = one scheduled occurrence of a tour, with its own timing, capacity,
optional booking deadline, status and notes. Departures live under their tour:
`/v1/agencies/:agencyCode/tours/:tourCode/departures`, so a Departure never
carries an agency_id — tenancy resolves through the route's tour, and a foreign
or stale `TUR-` / `DEP-` code is a 404 that never leaks existence.

Database (migration `20260920120000_departures_module`, see [PRISMA]):
`departure` table as described above, with start/end timestamptz, capacity > 0,
deadline ≤ start, and status pinned to OPEN | CLOSED | CANCELLED by CHECKs.

Routes, guarded by `JwtAuthGuard` + `AgencyPermissionGuard`:

- `GET   .../departures` (`AGENCY_DEPARTURE_VIEW`) — newest first; optional
  `?status=` filter; cancelled departures stay listed
- `GET   .../departures/:departureCode` (`AGENCY_DEPARTURE_VIEW`)
- `POST  .../departures` (`AGENCY_DEPARTURE_CREATE`) — always lands OPEN; the
  backend never accepts a client `status`, `tourId` or `agencyId` (zod
  `.strict()` → 400) and never auto-publishes the tour
- `PUT   .../departures/:departureCode` (`AGENCY_DEPARTURE_UPDATE`) — full
  replacement of the operational fields + optional status (OPEN ↔ CLOSED);
  CANCELLED edits → 409 `DEPARTURE_ALREADY_CANCELLED`
- `POST  .../departures/:departureCode/cancel` (`AGENCY_DEPARTURE_DELETE`) —
  one-way OPEN/CLOSED → CANCELLED; repeat cancel → 409
  `DEPARTURE_ALREADY_CANCELLED`; returns `{ departure, tourStatus,
  remainingOpenDepartures }`; the Tour status is NEVER touched — cancelling the
  last open departure of a PUBLISHED tour leaves it PUBLISHED (the UI warns
  instead)

`status`/`tourId`/`agencyId` are never part of any write payload. Errors:
`DEPARTURE_NOT_FOUND` (404), `DEPARTURE_ALREADY_CANCELLED` (409), 400
validation, 403 missing permissions. Every create/update/cancel writes an
`AGENCY_DEPARTURE_CREATED/UPDATED/CANCELLED` audit event (cancel carries
`{ tourCode, tourStatus, remainingOpenDepartures }`). The four permissions
(`AGENCY_DEPARTURE_VIEW/CREATE/UPDATE/DELETE`) are pre-existing catalog
entries — no RBAC catalog change was needed. Swagger documents the module.
Verified by 18 controller specs (in-memory) covering tenant scoping, the strict
payload boundary, status transitions, one-way cancel and the never-touch-the-tour
invariant.

NOT in this slice: per-departure prices by PricingOption (Module H); capacity's
booked-seats count and sold-out states (Bookings module).

## [AGENCY_PRICING]

IMPLEMENTED (backend + Agency Dashboard) — Module H of the trips roadmap. A
PricingOption is a tour-owned customer category definition (`Adult`, `Child`,
…): name, optional description, charging `basis` (`per_person` |
`per_booking`) and currency. The actual money lives on DeparturePrice — one
amount per (departure, option) — managed as a whole set per departure. Routes
live under the tour: `/v1/agencies/:agencyCode/tours/:tourCode`, so tenancy
resolves through the route's tour and a foreign/stale `TUR-` / `PRC-` /
`DEP-` code is a 404 that never leaks existence.

Database (migration `20260920130000_pricing_module`, see [PRISMA]):
`pricing_option` (code `PRC-…`, name/description/basis/currency, status pinned
to ACTIVE | INACTIVE by CHECK, tenant-scoped via composite super-key) and
`departure_price` (composite PK `(departure_id, pricing_option_id)`, amount
`DECIMAL(12,2)` ≥ 0). One currency per tour: set at the first option's
creation (backend default `DZD` when omitted), immutable after, and enforced
by the service across every option and price of the tour.

Routes, guarded by `JwtAuthGuard` + `AgencyPermissionGuard`:

- `GET   .../pricing-options` (`AGENCY_PRICING_VIEW`) — pricing overview:
  options (newest first, both statuses) + derived `startingPrice` (minimum
  amount across the tour's OPEN departures, `null` when none) +
  `pricedOpenDepartureCount` (distinct OPEN departures carrying ≥ 1 price);
  this one response drives the dashboard's pricing section and readiness panel
- `GET   .../pricing-options/:optionCode` (`AGENCY_PRICING_VIEW`) — deactivated
  options stay readable so stored `PRC-…` links keep working
- `POST  .../pricing-options` (`AGENCY_PRICING_MANAGE`) — always lands ACTIVE;
  `code` is backend-generated and never accepted; bodies are zod `.strict()`
  (a client `status`, `tourId` or `agencyId` → 400); optional `currency`
  (uppercase 3-letter) is checked against the tour's existing currency
- `PUT   .../pricing-options/:optionCode` (`AGENCY_PRICING_MANAGE`) — full
  replacement of name/description/basis; currency is immutable after creation
  and status moves only through deactivate; editing a deactivated option → 409
  `PRICING_OPTION_INACTIVE`
- `POST  .../pricing-options/:optionCode/deactivate` (`AGENCY_PRICING_MANAGE`)
  — one-way terminal action like archiving a tour: ACTIVE → INACTIVE, repeat
  cancel → 409 `PRICING_OPTION_ALREADY_INACTIVE`; there is no hard delete, and
  prices already stored on departures stay (history only, never re-offerable)
- `GET   .../departures/:departureCode/prices` (`AGENCY_PRICING_VIEW`) — the
  departure's stored set (cancelled departures included); a never-priced
  departure returns `{ departureCode, currency: null, prices: [] }`
- `PUT   .../departures/:departureCode/prices` (`AGENCY_PRICING_MANAGE`) —
  whole-set replacement in one transaction (like the tour aggregate's
  children): option codes omitted from the payload drop out, present ones are
  (re)created with their amount. Every code must belong to the same tour and
  be ACTIVE (`PRICING_OPTION_INACTIVE` 409) and amounts share one currency
  (`PRICING_CURRENCY_MISMATCH` 409); a cancelled departure is locked
  (`DEPARTURE_ALREADY_CANCELLED` 409)

Errors: `PRICING_OPTION_NOT_FOUND` / `DEPARTURE_NOT_FOUND` (404, tenant-
scoped), `PRICING_OPTION_NAME_TAKEN` (409, one name per tour),
`PRICING_OPTION_INACTIVE`, `PRICING_OPTION_ALREADY_INACTIVE`,
`PRICING_CURRENCY_MISMATCH`, `DEPARTURE_ALREADY_CANCELLED` (409), 400
validation, 403 missing permissions. Every mutation writes an
`AGENCY_PRICING_OPTION_CREATED / UPDATED / DEACTIVATED` or
`AGENCY_DEPARTURE_PRICES_REPLACED` audit event (replace carries `{ tourCode,
optionCount, currency }`). The two permissions (`AGENCY_PRICING_VIEW` /
`AGENCY_PRICING_MANAGE`) are pre-existing catalog entries — no RBAC catalog
change. Swagger documents the module. The Tour publish gate is unchanged:
pricing is still never required for publishing (recommended on the dashboard
only). Verified by controller specs (in-memory) covering tenant scoping, the
strict payload boundary, single-currency enforcement, name uniqueness, the
one-way deactivate transition, whole-set replacement and the never-touch-the-
tour invariant.

NOT in this slice: seat consumption / sold-out states (Bookings module),
promotions and exchange-rate logic (explicitly out of MVP), Tour publish-gate
integration.

## [AGENCY_AUTHORIZATION]

IMPLEMENTED. Makes AGENCY permissions enforceable inside one specific agency,
mirroring the platform side without touching it.

Resolution chain, walked in full from the database on every agency-scoped
request (nothing about agency access is in the JWT, which stays identity-only):

    AppUser -> AgencyMembership -> AgencyRoleAssignment -> Role
            -> RolePermission -> Permission.key

- `AgencyPermissionsService.resolveAccess(appUserId, agencyCode)` does it in ONE
  query (agency + this user's membership + its assignments + each role's AGENCY
  permissions), so there is no N+1 and no second source of truth.
- `AgencyPermissionGuard` composes with `JwtAuthGuard`: resolve `:agencyCode`,
  404 if unknown, 403 `AGENCY_SUSPENDED` if not operational, 403
  `AGENCY_MEMBERSHIP_REQUIRED` / `AGENCY_MEMBERSHIP_INACTIVE` without an ACTIVE
  membership, then CASL over the effective keys, else 403
  `AGENCY_PERMISSION_DENIED`. The resolved context is attached to the request
  (`@CurrentAgency`) so handlers never re-resolve it.
- `@RequireAgencyPermissions(...)` is separate from the PLATFORM
  `@RequirePermissions`, and validates its keys against the AGENCY catalog at
  decoration time: a typo or a PLATFORM key fails the app at boot.
- `@RequireAgencyMembership()` marks a route agency-scoped without a specific
  permission (agency existence, status and ACTIVE membership are still enforced).

Agency context comes from the ROUTE (`/v1/agencies/:agencyCode/...`), never from
a request body, and there is no ambient "active agency" on the AppUser: one
AppUser may hold different roles in several agencies and each is resolved
independently.

Tenant isolation is enforced twice, and both fail closed:

- a role counts only when `scope = AGENCY` AND it is global (`agencyId = null`)
  or owned by THIS agency (`isRoleValidForAgency`);
- a permission counts only when `permission.scope = AGENCY`, so a PLATFORM
  permission can never grant agency-side access.

OWNER has NO authorization branch. `membershipType` is never read by the guard
or the service: the owner has access purely because the ownership invariant
guarantees their membership holds the canonical AGENCY_ADMIN role, whose
RolePermissions grant the AGENCY catalog. Removing a permission from that role
removes it from the owner, on the next request, without a new JWT. `systemKey`
identifies the protected role; it is never an authorization input.

`GET /v1/agencies/:agencyCode/me` returns the caller's context in one agency:
agency (code/name/status), membership (type/status), the valid AGENCY roles and
the effective permission keys. It exists so a future Agency Dashboard can adapt
its UI; every route stays enforced server-side. Database ids, `systemKey` and
role-permission internals are not exposed.

NOT in this slice: agency member management, invitations, custom role CRUD,
ownership transfer, and any agency business feature beyond the Customers and
Tours slices (see [CUSTOMERS] and [AGENCY_TOURS]).

## [PLATFORM_AUTHORIZATION]

IMPLEMENTED (Group 1 backend only):

- Application layer over the RBAC tables in `src/rbac/` (`RbacModule`):
  - `GET /v1/permissions` — read-only, code-defined PLATFORM catalog
    (requires `PLATFORM_ROLE_VIEW`). No POST/PATCH/DELETE exist.
  - `/v1/roles` CRUD is PLATFORM-only and scope is server-owned/immutable:
    list/get/patch/delete filter `scope = PLATFORM`; create always writes
    `scope = PLATFORM` (a client-supplied `scope` is stripped by Zod).
    Existing permission keys: `PLATFORM_ROLE_VIEW`, `PLATFORM_ROLE_CREATE`,
    `PLATFORM_ROLE_UPDATE`, `PLATFORM_ROLE_DELETE`.
  - `/v1/agencies` is the platform Agency lifecycle surface: `GET /v1/agencies`
    (list; owner + `membersCount` derived from `AgencyMembership`, never stored),
    `GET /v1/agencies/:code` (details + linked `applicationId`),
    `POST /v1/agencies` (`PLATFORM_AGENCY_CREATE`),
    `PATCH /v1/agencies/:code` (`PLATFORM_AGENCY_UPDATE`, descriptive fields
    only) and `PATCH /v1/agencies/:code/status`
    (`PLATFORM_AGENCY_STATUS_MANAGE`, suspend/reactivate the BUSINESS —
    membership rows are never touched). No new permission was introduced.
  - `/v1/agency-roles` mirrors the CRUD/available-permissions/permission-set
    surface for Global Agency roles (`scope = AGENCY`, `agencyId = null`),
    authorized by the dedicated `PLATFORM_AGENCY_ROLE_VIEW`,
    `PLATFORM_AGENCY_ROLE_CREATE`, `PLATFORM_AGENCY_ROLE_UPDATE`,
    `PLATFORM_AGENCY_ROLE_DELETE` and `PLATFORM_AGENCY_ROLE_PERMISSION_MANAGE`
    capabilities; custom agency roles (`agencyId != null`) are Group 2 and
    return 404 here.
  - `GET /v1/roles/available-permissions` — PLATFORM permissions only
    (`PLATFORM_ROLE_VIEW`), declared before `/:id`.
  - `GET /v1/roles/:id/permissions` (`PLATFORM_ROLE_VIEW`) and
    `PUT /v1/roles/:id/permissions` (`PLATFORM_ROLE_PERMISSION_MANAGE`):
    atomic replace, dedupes keys, rejects unknown keys
    (`UNKNOWN_PERMISSION_KEYS`) and cross-scope keys
    (`CROSS_SCOPE_PERMISSION_KEYS`) with 400, empty array clears, returns the
    final sorted set. Deleting a role with assignments → 409
    (`ROLE_HAS_PLATFORM_ASSIGNMENTS`).
- Enforcement: `JwtAuthGuard` (identity-only JWT) + `PermissionGuard` +
  `@RequirePermissions`; `PlatformPermissionsService` loads effective
  `permission.key`s from PLATFORM assignments and filters **both**
  `role.scope = PLATFORM` and `permission.scope = PLATFORM`; `CaslAbilityFactory`
  builds the ability from those keys. Permission changes take effect without
  reissuing the JWT.
- Swagger documents all PLATFORM role/permission endpoints and error cases.

## [AUTH]

IMPLEMENTED (authentication vertical slice, Group 1 scope):

- Dependencies: `@nestjs/passport@12`, `passport@0.7`, `passport-local@1`,
  `@nestjs/jwt@12`, `passport-jwt@4`, `argon2@0.45` (argon2id), plus
  `@types/passport-local` / `@types/passport-jwt` (dev).
- Flow: `email + password` → Passport Local → `AuthService` → Prisma `appUser`
  → argon2id verify → `JwtService.sign({ sub })` → HttpOnly cookie →
  Passport JWT (cookie extractor) → `JwtAuthGuard` → `request.user`.
- Endpoints under `/v1/auth/*`:
  - `POST /v1/auth/login` — Passport Local (`usernameField: 'email'`);
    JWT payload = `{ sub: <appUser.id> }` only (no roles/permissions/password/
    email); JWT written to the HttpOnly cookie, never included in response
    JSON; returns the safe user.
  - `POST /v1/auth/logout` — clears the auth cookie; no server-side token
    persistence (refresh/system-store deferred).
  - `GET /v1/auth/me` — `JwtAuthGuard`; returns the safe user
    `{ code, email, firstName, lastName }`.
- JWT transport: `HttpOnly` cookie `travel_access_token`; `Secure` only when
  `NODE_ENV=production`; `SameSite=Lax` (same-site dashboard/backend
  architecture); `Path=/`; cookie `Max-Age` mirrors `JWT_EXPIRES_IN`. No
  localStorage/sessionStorage (frontend concern) and no Authorization-header
  dependency — the JWT strategy extracts exclusively from the cookie.
- JWT validation: `sub` → Prisma `appUser` lookup (bigint) → safe
  authenticated user; missing/non-numeric/unknown subject → 401.
- Config: `JWT_SECRET` from validated env (never hardcoded/logged);
  cookie options centralized in `src/auth/auth.cookie.ts`;
  `PassportModule.register({ session: false })`; stateless.
- No Agency, no refresh tokens, no User↔Platform-Role management endpoints
  (Group 2+). Platform role assignment exists only through the RBAC seed.

## [TENANCY]

- Tenant = Agency; shared PostgreSQL; backend-enforced isolation.
- Client-supplied `agencyId` is never authorization proof; agency-owned data is
  scoped with trusted server-side tenant context whenever that context exists.
- Public APIs expose only deliberate, published data.
- No authentication implementation is invented at foundation.

## [VALIDATION]

- Zod 4 + Standard Schema (`StandardSchemaValidationPipe` where appropriate;
  Standard-Schema response serialization where appropriate).
- IMPLEMENTED (auth): global `StandardSchemaValidationPipe` registered in
  `configureApp` (`src/setup-app.ts`) + the login body schema
  (`@Body({ schema: loginSchema })`) in `src/auth/schemas.ts`;
  `/v1/auth/register` was removed (see `[AUTH]`). Unknown body fields are
  stripped by the Zod objects (client-supplied `code`/`id`/`passwordHash` can
  never reach persistence).

## [ERROR_CONTRACT]

- Selected minimal policy: `{ statusCode, message, errorCode }`; structured
  validation details only when genuinely needed.
- Never expose: stack traces, database errors, SQL, secrets, internal
  implementation details.
- IMPLEMENTED (auth): machine-readable `errorCode`
  (`EMAIL_ALREADY_REGISTERED`, `USER_CREATE_CONFLICT`) on auth conflicts;
  login failures surface as generic 401 (`Invalid credentials` — no user
  enumeration); invalid tokens as 401.
- Concrete reusable runtime error machinery deferred until more endpoints
  need it.

## [LOGGING]

- Nest built-in Logger selected for foundation.
- No pino during foundation.
- Production observability stack (structured JSON, redaction, centralized
  collection, correlation/request IDs) remains pending.

## [TESTING]

- Use the test tooling produced by the actual Nest scaffold: Vitest (ESM runner)
  + oxlint, with `@nestjs/testing` in the dev baseline. As of the canonical
  RBAC bootstrap, `npm test` (122 tests), `npm run test:e2e` (2 tests),
  `npm run lint` (0/0) and `npm run build` all pass; see
  "Group 1 closure verification" in [STATUS].
- `nestjs-testing` skill governs Nest framework testing mechanics.

## [AGENT_TOOLING]

Local backend skills (existing):

- `nestjs-cli` — official Nest CLI/scaffold/generator decisions
- `nestjs-core` — modules/providers/DI/scopes/lifecycle/composition
- `nestjs-rest` — HTTP/routing/validation/exceptions/versioning
- `nestjs-testing` — Nest testing mechanics

Vendor skills (installed during M2-A via the official `skills` CLI, copied
under `backend/.agents/skills/`, declarable reproducibly via
`backend/skills-lock.json`):

- Prisma ORM v7: `prisma-cli`, `prisma-client-api`, `prisma-driver-adapter-implementation`
- Neon: `neon`, `neon-postgres`

## [IMPLEMENTED]

Only what actually exists now:

- backend OpenCode environment
- `backend/AGENTS.md`
- `backend/backend_PROJECT_MAP.md` (this file)
- `backend/opencode.json`
- four local Nest skills (`nestjs-cli`, `nestjs-core`, `nestjs-rest`,
  `nestjs-testing`)
- official NestJS application scaffold exists (`backend/`)
- NestJS 12 scaffold baseline exists
- TypeScript strict configuration exists (`tsconfig.json` strict)
- ESM configuration exists (`package.json` `"type": "module"`, nodenext)
- Express adapter is selected/present (`@nestjs/platform-express`)
- npm dependency installation completed; `package-lock.json` exists
- Prisma 7 foundation (`prisma/schema.prisma`, `prisma.config.ts` with
  `DATABASE_URL_UNPOOLED` tooling role)
- Prisma Client generation on the `prisma-client` generator; generated client at
  `src/generated/prisma/`
- `PrismaModule` + `PrismaService`; explicit, non-global wiring imported by
  `AppModule`
- `@prisma/adapter-neon` runtime integration (pooled `DATABASE_URL`)
- `@nestjs/config` + Zod 4 runtime env validation (`NODE_ENV`, `PORT`,
  `DATABASE_URL`); `DATABASE_URL_UNPOOLED` not required for Nest boot
- Neon development database connected; real `SELECT 1` verified through the
  actual `PrismaService` (M2-E)
- env files: `.env.example` (tracked placeholders), `.env` (gitignored)
- vendor Prisma/Neon skills installed (M2-A)
- Group 1 identity + RBAC database foundation (Prisma migrations
  `20260916101639_identity_rbac_foundation`, `20260916102901_drop_role_permission_code`,
  `20260916103945_refine_rbac_identifiers`):
  - `app_user` identity foundation
  - case-insensitive email identity using PostgreSQL `citext`
  - `role` catalog table (no `code` column)
  - `PLATFORM` / `AGENCY` role scope foundation with DB `role_scope_check` CHECK
  - `permission` catalog table with technical authorization `key` (VARCHAR(64),
    NOT NULL, UNIQUE)
  - `role_permission` many-to-many mapping (composite PK, cascade FKs,
    permission_id reverse index)
  - business Prisma migrations (customized: citext activation &
    role_scope_check; plus `code` drop and permission `key` intro) applied
    to Neon dev
  - role `(scope, name)` uniqueness (`role_scope_name_key`) applied to Neon dev
  - Group 1 refinement `20260917061114_role_agency_ownership`: `role.agency_id`
    (nullable, indexed) + `role_agency_scope_check` + partial unique indexes
    `role_global_name_key` / `role_agency_name_key` (replacing
    `role_scope_name_key`); `prisma db seed` re-verified idempotent
  - real Neon verification: tables, constraints, unique indexes, case-insensitive
    email behavior, invalid scope rejection, duplicate `permission.key` rejection,
    duplicate `(scope, name)` role rejection, same name in different scope allowed,
    `code` removal, scope constraint name (`role_scope_check` confirmed)
- authentication vertical slice (see [AUTH]): Nest URI versioning `/v1`
  (default version), global `StandardSchemaValidationPipe`, `AuthModule`
  (Passport Local + JWT-in-cookie), `/v1/auth/{login,logout,me}`,
  argon2id hashing, `USR-` code generation, HttpOnly `travel_access_token`
  cookie (Secure in production, SameSite=Lax), minimal `{ sub }` JWT,
  `JwtAuthGuard`, `@CurrentUser`; auth unit + HTTP integration specs

Identifier convention (final): business entities may carry a user-facing
`code` when justified (`app_user.code`, e.g. USR-…); RBAC `role` has no
business code but carries a stable technical `key` (uppercase snake case,
immutable, unique per ownership context — the HTTP identifier for role
assignment); `permission`
uses a stable technical authorization `key` (e.g. AGENCY_APPROVE), NOT a
business code.

Platform Users (IMPLEMENTED, verified against the live backend and frontend):
see [PLATFORM_USERS] for the full slice — list/search, get, create (atomic
user + roles), profile edit, ACTIVE/SUSPENDED status, role view/replace.
Suspended users are rejected at login and on every JWT validation, so an
existing HttpOnly cookie stops working immediately after suspension.

- RBAC seed idempotent; `AGENCY_MEMBER_INVITE` is consumed by the Member
  Invitations flow (no longer reserved-unused; see [MEMBER_INVITATIONS])
- Member Invitations vertical slice (IMPLEMENTED, backend only): see
  [MEMBER_INVITATIONS] — `AGENCY_MEMBER_INVITE`-guarded create/list/revoke under
  `/v1/agencies/:agencyCode/member-invitations` plus token-only inspect/accept
  under `/v1/member-invitations/:token`; 256-bit token delivered out-of-band
  (delivery provider abstracted, NOT wired to email — `MEMBER_INVITE_DELIVERY`
  defaults to `none`, `dev` refuses non-local NODE_ENV); DB stores SHA-256
  tokenHash only; anonymous new-account acceptance with Argon2id password;
  existing-account acceptance requires the matching signed-in account;
  non-enumeration (existing-account invites identical to unknown, no
  `member-candidates`/`POST members`); `AGENCY_MEMBER_INVITATION_*` audit events
  with `targetHash` and metadata never carrying token/tokenHash/password;
  migration `20260919150000_agency_member_invitation` applied (no drift);
  46 unit/HTTP tests + throwaway real-DB smoke (20 points) passed
- Customers vertical slice (IMPLEMENTED, backend + dashboard): see [CUSTOMERS] —
  agency-scoped `customer` model (migration `20260919191328_agency_customers`
  applied, no drift), `AGENCY_CUSTOMER_*`-guarded REST CRUD + one-way archive
  under `/v1/agencies/:agencyCode/customers` with `CUSTOMER_NOT_FOUND` /
  `CUSTOMER_ALREADY_ARCHIVED`, blank→`null` + email normalization,
  `AGENCY_CUSTOMER_*` audit events and Swagger; 20 controller specs (425 total
  backend tests) + a throwaway real-Neon smoke incl. the `customer_status_check`
  CHECK rejection; dashboard list/search/create/edit/archive/details in a
  dedicated EN+AR `customers` namespace with 23 Node `node --test` specs
- Tours vertical slice (IMPLEMENTED, backend + dashboard): see [AGENCY_TOURS] —
  agency-scoped `tour` aggregate + ordered `tour_destination` /
  `tour_itinerary_day` children (migrations `20260920100000_tours_module` and
  `20260920101000_tour_origin` applied, no drift), `AGENCY_TOUR_*`-guarded
  REST CRUD + explicit publish/unpublish + one-way archive under
  `/v1/agencies/:agencyCode/tours`, never auto-publishes, server-side publish
  readiness gate (SCHEDULED publishes only while it holds ≥ 1 OPEN departure —
  Module G; pricing not required until Module H), `TOUR_NOT_FOUND` /
  `TOUR_PUBLISH_READINESS_BLOCKED`
  / `TOUR_PUBLISH_STATE_BLOCKED` / `TOUR_ALREADY_ARCHIVED`, `AGENCY_TOUR_*`
  audit events and Swagger; 25 controller specs; dashboard Trips feature
  rewired to the real API (list/create/editor/:tourCode) with its dev
  in-memory repo removed
- Departures vertical slice (IMPLEMENTED, backend + dashboard): see [AGENCY_DEPARTURES] —
  per-tour `departure` rows (migration `20260920120000_departures_module`
  applied, no drift), `AGENCY_DEPARTURE_*`-guarded REST CRUD + one-way cancel
  under `/v1/agencies/:agencyCode/tours/:tourCode/departures`, always-OPEN on
  create, status OPEN | CLOSED | CANCELLED (zod `.strict()` rejects client
  status/tourId/agencyId), button-checked end/server deadlines, cancel never
  touches `tour.status` and returns `remainingOpenDepartures`,
  `DEPARTURE_NOT_FOUND` / `DEPARTURE_ALREADY_CANCELLED`,
  `AGENCY_DEPARTURE_*` audit events and Swagger; 18 controller specs; dashboard
  Departures & Pricing section now runs a live DeparturesManager
  (list/create/edit/cancel, upper-case status badges, cancel confirmation,
  PUBLISHED-with-no-OPEN warning, readiness fed by the real open count);
  embedded draft `departures` stripped from the Tour form/draft/payload
- Pricing vertical slice (IMPLEMENTED, backend + dashboard): see [AGENCY_PRICING] —
  `pricing_option` + `departure_price` rows (migration
  `20260920130000_pricing_module`), `AGENCY_PRICING_VIEW`/`MANAGE`-guarded
  REST: options CRUD-overview + one-way deactivate under
  `/v1/agencies/:agencyCode/tours/:tourCode/pricing-options`, whole-set price
  replacement under `.../departures/:departureCode/prices`, single forced
  currency per tour (default `DZD`, immutable after first option), zod
  `.strict()` reject of client status/tour/agency refs, `startingPrice` +
  `pricedOpenDepartureCount` derived in the overview, `PRICING_OPTION_*` /
  `PRICING_CURRENCY_MISMATCH` errors, `AGENCY_PRICING_*` + prices audit events
  and Swagger; Tour list/create/get now carry `startingPrice`; publish gate
  still ignores pricing. Dashboard runs a live PricingManager (options
  create/edit/one-way deactivate, starting-price summary), per-departure
  DeparturePricesDialog (whole-set PUT, clear-by-empty), readiness pricing
  item fed by the real overview, and `trips:details.extras.basisLabel`
  repointed after the draft `pricing-options-editor` was deleted

NOT implemented: `GET /health`, api-contract, tenant enforcement beyond the
RBAC/membership guards above, business models beyond
`app_user`/`role`/`permission`/`role_permission`/
`platform_role_assignment`/`agency`/`agency_membership`/invitations/`customer`/
`tour`/`tour_destination`/`tour_itinerary_day`/`departure`/`pricing_option`/
`departure_price`.
The Group 1
backend RBAC slice (canonical scoped permission catalog, default role presets,
PLATFORM Role CRUD, Global Agency Role CRUD, available-permissions, Role↔Permission
API, CASL-backed guard, idempotent seed, Swagger, role ownership schema
foundation) IS implemented and unit/HTTP/live verified.

## [SELECTED_NOT_IMPLEMENTED]

Major approved architecture awaiting implementation (concise):

- HTTP foundation: version-neutral `GET /health`
- API contract foundation: OpenAPI/Swagger drift-verified contract,
  `packages/api-contract/`, generated TypeScript contract
- First business vertical slice beyond auth (separate planning task)
- Identity + RBAC application layer (Group 2+): User↔Platform-Role management
  endpoints, Agency model, custom agency roles and AGENCY-scoped role
  assignments, refresh-token/system session store (auth today is stateless
  JWT-in-cookie)
- Architecture decision: `platform_admin` table NOT USED — platform
  administration is modeled through unified `app_user` → role → permission

## [ORPHANS_AND_PENDING]

Genuinely unresolved only:

- Neon dev database connected; project region / Postgres major not yet recorded
- Protected session/auth implementation details (first protected endpoint)
- CORS allowlist (when frontend network integration begins)
- Deployment readiness endpoint (`/ready`) if deployment requires it
- Production observability stack
- api-contract consumption mechanism if existing repo tooling forces a decision
- Breaking-change CI tooling (oasdiff-style) when `/v1` has deployed consumers

Resolved decisions are NOT re-opened here.

## [DO_NOT_BUILD_YET]

- auth until a protected endpoint is planned
- Redis / queues
- microservices
- CQRS
- GraphQL
- payments
- AI
- speculative infrastructure
- readiness endpoint until deployment requires it
- oasdiff until compatibility enforcement becomes real
- Prisma 8 (needs separate decision)