---
name: nestjs-cli
description: Use the official NestJS CLI and generators (nest new, nest generate/g) safely for this backend. Use when creating a new NestJS application, generating or adding Nest modules, controllers, services, providers, guards, pipes, interceptors, middleware, filters, decorators, gateways, classes, interfaces, or a CRUD resource, or when deciding which official Nest schematic fits a requested artifact or whether an artifact even has an official Nest generator. Does NOT cover Prisma schema design, backend architecture, authentication, REST design, testing strategy, scheduling, or queues.
---

# nestjs-cli

Procedural skill for the official NestJS CLI. Architecture and project policy live in `backend/AGENTS.md` and the root `AGENTS.md` — this skill adds the CLI procedure only: **official Nest generator first → inspect generated output → adapt to project architecture**. Detailed command/schematic tables are in `references/cli-reference.md`.

## Operating principle

Do not manually recreate framework-owned boilerplate when Nest provides an appropriate official schematic (`nest new` / `nest generate`). Official tooling wins over hand-rolled equivalents. Verify flags against the installed CLI before relying on them; never guess unsupported options.

## Workflow

### 1. Read local project guidance first

Before generating anything:

- read `backend/AGENTS.md`
- check whether a Nest application already exists in `backend/`
- read `package.json` when it exists
- inspect nearby modules to learn current path and naming conventions

Do not assume structure from memory.

### 2. Determine context

Classify the task before choosing a command:

- **A. Brand-new Nest application** — use the `nest new` scaffold (Section 5).
- **B. Artifact inside an existing Nest app** — use the smallest matching generator schematic (Section 6).

### 3. Verify CLI/runtime compatibility

- Inspect the Node.js version.
- When a project exists, inspect the installed Nest CLI/package versions and use official Nest documentation matching that version.
- When no project exists yet, consult the current official Nest CLI documentation and use the current official bootstrap mechanism.

Do not silently upgrade an existing Nest project. Do not run `nest upgrade` unless explicitly requested.

### 4. Prefer project-local tooling for existing apps

When a Nest project already exists, prefer its installed Nest CLI/toolchain over an arbitrary stale globally-installed CLI. Verify commands/options with CLI help when uncertain, e.g. `nest <command> --help`, or the project-local equivalent. Do not guess unsupported flags.

### 5. New Nest application

Only when the user explicitly requests a new application and none exists: use the official `nest new` scaffold. Never manually create equivalent framework-owned files (`package.json`, `nest-cli.json`, tsconfig files, `src/main.ts`, `src/app.module.ts`, starting tests, etc.) — those must originate from the official scaffold.

For this repository, the intended scaffold characteristics are:

- TypeScript
- npm package manager
- strict TypeScript
- no nested Git repository

Verify current `nest new --help` options before execution instead of assuming remembered flags. `nest new` may prompt for the module system (ESM vs CommonJS) and package manager; if the CLI surfaces an architectural choice that `backend/AGENTS.md` or `PROJECT_MAP.md` does not define, do not invent the decision — surface it to the user.

### 6. Generator selection — smallest matching schematic

For an existing Nest application, choose the SMALLEST official schematic that matches the requested artifact:

| Request                      | Schematic |
| ---------------------------- | --------- |
| module                       | module    |
| controller                   | controller |
| service                      | service   |
| provider                     | provider  |
| guard                        | guard     |
| pipe                         | pipe      |
| interceptor                  | interceptor |
| middleware                   | middleware |
| filter                       | filter    |
| decorator                    | decorator |
| gateway                      | gateway   |
| class                        | class     |
| interface                    | interface |
| full CRUD resource           | resource — only after confirming full CRUD generation is genuinely appropriate |

Never generate a broader structure than the feature requires.

### 7. Resource generator is NOT the default

