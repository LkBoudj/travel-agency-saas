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
- Current phase = Group 1 complete (Identity + RBAC database foundation via
  Prisma migrations) on top of M2. M1 baseline checks remain intentionally
  skipped (see below).

### M1 baseline checks — intentionally skipped (project decision)

The following M1 baseline checks were NOT executed and are NOT considered
verified or passed:

- build verification (`npm run build`)
- lint verification (`npm run lint`)
- unit-test verification (`npm test`)
- e2e verification (`npm run test:e2e`)
- runtime boot / HTTP verification

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
- Operational `GET /health` is version-neutral and liveness-only.
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
  actual `PrismaService` (M2-E). No business schema, migrations, or seed.

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
  `20260916103945_refine_rbac_identifiers`, `20260916104751_role_scope_name_unique`.
  Customized migration history:
  manually adds `CREATE EXTENSION IF NOT EXISTS citext;` and the
  `role_scope_check` CHECK constraint (`scope IN ('PLATFORM','AGENCY')`);
  `role` additionally constrained by unique `(scope, name)`
  (`role_scope_name_key`), so a role name is allowed once per scope;
  no `postgresqlExtensions` preview feature or `extensions` datasource field.
  Uses `BIGSERIAL` for BIGINT autoincrement PKs (Prisma's supported
  PostgreSQL autoincrement mapping).
- Migrations: `prisma/migrations/` existing; migration order authoritative.
- No seed; no models beyond Group 1.

## [IDENTITY_AND_RBAC]

IMPLEMENTED (Group 1) — database foundation:

- Unified identity + RBAC database foundation on PostgreSQL (Neon dev).
- One user identity: `app_user` (id BIGINT identity, code VARCHAR(24) unique
  user-facing identifier, email CITEXT unique login identifier, password_hash
  VARCHAR(255), optional first_name/last_name, timestamptz created_at/
  updated_at). No separate `platform_admin`/agency-owner/staff identity tables.
- `app_user` is intentionally NOT yet connected to roles (no `user_role`).
- Unified RBAC: `role` (id, name, scope VARCHAR(16),
  unique `(scope, name)` so each role name is allowed once per scope,
  description, timestamptz created_at/updated_at), `permission` (id,
  key VARCHAR(64) unique technical authorization identity, name,
  description, created_at — no updated_at),
  `role_permission` (composite PK role_id+permission_id, permission_id index,
  FKs ON DELETE CASCADE). No `user_permission`/overrides. No `code` business
  keys on `role`/`permission`; `permission.key` is a technical authorization
  key, not a business identifier.
- Role scope: `PLATFORM` | `AGENCY`, enforced in DB by `role_scope_check`
  CHECK constraint (verified by name in DB; no PostgreSQL ENUM).
- Case-insensitive email identity via PostgreSQL `citext` extension
  (`app_user.email CITEXT UNIQUE`); activation versioned in the migration.
- No business roles/permissions/catalog seeded (seed deferred).

## [TENANCY]

- Tenant = Agency; shared PostgreSQL; backend-enforced isolation.
- Client-supplied `agencyId` is never authorization proof; agency-owned data is
  scoped with trusted server-side tenant context whenever that context exists.
- Public APIs expose only deliberate, published data.
- No authentication implementation is invented at foundation.

## [VALIDATION]

- Zod 4 + Standard Schema (`StandardSchemaValidationPipe` where appropriate;
  Standard-Schema response serialization where appropriate).
- Pipes/interceptors are NOT implemented yet.

## [ERROR_CONTRACT]

- Selected minimal policy: `{ statusCode, message, errorCode }`; structured
  validation details only when genuinely needed.
- Never expose: stack traces, database errors, SQL, secrets, internal
  implementation details.
- Concrete reusable runtime error machinery deferred until a real business
  endpoint needs it.

## [LOGGING]

- Nest built-in Logger selected for foundation.
- No pino during foundation.
- Production observability stack (structured JSON, redaction, centralized
  collection, correlation/request IDs) remains pending.

## [TESTING]

- Use the test tooling produced by the actual Nest scaffold: Vitest (ESM runner)
  + oxlint, with `@nestjs/testing` in the dev baseline. Baseline test/lint/build
  runs were intentionally skipped at M1 by project decision — not verified yet.
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
  - real Neon verification: tables, constraints, unique indexes, case-insensitive
    email behavior, invalid scope rejection, duplicate `permission.key` rejection,
    duplicate `(scope, name)` role rejection, same name in different scope allowed,
    `code` removal, scope constraint name (`role_scope_check` confirmed)

Identifier convention (final): business entities may carry a user-facing
`code` when justified (`app_user.code`, e.g. USR-…); RBAC `role` has no
business code (internal `id`, display `name`, `scope` context); `permission`
uses a stable technical authorization `key` (e.g. AGENCY_APPROVE), NOT a
business code.

NOT implemented: URI versioning `/v1`, `GET /health`, OpenAPI/Swagger,
api-contract, business modules, tenant enforcement, auth, seed, business
models beyond `app_user`/`role`/`permission`/`role_permission`. M1 baseline
checks were intentionally skipped by project decision (see [STATUS]) and are
NOT marked verified.

## [SELECTED_NOT_IMPLEMENTED]

Major approved architecture awaiting implementation (concise):

- HTTP foundation: URI versioning `/v1`, version-neutral `GET /health`
- API contract foundation: OpenAPI generation, `packages/api-contract/`,
  generated TypeScript contract, deterministic drift detection
- First business vertical slice (separate planning task)
- Identity + RBAC application layer: `user_role` assignment table (awaits
  `agency` FK), Agency model, PLATFORM/AGENCY role assignments, CASL
  integration, Nest authorization guards, login/registration endpoints,
  password hashing implementation, sessions/JWT, role seed catalog,
  permission seed catalog
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