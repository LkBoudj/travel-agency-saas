# تقرير جرد المشروع (Audit) — قراءة فقط

**التاريخ:** 2026-09-18
**الفرع:** `feat/auth-rbac-foundation`
**آخر commit:** `a66f810 feat(platform): add platform users management, agency applications and role keys`
**النطاق:** جرد قراءة فقط — لم يُعدَّل أي كود، ولم تُثبَّت أي تبعية، ولم يُصلَح أي خطأ.

> **تنبيه مهم:** الواقع في الكود **أحدث من `PROJECT_MAP.md`**. الخرائط تقول "Agency غير موجود / Group 2 لم يبدأ" — لكن الـ schema والكود يحتويان فعلاً على `Agency` و`AgencyMembership` و`AgencyApplication` و`AgencyRoleAssignment` مع وحدتين خلفيتين كاملتين.

---

## 1. Prisma Schema

الملف: [backend/prisma/schema.prisma](backend/prisma/schema.prisma) — ملف schema واحد فقط.

### الـ models الموجودة فعلاً (9)

`AppUser` · `Role` · `Permission` · `RolePermission` · `PlatformRoleAssignment` · `Agency` · `AgencyApplication` · `AgencyMembership` · `AgencyRoleAssignment`

### هل يوجد `Agency`؟ ✅ نعم

`@@map("agency")`:

| الحقل | النوع / ملاحظات |
|---|---|
| `id` | BigInt, PK, autoincrement |
| `code` | String, unique, VarChar(24) |
| `name` | String, VarChar(200) |
| `status` | String, default `"ACTIVE"`, VarChar(16) — CHECK `agency_status_check` = ACTIVE \| SUSPENDED |
| `country` | String? VarChar(100) |
| `website` | String? VarChar(255) |
| `description` | String? Text |
| `createdAt` / `updatedAt` | DateTime Timestamptz |
| علاقات | `members: AgencyMembership[]` · `applications: AgencyApplication[]` |

### هل يوجد `AgencyMembership`؟ ✅ نعم

`id`, `agencyId`, `appUserId`, `status` (CHECK `agency_membership_status_check` = ACTIVE \| SUSPENDED), `createdAt`, `updatedAt` · `@@unique([agencyId, appUserId])` · علاقة `agencyRoleAssignments`.

ويوجد أيضاً **`AgencyRoleAssignment`** (`membershipId` + `roleId`, `@@unique([membershipId, roleId])`).

### هل يوجد `AuditLog`؟ ❌ غير موجود

لا يوجد أي model للتدقيق. يوجد فقط مورد صلاحية باسم `AUDIT` في كتالوج الصلاحيات، **بلا جدول يقابله**.

### هل يوجد `Country` / `City`؟ ❌ غير موجودان

لا كـ models. توجد فقط كـ `PERMISSION_RESOURCES` (`COUNTRY`, `CITY`, `CITY_REQUEST`) بلا جداول.

### model المستخدم — اسمه `AppUser` (لا يوجد model باسم `User`)

| الحقل | النوع / ملاحظات |
|---|---|
| `id` | BigInt PK |
| `code` | String unique VarChar(24) — معرّف عام `USR-…` |
| `email` | String unique **Citext** |
| `passwordHash` | String VarChar(255) |
| `firstName` / `lastName` | String? VarChar(100) |
| **`status`** | String, default `"ACTIVE"`, VarChar(16) |
| `createdAt` / `updatedAt` | DateTime Timestamptz |
| علاقات | `platformRoleAssignments`, `agencyApplications`, `agencyApplicationReviews`, `agencyMemberships` |

- **`phone`؟ ❌ غير موجود.**
- **`status`؟ ✅ موجود** — لكنه **`String` وليس enum في Prisma**. القيم مقيّدة بـ DB CHECK `app_user_status_check` = **`ACTIVE` | `SUSPENDED`**. النوع مُعرَّف في TypeScript فقط: `AppUserAccountStatus` في [backend/src/auth/auth-user.ts](backend/src/auth/auth-user.ts) و`platformUserStatusCodeSchema` في [backend/src/platform-users/platform-users.schemas.ts](backend/src/platform-users/platform-users.schemas.ts).

