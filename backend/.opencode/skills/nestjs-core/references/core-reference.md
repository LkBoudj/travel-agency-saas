# NestJS Core Composition Reference

Concise reference for composing NestJS core constructs (modules, controllers, providers, DI, scopes, lifecycle) derived from CURRENT official NestJS documentation. Values/behaviors here were verified against the official docs at the time this reference was written; re-verify against the installed Nest version (`nest info`, `package.json`) before relying on them.

## Table of contents

- [Official sources](#official-sources)
- [Root and feature modules](#root-and-feature-modules)
- [Module metadata](#module-metadata)
- [Dependency injection](#dependency-injection)
- [Custom providers decision table](#custom-providers-decision-table)
- [Non-class-based provider tokens](#non-class-based-provider-tokens)
- [Injection scopes](#injection-scopes)
- [Global modules](#global-modules)
- [Circular dependencies](#circular-dependencies)
- [ModuleRef](#moduleref)
- [Dynamic modules](#dynamic-modules)
- [Lifecycle](#lifecycle)
- [Bootstrap](#bootstrap)

## Official sources

- <https://docs.nestjs.com/modules>
- <https://docs.nestjs.com/providers>
- <https://docs.nestjs.com/fundamentals/custom-providers>
- <https://docs.nestjs.com/fundamentals/provider-scopes>
- <https://docs.nestjs.com/fundamentals/circular-dependency>
- <https://docs.nestjs.com/fundamentals/module-ref>
- <https://docs.nestjs.com/fundamentals/dynamic-modules>
- <https://docs.nestjs.com/fundamentals/lifecycle-events>
- <https://docs.nestjs.com/first-steps>
- NestJS brand docs portal: <https://docs.nestjs.com/llms.txt> (machine-readable chapter index)

## Root and feature modules

Every Nest application has at least one module — the **root module** (`AppModule`) — which Nest uses as the starting point to build the application graph. The root module is a composition root: it imports feature modules rather than declaring all providers itself.

Feature modules group code relevant to one domain/feature (controller + service + module) into a directory. This is the recommended organization for most applications and aligns with SOLID, and with this repository's feature-based modular monolith (backend/AGENTS.md).

Module loading: when the app bootstraps, Nest instantiates modules transitively — a module's `imports` are instantiated (and their own imports resolved) in dependency order, bottom-up.

## Module metadata

`@Module()` takes a single object with four properties:

| Property      | Meaning |
| ------------- | ------- |
| `providers`   | providers instantiated by the Nest injector, shared at least across this module |
| `controllers` | controllers defined in this module that have to be instantiated |
| `imports`     | modules that export the providers required by this module |
| `exports`     | subset of `providers` (or re-exported imported modules) available to modules that import this module; effectively the module's public API |

Key rules:

- Modules **encapsulate providers by default**: you can only inject providers from the current module or explicitly exported by imported modules.
- `providers: [CatsService]` is shorthand for `providers: [{ provide: CatsService, useClass: CatsService }]`.
- Every module is automatically a **shared module** (a singleton): all modules that import the same module share the same provider instances.
- A module that **re-registers a provider directly** instead of importing the owning module gets a **separate instance** — duplicated state, extra memory, potential inconsistency.
- Modules can re-export modules they import: `imports: [CommonModule], exports: [CommonModule]`.
- A module class itself can inject providers (for example, configuration) via constructor injection, but module classes cannot be injected as providers.

## Dependency injection

- `@Injectable()` marks a class as manageable by the Nest IoC container.
- Constructor injection is the standard mechanism: `constructor(private catsService: CatsService) {}`.
- Nest builds the dependency graph **transitively** during bootstrap, resolving dependencies bottom-up.
- If dependency resolution is hard to debug, set `NEST_DEBUG` to get extra resolution logs during startup.

## Custom providers decision table

| Form         | Token                     | When to use | Notes |
| ------------ | ------------------------- | ----------- | ----- |
| `useValue`   | any token                 | inject a constant, external library instance, or a mock object | value must satisfy the interface (TypeScript structural typing allows literals) |
| `useClass`   | class token               | resolve a token to a different implementation (e.g. env-based `ConfigService`) | behaves like an override of the default implementation |
| `useFactory` | any token                 | build the provider value dynamically | `inject: [...]` dependencies are passed to the factory in order; entries may be `{ token, optional: true }` |
| `useExisting`| any token                 | alias an existing provider so two tokens resolve to the same instance | with singletons, both tokens share one instance |

- Custom providers are scoped to their declaring module and must be exported to be visible elsewhere: export by token (`exports: ['CONNECTION']`) or by the full provider object.
- Providers are not limited to services — a provider can supply **any value** (e.g. a config object).

## Non-class-based provider tokens

- TS interfaces and type aliases are erased at compile time and therefore can never be DI tokens.
- String and `Symbol` tokens exist at runtime; inject them with `@Inject(token)`.
- `Symbol` tokens are preferred for libraries/larger apps: each symbol has a unique runtime identity, avoiding string collisions; export the same symbol instance wherever it is registered and injected.
- Abstract classes **do** exist at runtime and can serve as both TypeScript contract and DI token, enabling plain constructor injection without `@Inject()`.
- Best practice: define string/Symbol tokens in a dedicated file (e.g. `constants.ts`) rather than inline literals.

## Injection scopes

| Scope         | Behavior |
| ------------- | -------- |
| `DEFAULT`     | single instance shared application-wide; the default; tie lifetime to application lifecycle |
| `REQUEST`     | new instance per incoming request; garbage-collected after the request completes |
| `TRANSIENT`   | not shared; every consumer gets a new dedicated instance |

Declaration:

- Provider: `@Injectable({ scope: Scope.REQUEST })`
- Custom provider: `{ provide: ..., useClass: ..., scope: Scope.TRANSIENT }`
- Controller: `@Controller({ path: 'cats', scope: Scope.REQUEST })`

Scope rules:

- `REQUEST` **bubbles up the injection chain**: a controller depending on a request-scoped provider becomes request-scoped itself.
- `TRANSIENT` does **not** bubble: a singleton injecting a transient gets a fresh instance but stays singleton.
- The `REQUEST` provider is inherently request-scoped; providers depending on it become request-scoped automatically.
- Running with request-scoped providers slows each request; a well-designed use should not exceed roughly 5% latency impact.
- Constraint: WebSocket gateways, Passport strategies, and cron controllers must not use request-scoped providers (they must act as singletons).
- The `INQUIRER` token (from `@nestjs/core`) can be injected to learn the class that constructed a provider.
- Advanced: `durable: true` + `Scope.REQUEST` with a `ContextIdStrategy` lets a multi-tenant app reuse DI sub-trees per tenant instead of recreating them per request (do not attempt without an explicit context-driven need).

## Global modules

- A module becomes global with `@Global()`; its exports then are available everywhere without importing the module.
- Global modules should be registered **only once**, generally by the root/core module.
- Making everything global is discouraged: prefer explicit `imports` so the module graph remains controlled and legible.

## Circular dependencies

- A circular dependency is when class A needs B and B needs A (between providers or between modules).
- Avoid cycles where possible; when unavoidable, two official mechanisms:
  - `forwardRef()`: `@Inject(forwardRef(() => CommonService))` on provider dependencies, and `imports: [forwardRef(() => XModule)]` between modules (both sides).
  - `ModuleRef` on one side of the relationship as an alternative.
- Barrel files (`index.ts`) cause false circular dependencies when module/provider classes import through them — do not use barrels when importing module/provider classes in the same directory.
- Instantiation order inside a cycle is indeterminate; do not depend on which constructor runs first, and avoid `Scope.REQUEST` providers inside cycles (can produce undefined dependencies).

## ModuleRef

Injectable `ModuleRef` (from `@nestjs/core`) is an escape hatch for non-standard resolution:

- `moduleRef.get(token)` returns an already-instantiated provider registered in the current module; throws if not found. Add `{ strict: false }` to search the global context. `get()` **cannot** retrieve scoped (transient/request-scoped) providers.
- `moduleRef.resolve(token)` resolves a scoped provider from a fresh DI sub-tree; each call returns a distinct instance, each sub-tree has a unique context id. Pass a shared context id (`ContextIdFactory.create()`) to make repeated calls return the same instance, or `ContextIdFactory.getByRequest(request)` to resolve within the current request's sub-tree.
- `moduleRef.create(Class)` dynamically instantiates a class that was **not** registered as a provider.
- `ModuleRef` is not a replacement for constructor DI; prefer constructor injection and only reach for ModuleRef when DI cannot express the need.

## Dynamic modules

- A dynamic module returns a `DynamicModule` from a static method (convention: `register`, `forRoot`, `forFeature`) called from a consumer's `imports`.
- `DynamicModule` is a normal module descriptor plus a required `module` property equal to the module class; all other properties are optional.
- Dynamic module properties **extend** (not override) the base `@Module()` metadata.
- `global: true` may be set on the returned module to register it globally (discouraged generally).
- Re-exporting a dynamic module: `exports: [DatabaseModule]` (without the method call).
- Naming conventions and meaning: `register` = config per calling module; `forRoot` = single config reused in multiple places (once per app); `forFeature` = per-module configuration building on a `forRoot` config. All have `...Async` counterparts (`registerAsync`, `forRootAsync`, `forFeatureAsync`) that obtain the config via DI.
- `ConfigurableModuleBuilder` (from `@nestjs/common`) generates the `register`/`registerAsync` (or renamed `forRoot`/`forRootAsync` via `setClassMethodName`) methods plus a `MODULE_OPTIONS_TOKEN` provider; supports `useFactory`/`useClass`/`useExisting` config options and `setExtras` for non-options module behavior (e.g. `isGlobal`). Advanced tooling — use when a module genuinely needs a configurable import-time API, not for ordinary feature modules.
- Dependency injection is used to pass runtime options into dynamic providers (typically a `useValue` provider holding the options, consumed via `@Inject(CONFIG_OPTIONS)`).

## Lifecycle

Lifecycle hooks enable acting on key events; interfaces come from `@nestjs/common`:

| Hook | Triggered when |
| ---- | -------------- |
| `onModuleInit()` | host module's dependencies resolved |
| `onApplicationBootstrap()` | all modules initialized, before listening for connections |
| `onModuleDestroy()` | termination signal received (or explicit `app.close()`) |
| `beforeApplicationShutdown()` | after all `onModuleDestroy()` handlers complete, before connections close |
| `onApplicationShutdown()` | after connections close (`app.close()` resolves) |

Rules:

- `onModuleInit` and `onApplicationBootstrap` fire only when `app.init()` or `app.listen()` is called.
- `onModuleDestroy`, `beforeApplicationShutdown`, `onApplicationShutdown` fire only via explicit `app.close()` **or** a system signal (e.g. `SIGTERM`) **and** `app.enableShutdownHooks()` at bootstrap. Shutdown listeners are disabled by default because they consume resources.
- Hooks can be `async` and delay startup/shutdown.
- Lifecycle hooks are **not** triggered for request-scoped classes.
- Calling `app.close()` does not terminate the Node process itself.
- Windows caveat: `SIGTERM` never works on Windows; `SIGINT`/`SIGBREAK`/partially `SIGHUP` work.

## Bootstrap

- Entry: `bootstrap()` calls `NestFactory.create(AppModule)`; the passed module is the root/composition root. The application listens with `await app.listen(port)`.
- Optionally `app.enableShutdownHooks()` for graceful shutdown on system signals when the app has resources to release.
- Global prefix, CORS, versioning, and other global/REST configuration are documented in the official REST/techniques chapters and handled by the future nestjs-rest skill — not part of core composition.