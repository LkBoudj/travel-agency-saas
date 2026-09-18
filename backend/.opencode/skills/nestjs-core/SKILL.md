---
name: nestjs-core
description: Compose a NestJS application correctly. Use when organizing feature modules, deciding module boundaries and imports/exports, deciding how controllers and providers are declared and wired into modules, handling dependency injection, choosing provider registration patterns or custom provider tokens (useValue, useClass, useFactory, useExisting), deciding provider or controller scope, sharing providers across modules, resolving injection/module wiring failures, deciding lifecycle hook placement, choosing between forwardRef and ModuleRef for circular dependencies, or deciding whether a dynamic module is needed. Does NOT cover CLI generation (use the nestjs-cli skill), Prisma schema/database design, REST route design, DTOs, validation, pipes, guards, authentication, interceptors, exception filters, testing, Swagger, scheduling, queues, microservices, or GraphQL.
---

# nestjs-core

Decision skill for composing NestJS core constructs (modules, controllers, providers, DI). Architecture and project policy live in backend/AGENTS.md and the root AGENTS.md — this skill adds composition procedure only: **correct module boundaries first → explicit encapsulation → verify the dependency graph**. Detailed reference tables live in `references/core-reference.md`. The `nestjs-cli` skill covers artifact generation; this skill covers wiring those artifacts together.

## Operating principle

Nest composes applications from modules, controllers and providers through a runtime IoC container. Correct composition means: register each provider exactly where it is owned, share through exports/imports rather than re-registration, rely on the default singleton scope, and reach for advanced mechanisms (custom providers, scopes, ModuleRef, dynamic modules) only when a real need exists.

## Workflow

### 1. Read local project guidance first

Before composing anything:

- read `backend/AGENTS.md` (architecture: NestJS/Prisma/PostgreSQL/Neon, REST `/v1`, feature-based modular monolith, no empty modules)
- inspect PROJECT_MAP.md for the current backend state
- when a Nest app exists, read its `package.json` and inspect nearby modules to learn current path and naming conventions

Do not assume module structure from memory.

### 2. Feature modules are the default

Group a closely related capability set into one feature module: controller + its service(s) + module declaring them. The root `AppModule` imports feature modules and stays a composition root. Create a module only when a task needs it — never scaffold empty future modules (auth, users, tours, ...) up front.

### 3. Know the module metadata precisely

`@Module()` has four properties, each with a distinct meaning:

- `providers` — providers instantiated by the Nest injector, shared at least across this module
- `controllers` — controllers defined in this module that must be instantiated
- `imports` — modules that export the providers required by this module
- `exports` — the subset of providers that become available to modules importing this module; exports are effectively the module's public API

Never put a provider in `imports`, never export a provider that is not declared (or imported-and-re-exported), and do not register controllers in `providers`.

### 4. Encapsulation first

Modules encapsulate providers by default: a provider is injectable only if it belongs to the current module or is explicitly exported by a module in `imports`. When a provider is missing, check encapsulation before anything else. If a provider from another module is needed, that module must export it and this module must import it.

### 5. Controller boundary

Controllers are instantiated automatically when listed in a module's `controllers`. Keep controllers thin: HTTP transport + input boundary, delegating application work (backend/AGENTS.md). Wiring a controller into the correct feature module is composition; route/DTO/validation design is out of this skill's scope.

### 6. Providers and DI

Mark classes that are managed by the container with `@Injectable()`. Constructor injection is the default mechanism: a constructor parameter's class token signals what the container should inject. Register each provider in the owning module's `providers` array, where the shorthand `providers: [CatsService]` is exactly `{ provide: CatsService, useClass: CatsService }`. Nest builds a transitive dependency graph bottom-up at bootstrap.

### 7. Tokens are runtime values

DI tokens must exist at runtime. TypeScript interfaces and type aliases are erased at compile time and can never be tokens. When a token is needed for a non-class contract, define a string or `Symbol` token and inject it with `@Inject(token)`. Abstract classes exist at runtime and can act as both contract and token. Export the exact `Symbol`/string token instance and reuse it everywhere the provider is registered and injected to avoid collisions.

### 8. Custom providers only when standard ones do not fit

Standard class registration covers most needs. Reach for a custom provider only for a concrete need:

- `useValue` — inject a constant, an external library instance, or a mock
- `useClass` — resolve a token to a different implementation than the class itself
- `useFactory` — build the provider value dynamically; `inject` lists dependencies passed to the factory; entries may be marked `{ token, optional: true }`
- `useExisting` — alias an existing provider so two tokens share one instance

Export custom providers by token or by the full provider object so other modules can consume them.

### 9. Provider ownership: one module per provider

Every provider is owned by exactly one module. To use it elsewhere, import the owning module and consume the exported provider. If a consuming module re-registers a provider itself, Nest creates a separate instance — duplicated state, extra memory, and inconsistencies. Decide ownership first; wire via exports/imports second.

### 10. Default singleton scope

Singleton (`DEFAULT`) is the default and correct choice for almost everything: one instance shared application-wide, cached after bootstrap, initialized once. Do not declare it explicitly. Reserve scope changes for a demonstrated need.

### 11. Request scope is the exception

Use `Scope.REQUEST` only for genuine per-request state (request tracking, per-request caching, multi-tenancy). REQUEST bubbles up the injection chain: any provider depending on a request-scoped provider — and any controller depending on it — becomes request-scoped and is recreated per request. `TRANSIENT` does not bubble (each consumer gets its own instance). Request scope costs performance; keep your design so only the providers that truly need it are request-scoped. Do not use request-scoped providers for WebSocket gateways, Passport strategies, or cron controllers.

### 12. Global modules sparingly