### enums في الـ schema؟ ❌ لا يوجد ولا enum واحد

كل الحالات نصوص مقيّدة بـ CHECK constraints على مستوى PostgreSQL:

`app_user_status_check` · `agency_status_check` · `agency_membership_status_check` · `agency_application_status_check` (PENDING \| NEEDS_INFO \| APPROVED \| REJECTED \| WITHDRAWN) · `role_scope_check` · `permission_scope_check` · `role_agency_scope_check`

---

## 2. Migrations

**10 مجلدات migration** في [backend/prisma/migrations/](backend/prisma/migrations/) بالترتيب:

1. `20260916101639_identity_rbac_foundation`
2. `20260916102901_drop_role_permission_code`
3. `20260916103945_refine_rbac_identifiers`
4. `20260916104751_role_scope_name_unique`
5. `20260916195827_platform_role_assignment`
6. `20260917051422_scoped_platform_permissions`
7. `20260917061114_role_agency_ownership`
8. `20260917071337_add_role_key`
9. `20260917100000_add_app_user_status`
10. `20260917120000_agency_application_foundation`

(+ `migration_lock.toml`)

⚠️ **التحقّق من أنها "مطبّقة" فعلاً على قاعدة البيانات غير ممكن في هذه البيئة**: `npx prisma migrate status` فشل بـ `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL_UNPOOLED` — لا يوجد `.env` محمّل. العدد أعلاه = عدد الـ migrations الموجودة في المستودع.

---

## 3. وحدات الـ Backend

المصدر: [backend/src/](backend/src/). المجلدات (باستثناء `src/generated`):

`auth` · `authorization` · `rbac` · `platform-users` · `agency-applications` · `agencies` · `prisma` · `config`

المسجّلة في [backend/src/app.module.ts](backend/src/app.module.ts): `PrismaModule, AuthModule, AuthorizationModule, RbacModule, PlatformUsersModule, AgencyApplicationsModule, AgenciesModule`.

الإصدار عبر URI بـ `defaultVersion: '1'` ([backend/src/setup-app.ts](backend/src/setup-app.ts)) — أي كل شيء تحت `/v1`.

### `AppController` — [backend/src/app.controller.ts](backend/src/app.controller.ts) *(بلا أي guard)*

- `GET /v1/`
- `GET /v1/prisma-check`

### `AuthModule` — [backend/src/auth/auth.controller.ts](backend/src/auth/auth.controller.ts)

- `POST /v1/auth/register` (عام)
- `POST /v1/auth/login` (عام، `AuthGuard('local')`)
- `POST /v1/auth/logout`
- `GET /v1/auth/me` (`JwtAuthGuard`)

### `RbacModule` — 3 controllers

**[backend/src/rbac/roles.controller.ts](backend/src/rbac/roles.controller.ts)**

- `GET /v1/roles` (`PLATFORM_ROLE_VIEW`)
- `GET /v1/roles/available-permissions` (`PLATFORM_ROLE_VIEW`)
- `GET /v1/roles/:id` (`PLATFORM_ROLE_VIEW`)
- `POST /v1/roles` (`PLATFORM_ROLE_CREATE`)
- `PATCH /v1/roles/:id` (`PLATFORM_ROLE_UPDATE`)
- `DELETE /v1/roles/:id` (`PLATFORM_ROLE_DELETE`)
- `GET /v1/roles/:id/permissions` (`PLATFORM_ROLE_VIEW`)
- `PUT /v1/roles/:id/permissions` (`PLATFORM_ROLE_PERMISSION_MANAGE`)

**[backend/src/rbac/agency-roles.controller.ts](backend/src/rbac/agency-roles.controller.ts)** — نفس السطح للأدوار العامة من نوع AGENCY

