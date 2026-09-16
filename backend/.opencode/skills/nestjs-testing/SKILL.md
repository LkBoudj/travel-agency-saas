---
name: nestjs-testing
description: Testing guidance for the NestJS backend using the official @nestjs/testing API. Use when writing, reviewing, or fixing unit tests (Test.createTestingModule + compile, isolated instantiations, get/getStrict/resolve), mocking (overrideProvider useValue/useClass/useFactory, useMocker, overrideModule.useModule, overrides for guards/interceptors/filters/pipes), e2e tests (createNestApplication + Supertest against .e2e-spec, Fastify inject), testing request-scoped providers (ContextIdFactory.getByRequest), and matching test file conventions (.spec, .e2e-spec) with the actual runner declared in backend/package.json (new Nest scaffolds default to Vitest, classic Jest otherwise). Does NOT cover app scaffolding (nestjs-cli), module/provider design (nestjs-core), or the HTTP endpoint behavior under test (nestjs-rest).
---

# nestjs-testing

Decision skill for testing a NestJS app with the official `@nestjs/testing` package. Covers the framework-level mechanics of building `TestingModule`s, faking collaborators, and driving e2e requests. Business/test-case design decisions still follow backend/AGENTS.md; endpoint behavior follows the nestjs-rest skill.

## Operating principle

Tests exercise the module through its real Nest composition (pipes → guards → interceptors → handlers → providers) with collaborators replaced at the provider/`TestingModule` level. `@nestjs/testing` is runner-agnostic — it only supplies `TestingModule`; the actual runner (Jest or Vitest) and its APIs (`describe/it`, assertions, `vi` vs `jest`) are chosen by the installed `package.json`. Never manually stub what a `TestingModule` provides.

## Workflow

### 1. Read project guidance and runner first

- read the backend `package.json` and confirm the test runner (Jest vs Vitest) and the `test`, `test:e2e`, `test:watch`, `test:cov` scripts that exist
- do not assume a runner: use only the runner APIs that `package.json` declares (newly generated Nest scaffolds now default to **Vitest**)
- check for existing `src/**/*.spec.ts` and `test/*.e2e-spec.ts` conventions before writing new test files

### 2. Know this skill's boundary

This skill covers testing mechanics only. Do not use it to design modules/providers or DI (nestjs-core), to generate files (nestjs-cli), or to decide endpoint HTTP behavior (nestjs-rest). A test may import minimal copies of `AppModule`/feature modules — never full e2e by wiring a test-only DI graph from scratch.

### 3. Unit tests

- Base fixture: `const module = await Test.createTestingModule({ imports: [...], controllers: [...], providers: [...] }).compile();`
- Where possible, test a single provider in isolation (pass only the class to `providers`, provide its direct collaborators as stubs) — a small, focused compile is faster and less brittle than a full-module import.
- Retrieve instances with `module.get<CatService>(CatService)` (or `module.getStrict()` inside/with a `get(Class, { strict: false })` fallback for global providers); obtain request-scoped instances with `module.resolve(...)`.
- Close the module in teardown (`afterAll(() => module.close())`) when the app context initializes on `onModuleInit`.

### 4. Test doubles

- Replace collaborators at the module level:
  - `overrideProvider(Service).useValue(stub)` — plain object works best; you can also supply safety `instanceof` guards (`runInContext` / Hooks only when needed).
  - `overrideProvider(Service).useClass(FakeService)`
  - `overrideProvider(Service).useFactory({ factory: () => ({...}) })`
  - `Test.createTestingModule({ providers: [ { provide: CONNECTION, useValue: connectionMock } ]})` — a provider with a custom token can be provided directly.
- Replace modules with `overrideModule(FeatureModule).useModule({ module: class extends FeatureModule {}, providers: [...] })` or `useModule(FakeModule)`.
- **Guards/interceptors/filters/pipes**: `overrideGuard(X).useValue(...)`, `overrideInterceptor(X)`, `overrideFilter(X)`, `overridePipe(X)` — chain directly with `.overrideX`. Each accepts `useValue`/`useClass`/`useFactory`. Overrides apply from the point of the call, so call them on the `TestingModuleBuilder`.
- **`useMocker(fn)`**: `Test.createTestingModule({ providers: [...] }).useMocker((token) => { if (token === CatsService) return { findAll: jest.fn(), findOne: jest.fn() }; /* jest */ })` auto-supplies mocks for providers/tokens; accept every token you don't otherwise stub (return `undefined` from the function for the rest). Runner-agnostic: the returned stub uses the active runner API.
- **Known limitation**: `REQUEST` and `INQUIRER` tokens are **not** auto-mockable via `useMocker` — provide them explicitly (`overrideProvider(REQUEST).useValue(...)`) for request-scoped providers.

### 5. E2E tests

- `test/*.e2e-spec.ts`; fixture:
  ```ts
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication();
  await app.init();
  ```
  then drive `supertest(app.getHttpServer()).get('/v1/cats').expect(200)`.
- Fastify path: `const app = moduleFixture.createNestApplication(new FastifyAdapter())`, then `app.inject({ method: 'GET', url: '/' })` (no supertest dependency). Duplicate-generated app-close logic in teardown (`app.close()`).
- Configure `app` the same way production `main.ts` does (global prefix, validation/versioning) so e2e reflects bootstrap reality.
- Keep e2e small and route-focused; assert on HTTP contracts (`status`, body envelope, `errorCode`) not on internals.

### 6. Testing request-scoped providers (provider scopes)

- Request-scoped providers need a request identity. Create one with `const contextId = ContextIdFactory.create()` then retrieve the instance via `module.resolve(Provider, contextId, { strict: false })`.
- In a route-test context, mock the request token: `module.get(REQUEST).then(...)` patterns apply; provide a fake `REQUEST` token when the tested provider consumes `@Inject(REQUEST)`.
- Spy in Nest internals only where unavoidable; prefer a real (range) module compile.

### 7. Runner nuance

- `@nestjs/testing` does not select the runner. New generated projects default to **Vitest**; older/Default-express projects often use Jest. Respect `package.json` (`test`, `test:e2e`) scripts and write mocks/stubs with the imported runner API (`jest.fn()` → `vi.fn()` in Vitest, `jest.spyOn` → `vi.spyOn`, `@jest/globals` vs `vitest`).
- Superagent/supertest is Express-oriented; Vitest and Jest both work as test runners here.

### 8. Verification

- Run only scripts confirmed in `backend/package.json` (from `backend/`): e.g. `npm run lint`, `npm test`, `npm run test:e2e`. If a script is absent, say so; do not invent a test command.

## Boundaries

Answers only: **how do we exercise NestJS code through the real module graph with minimal fake surface?** Not module/provider design (nestjs-core), not generation (nestjs-cli), not HTTP endpoint semantics (nestjs-rest), not Prisma mocks-in-depth (official Prisma vendor skill when bootstrapped), and not auth/security. Runner-specific and framework-specific implementation notes belong in `references/testing-reference.md`.