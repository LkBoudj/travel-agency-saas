---
name: travel-saas-engineering
description: Senior-engineering workflow for any coding task in the travel-agency-saas repository. Use for implementation, bug fixes, refactors, code review, new pages/features, shared component changes, hooks, API layers, backend slices, route wiring, or deciding where code belongs. Enforces map-first orientation, Serena-first semantic navigation, reuse-before-create, strict layer ownership, minimal correct changes, Superpowers engineering discipline, focused verification, protection of completed work, and stop-when-done.
---

# Travel SaaS Engineering

Operate like a senior/principal engineer working inside an established product.

Optimize for:

- correctness
- maintainability
- reuse
- small context
- small diffs
- predictable structure
- safe incremental progress
- low token usage

Do not redesign the project during ordinary feature work.

Existing verified architecture and established patterns are constraints, not suggestions.

# Source of Truth

Use current code and tests as the final truth.

Orient in this order:

1. `PROJECT_MAP.md`
2. `CURRENT_STATUS.md` when the task belongs to active multi-step work
3. root `AGENTS.md`
4. app-local `AGENTS.md` when present
5. relevant architecture/decision section only when needed
6. task-relevant source files
7. direct dependencies and focused tests

Do not read old chats or broad historical files unless required.

Use `PROJECT_MAP.md` as the primary index.

Do not scan the whole repository to discover what exists.

If the map appears stale or incomplete:

- verify with Serena or targeted search
- trust current code/tests
- update the map only when structure actually changed

Never assume a path exists without verifying it.

# Start Every Task

Before editing, determine:

- what exactly is requested
- which app/module owns it
- whether it already exists
- which existing pattern should be reused
- the smallest regression surface
- the Definition of Done

For multi-step work, show:

```text
Current task:
Where stopped:
Next action:
```

Do not begin unrelated work.

# Core Workflow

Always follow:

```text
Understand
→ Locate
→ Classify
→ Reuse
→ Inspect minimal context
→ Plan bounded change
→ Implement
→ Verify focused surface
→ Update project state if required
→ STOP
```

Do not jump directly from request to implementation when ownership or architecture is unclear.

# Classify the Task

Classify before touching code:

- surgical bug fix
- small feature change
- new feature
- new page
- shared component change
- backend slice
- database/security/architecture change
- large multi-step feature
- UI/UX redesign
- code review

Use the matching Golden Path below.

# Reuse Before Create

Mandatory order:

```text
Reuse existing
→ Extend existing minimally
→ Create feature-local
→ Promote to shared only after proven reuse
```

Before creating any:

- component
- hook
- layout
- table
- toolbar
- form shell
- API helper
- utility
- status component
- page structure

first verify that an equivalent does not already exist.

Never create a second implementation of an established pattern.

# Protect Existing Progress

Do not rebuild completed work because another design is possible.

Do not reopen a completed module unless there is:

- a confirmed bug
- a new requirement
- a necessary dependency of the current task

Prefer additive extension over replacement.

If an existing abstraction handles most of the requirement, extend it minimally.

Never perform a repo-wide refactor as a side effect of a feature task.

Modernize legacy code incrementally only when that slice is already being touched.

# Dependency Direction

Respect this conceptual direction:

```text
app
 ↓
pages
 ↓
features
 ↓
shared
 ↓
theme/infrastructure
```

Forbidden:

```text
shared → feature
theme → feature
feature A → internals of feature B
```

If two features genuinely require the same behavior:

1. identify the smallest reusable behavior
2. extract a domain-agnostic abstraction
3. place it in shared
4. make both features depend on it

Do not couple feature internals.

# Pages

Pages own:

- route integration
- route params
- layout selection
- feature composition

Pages do not own:

- API calls
- business rules
- query logic
- large forms
- table definitions
- transformation logic
- large markup trees

Keep pages thin.

If a page starts carrying real feature behavior, move that behavior into its feature.

# Features

Business-specific code belongs in:

```text
src/features/<feature>/
```

Use only folders actually needed:

```text
api/
components/
hooks/
lib/
model/
types/
```

Do not create empty folders for architecture aesthetics.

Feature code owns:

- business-specific components
- query/mutation hooks
- API/service calls
- feature schemas
- feature types
- mappers
- feature-specific helpers
- feature-specific tests

Keep feature internals local.

# Shared Components

Shared UI must remain domain-agnostic.

A shared component must not understand:

- Tour
- Booking
- Customer
- Departure
- Agency-specific business rules

If a component contains business entity knowledge, keep it inside the feature.

Before adding shared UI, inspect the existing design-system/component registry in `PROJECT_MAP.md`.

Prefer existing primitives such as:

- PageHeader
- SectionHeader
- DataToolbar
- SearchInput
- DataTable
- RowActionsMenu
- StatusBadge
- StatCard
- CellStack
- EmptyState
- ErrorState
- StatePanel
- TableSkeleton
- FormSection
- FormActions
- FormErrorSummary
- ConfirmDialog
- PermissionGate

Confirm the current set before relying on names.

# Layouts

Use composition, not inheritance.

Layouts define repeated structure.

Do not create a layout for a one-page styling difference.

Preferred model:

```text
AppShell
→ domain/layout composition
→ page recipe
→ feature
```

For a new page:

1. identify the existing layout
2. identify the existing page recipe
3. reuse both
4. add only feature-specific content

Never duplicate:

- sidebar
- page shell
- page header structure
- common spacing
- toolbar structure
- responsive shell

# Page Recipes

## Data Management

Use for list/management screens:

```text
PageHeader
→ DataToolbar
→ DataTable
→ loading / empty / error / pagination
```

Typical examples:

- Trips
- Departures
- Bookings
- Customers
- Team
- Payments

Do not invent a new list architecture per feature.

## Editor

Use for editing/configuration:

```text
PageHeader
→ section/navigation structure
→ FormSection
→ FormActions
```

## Catalog

Use for catalogs such as Themes:

```text
PageHeader
→ filters/search
→ card/grid/list
→ actions
```

## Overview

Use:

```text
PageHeader
→ metrics
→ operational sections
→ recent activity
```

# DataTable Contract

Use one shared table engine.

The shared DataTable owns:

- visual structure
- header styling
- row density
- separators
- hover
- keyboard behavior
- sticky behavior
- loading shell
- responsive container
- RTL-safe alignment

It does not own:

- feature statuses
- API calls
- permissions
- Booking logic
- Tour logic
- Customer logic

Feature tables define only:

- columns
- row rendering configuration
- row actions
- domain-specific cells

Pattern:

```text
BookingsTable
      ↓
DataTable

TripsTable
      ↓
DataTable
```

If table styling changes globally, change the shared DataTable once.

Do not patch every feature table separately unless the requirement is feature-specific.

# Toolbar Contract

Reuse the shared toolbar structure.

It owns layout for:

- search
- filters
- result count
- secondary actions
- primary action

Feature-specific filters remain inside the feature.

Do not create unrelated toolbar layouts per page.

# Forms

Reuse shared form structure where possible:

- FormSection
- FormActions
- validation summary
- dialog/drawer form shells
- consistent labels/errors/spacing

Feature owns:

- schema
- defaults
- API-to-form mapping
- form-to-API mapping
- feature fields
- mutation

Do not duplicate form chrome.

# API Layer

Never call HTTP directly from:

- page
- component
- table
- visual hook

Use:

```text
Feature component
→ feature hook
→ feature API/service
→ shared API client
→ backend
```

The shared HTTP client owns transport concerns only:

- base URL
- credentials
- headers
- response parsing
- normalized errors

Feature API modules own endpoint knowledge.

# Server and Client State

Use:

```text
Server state
→ TanStack Query

Shareable navigation/filter state
→ URL/search params when appropriate

Local interaction state
→ local React state

Cross-app global state
→ only when genuinely necessary
```

Do not introduce global state to avoid passing a few props.

Do not mirror server state unnecessarily into local/global state.

# Query Conventions

Follow existing query-key patterns.

Prefer feature key factories such as:

```text
bookingKeys.list(...)
bookingKeys.detail(...)
tourKeys.list(...)
```

After mutation:

- invalidate/update only affected queries
- avoid broad cache invalidation without reason

Do not introduce random query-key naming.

# DTO vs View Model

Do not force API DTOs directly into every UI shape when a mapping layer improves clarity.

Use a feature-local mapper when useful:

```text
API DTO
→ mapper
→ feature view model
→ component
```

Do not create mapping layers when the DTO already fits cleanly.

Avoid ceremonial abstractions.

# Theme and Visual System

Theme files own visual decisions only:

- colors
- spacing
- typography
- radius
- shadows
- control sizes
- semantic visual tokens