- `GET /v1/agency-roles` · `GET /v1/agency-roles/available-permissions` · `GET /v1/agency-roles/:id` · `POST /v1/agency-roles` · `PATCH /v1/agency-roles/:id` · `DELETE /v1/agency-roles/:id` · `GET /v1/agency-roles/:id/permissions` · `PUT /v1/agency-roles/:id/permissions`
- الصلاحيات: `PLATFORM_AGENCY_ROLE_VIEW` / `_CREATE` / `_UPDATE` / `_DELETE` / `PLATFORM_AGENCY_ROLE_PERMISSION_MANAGE`

**[backend/src/rbac/permissions.controller.ts](backend/src/rbac/permissions.controller.ts)**

- `GET /v1/permissions` (`PLATFORM_ROLE_VIEW`) — قراءة فقط، لا CRUD للصلاحيات

### `PlatformUsersModule` — [backend/src/platform-users/platform-users.controller.ts](backend/src/platform-users/platform-users.controller.ts)

- `GET /v1/platform-users` (`PLATFORM_USER_VIEW`)
- `GET /v1/platform-users/:code` (`PLATFORM_USER_VIEW`)
- `GET /v1/platform-users/:code/roles` (`PLATFORM_USER_ROLE_VIEW`)
- `POST /v1/platform-users` (`PLATFORM_USER_CREATE`)
- `PATCH /v1/platform-users/:code` (`PLATFORM_USER_UPDATE`)
- `PATCH /v1/platform-users/:code/status` (`PLATFORM_USER_DISABLE`)
- `PUT /v1/platform-users/:code/roles` (`PLATFORM_USER_ROLE_MANAGE`)

### `AgencyApplicationsModule` — [backend/src/agency-applications/agency-applications.controller.ts](backend/src/agency-applications/agency-applications.controller.ts) — **controllerان**

مسار المتقدّم (مصادقة فقط، بلا `@RequirePermissions`):

- `POST /v1/agency-applications`
- `GET /v1/agency-applications/mine`
- `POST /v1/agency-applications/:id/withdraw`

مسار المنصّة:

- `GET /v1/admin/agency-applications` (`PLATFORM_AGENCY_APPLICATION_VIEW`)
- `GET /v1/admin/agency-applications/:id` (`PLATFORM_AGENCY_APPLICATION_VIEW`)
- `PATCH /v1/admin/agency-applications/:id/needs-info` (`PLATFORM_AGENCY_APPLICATION_VIEW`)
- `PATCH /v1/admin/agency-applications/:id/reject` (`PLATFORM_AGENCY_APPLICATION_REJECT`)
- `POST /v1/admin/agency-applications/:id/approve` (`PLATFORM_AGENCY_APPLICATION_APPROVE`)

### `AgenciesModule` — [backend/src/agencies/agencies.controller.ts](backend/src/agencies/agencies.controller.ts)

- `GET /v1/agencies` (`PLATFORM_AGENCY_VIEW`)
- `GET /v1/agencies/:code` (`PLATFORM_AGENCY_VIEW`)
- ❌ لا يوجد POST/PATCH/DELETE — الوكالة تُنشأ **فقط** عبر اعتماد طلب (`approve`)

### ملاحظات على البنية التحتية

- `GET /health` — **غير موجود**
- CORS — **غير مُعدّ** (لا استدعاء `enableCors` في `setup-app.ts` ولا `main.ts`)
- Swagger على `/docs` في [backend/src/main.ts](backend/src/main.ts)

---

## 4. المصادقة والصلاحيات

### اشتقاق الهوية من الجلسة

