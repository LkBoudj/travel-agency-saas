# Module K — Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Agency staff record manual payments and see the remaining booking balance (server-authoritative arithmetic).

**Architecture:** Reuses the merged Module J backbone (server-authoritative booking total + per_person×seats price-line + frozen reserved seats + EN/AR RTL i18n + RBAC/audit/RBAC-guard chain). Adds a `Payment` row slice: `record` is a same-booking transaction guarded by RBAC `AGENCY_PAYMENT_*` + status + remaining-balance arithmetic; the server total/remaining is authoritative, client is a UX-only gate. No external gateway (PRD §23: manual only; gateway/roadmap stays far-future).

**Tech Stack:** NestJS 12 + Prisma + Neon (backend payments slice); Vite React SPA + react-i18next double-brace `{{var}}` + RTL (frontend dashboard). Node `node --test` + backend e2e.

**Spec:** `docs/TRAVEL_AGENCY_SAAS_MVP_v0.1_AGENT_PRD.md` §23 (Module K — Payments) + Module J merged roadmap (Module K is the next shipped payment slice). PRD example: `Booking total: 120,000 DZD / Paid 50,000 / Remaining 70,000`.

## Global Constraints (verbatim from AGENTS.md, apply to every task)

- **No fabricated behavior.** Never simulate auth, tenants, payments, gateways, or API responses. Backend guards authoritative; frontend gates are UX only. No hardcoded `authenticated = true`, no fake JWT/localStorage login, no fake endpoints.
- **Official tooling first**; do not hand-roll what the framework provides.
- **Dependency policy:** `package.json` is source of truth; never `npm install` in code; report exact command if a dependency is missing.
- **Never invent files or paths.** Verify a file exists before referencing it.
- **No secrets/keys** in code, logs, or commits.
- **RTL/Arabic:** `ar` is a product language; keep i18n interpolation **double-brace** `{{var}}` (single-brace renders literally — the Module J regression that is now a global gate). A dedicated i18n namespace must exist before any UI string; EN + AR RTL-correct.
- **AGENTS §7 safety:** no destructive git (no `reset --hard`, no force-push).

## Review Focus (failure classes the spec implies but no task's tests exercise)

1. **Negative amount.** `amount <= 0` must be rejected by the schema/validator (400), never recorded.
2. **Overpayment.** `remaining < amount` must be rejected server-side with a dedicated code (books is authoritative; never mint a negative balance).
3. **Restricted namespace.** Any single-brace `{token}` in Module K i18n (both locales) must be caught by the honest token scanner = ZERO; all interpolated keys are `{{...}}`.
4. **RBAC gate.** `AGENCY_PAYMENT_*` missing → the record action must be hidden (UX) AND any direct call returns 403 (RBAC guard authoritative).
5. **Currency mismatch.** Payment currency must equal booking currency (server enforced; RTL AR).
6. **Concurrency:** two simultaneous records must not let Σpaid exceed total (row-lock on booking, mirror Module J concurrency e2e).
7. **Booking freeze:** payments on a non-actionable (frozen/terminal) booking must 409, matching the Module J travelers gate style.

## Task Structure

Each step is one bolt: write failing test → run to see it fail → implement minimal → run again green → next. Commit per task on `feat/module-k-payments`; Module K merges to main only after the full slice is green.

### Task K1: Backend payments slice (datamodel + migration + RBAC + service + controller + audit + e2e)

**Files**
- Create: `backend/prisma/migrations/<ts>_module_k_payments/migration.sql`
- Create: `backend/src/payments/payments.module.ts`
- Create: `backend/src/payments/payments.service.ts`
- Create: `backend/src/payments/payments.controller.ts`
- Create: `backend/src/payments/payments.types.ts`
- `backend/src/payments/payments.schemas.ts`
- Create: `backend/src/payments/payments.rbac.ts`
- Modify: `backend/prisma/schema.prisma` (Payment model)
- Modify: `backend/src/app.module.ts` (register PaymentsModule)
- Modify: `backend/src/rbac/rbac.constants.ts` + `rbac.types.ts` (AGENCY_PAYMENT_* entries) + RBAC catalog spec
- Create: `backend/test/payments.e2e-spec.ts`