Theme files must never contain business logic or feature-specific data.

Use existing semantic status mappings.

Do not hand-pick random status colors inside feature components.

For UI work, prefer:

```text
Mantine component API
→ existing project primitives
→ Mantine theme/tokens
→ scoped styles
→ global CSS only for true global structure
```

Do not create a second design system.

# RTL and i18n

Arabic is first-class.

Use logical layout concepts:

- start/end
- inline/block spacing
- RTL-aware directional icons

Avoid unnecessary physical CSS such as:

```text
margin-left
margin-right
left
right
```

Shared components must not contain untranslated user-facing English literals.

Feature copy belongs in the correct i18n namespace.

Never allow raw i18n keys to reach the UI.

# Permissions and Security

Frontend permission checks are UX only.

Backend remains the security authority.

Never:

- trust hidden buttons as security
- send tenant IDs from bodies when route/context already defines tenancy
- weaken tenant isolation for convenience
- bypass existing RBAC guards

Any change involving:

- authentication
- authorization
- tenant isolation
- RBAC
- sensitive public/private boundaries

requires analysis before implementation.

# Backend Work

Follow the nearest established backend module pattern.

Before creating a new pattern, inspect one relevant existing module only.

Respect local conventions for:

- controller
- service
- schemas/validation
- types
- Swagger
- guards
- audit
- Prisma access
- tenant scoping

Do not bypass service/authorization boundaries.

Do not introduce a second backend architectural style.

# Database Work

Schema changes require analysis first.

Before modifying Prisma/migrations:

1. identify existing model/constraint
2. identify affected business invariants
3. identify migration impact
4. identify tenant/security impact
5. propose the smallest schema change
6. wait for approval when required

Never modify database architecture as incidental cleanup.

# Serena

Use Serena before broad code reading for:

- locating symbols
- declarations
- references
- consumers
- file outlines
- impact analysis

Prefer semantic navigation over broad grep/full-file reads.

Use targeted text search when semantic lookup is insufficient.

Do not read large files when the relevant symbol can be inspected directly.

For a shared-component change:

1. find the component symbol
2. inspect its public contract
3. find references/consumers
4. determine the affected regression surface
5. verify only relevant consumers

# Superpowers

Use Superpowers as the engineering discipline layer.

Use the appropriate capability:

```text
creative/new design work
→ brainstorming

large/multi-step implementation
→ writing-plans
→ executing-plans

bug
→ systematic-debugging

behavior change / bug fix
→ test-driven-development when practical

before declaring substantial work complete
→ requesting-code-review / verification discipline
```

Do not duplicate Superpowers instructions in project code or planning files.

This skill defines project rules.

Superpowers defines engineering process.

# planning-with-files

Use `planning-with-files` only when durable planning is useful:

- multiple sequential tasks
- cross-feature work
- migration
- major UI redesign
- backend + frontend integration
- work likely to continue across sessions

Do not use it for:

- tiny bug
- one component change
- one-page cosmetic change
- simple rename
- isolated test fix

For multi-step plans:

- use stable task IDs
- define dependencies
- define DoD per task
- update progress after verified completion
- never reopen `[x]` without a bug/new requirement

# Golden Path — New Data Management Page

Before coding:

1. locate the nearest reference page from `PROJECT_MAP.md`
2. reuse the existing layout
3. reuse PageHeader
4. reuse DataToolbar/SearchInput
5. reuse DataTable
6. reuse RowActionsMenu
7. reuse EmptyState/TableSkeleton/ErrorState
8. reuse shared form primitives for create/edit
9. add feature-local columns/filters/actions only
10. add route/navigation
11. add EN + AR copy
12. add permission gates
13. add focused tests
14. update PROJECT_MAP only if structure changed
15. STOP

Do not copy an existing page implementation wholesale.

Copy the recipe, not the code.

# Golden Path — New Feature

1. locate the nearest existing feature
2. determine the existing layout/recipe
3. create `src/features/<feature>/`
4. add only folders actually needed
5. add feature API/service
6. add query/mutation hooks
7. add feature UI
8. reuse shared primitives
9. keep feature types local
10. add route/navigation only if needed
11. add i18n
12. add focused tests
13. verify direct flow
14. STOP

Do not promote new feature code to shared prematurely.

# Golden Path — Shared Component Change