- **الـ strategy:** `JwtStrategy` في [backend/src/auth/strategies/jwt.strategy.ts](backend/src/auth/strategies/jwt.strategy.ts) — تستخرج الـ JWT **حصراً من كوكي** `travel_access_token` عبر `cookieJwtExtractor` (لا Authorization header)
- **الـ guard:** `JwtAuthGuard` في [backend/src/auth/guards/jwt-auth.guard.ts](backend/src/auth/guards/jwt-auth.guard.ts) (امتداد بسيط لـ `AuthGuard('jwt')`)
- **السلسلة:** payload `{ sub }` فقط ← `BigInt(sub)` ← `prisma.appUser.findUnique` ← **رفض 401 إذا `status === 'SUSPENDED'`** ← `InternalAuthUser { id, code, email, firstName, lastName, status }`
- **الـ decorator:** `@CurrentUser()` في [backend/src/auth/decorators/current-user.decorator.ts](backend/src/auth/decorators/current-user.decorator.ts)

### هل يوجد اشتقاق لـ `agencyId` من الجلسة؟ ❌ لا

لا يوجد أي منطق يضع `agencyId` في `request.user` أو يشتقّه من العضوية. `InternalAuthUser` لا يحمل `agencyId` إطلاقاً.

كل ظهور لـ `agencyId` في الكود هو إمّا:

- حقل ملكية في RBAC — [backend/src/rbac/roles.service.ts](backend/src/rbac/roles.service.ts)
- فلتر ثابت `agencyId: null` — [backend/src/platform-users/platform-users.service.ts](backend/src/platform-users/platform-users.service.ts)
- إنشاء العضوية عند الاعتماد — [backend/src/agency-applications/agency-applications.service.ts](backend/src/agency-applications/agency-applications.service.ts)

**طبقة سياق المستأجر (tenant context) غير موجودة بعد.**

### تعريف الصلاحيات في CASL

[backend/src/authorization/casl-ability.factory.ts](backend/src/authorization/casl-ability.factory.ts) — نموذج مبسّط جداً:

- النوع: `MongoAbility<[PlatformPermissionKey, 'all']>` حيث `PlatformPermissionKey = string`
- **الـ subject الوحيد = `'all'`** حرفياً. لا توجد subjects حقيقية (لا `Agency`، لا `User`…)
- **الـ actions = مفاتيح الصلاحيات نفسها** كسلاسل: `can(key, 'all')` لكل مفتاح. أي لا يوجد قاموس actions داخل CASL — الدلالة كلها في الكتالوج
- القرار في [backend/src/authorization/permission.guard.ts](backend/src/authorization/permission.guard.ts): `required.every(key => ability.can(key, 'all'))` ← 401 بلا هوية، 403 بصلاحية ناقصة
- المفاتيح تُحمَّل من قاعدة البيانات في كل طلب عبر [backend/src/authorization/platform-permissions.service.ts](backend/src/authorization/platform-permissions.service.ts)، مفلترة بـ `role.scope = PLATFORM` **و** `permission.scope = PLATFORM`

الكتالوج الحقيقي في [backend/src/rbac/rbac.types.ts](backend/src/rbac/rbac.types.ts) بصيغة `<SCOPE>_<RESOURCE>_<ACTION>`:

**RESOURCES (23):** USER, ROLE, ROLE_PERMISSION, USER_ROLE, AGENCY_ROLE, AGENCY_ROLE_PERMISSION, AGENCY, AGENCY_STATUS, AGENCY_APPLICATION, COUNTRY, CITY, CITY_REQUEST, AUDIT, MEMBER, MEMBER_ROLE, CUSTOMER, TOUR, DEPARTURE, PRICING, EXTRA_SERVICE, BOOKING, PAYMENT, REFUND

**ACTIONS (15):** VIEW, CREATE, UPDATE, DISABLE, DELETE, MANAGE, APPROVE, REJECT, INVITE, REMOVE, ARCHIVE, PUBLISH, CANCEL, ADJUST, RECORD

**SCOPES:** `PLATFORM` | `AGENCY`

التعريفات في [backend/src/rbac/rbac.constants.ts](backend/src/rbac/rbac.constants.ts): `RBAC_PERMISSION_CATALOG` + `DEFAULT_PLATFORM_ROLES` + `DEFAULT_GLOBAL_AGENCY_ROLES`.