`nest generate resource` generates broad CRUD boilerplate (module + controller + service + entity + DTOs + spec files, and create/update/delete endpoints). Do NOT use it merely because a feature has a noun (Tour, Agency, Booking, Customer). Use `resource` only when the work genuinely calls for the full CRUD resource shape. For focused features — list published tours, get one public tour, calculate availability — prefer the smallest module/controller/service generators and do not generate create/update/delete endpoints that were not requested.

### 8. Prisma boundary

This repository uses Prisma for persistence.

- A request for a DATABASE MODEL is NOT automatically a Nest class/entity generation task.
- Do not invent `nest generate model`, TypeORM-style entity generation, or persistence entity files merely because a database model is requested.
- Database schema/model work belongs to the Prisma workflow/skill.
- DTOs (transport contracts), Nest classes, and Prisma models (persistence contracts) are separate concepts.
- `nest generate resource` may produce an entity-style file as part of its generic boilerplate — do not treat that generated file automatically as the Prisma persistence model.

### 9. Unsupported concepts

Never invent Nest CLI commands. If the official schematics list does not contain something (e.g. `job`, `model`, `repository`, `use-case`, `command-handler`, `dto`), do NOT fabricate commands such as `nest g job`, `nest g model`, or `nest g repository`. Instead:

- determine whether another official schematic fits,
- determine whether the artifact is plain application code,
- or defer to the relevant specialized skill.

### 10. Scheduled jobs / queues

This skill does NOT decide scheduling or queue architecture. If the user asks for a "job", first determine what "job" means — it may be a scheduled task, a queue worker, a background process, or a plain provider/service. Do not install scheduling/queue infrastructure, do not invent a `job` schematic, and use future specialized Nest skills when those technologies are actually introduced.

### 11. Nest monorepo commands

The repository being a monorepo does NOT automatically mean the backend uses Nest workspace/monorepo mode. Do not use `nest generate app`, `nest generate library`, or convert a standard Nest application into Nest monorepo mode unless the task explicitly requires that architectural change. Consult the official Workspaces documentation before any such change.

### 12. Tests generated by schematics

Respect official schematic defaults. Do not routinely disable spec generation with `--no-spec`. Only disable generated tests when backend project policy explicitly requires it, an existing project convention demonstrates it, or the user explicitly requests it. Do not delete generated tests merely to make a task smaller.

### 13. Use dry-run when risk is meaningful

Prefer `--dry-run` before execution when generation may touch several files, register modules automatically, create a resource, affect a surprising path, convert project/workspace structure, or overwrite/conflict with existing files. For a simple, well-understood generator operation in an established module, a dry-run is optional. Do not turn every trivial generator into a repetitive dry-run ritual.

### 14. Generate → inspect → adapt

After running an official generator:

1. inspect every generated/modified file relevant to the operation
2. verify its location
3. verify module registration/import changes
4. verify naming
5. identify generic boilerplate that does not fit project architecture
6. make the minimum justified adaptation

Do not blindly accept generated boilerplate. Do not rewrite the entire generated structure unnecessarily.

### 15. Never overwrite user work casually

Before generating into an existing path, inspect the target. If generated files would collide with existing implementation: do not force overwrite; stop and inspect; choose a safe generation strategy. Do not remove existing user code merely to allow a schematic to run.

### 16. Verification

After generation:

- inspect the resulting diff
- verify unexpected files were not created
- once they exist, use the backend's actual verification scripts — do not invent script names (see `backend/AGENTS.md`)

For CLI-only work, a successful generation is not sufficient evidence by itself — the resulting Nest module graph and TypeScript code must remain valid.

## Boundaries

This skill answers only: **how should OpenCode use the official Nest CLI and generators safely?** It does NOT teach modules architecture, DI patterns, controller implementation, DTO validation, exception handling, API versioning, auth/authorization, Prisma, migrations, Neon, testing strategy, Swagger, scheduling, queues, CQRS, microservices, or GraphQL — those belong to separate skills. Detailed official CLI tables live in `references/cli-reference.md`; consult it, then verify against the installed CLI.