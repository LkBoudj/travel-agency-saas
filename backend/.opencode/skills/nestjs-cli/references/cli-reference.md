# Nest CLI Reference

Concise command/schematic reference derived from CURRENT official NestJS CLI documentation. The Nest CLI is published as `@nestjs/cli`, uses the `@nestjs/schematics` collection by default, and every `nest` command follows: `nest commandOrAlias requiredArg [optionalArg] [options]`.

## Official sources

- <https://docs.nestjs.com/cli/overview>
- <https://docs.nestjs.com/cli/usages>
- <https://docs.nestjs.com/cli/workspaces>
- <https://docs.nestjs.com/cli/libraries>
- <https://docs.nestjs.com/recipes/crud-generator>
- <https://docs.nestjs.com/first-steps>
- `nest --help` / `nest <command> --help` on the installed CLI

## New application

```bash
$ nest new <name> [options]
$ nest n <name> [options]
```

Creates and initializes a new standard-mode Nest project; prompts for the module system (ESM or CommonJS) and package manager. Options (verify against the current CLI before use):

| Option                                | Alias | Description |
| ------------------------------------- | ----- | ----------- |
| `--directory [directory]`             |       | Destination directory |
| `--dry-run`                           | `-d`  | Report changes without touching the filesystem |
| `--skip-git`                          | `-g`  | Skip git repository initialization |
| `--skip-install`                      | `-s`  | Skip package installation |
| `--skip-tests`                        | `-t`  | Do not generate test files for the new project |
| `--package-manager [pm]`              | `-p`  | npm, yarn, pnpm, or bun (must be installed globally) |
| `--language [language]`               | `-l`  | TypeScript or JavaScript |
| `--collection [collectionName]`       | `-c`  | Schematics collection to use |
| `--strict`                            |       | Enable strict TS compiler flags |
| `--format`                            |       | Format generated files with Prettier |
| `--observe` / `--no-observe`          |       | Auto-configure `@nestjs/observe` or skip the prompt |

`options must be verified against the current CLI` — several options (e.g. `--skip-tests`, `--format`, `--observe`, bun support) have been added over recent releases; run `nest new --help` before relying on any single flag.

## Generate syntax

```bash
$ nest generate <schematic> <name> [options]
$ nest g <schematic> <name> [options]
```

## Official schematics

| Name          | Alias | Description |
| ------------- | ----- | ----------- |
| `app`         |       | Application within a monorepo (converts a standard project to monorepo mode) |
| `library`     | `lib` | Library within a monorepo (converts a standard project to monorepo mode) |
| `class`       | `cl`  | New class |
| `controller`  | `co`  | Controller declaration |
| `decorator`   | `d`   | Custom decorator |
| `filter`      | `f`   | Filter declaration |
| `gateway`     | `ga`  | Gateway declaration |
| `guard`       | `gu`  | Guard declaration |
| `interface`   | `itf` | New interface |
| `interceptor` | `itc` | Interceptor declaration |
| `middleware`  | `mi`  | Middleware declaration |
| `module`      | `mo`  | Module declaration |
| `pipe`        | `pi`  | Pipe declaration |
| `provider`    | `pr`  | Provider declaration |
| `resolver`    | `r`   | Resolver declaration (GraphQL) |
| `resource`    | `res` | Full CRUD resource (TypeScript only) |
| `service`     | `s`   | Service declaration |

Never invent schematics. `job`, `model`, `repository`, `use-case`, `command-handler`, and `dto` are NOT official schematics — there is no `nest g job`, `nest g model`, or `nest g repository`.

## Important generate options

| Option                          | Alias | Description |
| ------------------------------- | ----- | ----------- |
| `--dry-run`                     | `-d`  | Report changes without touching the filesystem |
| `--project [project]`           | `-p`  | Project the element is added to (monorepo mode) |
| `--flat`                        |       | Do not generate a folder for the element |
| `--no-flat`                     |       | Generate a folder for the element (default per element type) |
| `--collection [collectionName]` | `-c`  | Schematics collection to use |
| `--spec`                        |       | Enforce spec file generation (default) |
| `--no-spec`                     |       | Disable spec file generation |
| `--spec-file-suffix [suffix]`   |       | Custom spec file suffix |
| `--skip-import`                 |       | Skip importing the element into its closest module |
| `--format`                      |       | Format generated files with Prettier |

## Project creation options

The relevant `nest new` options for this repository's intended scaffold are: `--language TypeScript`, `--package-manager npm`, `--strict`, and `--skip-git`. Verify each against `nest new --help` for the installed CLI before executing.

## Node / generator requirements

"Current official requirement at the time this reference was written": NestJS 11 requires **Node.js v20 or higher**; NestJS v12 release notes require **Node.js v20.19+ / v22.12+** (Node 21.x not supported). NestJS v12 defaults for newly generated projects include ESM packaging, Vitest for ESM projects (Jest for CommonJS), oxlint, and Rspack as the monorepo bundler; the `decorator` schematic generates `Reflector.createDecorator()`-based decorators.

Future agents MUST re-check the official docs and the installed CLI (`nest info`) when scaffolding a new project instead of assuming this value never changes.

## Resource generator warning

`nest generate resource` creates a module, controller, service, an entity file, DTO files, spec files, and full create/read/update/delete endpoints (REST, GraphQL, Microservice, or WebSocket flavor — it prompts for the transport). Generated services are NOT tied to any ORM/data source and start as placeholders. It is broad CRUD boilerplate and NOT the default choice for focused vertical slices; prefer the smallest module/controller/service generators unless the full CRUD shape is genuinely required. Entity-style files it produces are NOT automatically the Prisma persistence model in this repository.

## Standard vs Nest monorepo mode

Nest has two code-organization modes:

- **Standard mode**: a single application; `nest new` produces this by default, with one `src/` and one `test/`.
- **Monorepo/workspace mode**: multiple applications and libraries coordinated by `nest-cli.json` (`"monorepo": true`, `apps/`, `libs/`); enabled by adding a project via `nest generate app` or `nest generate library`.

The repository containing multiple applications (dashboard, storefront, backend) does NOT mean the backend should use Nest monorepo mode. Keep the backend in standard mode unless a task explicitly requires Nest workspace/monorepo architecture; any such change must be justified and verified against the official Workspaces documentation.