1. locate the shared component
2. inspect its public contract
3. use Serena to find consumers
4. determine which consumers are affected
5. make one minimal shared change
6. update focused shared tests
7. verify representative affected consumers
8. do not edit unaffected features
9. STOP

If the shared component now requires business-specific knowledge, split feature-specific behavior out instead.

# Golden Path — Bug Fix

Use systematic debugging.

```text
Reproduce
→ gather evidence
→ identify root cause
→ state root cause
→ create/update focused regression test
→ smallest fix
→ verify reproduction gone
→ verify direct regression surface
→ STOP
```

Do not patch symptoms.

Do not perform adjacent cleanup.

If the same solution direction fails twice:

- stop editing
- reassess evidence
- report the blocker/root uncertainty

Do not loop.

# Golden Path — UI/UX Change

1. identify whether the issue is global or feature-local
2. inspect shared primitive/token first
3. fix the shared cause once when appropriate
4. keep business logic untouched
5. verify visual behavior in affected consumers
6. verify EN + AR when user-facing
7. verify responsive behavior when layout changed
8. STOP

Examples:

```text
all page titles wrong
→ PageHeader

all tables wrong
→ DataTable

all form spacing wrong
→ shared form/theme layer

one Trips cell wrong
→ Trips feature only
```

Never patch the same visual issue page-by-page when a shared cause exists.

# Golden Path — Code Review

Review in this order:

1. correctness
2. security / tenant isolation
3. architecture boundaries
4. duplication
5. regression risk
6. tests
7. readability
8. unnecessary complexity

Report concrete findings.

Do not redesign working code during review.

Separate:

- blocking defects
- important improvements
- optional cleanup

# Impact Analysis

Before changing shared infrastructure, determine impact.

Examples:

```text
DataTable change
→ DataTable tests
→ known table consumers

AppShell change
→ routed dashboard screens

API client change
→ feature APIs

theme token change
→ visual consumers
```

Do not verify the entire repository automatically.

Verify the smallest trustworthy regression surface.

Expand only when evidence requires it.

# Minimal Context Rule

Read the minimum necessary to make a correct decision.

Prefer:

```text
PROJECT_MAP
→ relevant symbol
→ direct dependency
→ relevant test
```

over:

```text
entire app
→ entire feature
→ neighboring features
```

If additional context is needed, expand one layer at a time.

Do not reread files already understood unless new evidence requires it.

# Minimal Change Rule

Prefer a diff that:

- changes one responsibility
- preserves working interfaces when possible
- reuses current abstractions
- avoids unrelated formatting
- avoids cleanup outside scope
- is easy to review and revert

Do not optimize for cleverness.

Optimize for obvious correctness.

# Stop Rules

Stop immediately when:

- DoD is satisfied
- relevant tests pass
- requested behavior is verified

Do not continue polishing.

If an unrelated issue is discovered:

- record it
- report it
- do not fix it

If architecture conflicts with the requested task:

- stop
- explain the conflict
- propose options

If schema/security/RBAC/major dependency change becomes necessary:

- stop for approval

If the same fix fails twice:

- stop
- reassess evidence

If task scope expands materially:

- update the plan or request approval before continuing

# Definition of Done

A coding task is complete when:

- requested behavior works
- established architecture is preserved
- no duplicate pattern was introduced
- relevant permissions/tenant boundaries remain intact
- focused tests pass
- relevant typecheck/lint/build pass when applicable
- user-facing EN/AR behavior is verified when affected
- no unrelated code was modified
- project map/status was updated only if necessary

Then STOP.

# Reporting

End with a concise report:

```text
T# [x] <task>

Changed:
- ...

Reused:
- ...

Verified:
- ...

Unrelated issues:
- ...
```

Omit `Unrelated issues` when none were found.

Do not produce a long narrative unless requested.

# Non-Negotiable Rules

Never:

- read the entire repo without a demonstrated need
- create a second implementation of an existing pattern
- perform speculative refactoring
- rewrite a completed module without requirement
- silently change architecture
- silently change database schema
- silently change security/RBAC
- bypass tenant isolation
- move business logic into shared UI
- call APIs directly from pages/components
- introduce cross-feature internal coupling
- invent abstractions before reuse is proven
- fix unrelated issues in passing
- keep coding after DoD is satisfied

Always:

- orient from the map
- verify with current code
- reuse first
- navigate semantically
- make the smallest correct change
- verify the real regression surface
- preserve previous progress
- stop when done