**Interfaces**
- Consumes: `BookingService.findForAgencyByCode`, `BookingPriceLine` service total (authoritative), `RBACGuard`/audit, `AgencyUser` RBAC (Module J pattern).
- Produces: `PaymentsService.listForBooking(agencyCode, bookingCode)` → `Payment[]`; `PaymentsService.record({bookingCode, amount, currency, note, recordedById, agencyId})` → `{payment, remaining}`; `PaymentsService.remaining(booking)` = `booking.total − Σ(paid)`.

- [ ] K1-1: Write the failing e2e (record payment on a seeded CONFIRMED booking with a 409 gate when cancelled/terminal; assert `remaining` matches PRD arithmetic).
- [ ] K1-2: Run, confirm red.
- [ ] K1-3: Add `Payment` Prisma model + migration SQL (`amount DECIMAL(12,2) CHECK (amount > 0)`, `currency` (2-char, equals booking), FK to booking row-locked, `recorded_by`, `note`, audit); regen prisma client.
- [ ] K1-4: RBAC `AGENCY_PAYMENT_*` + capability catalog + audit `AGENCY_PAYMENT_RECORDED`.
- [ ] K1-5: Service `record` (transaction + `SELECT ... FOR UPDATE` on booking; remaining = total − Σ paid; 400/403/409 guards) + controller + module wiring.
- [ ] K1-6: Green e2e + RBAC guard spec update; full `npm run typecheck` + `npm run lint` + `npm run build` green.

### Task K2: Frontend payments slice (record dialog + hooks + payload lib + i18n RTL)

**Files**
- Create: `frontend/dashboard/src/features/payments/components/payment-record-dialog.tsx`
- Create: `frontend/dashboard/src/features/payments/hooks/use-payments.ts`
- Create: `frontend/dashboard/src/features/payments/lib/payment-payloads.ts` (+ `.test.ts`)
- Create: `frontend/dashboard/src/i18n/locales/en/payments.json` + `ar/payments.json`
- Modify: `frontend/dashboard/src/i18n/index.ts` (register `payments` namespace)
- Modify: `frontend/dashboard/src/features/bookings/pages/booking-details-page.tsx` (PaymentsPanel mount, gated on `AGENCY_PAYMENT_*` via `usePaymentCapabilities`)

**Interfaces**
- Consumes: `booking.total` + `currency` (existing), `useBookingCapabilities`, `PaymentsService.listForBooking`/`record`.
- Produces: `PaymentRow`, `recordPaymentPayload({amount, currency, note})` (validator-gated), `remaining` from server only.

- [ ] K2-1: Write failing payload/hook tests + i18n namespace; honest token scanner ZERO for both locales.
- [ ] K2-2: Run, confirm red (scanner finds at least the placeholder or interpolation).
- [ ] K2-3: Implement payload libs + usePayments hook + record dialog (submit `disabled={pending || !valid}`).
- [ ] K2-4: Wire PaymentsPanel into booking-details-page gated on capabilities (UX gate only; backend guards authoritative).
- [ ] K2-5: Green (node --test unit + typecheck + lint + build); i18n scanner ZERO.

### Task K3: Docs + commit + merge

- [ ] K3-1: PROJECT_MAP.md byte-flip: Module K roadmap "Payments (Module K) — not in slice" → shipped; add `payments` namespace i18n (EN+AR) + Module K roadmap line.
- [ ] K3-2: Pre-merge continuum e2e (bookings → travelers → payments) all green; byte-truth Sweallow/PROJECT_MAP honesty scan.
- [ ] K3-3: Commit (`feat: complete payments (Module K)`), merge `feat/module-k-payments` → main (mirror `e01a5c7` style).
- [ ] K3-4: Update AGENTS.md / PROJECT_MAP roadmap: Module K shipped; next slice = roadmap far-future (billing/subscription, online gateway — explicitly NOT MVP, no fabrication).

NOT in this slice (roadmap-future, do NOT fabricate): external payment gateway / Stripe, online checkout, billing/subscription enforcement, recurring/billing, custom-domain automation.
