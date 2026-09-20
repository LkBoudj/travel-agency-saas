# Travel Agency SaaS — Professional Project Study

**Date:** 2026-09-19  
**Repository:** `https://github.com/LkBoudj/travel-agency-saas.git`  
**Scope:** Product architecture, security, domain design, delivery readiness, MVP sequencing, and agent execution readiness.

---

## 1. Executive Assessment

The project has moved beyond prototype stage in its foundation layers. Identity, Platform RBAC, Agency isolation, Agency authorization, member management, dashboard context, security hardening, and the Member Invitations backend core have been deliberately designed and repeatedly verified.

The strongest part of the system is the separation between:

- platform identity and platform authority;
- agency membership and agency authority;
- ownership and permissions;
- user identity and customer/business records;
- tenant context and authentication state.

This is a sound base for a multi-tenant SaaS.

The main project risk is no longer basic architecture. The main risk is **scope expansion before completing the business workflow**. The MVP must therefore be frozen and executed as a narrow vertical product path: Customers -> Tours -> Departures -> Pricing -> Bookings -> Travelers -> Payments.

---

## 2. Product Maturity Snapshot

### Strong / established

- identity model;
- cookie authentication;
- platform RBAC;
- agency ownership model;
- agency-scoped authorization;
- tenant isolation rules;
- dashboard agency context;
- member lifecycle management;
- security awareness and threat-model-driven remediation;
- invitation token security design;
- explicit testing and verification discipline.

### In progress

- real SMTP invitation delivery through Mailpit;
- Member Invitations frontend and acceptance UI.

### Not yet product-complete

- customer management;
- tour management;
- departure scheduling;
- pricing workflow;
- booking lifecycle;
- traveler management;
- manual payment workflow;
- final MVP E2E verification;
- deployment readiness.

---

## 3. Architecture Assessment

### Backend

The NestJS + Prisma + PostgreSQL design is appropriate for this product.

Key positive decisions:

- centralized AppUser identity;
- multi-role RBAC;
- permission-key authorization;
- Agency context resolved from URL/resource rather than stored session state;
- database-level protection for ownership and cross-tenant role assignment where needed;
- Zod-based explicit HTTP contracts;
- intentional serialization instead of exposing Prisma models;
- transaction use for atomic provisioning and invitation acceptance.

### Frontend

The React/Vite Dashboard architecture is appropriate for the MVP.

Positive decisions:

- TanStack Query owns server state;
- Agency code included in query keys;
- no global mutable active Agency;
- permission-aware UX is presentation only;
- compact Dialog/Sheet flows instead of oversized admin pages;
- frontend contracts follow backend contracts rather than inventing local models.

### Multi-tenant design

The project correctly treats tenant isolation as both:

- write isolation; and
- read/privacy isolation.

This distinction was important because the member-candidate security review found that write isolation could be correct while identity reads still leaked cross-tenant PII.

---

## 4. Security Assessment

Security maturity is above average for an MVP-stage project because multiple structural risks were discovered and corrected before launch.

### Security principles already established

- no JWT permission snapshot;
- no OWNER authorization bypass;
- no role-name authorization;
- no Agency global AppUser directory;
- no public registration for MVP;
- invitation consent before membership;
- hashed invitation token storage;
- rate limiting on sensitive identity/token operations;
- audit architecture for sensitive actions;
- production Swagger restrictions;
- no public debug count endpoint.

### Risks that must remain regression-tested

- cross-tenant identity discovery;
- cross-tenant member reads;
- role assignment from another Agency;
- Platform role leaking into Agency authorization;
- Agency permission leaking into Platform Admin APIs;
- member invitation replay;
- wrong-user invitation claim;
- duplicate invitation acceptance race;
- payment integrity when Payments are implemented.

---

## 5. Domain Model Assessment

### Identity vs business entities

The decision to keep `AppUser` separate from `AgencyCustomer` is correct.

A travel agency customer should not need an authenticated SaaS identity just to exist in agency records or appear on a booking.

### Ownership

The use of:

```text
AgencyMembership.membershipType = OWNER | EMPLOYEE
```

is preferable to treating ownership as a role.

This avoids conflating:

- who owns the business; and
- what a user is allowed to do.

### Roles

Global Agency roles plus future Agency-specific custom roles are a good extensibility model.

Custom Role CRUD should remain Post-MVP unless default roles are insufficient for a real MVP user.

### Booking domain

The existing schema already anticipates a serious travel operations model: tours, destinations, itinerary days, departures, pricing options, booking travelers, adjustments/cancellations/history, extra services, payments, and refunds.

The MVP should resist implementing every schema concept merely because the table exists. Only the minimum vertical booking path should be activated first.

---

## 6. Current Product Workflow Assessment

The project currently has a mature access-control shell but not yet a complete travel-business workflow.

This creates a common SaaS development risk: spending too much time on foundation/admin capabilities while the core customer value path remains incomplete.

The next product milestone must therefore prioritize business operations over more foundation work once Member Invitations are closed.

---

## 7. MVP Boundary Recommendation

MVP v0.1 should answer one question:

> Can a real travel agency use this system to onboard staff, manage a customer, build a tour, schedule it, book travelers, and record payment securely?

If yes, ship the pilot MVP.

If a feature does not materially contribute to that answer, defer it.

---

## 8. Recommended MVP Sequence

```text
Current
  Member Invitation SMTP/Mailpit
  Member Invitations Frontend / Acceptance

Then
  Customers
  Tours
  Destinations / Itinerary
  Departures
  Pricing
  Bookings
  Travelers
  Payments

Finally
  Security regression
  Full E2E flow
  MVP cleanup
  Deployment checklist
```

