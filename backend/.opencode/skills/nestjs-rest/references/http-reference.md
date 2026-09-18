# HTTP/REST boundary — focused reference

NestJS REST/HTTP endpoint implementation facts, distilled from the official docs for the currently dominant NestJS major. Verify against the installed version (`package.json`) and the official pages when precision matters.

Official sources:
- https://docs.nestjs.com/controllers
- https://docs.nestjs.com/pipes
- https://docs.nestjs.com/techniques/validation
- https://docs.nestjs.com/techniques/versioning
- https://docs.nestjs.com/exception-filters
- https://standardschema.dev (Standard Schema spec used by the validation pipe)

## Version baseline

- Current NestJS major (as of research): v12. Notable v12 controller facts used in this skill: `routeConflictPolicy` / `routeResolutionStrategy` (opt-in duplicate/shadowing diagnostics), `StandardSchemaValidationPipe` (Zod/Valibot/ArkType), `@QueryMethod()` decorator for the HTTP `QUERY` method.
- Runtime: NestJS v12 requires Node.js 20.19+/22.12+ (NestJS v11 requires Node 20+).
- Raw docs mirror: `https://raw.githubusercontent.com/nestjs/docs.nestjs.com/master/content/<chapter>.md`.

## 1. Route definition

- `@Controller('cats')` defines a controller with path prefix `cats`. Full route = prefix + method path (`@Get('breed')` → `GET /cats/breed`).
- Options object: `@Controller({ path: 'cats', host: 'admin.example.com', version: '1' })`.
- Method decorators: `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Options`, `@Head`, `@All`, and `@QueryMethod` (HTTP `QUERY` method — distinct from the `@Query()` parameter decorator).
- Wildcards / param tokens: `@Get(':id')`; Express v5 changed single-`*` wildcard semantics — Nest recommends `@Get('ab*cd')`-style patterns be verified per platform, or avoid platform wildcards in favor of explicit routes. Catch-all syntax differs between Express (`*splat`) and Fastify (origins); prefer explicit routes over catch-alls.
- Async handlers are fully supported (`async findAll(): Promise<Cat[]>`).
- **Route conflicts (v12)**: by default duplicate routes silently shadow; enable `routeConflictPolicy: RouterConflictPolicy.ERROR` (default `WARNING`/logs) and/or `routeResolutionStrategy` on `NestApplicationOptions` so shadowing fails fast at bootstrap instead of misrouting later.

## 2. Request input decorators

| Decorator | Extracts | Example |
|---|---|---|
| `@Req()` / `@Request()` | entire platform request (last resort) | `find(@Req() req)` |
| `@Res()` / `@Response()` | platform response (see §3) | — |
| `@Next()` | next() function | — |
| `@Session()` | session object (when enabled) | — |
| `@Param(key?)` | single named route param or full object | `@Param('id', ParseIntPipe) id: number` |
| `@Body(key?, options?)` | whole body or a field; `options = { schema, pipes }` | `@Body(new ValidationPipe())` / `@Body({ schema })` |
| `@Query(key?, options?)` | query string value(s); same options object | `@Query('page', DefaultValuePipe(1), ParseIntPipe)` |
| `@Headers(name?)` | all headers or one named header | `@Headers('x-api-key') key: string` |
| `@Ip()` | remote IP | `@Ip() ip: string` |
| `@HostParam(key?)` | host (:domain.example.com) params | `@HostParam('account')` |
| `@RawBody(field?)` | raw request body (when raw body is enabled) | — |

Rules:
- `@Param`, `@Body`, `@Query` take the shape `decorator(key?, pipeOrOptions)`: pass a pipe instance, a class-backed type, or an options object `{ schema, pipes }`.
- Validation of a dynamic segment: `@Param('id', { schema: z.string().min(1) })`.
- Body field selection: `@Body('name')` returns just `req.body.name`.

## 3. Response behavior (standard mode)