⚠️ موارد مثل `AUDIT`, `COUNTRY`, `CITY`, `TOUR`, `BOOKING`, `PAYMENT`, `REFUND` معرّفة كصلاحيات **بلا أي جداول أو endpoints تقابلها**.

### التمييز بين "مستخدم منصّة" و"عضو وكالة"؟ ✅ نعم — على مستوى البيانات لا الهوية

- هوية واحدة `AppUser` للاثنين
- **"مستخدم منصّة"** = `AppUser` له `PlatformRoleAssignment` بـ `role.scope='PLATFORM'` و`agencyId=null` — التعريف منفَّذ في كل استعلام داخل [backend/src/platform-users/platform-users.service.ts](backend/src/platform-users/platform-users.service.ts)
- **"عضو وكالة"** = صف `AgencyMembership` + `AgencyRoleAssignment`

⚠️ لكن **لا يوجد إنفاذ للصلاحيات من جهة الوكالة**: `PlatformPermissionsService` يقرأ `platformRoleAssignment` فقط؛ لا توجد خدمة تقرأ صلاحيات عبر `AgencyMembership → AgencyRoleAssignment`. الأدوار التي تُمنح عند اعتماد الطلب مُخزَّنة لكنها **غير مُفعَّلة في أي guard**.

---

## 5. إدارة مستخدمي المنصّة

الوحدة: [backend/src/platform-users/](backend/src/platform-users/)

### كيف يُنشأ مستخدم جديد؟ → إنشاء مباشر بكلمة مرور ❌ لا دعوة عبر بريد

`POST /v1/platform-users` يستقبل `{ email, password (8–72), firstName?, lastName?, roleKeys[] (1..50) }` ([platform-users.schemas.ts](backend/src/platform-users/platform-users.schemas.ts) مع `.strict()`)، ويُنشئ في معاملة واحدة:

`argon2.hash(password)` + `generateAppUserCode()` + `AppUser` + `PlatformRoleAssignment`

- `roleKeys` **إلزامي** (لا مستخدمين بلا دور)
- الأدوار AGENCY مرفوضة: `AGENCY_ROLE_NOT_ASSIGNABLE`
- المفاتيح المجهولة: `UNKNOWN_PLATFORM_ROLE_KEYS`
- الإيميل المكرر: 409 `EMAIL_ALREADY_REGISTERED`

### هل يوجد حقل/جدول للدعوات (invitation/token)؟ ❌ غير موجود

لا model، لا جدول، لا حقل token، ولا حتى `emailVerifiedAt`.

### هل يوجد إرسال بريد إلكتروني فعلي؟ ❌ غير موجود

لا `nodemailer` ولا `@nestjs-modules/mailer` ولا SendGrid/Resend/SMTP/Mailgun/Postmark في `dependencies`، ولا أي إشارة في `src/`.

التبعيات الفعلية: `@casl/ability`, `@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/platform-express`, `@nestjs/swagger`, `@prisma/adapter-neon`, `@prisma/client`, `argon2`, `passport`, `passport-jwt`, `passport-local`, `reflect-metadata`, `rxjs`, `zod` — **لا شيء للبريد**.

### هل يوجد Suspend أم حذف فقط؟ → Suspend فقط ❌ لا يوجد أي endpoint لحذف مستخدم

- `PATCH /v1/platform-users/:code/status` بـ `{ status: 'ACTIVE' | 'SUSPENDED' }`
- الحذف الوحيد في المشروع كله هو `DELETE /v1/roles/:id` و`DELETE /v1/agency-roles/:id`
- الإيقاف فعّال فوراً: `JwtStrategy` يرفض `SUSPENDED` في كل طلب، فتتعطّل الكوكي القائمة دون انتظار انتهاء الـ JWT

### الحمايات