`@Global()` makes a module's exports available everywhere without imports. Register any global module only once (root/core). Making everything global is an anti-pattern: prefer explicit imports so the module graph stays legible and coupling stays visible.

### 13. Shared modules via exports, not re-registration

Every module is a shared module: importing a module's exports gives the same instance to every importer. Sharing is done by exporting from the owner and importing in the consumer — never by duplicating the provider in multiple `providers` arrays (see section 9).

### 14. Circular dependencies are a symptom to minimize

Avoid cycles between modules/providers where possible; a cycle usually signals a boundary that can be redrawn. When a cycle is unavoidable, two official mechanisms exist: `forwardRef()` for one/both sides (`@Inject(forwardRef(() => X))` for providers, `imports: [forwardRef(() => XModule)]` between modules), or `ModuleRef` on one side. Never import module/provider classes through barrel (`index.ts`) files — barrels trigger false circular dependencies. Instantiation order in a cycle is indeterminate, and request-scoped providers inside cycles can surface undefined dependencies; keep cycles as a last resort.

### 15. ModuleRef is an escape hatch, not the default

Inject `ModuleRef` (from `@nestjs/core`) only when constructor DI cannot express the need:

- `get(token)` — retrieve an already-instantiated registered provider (current module; pass `{ strict: false }` for the global context); cannot retrieve scoped providers
- `resolve(token)` — create a scoped provider instance from a fresh DI sub-tree (each call has its own context; share a context id via `ContextIdFactory.create()`/`getByRequest(request)` when one instance is wanted)
- `create(Class)` — instantiate an unregistered class dynamically

Prefer ordinary constructor injection; reach for ModuleRef only for dynamic/scoped resolution.

### 16. Dynamic modules only for configurable-at-import behavior

Use a dynamic module when a consuming module must supply configuration at import time (a `DynamicModule` return with a required `module` property; its properties extend — do not override — the base `@Module()` metadata). Follow the naming conventions: `register` (per-consumer config), `forRoot` (global single config), `forFeature` (per-module tweaks), with their `...Async` counterparts. Do not turn ordinary monolith feature modules into dynamic modules. `ConfigurableModuleBuilder` reduces boilerplate for highly configurable modules — advanced; only when the pattern is actually needed.

### 17. Lifecycle hooks for real resources, not ceremony

Implement lifecycle interfaces from `@nestjs/common` when a resource needs setup/teardown: `onModuleInit` (after dependencies resolve), `onApplicationBootstrap` (after all modules initialize, before listening), `onModuleDestroy` / `beforeApplicationShutdown` / `onApplicationShutdown` (termination). Async hooks can await and defer startup/shutdown. Init hooks fire only when `app.init()` or `app.listen()` is called. Shutdown hooks fire only via `app.close()` or a system signal when `app.enableShutdownHooks()` was called — shutdown listeners are opt-in by design. Lifecycle hooks are not triggered for request-scoped classes. Do not use hooks for cosmetic startup logging.

### 18. Bootstrap boundary

`bootstrap()` in `main.ts` calls `NestFactory.create(AppModule)` and `app.listen(...)`; create only the root module there. The root module is the composition root that imports feature modules. Call `app.enableShutdownHooks()` when graceful shutdown is required. Global/REST/versioning configuration belongs to the nestjs-rest skill, not this one.

### 19. Do not bypass the container

Let the container instantiate and manage lifecycle. Do not hand-construct providers with `new Service()` where DI should provide them, and do not build ad-hoc service locators/global registries to replace DI. When constructor DI cannot express a need, prefer official mechanisms (factory providers, forwardRef, ModuleRef) over custom IoC workarounds.

### 20. Do not over-abstract

Do not add repository interfaces, extra provider layers, or generic factories purely for pattern-completeness. Repositories are NOT mandatory (backend/AGENTS.md). Compose the smallest coherent wiring the feature needs; add abstraction only when real reuse or complexity justifies it.

### 21. No speculative "core" scaffolding

Do not pre-build a `core/`, `common/`, or `shared/` folder with speculative global providers (database, logging, config, cache) before a feature needs them. Introduce shared/global providers only when more than one feature genuinely requires the same service.

### 22. Relationship with nestjs-cli

`nestjs-cli` answers **how to create/generate** Nest artifacts (`nest g module/controller/service` and the rest). This skill answers **how to compose** those artifacts correctly: where they belong, how they are wired, and how the module graph stays valid. Use the CLI to generate, then this skill's rules to wire and verify. Generation alone never proves the module graph is correct.

### 23. Relationship with Prisma

Persistence is accessed through a provider (e.g. a feature service) that injects the Prisma client like any dependency. Prisma schema, models, migrations and client generation belong to the Prisma workflow/skill, and DTOs are API transport contracts — never conflate them with Nest provider wiring. Keep Prisma access behind the feature's service boundary; controllers must not touch Prisma directly.

### 24. Verify the dependency graph

Before considering composition work done:

- trace each module graph: is every dependency provided (local, imported-exported, or legitimately global)?
- confirm exports/imports match what consumers actually inject
- confirm no unintended circular dependency was introduced
- confirm token identities match between registration and injection (identical `Symbol`/string instances)
- then run the backend's actual verification scripts — inspect `backend/package.json`, never invent script names

A graph that compiles can still fail at runtime when tokens or encapsulation are wrong — the graph is the source of truth.

## Boundaries

This skill answers only: **how should NestJS core constructs be composed correctly?** It does NOT teach the official CLI, Prisma, PostgreSQL/Neon, REST route design, DTOs, validation, pipes, guards, authentication/authorization, interceptors, exception filters, testing, Swagger, scheduling, queues, CQRS, microservices, or GraphQL — those belong to separate skills. Detailed current official reference tables live in `references/core-reference.md`; consult it and verify claims against the installed Nest version before relying on them.