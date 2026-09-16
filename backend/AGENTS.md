# AGENTS.md — Backend

Repo-wide policy lives in the root `AGENTS.md` and is authoritative in every
session. This file is the backend-local delta only: it applies to `backend/`,
adds nothing that belongs in the root policy, and does not repeat it.

## 1. Scope

- Applies to `backend/` only. Root `AGENTS.md` governs Git safety, dependency
  policy, inspect-before-edit, no-fabricated-behavior, verification, and skills.
- Current status: `backend/` contains only OpenCode configuration. The NestJS
  application has NOT been scaffolded; no `src/`, `prisma/`, or `package.json`
  exists.

## 2. Selected Backend Architecture

Agreed decisions (see PROJECT_MAP — do not drift):

- Framework: NestJS (TypeScript)
- ORM: Prisma
- Database: PostgreSQL
- Hosted PostgreSQL: Neon
- API style: REST under `/v1`
- Application shape: feature-based modular monolith

No installed versions are authoritative yet — there is no `backend/package.json`.

## 3. Official Tooling / Generator Ownership

Backend specialization of the root "official tooling first" rule: framework-
owned boilerplate comes from the framework's official CLI/generator when a
suitable one exists.

- new NestJS applications → official Nest CLI
- NestJS framework artifacts → official Nest schematics/generators
- database schema, migrations, client generation → Prisma tooling
- Neon infrastructure operations → official Neon tooling when applicable

Workflow: Generate → inspect → adapt. This file only establishes the invariant;
exact CLI commands, generator choices, and version-specific behavior live in
skills. Do not manually recreate generator-owned boilerplate unless no
appropriate generator exists, running it would damage existing work, or
repository policy prevents it.

## 4. Version and Documentation Discipline

Order of authority:

```text
installed package version
→ matching official vendor documentation
→ implementation
```

Once `backend/package.json` exists it is the version source of truth. Never
upgrade NestJS, Prisma, Node, or other backend dependencies merely because a
newer version exists; never apply "latest" patterns that conflict with the
installed version; before the backend exists, never fabricate versions.

## 5. Backend Responsibility Boundaries

Default split — no overengineering:

- Controller: HTTP transport + input/DTO boundary; delegates application work;
  no business logic.
- Service/provider: application/business orchestration; domain rules;
  transactions where appropriate.
- Prisma: persistence / PostgreSQL access.
- Repositories: NOT mandatory; introduce only when query complexity, reuse, or a
  real abstraction justifies them.

Do not enforce repository interfaces or extra layers by default. Do not put
Prisma queries directly in controllers. Keep modules feature-oriented.

## 6. Multi-Tenancy Invariant

Tenant = Agency. The backend owns tenant authorization and isolation.

- Never trust a client-supplied `agencyId` as proof of authorization.
- Agency-owned reads/writes must be scoped using trusted server-side tenant
  context whenever that context exists.
- Public endpoints expose only intentionally public/published data.
- Do not simulate tenant security through frontend-driven conventions.
- Do not invent the final authentication implementation before its feature is
  designed.

## 7. NestJS / Prisma Boundary

Framework constructs and PostgreSQL persistence are different concerns.

- A "database model" belongs to Prisma/database schema tooling, not arbitrary
  Nest entity files.
- Do not generate TypeORM-style entities; this project uses Prisma.
- DTOs are API transport contracts; Prisma models are persistence contracts.
  They are not interchangeable.
- Exact Prisma procedures come from the official Prisma skill matching the
  installed version.

## 8. Skills Policy

Backend-specific procedural knowledge becomes small focused skills instead of
growing this file. Before framework-specific work, load the relevant skill when
one exists. Planned backend skill families: `nestjs-cli`, `nestjs-core`,
`nestjs-rest`, `nestjs-testing`. Prisma and Neon prefer vendor-maintained
official skills when available and compatible. None of these exists yet.
Future backend-local skills may live under this directory's OpenCode-
discoverable skill directories.

## 9. Architecture Restraint

Default backend is a modular monolith. Do not introduce without an explicit
feature requirement: microservices, CQRS, event sourcing, Redis, queues, Kafka,
GraphQL, generic repository frameworks, background-job infrastructure, plugin
systems. Do not build infrastructure speculatively.

## 10. Backend Change Shape

Prefer vertical slices; a feature grows through the smallest coherent path:

```text
database/data need
→ Nest module boundary
→ endpoint/application behavior
→ verification
```

Do not scaffold every future module at once or create empty modules (auth,
users, agencies, tours, bookings, payments, ...) before a task needs them.

## 11. Verification Delta

Only the backend-specific addition to root verification rules: after the Nest
app exists, inspect `backend/package.json` and run only the scripts that
actually exist there. Never assume script names before `package.json` exists.

## 12. Backend Architecture State

`backend_PROJECT_MAP.md` is the backend-local source of truth for what is
SELECTED, IMPLEMENTED, and PENDING.

- Before planning or implementing backend work, read the relevant sections.
- Update it only when verified backend architecture/state meaningfully changes.
- Never record planned work as IMPLEMENTED.