| الحماية | الحالة | المرجع |
|---|---|---|
| منع إيقاف المستخدم لنفسه | ✅ موجودة — 400 `CANNOT_SUSPEND_OWN_ACCOUNT` | [platform-users.service.ts:122](backend/src/platform-users/platform-users.service.ts#L122) |
| منع حذف دور له تعيينات | ✅ موجودة — 409 `ROLE_HAS_PLATFORM_ASSIGNMENTS` | [roles.service.ts:92](backend/src/rbac/roles.service.ts#L92) |
| **منع حذف آخر Super Admin** | ❌ **غير موجودة** | — |

⚠️ **الفجوة الأمنية الأبرز:** لا شيء يمنع `PUT /v1/platform-users/:code/roles` من نزع `PLATFORM_ADMIN` عن آخر مالك له. `replaceRoles` يحذف كل التعيينات ثم يُعيد الإنشاء، **بلا أي فحص للذات ولا عدّ لحاملي الدور** — أي يمكن للمشرف أن يسلب نفسه (أو الجميع) صلاحية الإدارة بلا رجعة عبر الـ API.

---

## 6. واجهة frontend/admin

المصدر: [frontend/admin/src/](frontend/admin/src/)

### المسارات (routes)

المعرَّفة في [route-paths.ts](frontend/admin/src/app/router/route-paths.ts) و[routes.tsx](frontend/admin/src/app/router/routes.tsx):

| المسار | الصفحة | الحماية |
|---|---|---|
| `/login` | [login-page.tsx](frontend/admin/src/features/auth/pages/login-page.tsx) | `GuestOnly` |
| `/` | إعادة توجيه ← `/overview` | `RequireAuth` |
| `/overview` | [overview-page.tsx](frontend/admin/src/features/platform/pages/overview-page.tsx) | `RequireAuth` |
| `/users` | إعادة توجيه ← `/users/platform-users` | `RequireAuth` |
| `/users/platform-users` | [users-page.tsx](frontend/admin/src/features/platform/pages/users-page.tsx) | `RequireAuth` |
| `/roles-and-permissions` | [roles-permissions-page.tsx](frontend/admin/src/features/platform/pages/roles-permissions-page.tsx) | `RequireAuth` |
| `*` | إعادة توجيه ← `/` | — |

### الـ Sidebar

المسار: [frontend/admin/src/components/app-sidebar.tsx](frontend/admin/src/components/app-sidebar.tsx) — مصفوفة `platformNav`، والعرض عبر [nav-main.tsx](frontend/admin/src/components/nav-main.tsx).

البنود الحالية **ثلاثة فقط**:

1. `Overview` ← `/overview`
2. `Users` ← `/users/platform-users` (بند فرعي واحد: *Platform Users*)
3. `Roles & Permissions` ← `/roles-and-permissions`

⚠️ **لا يوجد أي بند أو صفحة لـ Agencies أو Agency Applications** رغم وجود الـ endpoints الخلفية كاملة (`/v1/agencies`, `/v1/admin/agency-applications`) — هذه أكبر فجوة بين الخلفية والواجهة.

### كيف تُستدعى الـ APIs؟

عميل HTTP واحد في [frontend/admin/src/lib/api.ts](frontend/admin/src/lib/api.ts):

- دالة `apiRequest<T>` فوق `fetch` مع `credentials: "include"`
- `VITE_API_BASE_URL` (افتراضي `http://localhost:3000`)
- صنف `ApiError { message, status, code }` يقرأ `errorCode` من جسم الخطأ

تستهلكه ملفات الـ API عبر TanStack Query hooks:

- [auth.api.ts](frontend/admin/src/features/auth/api/auth.api.ts)
- [roles.api.ts](frontend/admin/src/features/platform/api/roles.api.ts)
- [permissions.api.ts](frontend/admin/src/features/platform/api/permissions.api.ts)
- [platform-users.api.ts](frontend/admin/src/features/platform/api/platform-users.api.ts)

### هل يوجد كود وهمي/mock متبقٍّ؟ ❌ لا يوجد

بحث عن `mock|fake|dummy|stub|hardcod|demo|TODO|FIXME` لم يُرجع إلا:

- سمات `placeholder=` في حقول الإدخال (طبيعية، ليست كوداً وهمياً)
- مكوّن [placeholder-page.tsx](frontend/admin/src/features/platform/components/placeholder-page.tsx) وصفحة `Overview` التي تستخدمه — وهو **placeholder صادق** يقول "Not implemented yet" ولا يفبرك أي مقاييس

لا توجد بيانات وهمية، ولا mock API، ولا مصادقة مزيّفة. الاختبارات (`*.test.ts` لدوال pure) لا تتضمن mock للخادم.

---

## 7. حالة التحقّق

### `backend/`

| الأمر | النتيجة |
|---|---|
| `npm run lint` (`oxlint --type-aware src/ test/`) | ✅ **نجح** — exit 0، مع **3 تحذيرات** |
| `npm run typecheck` | ⚠️ **السكربت غير موجود** في `backend/package.json` — فحص الأنواع يجري ضمن `build` |
| `npm run build` (`nest build`) | ✅ **نجح** — exit 0، بلا أخطاء |

التحذيرات الثلاثة (`no-unused-vars`، غير حاجبة):

- `LIST_AGENCY_APPLICATIONS_QUERY_SCHEMA` — [agency-applications.controller.ts:49](backend/src/agency-applications/agency-applications.controller.ts#L49)
- `Prisma` — [agency-applications.service.ts:7](backend/src/agency-applications/agency-applications.service.ts#L7)
- `PLATFORM_KEYS` — [agency-applications.controller.spec.ts:314](backend/src/agency-applications/agency-applications.controller.spec.ts#L314)

### `frontend/admin/`

| الأمر | النتيجة |
|---|---|
| `npm run lint` (`oxlint`) | ❌ **فشل** — `'oxlint' is not recognized…` |
| `npm run typecheck` | ⚠️ **السكربت غير موجود**؛ فحص الأنواع ضمن `build` (`tsc -b`) |
| `npm run build` (`tsc -b && vite build`) | ❌ **فشل** — `error TS2688: Cannot find type definition file for 'vite/client'` و`… for 'node'` |

**السبب الجذري واحد:** `frontend/admin/node_modules` **غير موجود** — التبعيات لم تُثبَّت. الفشلان بيئيان ولا يدلّان على خطأ في الكود؛ لا يمكن الحكم على صحة `frontend/admin` قبل التثبيت.

لم يُصلَح أي خطأ ولم يُشغَّل أي تثبيت (ممنوع بموجب سياسة [AGENTS.md](AGENTS.md)).

الأمر المطلوب منك لإكمال التحقّق:

```
cd frontend/admin && npm install
```

---

## ملاحظات عابرة للأقسام (أولويات)

1. **`PROJECT_MAP.md` والخريطة الخلفية قديمتان** — تنصّان على أن `Agency` وعضويات الوكالة غير موجودة، والواقع أن migration رقم 10 أضاف `Agency` + `AgencyApplication` + `AgencyMembership` + `AgencyRoleAssignment` مع وحدتين خلفيتين كاملتين. يجب تحديث الخرائط.
2. **أخطر فجوة أمنية:** غياب حماية "آخر مشرف" في `PUT /v1/platform-users/:code/roles`.
3. **فجوة إنفاذ:** أدوار الوكالة تُخزَّن عند الاعتماد لكن لا guard يقرأها — لا يوجد `agencyId` في سياق الجلسة، ولا خدمة صلاحيات AGENCY.
4. **لا CORS ولا `GET /health`** في الخلفية، رغم أن الواجهات تعتمد على `credentials: "include"` عبر أصل مختلف.
5. **فجوة واجهة:** `frontend/admin` لا يعرض Agencies ولا Agency Applications رغم جاهزية الـ API.
6. **23 مورد صلاحية مقابل 9 models** — كتالوج الصلاحيات يسبق نموذج البيانات بفارق كبير (AUDIT، COUNTRY، CITY، TOUR، BOOKING، PAYMENT، REFUND… بلا جداول).