- **Standard mode (recommended)**: return an object/array → serialized JSON; return a primitive (string/number) → sent as-is. GET 200; POST 201. `undefined` return → empty 200 (unless status explicitly changed).
- `@HttpCode(204)` overrides the default status. `@Header('Cache-Control', 'none')` sets a header. `@Redirect(url, statusCode)` performs a redirect; return `{ url, statusCode }` from the handler to override at runtime.
- **Library-specific mode**: injecting `@Res()` switches the route to platform mode and you must manually manage the response (e.g. `res.status(201).json(...)`). This disables standard handling, bypasses some Nest features, and breaks testability — avoid unless truly required (raw response streaming, setting platform-specific headers).
- **Passthrough**: `@Res({ passthrough: true })` keeps standard response handling while still letting you set status/headers/cookies on the platform object. Prefer this over raw mode.

## 4. Pipes

- A pipe transforms input data and/or validates it. Types: transformation-only (`Parse*`), validation-only (`ValidationPipe`, `StandardSchemaValidationPipe`), or both (custom).
- Pipes run **inside the exceptions zone**, so a failing pipe is handled by the global exception filter automatically.
- Built-in pipes (see docs table): `ValidationPipe`, `StandardSchemaValidationPipe`, `ParseIntPipe`, `ParseBoolPipe`, `ParseFloatPipe`, `ParseArrayPipe`, `ParseUUIDPipe`, `ParseEnumPipe`, `ParseDatePipe`, `DefaultValuePipe`.
- Binding:
  - parameter-scoped: `@Param('id', ParseIntPipe) id: number`
  - route-scoped: `@Get(':id', new ParseIntPipe({ errorHttpStatusCode: 406 }))`
  - controller-scoped: `@UsePipes(new ValidationPipe())`
  - global: `app.useGlobalPipes(...)` at bootstrap (wrapped class only in `AppModule` provider context — but boot-time invocation works since `useGlobalPipes` is called after the application is created); or `{ provide: APP_PIPE, useClass: ValidationPipe }` in a module for DI'able globals.
- `ParseIntPipe` on missing value: if the first pipe is passed a `Transform`-style default, use `DefaultValuePipe` before it — `@Query('page', DefaultValuePipe(1), ParseIntPipe) page: number`.

## 5. Validation

- Two validation strategies ship built-in:
  - **`ValidationPipe`** — decorator-based, uses `class-validator` + `class-transformer` (install with `npm i --save class-validator class-transformer`). Works because DTOs are runtime classes with metatypes.
  - **`StandardSchemaValidationPipe`** — schema-first, validates any **Standard Schema** (Zod → `z`, Valibot, ArkType, typebox, …). Also attachable per-parameter via `@Body({ schema })`, `@Query('x', { schema })`, `@Param('id', { schema })`. Feeds OpenAPI when Swagger is adopted.
- `ValidationPipe` key options:
  - `whitelist: true` — strip any properties with no corresponding DTO decorator.
  - `forbidNonWhitelisted: true` — error (400) instead of silently stripping unknown properties.
  - `transform: true` — coerce plain JSON into typed instances and convert primitives ("1" → 1); enables implicit type conversion of route/query params.
  - `transformOptions: { enableImplicitConversion: true }` — auto-convert without relying on decorator types.
  - `validateCustomDecorators: true` — include params of custom decorators in whitelist filtering.
  - `disableErrorMessages: true` — suppress detailed messages in production.
  - Set globals in `main.ts`: `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`.
- `class-validator` library offers core decorators (`@IsString()`, `@IsInt()`, `@IsNumber()`, `@IsArray()`, `@ValidateNested()`, `@ArrayNotEmpty()`, `@IsEnum()`, `@IsOptional()`, …) and transform hints (`@Type(() => ...)`).
- **Array caveat**: `cats: CatDto[]` is erased at runtime; either wrap in a class (`CreateCatDto` with a `@ValidateNested()` array field) or use `ParseArrayPipe` (with `optional: true` to avoid 400 on absence).
- Validation failures surface as 400 `BadRequestException` with the first violated constraint's message.

## 6. DTO / mapped types

- DTOs must be **classes** — interfaces carry no runtime metatype. Nest uses the metatype to run validation and transform.
- `@nestjs/mapped-types` provides `PartialType`, `PickType`, `OmitType`, `IntersectionType` — derives `UpdateCatDto extends PartialType(CreateCatDto)` rather than duplicating fields.

