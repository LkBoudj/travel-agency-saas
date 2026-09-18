# NestJS testing — focused reference

Official `@nestjs/testing` mechanics distilled from the current NestJS docs. Use with the nestjs-testing SKILL.md. Verify specifics against the installed version and the official pages.

Official sources:
- https://docs.nestjs.com/fundamentals/testing
- https://docs.nestjs.com/fundamentals/unit-testing (same content path; canonical page is /fundamentals/testing)
- https://docs.nestjs.com/techniques/versioning (for e2e of versioned routes)

## Version baseline

- Current NestJS major: v12. Newly generated projects now default to **Vitest** as the test runner; `@nestjs/testing` remains runner-agnostic.
- Runtime: NestJS v12 requires Node.js 20.19+/22.12+.
- Raw docs mirror: `https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/content/fundamentals/unit-testing.md`.

## 1. Unit-testing base fixture

```ts
const module: TestingModule = await Test.createTestingModule({
  imports: [CatsModule],          // or none for a focused test
  controllers: [CatsController],  // optional
  providers: [CatsService],       // at least one under test
}).compile();

const service = module.get<CatsService>(CatsService);
```

- `Test` and `TestingModule` come from `@nestjs/testing`.
- `.compile()` triggers module resolution (imports, providers, exports) but does NOT start lifecycle hooks; hooks run when the app is created (e2e) or explicitly (see lifecycle notes).
- Isolate: for a single-provider test, list only that class in `providers` and stub its collaborators via overrides; prefer this over importing whole modules to reduce compile cost and coupling.

## 2. Retrieving instances

- `module.get<T>(Type)` — standard (non-scoped) instance.
- `module.getStrict()` — like `get` but restricted to the module's own providers (not global). Can raise an error for request-scoped providers.
- `module.get(Type, { strict: false })` — allows retrieval of global providers.
- `module.resolve(Type, contextId, opts?)` — retrieves a **request-scoped** instance per context id; without explicit `contextId` a transient context is created each call.
- `module.createNestApplication(httpAdapter?, options?)` — build a full app on the testing module for e2e/integration.

## 3. Overrides

| Call | Effect |
|---|---|
| `overrideProvider(Token).useValue(x)` | replace the provider with a fixed value (mock) |
| `overrideProvider(Token).useClass(FakeClass)` | replace with a class |
| `overrideProvider(Token).useFactory({ factory: () => x })` | replace with a factory result |
| `overrideModule(ModuleRef).useModule(ClassOrLambda)` | swap an imported module |
| `overrideGuard(Guard).useValue / useClass / useFactory` | replace a guard (class- or token-bound) |
| `overrideInterceptor(I).useValue / useClass / useFactory` | replace an interceptor |
| `overrideFilter(F).useValue / useClass / useFactory` | replace an exception filter |
| `overridePipe(P).useValue / useClass / useFactory` | replace a pipe |

- Override calls chain: `Test.createTestingModule(...).overrideProvider(A).useValue(a).overrideProvider(B).useValue(b).compile()`.
- When overriding a class-bound provider by token, the token string/type must match what the module/provider refers to (`{ provide: TOKEN, useClass: Service }`).
- Guard/interceptor/filter/pipe overrides apply to the enhanced route only after compilation; use the same token type used in `@UseGuards(X)` etc.

## 4. useMocker

- `Test.createTestingModule({ providers: [CatsService] }).useMocker((token) => { if (token === CatsService) return { findAll: jest.fn(), get: jest.fn() }; return undefined; })` — every provider/token not explicitly overridden is passed to the mocker; returning `undefined` leaves the default provider in place.
- The token parameter is a class or a string/number/Symbol token.
- **`REQUEST` and `INQUIRER` tokens are not auto-mockable** — if a request-scoped provider or an `@Inject(REQUEST)` consumer is under test, provide those tokens explicitly with an override/provide entry.

## 5. E2E with Supertest (Express)

```ts
// test/cats.e2e-spec.ts
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Cats (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  it('/v1/cats (GET)', () => request(app.getHttpServer()).get('/v1/cats').expect(200));
  afterAll(async () => { await app.close(); });
});
```

- Configure the app like production `main.ts` (global prefix/validation/versioning) for faithful behavior.
- Versioned routes: `get('/v1/cats')` matches URI versioning when `app.enableVersioning({ type: VersioningType.URI })` was applied in bootstrap (not automatically in tests unless you apply it).

## 6. E2E with Fastify

```ts
const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
const app = moduleFixture.createNestApplication(new FastifyAdapter());
await app.init();

const res = await app.inject({ method: 'GET', url: '/v1/cats' });
expect(res.statusCode).toBe(200);
await app.close();
```

- `app.inject()` returns a full response object (`statusCode`, `body`, `headers`); no Supertest dependency needed on the Fastify adapter.

## 7. Testing request-scoped providers

- Create a new context per request-under-test and resolve within it:

```ts
const contextId = ContextIdFactory.create();
const catsService = await module.resolve(CatsService, contextId);
```

- For providers that consume the request, provide a fake `REQUEST` token in the testing module or override it (`overrideProvider(REQUEST).useValue(fakeRequest)`).
- `ContextIdFactory.getByRequest(req)` derives the context id from an actual platform request object inside a route handler/test harness.

## 8. Lifecycle

- `module.close()` triggers `OnModuleDestroy`/`OnApplicationShutdown` — call it in `afterAll` for compiled modules that open resources (DB connections, servers) to avoid dangling handles and open sockets failing test runs.
- `createNestApplication()` + `app.init()` runs `OnModuleInit`/`OnApplicationBootstrap`; `app.close()` runs the destroy hooks.
- When testing only a provider that starts lifecycle hooks, invoke hooks manually or close the module to flush them.

## 9. Runner notes (Vitest vs Jest)

- Files: unit `src/**/*.spec.ts`; e2e `test/*.e2e-spec.ts`; Nest defaults honor those suffixes on both runners.
- Vitest globals vs imports: use `vitest` (`import { describe, it, expect, vi } from 'vitest'`) if `package.json` lists a vitest script; use Jest equivalents (`jest.fn()`, `jest.spyOn`) otherwise. `@nestjs/testing` itself is independent of either.
- Coverage/timers/configs are runner-owned and belong in `vitest.config.ts` / `jest.config.ts` per the installed scaffold — never hand-rolled duplicates.

## 10. Reports / fixtures

- Keep fixtures in test files or `test/` factory helpers; do not ship snapshot-style dumps of live data. Demo/fixture data policy follows backend AGENTS rules, not this skill.