This sequence minimizes rework because each module provides data needed by the next one.

---

## 9. What Should Not Be Built Before MVP Closure

- marketplace;
- website builder;
- custom domains;
- advanced analytics;
- AI features;
- mobile app;
- Stripe/payment gateway;
- advanced refund automation;
- CRM automation;
- complex notifications center;
- custom Agency Role UI;
- ownership transfer;
- advanced reporting;
- public self-signup.

---

## 10. Engineering Process Assessment

The project has adopted a strong working pattern:

```text
DB
-> Backend
-> API verification
-> Frontend
-> Real verification
-> Commit / PR
```

This should remain the standard.

The project should avoid returning to large cross-cutting tasks that change DB, backend, multiple frontends, and unrelated UX simultaneously.

---

## 11. Agent Readiness Assessment

The project is particularly suitable for coding agents because many rules have already been made explicit.

However, agents can still fail if they:

- authorize by role names;
- expose raw Prisma records;
- assume active Agency globally;
- reintroduce user search;
- infer completion from placeholder pages;
- broaden scope beyond the task;
- claim verification that was not performed.

For this reason the companion PRD includes an agent execution contract, source-of-truth hierarchy, task workflow, final report template, and Definition of Done.

---

## 12. Testing Assessment

### Backend

Current testing discipline is strong:

- focused module tests;
- controller-level HTTP behavior;
- transaction/rollback testing;
- real database smoke tests;
- security regression tests;
- migration drift checks.

This discipline must be carried into Customers/Bookings/Payments, especially tenant isolation and monetary integrity.

### Frontend

The dashboard currently relies on pure-logic tests plus real typecheck/lint/build rather than DOM render tests.

That is acceptable for the MVP under the current dependency policy, as long as no one claims visual/browser verification without actually running it.

A render/E2E tool can be introduced later when there is a clear need and explicit approval.

---

## 13. Data Integrity Priorities for Remaining MVP

### Customers

Primary risk: tenant leakage.

### Tours / Departures

Primary risk: cross-Agency relationship creation and inconsistent schedule data.

### Pricing

Primary risk: wrong option/departure relationship and unsafe client-calculated prices.

### Bookings

Primary risks:

- linking resources across Agencies;
- trusting client totals;
- incoherent status/history transitions;
- duplicate or inconsistent adjustments.

### Payments

Primary risks:

- negative or invalid amounts;
- overpayment;
- cross-tenant posting;
- inconsistent paid/remaining balance;
- mutation/audit integrity.

---

## 14. UX Assessment

The compact-form direction is correct for an operations SaaS.

Continue using:

- table/list -> action -> Dialog/Sheet;
- short forms;
- progressive disclosure;
- separate status actions;
- technical identifiers hidden from normal users;
- clear distinction between account status and Agency membership status.

Avoid turning operational tasks into multi-page wizards unless genuinely required.

---

## 15. GitHub Organization Recommendation

After Member Invitations are complete, formalize the MVP in GitHub.

Recommended:

- Milestone: `MVP v0.1`
- One issue per bounded feature slice
- PR per coherent slice
- Labels: backend, frontend, database, security, feature, bug, mvp, post-mvp, blocked
- Board: Backlog -> Ready -> In Progress -> Review -> Done

GitHub should track status; the PRD should track product/architecture rules.

---

## 16. Risks Register

| Risk | Probability | Impact | Control |
|---|---:|---:|---|
| Scope expansion delays usable MVP | High | High | Freeze MVP; Post-MVP default |
| Cross-tenant data leak in new business modules | Medium | Critical | Tenant tests on every module |
| Agent changes architecture inconsistently | Medium | High | Agent-executable PRD + AGENTS rules |
| Payment calculations become client-authoritative | Medium | High | Server-side totals and validation |
| Placeholder UI mistaken for complete feature | Medium | Medium | Real API + E2E verification requirement |
| Invitation email works only in console, not SMTP | Current | Medium | Mailpit real-delivery gate |
| Unrelated uncommitted work mixed into commits | Medium | Medium | Git safety rules and focused branches |
| Too many infrastructure improvements before business flow | High | High | No new platform work unless blocking MVP |

---

## 17. Professional Recommendation

Do not redesign the foundation again unless a concrete defect appears.

The foundation is sufficiently mature for MVP development.

The highest-value move is now:

```text
Finish Invitations
-> Customers
-> Tours
-> Departures
-> Pricing
-> Bookings
-> Travelers
-> Payments
-> Full MVP smoke test
```

This converts the project from a technically strong SaaS shell into a usable travel-agency product.

---

## 18. Final Assessment

### Architecture

**Strong for MVP.** Clear context separation, explicit RBAC, sound multi-tenant direction.

### Security

**Strong and improving.** Critical enumeration flaw was identified before launch and the design moved to consent-based invitations.

### Product completeness

**Foundation-heavy, business-flow incomplete.** This is now the primary gap.

### Technical debt

**Manageable.** Some legacy naming (for example historical Agency Owner role key semantics) should not block MVP if user-visible semantics remain clear and invariants are correct.

### Delivery readiness

**Ready to execute a frozen MVP plan.** Do not expand the architecture; finish the vertical business flow.

---

## Companion Document

Use the following as the authoritative execution PRD for agents:

`TRAVEL_AGENCY_SAAS_MVP_v0.1_AGENT_PRD.md`