## 7. HTTP exceptions & filters

- Throw built-in exceptions; base shape `{ statusCode, message, error? }`:
  Usage:
  `throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)` or the named subclasses.
- **Named built-ins** (all extend `HttpException`): `BadRequestException` (400) `UnauthorizedException` (401) `NotFoundException` (404) `ForbiddenException` (403) `NotAcceptableException` (406) `RequestTimeoutException` (408) `ConflictException` (409) `GoneException` (410) `HttpVersionNotSupportedException` (505) `PayloadTooLargeException` (413) `UnsupportedMediaTypeException` (415) `UnprocessableEntityException` (422) `InternalServerErrorException` (500) `NotImplementedException` (501) `BadGatewayException` (502) `ServiceUnavailableException` (503) `GatewayTimeoutException` (504) + `PreconditionFailedException` (412) and others in the docs list.
- **v12 `HttpException` options**: `{ cause, description, errorCode }` — `errorCode` adds a stable machine-readable string to the payload for client branching; `cause` is for logging/`console` tracing, never serialized to the response.
- Response body variants: passing an object as the first constructor arg sets the payload directly; passing a string sets `message` (with `description` appended when given).
- **Global filter**: Nest ships a built-in global exception filter that handles every exception by default:
  - `HttpException`/inheritors → their status + payload.
  - unknown handled exceptions → `{ "statusCode": 500, "message": "Internal server error" }` (no stack leak).
  - `http-errors` objects (built-exception like `statusCode`/`message`) are recognized when thrown.
- **Custom filters**: `@Catch(HttpException)` (class-backed) or `@Catch()` catch-all. Bind at method/controller scope with `@UseFilters(Filter, new Filter())`, or globally via `APP_FILTER` (DI-capable — preferred for injectable filters) or `app.useGlobalFilters()` (manual instantiation, no DI).
- **Order of filters**: global → controller → route (matched on first apply). A catch-all `@Catch()` filter must be listed before narrower filters so it can actually absorb them; extend `BaseExceptionFilter` when decoration is the goal. `HTTPAdapterHost` gives access to the underlying adapter for platform-native handling.
- Keep custom filters rare: the built-in filter already returns correct statuses and safe shapes; override only the response envelope, observable logging, or tracing behavior.

## 8. API versioning

- Enable: `app.enableVersioning({ type: VersioningType.URI })` in `main.ts` (after global prefix, before controller route paths).
- **URI (default for this project's `/v1` goal)**: version injected after the global prefix and before the controller prefix; default prefix `v` → route `GET /v1/cats`. Config: `{ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' }` trims `v` when `prefix` is `''` → `/1/cats`.
- **Header**: `VersioningType.HEADER` with `{ header: 'X-API-Version' }` filled by `X-API-Version: v1` (or bare `1`). **Media type**: `{ type: VersioningType.MEDIA_TYPE, key: 'v=' }` with Accept `application/json;v=1`. **Custom**: `{ type: VersioningType.CUSTOM, extractor: (request) => ... }`.
- Control points:
  - controller-level `@Controller({ version: '1' })`
  - route-level `@Version('1')` (or `@Version(['1', '2'])`)
  - global `defaultVersion: '1'`
  - negation `@Version('1,2')` is a comma list, not a range operator.
- `VERSION_NEUTRAL` marks a resource to respond under any version. **Behavior**: when versioning is enabled, a controller/route without a version (and without `VERSION_NEUTRAL`) returns 404 rather than serving unversioned traffic — escape hatch is `defaultVersion`.
- Versioning is a routing-layer concern: duplicate controllers/routes on the same version can shadow — pair with `routeConflictPolicy` diagnostics from §1 in v12.

## 9. Performance / hygiene notes

- Return DTO-shaped objects for JSON: pass the actual DTO class as the Swagger response type only when Swagger is introduced.
- Keep controllers free of I/O orchestration; a handler should: extract inputs → call a service → return/throw. Anything else violates the boundary and the backend AGENTS rules.
- Handlers returning platform `@Res()` paths are exempt from standard-mode defaults but must set status manually; prefer passthrough.