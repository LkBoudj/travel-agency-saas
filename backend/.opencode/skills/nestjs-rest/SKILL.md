---
name: nestjs-rest
description: REST/HTTP boundary guidance for the NestJS backend under /v1. Use when implementing or reviewing controller routing and HTTP method decorators, extracting request input (Param, Body, Query, Headers, Ip, HostParam, custom param decorators), defining DTO transport classes, validating/transforming input (ValidationPipe with class-validator, StandardSchemaValidationPipe with Zod/Valibot/ArkType, built-in Parse* pipes), setting HTTP status/response behavior (HttpCode, Header, Redirect, standard vs @Res responses), throwing HTTP exceptions or using exception filters (HttpException, built-in exceptions, errorCode, UseFilters, APP_FILTER), and applying API versioning (URI/header/media-type/custom, defaultVersion, VERSION_NEUTRAL). Does NOT cover module/provider wiring or DI (see nestjs-core), Nest artifact generation (see nestjs-cli), auth, Swagger, Prisma, logging, or testing.
---

# nestjs-rest

Decision skill for the NestJS REST HTTP boundary. Project invariants live in backend/AGENTS.md and the root AGENTS.md — this skill adds endpoint-boundary procedure only: **declare HTTP surface → extract inputs → validate at the edge → respond via standard mode → map failures to HTTP exceptions**. Detailed official behavior lives in `references/http-reference.md`.

## Operating principle

The controller is the HTTP transport and input boundary: it maps a request to application work and back to an HTTP response. Keep it thin. Keep business logic in services (see backend/AGENTS.md), keep persistence behind the service boundary, and use Nest's standard response handling unless a real need forces `@Res()`. Validate everything entering from the network at the boundary.

## Workflow

### 1. Read local project guidance first

- read `backend/AGENTS.md` and the relevant PROJECT_MAP decisions (REST under `/v1`, feature-based modular monolith, multi-tenancy invariants)
- read the project `package.json` when it exists and follow the installed Nest version's documented behavior
- inspect the nearest feature module to reuse existing DTO/pipe/filter conventions

### 2. Know this skill's boundary

This skill owns the HTTP endpoint boundary only. Do not use it to learn module wiring or provider DI (nestjs-core), to generate files (nestjs-cli), or for business/persistence logic. A thin controller delegates to a service and returns the result; it does not contain business rules.

### 3. Declare the endpoint surface

- Controllers are classes decorated with `@Controller('prefix')` (optionally `{ host, version, scope }`); the route path = controller prefix + method path.
- Map methods with `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`, plus `@Options()`, `@Head()`, `@All()`, and `@QueryMethod()` (the HTTP `QUERY` method; do not confuse with the `@Query()` parameter decorator).
- Declare parametric routes after static routes, or enable Nest's route-conflict diagnostics (`routeConflictPolicy` / `routeResolutionStrategy`) so shadowing surfaces at bootstrap instead of runtime.
- The controller must be listed in its feature module's `controllers` array (wiring belongs to the nestjs-core skill).

### 4. Extract request input with dedicated decorators

Use `@Param(...)`, `@Body(...)`, `@Query(...)`, `@Headers(...)`, `@Ip()`, `@HostParam()` before reaching for platform objects. `@Req()`/`@Res()` expose Express/Fastify specifics and should be last resorts. `@Body`, `@Query`, `@Param`, `@RawBody` accept an options object (`{ schema, pipes }`) so a Standard Schema (Zod/Valibot/ArkType) can be attached directly to a parameter.

### 5. Prefer the standard response mode

- Returning a value (object/array → JSON, primitive → raw) is the recommended path; default status is 200 except POST which defaults to 201.
- Adjust with handler decorators: `@HttpCode(...)`, `@Header(...)`, `@Redirect(...)`.
- Avoid `@Res()`: injecting it switches the handler to library-specific mode and disables standard handling for that route; if you must touch the platform response (cookies/headers), use `@Res({ passthrough: true })` and still return a value.

### 6. DTOs are runtime classes, not interfaces

Use classes for payload/query/param types because pipes need a runtime metatype; TypeScript interfaces are erased and cannot drive validation. Build create/update variants with `PartialType`, `PickType`, `OmitType`, `IntersectionType` from `@nestjs/mapped-types` rather than hand-copying fields. A DTO is a transport contract — never reuse it as a persistence model (that is Prisma's contract).

### 7. Validate at the edge

- Register `ValidationPipe` globally (typically `{ whitelist: true, transform: true }` with `class-validator`/`class-transformer` decorators on DTO classes). `forbidNonWhitelisted` turns stripping into a 400 when unknown fields must be rejected.
- If the project uses Zod/Valibot/ArkType (Standard Schema), use the built-in `StandardSchemaValidationPipe` and/or `@Body({ schema })` / `@Param('id', { schema })`; it also drives OpenAPI if Swagger is adopted later.
- Convert typed primitives explicitly with built-in `Parse*` pipes (`ParseIntPipe`, `ParseBoolPipe`, `ParseFloatPipe`, `ParseUUIDPipe`, `ParseEnumPipe`, `ParseArrayPipe`, `ParseDatePipe`) — path/query values arrive as strings. Use `DefaultValuePipe` before a `Parse*` pipe when the parameter may be missing.
- Validate arrays by wrapping them in a class or using `ParseArrayPipe` — an inline `CreateDto[]` type is erased and cannot be validated.

### 8. Fail with HTTP exceptions, keep filters minimal

- Throw the built-in exceptions (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `ConflictException`, `UnauthorizedException`, etc.) — they map to the correct status and shape automatically.
- Use the `errorCode` option for stable machine-readable error identifiers clients can branch on, and `cause` only for logging (never serialized).
- Rely on the built-in global exception filter by default. Add a custom filter only when the response shape/logging genuinely needs to change; register global filters via `APP_FILTER` (allows DI) or `app.useGlobalFilters()`. A catch-everything `@Catch()` filter must be declared before more specific filters.
- Never leak internal stack traces or database errors to clients.

### 9. Version the API to match the architecture

The approved API is REST under `/v1` — URI versioning is the natural fit. Enable with `app.enableVersioning({ type: VersioningType.URI })` (default prefix `v`, configurable). Apply versions at controller level, route level (`@Version(...)`), or globally via `defaultVersion`. Use `VERSION_NEUTRAL` for resources that must respond under any version. Note that when versioning is enabled, unversioned controllers/routes return 404.

### 10. Verify through the whole stack

After implementing an endpoint: confirm the controller is registered in the correct module, validation and pipes are actually attached, exceptions surface with the intended status/`errorCode`, and the route works under `/v1` (`/v1/cats` etc.). Then rely on the backend's actual verification scripts (`backend/package.json`) and the nestjs-testing skill to cover behavior.

## Boundaries

This skill answers only: **how should NestJS REST endpoints be implemented at the HTTP boundary?** It does NOT teach module/provider composition (nestjs-core), CLI generation (nestjs-cli), testing (nestjs-testing), authentication/authorization, Swagger/OpenAPI, Prisma persistence, logging, or deployment. Those belong to their own skills or are deferred. Nuanced official tables and current-version facts live in `references/http-reference.md`.