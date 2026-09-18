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

### Group 1 closure verification (verified reality)

The former M1 baseline checks are now executed and passing:

- build verification (`npm run build`) — passes
- lint verification (`npm run lint`) — passes with 3 pre-existing
  `no-unused-vars` warnings in the agency-applications module
- unit/HTTP tests (`npm test`) — 252 tests pass (14 files)
- e2e verification (`npm run test:e2e`) — 2 tests pass against the
  `configureApp`-configured app (versioned `GET /v1` serves, unversioned `/`
  is 404)
- seed idempotency — `npx prisma db seed` run twice, both succeed
- migration status — `npx prisma migrate status` reports "Database schema is
  up to date!" (11 migrations); `prisma migrate diff` schema vs database
  reports "No difference detected."
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
  `20260917100000_add_app_user_status`.
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
agency CASL / agency-scoped request authorization, member management (invite,
add, remove, suspend employee, change membershipType), transfer ownership,
customer model and customer counts.

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
  - `POST /v1/auth/register` — Zod/Standard-Schema validated
    (`z.email()`, password 8–72), argon2id-hashed via service, `app_user.code`
    generated as `USR-<12 uppercase hex>` (project `USR-…` convention, fits
    `VARCHAR(24)`); client-supplied `code`/`id`/`passwordHash` are never
    accepted (Zod object strips unknown fields); duplicate CITEXT email →
    409 `EMAIL_ALREADY_REGISTERED` (Prisma P2002 handled via
    `Prisma.PrismaClientKnownRequestError`); returns the safe user only.
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
  `configureApp` (`src/setup-app.ts`) + per-parameter schemas
  (`@Body({ schema })`) for `/v1/auth/register` and `/v1/auth/login`
  (`src/auth/schemas.ts`). Unknown body fields are stripped by the Zod
  objects (client-supplied `code`/`id`/`passwordHash` can never reach
  persistence).

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
  (Passport Local + JWT-in-cookie), `/v1/auth/{register,login,logout,me}`,
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

NOT implemented: `GET /health`, api-contract, Agency model, tenant enforcement,
custom agency roles and
agency-side role assignments (the `agency` table, and therefore the
`role.agency_id` foreign key, do not exist yet), business models beyond
`app_user`/`role`/`permission`/`role_permission`/
`platform_role_assignment`. The Group 1 backend RBAC slice (canonical scoped
permission catalog, default role presets, PLATFORM Role CRUD, Global Agency
Role CRUD, available-permissions, Role↔Permission API, CASL-backed guard,
idempotent seed, Swagger, role ownership schema foundation) IS implemented and
unit/HTTP/live verified.

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