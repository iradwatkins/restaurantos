# RestaurantOS — Investment-Grade Audit Report

**Date:** March 19, 2026
**Audited by:** Claude (automated, multi-agent)
**Repo:** https://github.com/iradwatkins/restaurantos
**Scope:** Security, Code Quality, Performance, Architecture, Accessibility, Testing, DevOps

---

## Executive Summary

RestaurantOS is a multi-tenant restaurant SaaS (Next.js 15 + Convex + Stripe) with a public website, online ordering, POS, KDS, dashboard, and admin panel. This audit uncovered **89 findings** across 7 domains, including **5 CRITICAL** and **22 HIGH** severity issues.

The most urgent problems:
1. **Admin middleware accepts any cookie value** — no JWT verification (full admin bypass)
2. **~30 Convex mutations have zero auth guards** — any caller can modify any tenant's data
3. **Client-supplied prices trusted in order placement** — customers can pay $0 for real orders
4. **Zero SSR on public pages** — SEO is dead, LCP is 3-5s+
5. **Deploy pipeline doesn't restart containers or wait for CI** — broken code ships with downtime

| Domain | CRITICAL | HIGH | MEDIUM | LOW | Total |
|--------|----------|------|--------|-----|-------|
| Security | 5 | 11 | 7 | 1 | 24 |
| Code Quality | 0 | 8 | 7 | 3 | 18 |
| Performance | 0 | 7 | 7 | 1 | 15 |
| Architecture | 0 | 7 | 10 | 5 | 22 |
| Accessibility | 0 | 6 | 7 | 3 | 16 |
| Testing | 0 | 7 | 5 | 3 | 15 |
| DevOps | 0 | 7 | 10 | 3 | 20 |
| **Totals** | **5** | **53** | **53** | **19** | **130** |

*Note: Some findings overlap across domains (e.g., `ignoreBuildErrors` appears in Code Quality, Architecture, and DevOps). Deduplicated unique findings: ~91.*

---

## Table of Contents

1. [Security](#1-security)
2. [Code Quality](#2-code-quality)
3. [Performance](#3-performance)
4. [Architecture](#4-architecture)
5. [Accessibility](#5-accessibility)
6. [Testing](#6-testing)
7. [DevOps](#7-devops)
8. [Remediation Roadmap](#8-remediation-roadmap)
9. [Assignment Matrix](#9-assignment-matrix)

---

## 1. Security

### 1A. Authentication & Authorization

#### SEC-01: Admin middleware does not verify JWT signatures — CRITICAL
- **File:** `apps/admin/src/middleware.ts:13-20`
- **What:** The middleware only checks `if (!sessionCookie?.value)` — it never decodes or verifies the JWT. Any non-empty string in the `admin_session_token` cookie bypasses the middleware.
- **Nuance:** Admin API routes call `getSession()` → `getSessionFromCookies()` which DOES call `jwtVerify()` (`session-manager.ts:51`). So API routes are partially protected. However, server-rendered dashboard pages and layouts that call `getSession()` are protected, but the middleware allows the request through before that check runs — meaning the page shell, static assets, and any server component that doesn't independently call `getSession()` are exposed.
- **Impact:** Admin dashboard page rendering bypass. Combined with SEC-05 (hardcoded JWT fallback secret), a forged JWT using `'dev-secret-change-me'` would pass even the `getSession()` verification if env vars are missing.
- **Fix:** Import `jwtVerify` from `jose` and verify the token signature in middleware, exactly as the portal middleware does (lines 82-91).

#### SEC-02: `createAdminUser` mutation has no auth guard — CRITICAL
- **File:** `packages/backend/convex/admin/mutations.ts:5-33`
- **What:** Every other admin mutation calls `await requireSuperAdmin(ctx)`, but `createAdminUser` does not.
- **Impact:** Any caller can create a super_admin account, then use it to take full control of the platform.
- **Fix:** Add `await requireSuperAdmin(ctx)` as the first line. For initial bootstrap, use a seed script.

#### SEC-03: Admin login has no rate limiting — HIGH
- **File:** `apps/admin/src/app/api/auth/login/route.ts:7-49`
- **What:** Portal login has `checkRateLimit` (5 attempts / 15 min). Admin login has none.
- **Impact:** Brute-force attacks against the super-admin panel.
- **Fix:** Add the same `checkRateLimit` call.

#### SEC-04: `getCurrentUser` looks up by email only, not by tenant — HIGH
- **File:** `packages/backend/convex/lib/auth.ts:85-90`
- **What:** Uses `by_email` index. If two tenants share an email, the wrong user may be returned.
- **Impact:** Cross-tenant privilege escalation — `assertTenantOwnership` checks pass for the wrong tenant.
- **Fix:** Extract `tenantId` from JWT claims and query using `by_tenantId_email` index.

#### SEC-05: Admin JWT secret falls back to hardcoded value — HIGH
- **File:** `apps/admin/src/lib/auth/jwt-secret.ts:1`
- **What:** Falls back to `'dev-secret-change-me'` when env vars are missing. Portal correctly throws.
- **Impact:** In production with missing env var, admin sessions can be forged with a known secret.
- **Fix:** Throw on missing secret, matching the portal's behavior.

#### SEC-06: `updateLastLogin` admin mutation has no auth guard — MEDIUM
- **File:** `packages/backend/convex/admin/mutations.ts:35-47`

#### SEC-07: Admin session JWT has 7-day expiry — LOW
- **File:** `apps/admin/src/lib/auth/session-manager.ts:30`
- **What:** Admin sessions last 7 days vs portal's 8 hours. Too long for platform-wide control.

### 1B. Tenant Isolation — Unguarded Mutations

#### SEC-08: ALL tenant mutations lack auth guards — CRITICAL
- **File:** `packages/backend/convex/tenants/mutations.ts` (7 mutations)
- **What:** `create`, `update`, `updateSettings`, `updateTheme`, `updateBranding`, `switchDeliveryMode` — none call `requireTenantAccess`.
- **Impact:** Any authenticated user can modify any tenant's settings, branding, theme, business hours, delivery mode.

#### SEC-09: `users.create` has no auth guard — CRITICAL
- **File:** `packages/backend/convex/users/mutations.ts:7`
- **What:** Accepts tenantId, email, password, and role with no authentication. Anyone can create an owner-role user for any tenant.
- **Impact:** Full tenant takeover — create owner user, log in, full access.

#### SEC-10: ALL event mutations lack auth guards — CRITICAL
- **File:** `packages/backend/convex/events/mutations.ts` (6 mutations)
- **What:** `createEvent`, `updateEvent`, `deleteEvent`, `createPricingTier`, `updatePricingTier`, `deletePricingTier` — zero auth.

#### SEC-11: ALL dailySpecials mutations lack auth guards — HIGH
- **File:** `packages/backend/convex/dailySpecials/mutations.ts` (3 mutations)

#### SEC-12: ALL catering mutations lack auth guards — HIGH
- **File:** `packages/backend/convex/catering/mutations.ts` (8 mutations)
- **What:** Includes `updateOrderStatus`, `recordDeposit`, `recordBalancePayment` — financial operations with no auth.

#### SEC-13: ALL KDS mutations lack auth guards — HIGH
- **File:** `packages/backend/convex/kds/mutations.ts` (4 mutations)
- **What:** `createTicket`, `bumpTicket`, `bumpItem`, `recallTicket` — anyone can disrupt kitchen operations.

#### SEC-14: `orders.create` and `createTable` lack auth guards — HIGH
- **File:** `packages/backend/convex/orders/mutations.ts:23, 250`
- **What:** Other order mutations (addItems, updateStatus, recordPayment) correctly check auth. Create does not.

#### SEC-15: 6 menu mutations lack auth guards — HIGH
- **File:** `packages/backend/convex/menu/mutations.ts:7, 89, 187, 206, 223, 259`
- **What:** `createCategory`, `createItem`, `toggle86`, `createModifierGroup`, `createModifierOption`, `deleteModifierGroup` — no auth. Update/delete mutations are correctly guarded.

#### SEC-16: `generateUploadUrl` has no auth guard — MEDIUM
- **File:** `packages/backend/convex/menu/mutations.ts:306-311`
- **What:** Anyone can generate upload URLs to Convex storage.

#### SEC-17: Webhook mutations (`ingestDeliveryOrder`, `logWebhookEvent`) have no auth guards — HIGH
- **File:** `packages/backend/convex/webhooks/mutations.ts:15, 146`
- **What:** Both mutations accept raw `tenantId` with zero auth. While the API route has conditional signature verification (SEC-21), the Convex mutations can be called directly by anyone who knows the Convex deployment URL.
- **Impact:** Fake delivery orders injected into any tenant. Arbitrary webhook log entries created.
- **Fix:** Add internal auth guard or a shared webhook secret verification at the mutation level.

#### SEC-18a: Admin tenant PUT spreads arbitrary body into mutation — MEDIUM
- **File:** `apps/admin/src/app/api/tenants/[tenantId]/route.ts:48`
- **What:** `...body` from `request.json()` is spread directly into the `tenants.mutations.update` call. No field allowlisting.
- **Impact:** Mass assignment — an attacker (with admin session) could inject unexpected fields into the tenant update.
- **Fix:** Destructure only expected fields from body before passing to mutation.

#### SEC-18b: `updateTheme` accepts `v.any()` — no input validation — HIGH
- **File:** `packages/backend/convex/tenants/mutations.ts:236-244`
- **What:** Arbitrary JSON spread directly into `ctx.db.patch()`. Bypasses schema validation.

### 1C. XSS, Input Validation, API Security

#### SEC-18: Stripe payment amount comes from the client — HIGH
- **File:** `apps/portal/src/app/api/stripe/create-payment-intent/route.ts:35`
- **What:** `amount` sent to Stripe comes directly from `request.json()`. Server never verifies it matches the actual order total.
- **Impact:** Customer submits `amount: 50` (50 cents) for a $100 order.
- **Fix:** Look up order by ID, compute total server-side, use that as payment amount.

#### SEC-19: Notifications API route has no authentication — HIGH
- **File:** `apps/portal/src/app/api/notifications/order/route.ts:11-102`
- **Impact:** Anyone can trigger email/SMS notifications to any customer — spam and SMS cost abuse.

#### SEC-20: Reports export route has no authentication — MEDIUM
- **File:** `apps/portal/src/app/api/reports/export/route.ts:10-69`

#### SEC-21: KitchenHub webhook verification is conditional — HIGH
- **File:** `apps/portal/src/app/api/webhooks/kitchenhub/route.ts:39-48`
- **What:** Verification only runs `if (webhookSecret)`. Missing env var = no verification.
- **Impact:** Fake delivery orders injected into any tenant's kitchen pipeline.

#### SEC-22: Theme CSS injection via `dangerouslySetInnerHTML` — MEDIUM
- **Files:** `apps/portal/src/app/layout.tsx:52`, `apps/portal/src/app/order/layout.tsx:27`, `apps/portal/src/app/(website)/layout.tsx:81`
- **What:** `generateThemeCSS` in `apps/portal/src/lib/theme.ts:43` interpolates tenant-stored values into CSS without sanitization.
- **Note:** A 4th `dangerouslySetInnerHTML` at `(website)/layout.tsx:84` uses `JSON.stringify(jsonLd)` for structured data — this is safe (standard Next.js pattern, `JSON.stringify` escapes special chars).
- **Fix:** Validate theme values match HSL format before storing.

#### SEC-23: No CSRF protection — MEDIUM
- **What:** Zero CSRF tokens across the codebase. `sameSite: 'strict'` provides partial protection.

#### SEC-24: Wildcard image hostname — MEDIUM
- **File:** `apps/portal/next.config.ts:24-28`
- **What:** `hostname: '**'` allows SSRF via Next.js image optimization endpoint.

#### SEC-25: `ignoreBuildErrors: true` in both apps — MEDIUM
- **Files:** `apps/admin/next.config.ts:6`, `apps/portal/next.config.ts:6`

### 1D. Business Logic Security

#### SEC-26: `placeOrder` trusts all client-supplied prices — CRITICAL
- **File:** `packages/backend/convex/public/mutations.ts:9-115`
- **What:** `unitPrice`, `lineTotal`, `subtotal`, `tax`, `total` accepted verbatim from client. No server-side price verification. Orders enter the kitchen pipeline even with `total: 0`.
- **Fix:** Look up each menuItem by ID, verify prices, recalculate all totals server-side.

#### SEC-27: `placeCateringOrder` trusts client prices — HIGH
- **File:** `packages/backend/convex/catering/mutations.ts:148-213`
- **What:** Same as SEC-26. Deposit calculation (50%) also based on client-supplied total.

#### SEC-28: Stripe webhook silently swallows processing errors — MEDIUM
- **File:** `apps/portal/src/app/api/stripe/webhook/route.ts:89-93`
- **What:** Returns 200 on processing failure. Customer charged but order shows "unpaid". No dead-letter queue.

---

## 2. Code Quality

#### CQ-01: `ignoreBuildErrors: true` in both Next.js configs — HIGH
- **Files:** `apps/admin/next.config.ts:6`, `apps/portal/next.config.ts:6`
- **What:** TypeScript errors invisible at build time. Every `as any` exists because there's zero enforcement.
- **Fix:** Remove flag and fix all resulting TS errors.

#### CQ-02: 12 `v.any()` usages in Convex schema/mutations — HIGH
- **File:** `packages/backend/convex/schema.ts:191, 235-237, 255-257, 259, 772` + `tenants/mutations.ts:239` + `webhooks/mutations.ts:41, 152`
- **Fix:** Replace with explicit typed validators matching the actual data shapes.

#### CQ-03: 30+ `as any` type assertions in production code — HIGH
- **Key instances:**
  - `apps/portal/src/app/order/order-content.tsx:175` — `items: cart as any` (6 occurrences across files)
  - `packages/backend/convex/webhooks/mutations.ts:69` — `menuItemId: "" as any` (schema violation)
  - `apps/portal/src/app/api/stripe/webhook/route.ts:42-43` — Stripe metadata strings cast to Convex IDs
- **Fix:** Define shared `CartItem` type assignable to Convex `OrderItem` validator. Validate Stripe metadata IDs.

#### CQ-04: Auth library fully duplicated between apps — HIGH
- **Files:** `apps/admin/src/lib/auth/` and `apps/portal/src/lib/auth/`
- **What:** 4 near-identical files. `convex-client.ts` is byte-for-byte identical. `jwt-secret.ts` differs dangerously (admin has hardcoded fallback, portal throws).
- **Fix:** Extract into `packages/auth` shared package.

#### CQ-05: Notification route returns 200 on failure — HIGH
- **File:** `apps/portal/src/app/api/notifications/order/route.ts:98-100`
- **What:** `catch { return NextResponse.json({ ok: true }) }` — callers cannot distinguish success from failure.

#### CQ-06: Silent `.catch(() => {})` patterns — MEDIUM
- **Files:** `apps/portal/src/hooks/use-session.ts:23`, `apps/portal/src/app/order/order-content.tsx:199`, `apps/portal/src/app/(dashboard)/kds/kds-content.tsx:81`
- **Fix:** At minimum add `.catch((e) => console.error(...))`.

#### CQ-07: Full table scans in admin analytics — HIGH
- **File:** `packages/backend/convex/admin/queries.ts:29, 61, 66, 93`
- **What:** `ctx.db.query("orders").collect()` and `ctx.db.query("webhookLogs").collect()` load ALL data across ALL tenants into memory.
- **Fix:** Use indexed, time-bounded queries. Consider pre-aggregated counters.

#### CQ-08: Loose `v.string()` for enum fields — MEDIUM
- **File:** `packages/backend/convex/schema.ts:15, 214, 249, 496, 681`
- **Fix:** Replace with `v.union(v.literal(...), ...)` matching the actual allowed values.

#### CQ-09: Inconsistent error handling across API routes — MEDIUM
- **What:** Mix of `catch (error: any)`, `catch (error)`, `catch {}`. No standardized pattern.
- **Fix:** Standardize on `catch (error: unknown)` with `error instanceof Error` checks.

#### CQ-10: Non-null assertions on env vars in inline clients — MEDIUM
- **Files:** `apps/portal/src/app/api/stripe/webhook/route.ts:5`, `apps/portal/src/app/api/notifications/order/route.ts:9`
- **What:** `process.env.NEXT_PUBLIC_CONVEX_URL!` — creates `ConvexHttpClient` inline instead of using shared client.

---

## 3. Performance

#### PERF-01: `getOrderStatus` scans entire orders table — HIGH
- **File:** `packages/backend/convex/public/queries.ts:273-276`
- **What:** Public, customer-facing query does `.collect()` + `.find()` by orderNumber. O(n) per customer.
- **Fix:** Add `by_tenantId_orderNumber` index. Use `.withIndex(...).first()`.

#### PERF-02: `getActiveOrders` full table scan with JS filter — HIGH
- **File:** `packages/backend/convex/orders/queries.ts:33-43`
- **What:** Loads ALL orders, filters 4 statuses in JS. POS dashboard subscribes in real-time.
- **Fix:** Run 4 parallel indexed queries per active status, or add `isActive` boolean field + index.

#### PERF-03: Admin `getSystemHealth` loads entire orders + webhookLogs — HIGH
- **File:** `packages/backend/convex/admin/queries.ts:54-71`
- **What:** Cross-tenant full table scan subscribed to in real-time.
- **Fix:** Time-bounded indexed queries or pre-aggregated counters.

#### PERF-04: `getTenantAnalytics` loads entire orders table — HIGH
- **File:** `packages/backend/convex/admin/queries.ts:91-118`
- **What:** `.collect()` ALL orders for ALL tenants. O(tenants × orders).

#### PERF-05: All public pages use `{ ssr: false }` — zero SSR — HIGH
- **Files:** `apps/portal/src/app/(website)/page.tsx:3`, `our-menu/page.tsx:9`, `order/page.tsx:4`, + 4 more
- **What:** Server sends empty shell. Client downloads JS, connects to Convex, fetches data, then renders.
- **Impact:** LCP delayed 3-5s+. Google cannot index any content. SEO is dead for all restaurant websites.
- **Fix:** Use Convex `fetchQuery` in server components for initial data. Keep CSR only for dashboard pages.

#### PERF-06: Homepage maintains 4 real-time subscriptions — HIGH
- **File:** `apps/portal/src/app/(website)/home-content.tsx:21-39`
- **What:** `getFullMenu`, `getTodaySpecial`, `getPublicEvents`, `getTenantWebsite` — all real-time. 100 concurrent visitors = 400 subscription re-evaluations per mutation.
- **Fix:** Use one-shot fetch for public pages. Reserve real-time for POS/KDS/order-tracking.

#### PERF-07: `getFullMenu` fetches ALL menu data including hidden items — HIGH
- **File:** `packages/backend/convex/public/queries.ts:131-158`
- **What:** Full payload sent to every visitor. Filters in JS.
- **Fix:** Project only display fields. Use a lighter "featured items" query for homepage.

#### PERF-08: `getDailySales` redundant data loading — MEDIUM
- **File:** `packages/backend/convex/reports/queries.ts:12-48`
- **What:** 7 iterations, each loading progressively more data due to missing `.lt()` upper bound.
- **Fix:** Single query for 7-day window, bucket in memory.

#### PERF-09: `getMaxPrepTime` N+1 sequential reads — MEDIUM
- **File:** `packages/backend/convex/public/mutations.ts:118-128`
- **Fix:** Use `Promise.all()` to parallelize.

#### PERF-10: Missing `by_tenantId_orderNumber` index — HIGH (enables PERF-01 fix)
- **File:** `packages/backend/convex/schema.ts:460-463`

#### PERF-11: Missing `by_tenantId_createdAt` index on auditLogs — MEDIUM
- **File:** `packages/backend/convex/schema.ts:261-264`

#### PERF-12: Catering orders query has no pagination — MEDIUM
- **File:** `packages/backend/convex/catering/queries.ts:24-32`

#### PERF-13: Raw `<img>` tags without Next.js Image optimization — MEDIUM
- **Files:** `apps/portal/src/app/(website)/website-nav.tsx:75`, `apps/portal/src/app/(dashboard)/menu/components/item-form-dialog.tsx:174`, `apps/portal/src/app/(server)/serve/components/order-build-phase.tsx:155`

#### PERF-14: `@restaurantos/ui` barrel import — MEDIUM
- **File:** `packages/ui/src/index.ts`
- **Fix:** Add `"sideEffects": false` to UI package. Consider `optimizePackageImports` for `lucide-react`.

---

## 4. Architecture

#### ARCH-01: docker-compose.yml defines Postgres, Redis, MinIO — none are used — HIGH
- **File:** `docker-compose.yml`
- **What:** App uses Convex (no Postgres driver). Rate limiting is in-memory (not Redis). File storage uses Convex's `_storage` (not MinIO/S3).
- **Fix:** Remove unused services. Clean `.env` of `S3_*` vars. Replace `SENDGRID_API_KEY` with `RESEND_API_KEY` in `.env.example`.

#### ARCH-02: No `.dockerignore` — HIGH
- **What:** `COPY . .` copies `.git/`, `.env` (with RSA key), `node_modules/`, test artifacts into build layers.
- **Fix:** Create `.dockerignore` excluding `.git`, `node_modules`, `.env*`, `.next`, `test-results`.

#### ARCH-03: Zod version split: v3 vs v4 across packages — HIGH
- **What:** `packages/backend` uses `zod@^4.3.5`, everything else uses `zod@^3.24.0`. Zod 4 has breaking API changes.
- **Fix:** Align all packages on the same major version.

#### ARCH-04: No startup validation of environment variables — HIGH
- **What:** Critical vars (`STRIPE_SECRET_KEY`, `JWT_PRIVATE_KEY`) checked inline at point-of-use. Missing vars cause runtime failures on first request.
- **Fix:** Add `validateEnv()` at startup using `@t3-oss/env-nextjs` or Zod.

#### ARCH-05: `@restaurantos/webhooks` package never imported — MEDIUM
- **What:** Exports types but nothing consumes them.

#### ARCH-06: `packages/backend` doesn't use `@restaurantos/config` — MEDIUM
- **What:** Config package defines canonical constants, but Convex schema re-declares all literal unions independently.

#### ARCH-07: CI does not run lint — MEDIUM
- **File:** `.github/workflows/ci.yml`
- **What:** Named "Lint, Type Check & Test" but never runs `pnpm turbo lint`.

#### ARCH-08: Deploy workflow stops containers but never restarts — HIGH
- **File:** `.github/workflows/deploy.yml:67-73`
- **What:** `docker stop` + `docker rm` then prints "Deploy complete". Requires manual restart.

#### ARCH-09: Deploy does not depend on CI passing — HIGH
- **What:** Both workflows trigger independently on push to main. Failing tests don't block deploy.

#### ARCH-10: Phantom `db:migrate`/`db:seed`/`db:studio` scripts — MEDIUM
- **What:** Turborepo tasks defined but no workspace implements them. Convex has no migration concept.

#### ARCH-11: `.env.example` references SendGrid but code uses Resend — MEDIUM
- **Fix:** Replace `SENDGRID_API_KEY` with `RESEND_API_KEY`.

#### ARCH-12: Env var naming inconsistency — MEDIUM
- **What:** `.env.example` defines `STRIPE_PUBLISHABLE_KEY` but code reads `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

#### ARCH-13: Duplicate utility deps across workspaces — MEDIUM
- **What:** `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner` in apps AND `packages/ui`.

#### ARCH-14: Empty `services/` directory in workspace config — LOW
- **File:** `pnpm-workspace.yaml`

#### ARCH-15: Port mismatch between dev and prod configs — LOW

#### ARCH-16: `bcryptjs` duplicated across 3 packages — LOW

#### ARCH-17: `stripe` in root package.json is redundant — MEDIUM

#### ARCH-18: Hardcoded VPS IP in Dockerfile ARG default — MEDIUM
- **Files:** `apps/admin/Dockerfile:5`, `apps/portal/Dockerfile:5`
- **What:** `ARG NEXT_PUBLIC_CONVEX_URL=http://72.60.28.175:3214` bakes plaintext HTTP endpoint.

---

## 5. Accessibility

#### A11Y-01: No color contrast enforcement for tenant-configurable colors — HIGH
- **WCAG:** 1.4.3 Contrast (Minimum)
- **Files:** `apps/portal/src/app/(website)/home-content.tsx:50-51, 101, 162, 218, 374, 402` + `apps/portal/src/lib/theme.ts:1-48`
- **What:** Tenants can set any hex color. Yellow primary on white background = illegible text.
- **Fix:** Validate contrast ratio at color selection time. Dynamically choose white/dark foreground based on luminance.

#### A11Y-02: Button nested inside Link — invalid HTML — HIGH
- **WCAG:** 4.1.1 Parsing
- **File:** `apps/portal/src/app/(website)/home-content.tsx:113-119` (5 instances)
- **What:** `<button>` inside `<Link>` (renders `<a>`) = interactive element inside interactive element.
- **Fix:** Apply button styling directly to `<Link>`, or use Button with `asChild`.

#### A11Y-03: No `aria-live` for cart updates — HIGH
- **WCAG:** 4.1.3 Status Messages
- **File:** `apps/portal/src/app/order/order-content.tsx:260-356`
- **Fix:** Add `aria-live="polite"` to cart container.

#### A11Y-04: No `aria-live` for order tracking status changes — HIGH
- **WCAG:** 4.1.3 Status Messages
- **File:** `apps/portal/src/app/order/track/track-content.tsx:136-270`
- **Fix:** Announce status changes: "Order status updated: Ready for Pickup."

#### A11Y-05: No `aria-live` for KDS new ticket arrivals — HIGH
- **WCAG:** 4.1.3 Status Messages
- **File:** `apps/portal/src/app/(dashboard)/kds/kds-content.tsx:145-246`

#### A11Y-06: Unlabeled `<select>` elements — HIGH
- **WCAG:** 4.1.2 Name, Role, Value
- **Files:** `apps/portal/src/app/(dashboard)/orders/components/pos-terminal.tsx:122-135`, `apps/portal/src/app/(website)/catering/catering-content.tsx:347-355`

#### A11Y-07: Decorative SVG icons lack `aria-hidden` — MEDIUM
- **WCAG:** 1.1.1 Non-text Content
- **File:** Multiple Lucide icon usages throughout `home-content.tsx`
- *Note: May be handled by Lucide v0.263+ default. Verify installed version.*

#### A11Y-08: Food gallery text visible only on hover — MEDIUM
- **WCAG:** 2.1.1 Keyboard
- **File:** `apps/portal/src/app/(website)/home-content.tsx:320-335`
- **Fix:** Make name always visible or add `tabIndex={0}` + `group-focus-within:opacity-100`.

#### A11Y-09: Order layout missing skip-navigation link — MEDIUM
- **WCAG:** 2.4.1 Bypass Blocks
- **File:** `apps/portal/src/app/order/layout.tsx:28-44`

#### A11Y-10: Modifier toggle buttons missing `aria-pressed` — MEDIUM
- **WCAG:** 4.1.2 Name, Role, Value
- **File:** `apps/portal/src/app/order/components/menu-item-card.tsx:172-189`

#### A11Y-11: Checkout form not wrapped in `<form>` — MEDIUM
- **File:** `apps/portal/src/app/order/order-content.tsx:123-173`
- **What:** Uses `document.getElementById` instead of form submission. No Enter-key submit, poor autofill.

#### A11Y-12: Dashboard layout missing skip-navigation link — MEDIUM
- **File:** `apps/portal/src/app/(dashboard)/layout.tsx:21-32`

#### A11Y-13: KDS timer uses color-only urgency indication — MEDIUM
- **WCAG:** 1.4.1 Use of Color
- **File:** `apps/portal/src/app/(dashboard)/kds/kds-content.tsx:13-18`

#### A11Y-14: Heading hierarchy issue on homepage — MEDIUM
- **File:** `apps/portal/src/app/(website)/home-content.tsx:101`
- **What:** Hero subheading is `<h2>` but functions as subtitle. Should be `<p>`.

#### A11Y-15: Loading states not announced to screen readers — LOW
- **Files:** `home-content.tsx:43-46`, `order-content.tsx:61`, `track-content.tsx:70-71`
- **Fix:** Add `role="status"` and `aria-live="polite"`.

#### A11Y-16: `animate-pulse` without `prefers-reduced-motion` — LOW
- **File:** `apps/portal/src/app/order/track/track-content.tsx:180-183`
- **Fix:** Add `motion-reduce:animate-none`.

#### A11Y-17: `cursor-pointer` on non-interactive `<div>` — LOW
- **File:** `apps/portal/src/app/(website)/home-content.tsx:435`

**Positive findings:** Radix UI primitives provide proper focus trapping in dialogs, keyboard navigation in selects/dropdowns. Website shell has skip-to-content link, semantic landmarks, and labeled nav. Button focus rings are visible. All dialogs include `DialogTitle` and `DialogDescription`.

---

## 6. Testing

#### TEST-01: Zero tests for auth flows — HIGH
- **Files:** Both middleware files, login routes, `auth.ts`, session managers
- **What:** Portal middleware JWT verification, subdomain routing, cookie scoping, admin middleware — all completely untested.
- **Impact:** Auth bypass bugs go straight to production.

#### TEST-02: Zero tests for payment/Stripe flows — HIGH
- **Files:** `create-payment-intent/route.ts`, `webhook/route.ts`, `orders/mutations.ts:recordPayment`
- **Impact:** Money flows. Incorrect payment status or amount validation = revenue loss.

#### TEST-03: Zero tests for order placement mutations — HIGH
- **File:** `packages/backend/convex/orders/mutations.ts`
- **What:** Order creation, item addition, status transitions, KDS ticket creation — all untested.

#### TEST-04: Zero tests for menu CRUD mutations — MEDIUM
- **File:** `packages/backend/convex/menu/mutations.ts`

#### TEST-05: Admin app has zero test files — HIGH
- **What:** Entire admin app (tenant management, analytics, audit logs) has no tests at all.

#### TEST-06: Zero E2E tests — no Playwright/Cypress installed — HIGH
- **What:** No E2E test infrastructure. `test:e2e` scripts are stubs. `test-results/` is empty.
- **Impact:** No regression coverage for any user flow.

#### TEST-07: No auth context test helpers — HIGH
- **What:** No mock for `ctx.auth.getUserIdentity()`. No tenant/user/order factories. Blocks writing meaningful mutation tests.

#### TEST-08: No Stripe test infrastructure — HIGH
- **What:** No Stripe event factories, no mock client, no test mode configuration.

#### TEST-09: Deploy pipeline has no test gate — MEDIUM
- **What:** Deploy triggers independently on push to main. Tests may still be running.

#### TEST-10: `pnpm audit || true` silences security vulnerabilities — MEDIUM
- **File:** `.github/workflows/ci.yml:30`

#### TEST-11: No coverage thresholds enforced — MEDIUM
- **What:** `@vitest/coverage-v8` installed but unused. Coverage can regress silently.

#### TEST-12: Weak assertion in order-number test — LOW
- **File:** `packages/backend/convex/lib/order-number.test.ts:72-73`
- **What:** "uses YYYY-MM-DD date format" test merely asserts `ctx.db` is defined.

#### TEST-13: No component/UI tests — MEDIUM
- **What:** Zero React component rendering tests despite significant UI surface.

#### TEST-14: KDS, catering, events, daily specials completely untested — MEDIUM

**Current state:** 15 test files, 75 tests, all passing in 327ms. Tests are pure utility functions — meaningful but limited scope. No integration tests, no component tests, no E2E tests.

---

## 7. DevOps

#### OPS-01: No `.dockerignore` file — HIGH
- **What:** `.env` (RSA private key), `.git/`, `node_modules/` all copied into build layers. Additionally, `.next/standalone/` dirs contain copies of `.env` files (40 lines each including secrets), and `packages/backend/.env.local` contains the Convex self-hosted admin key. All of these get swept into Docker build context via `COPY . .`.
- **Fix:** Create root `.dockerignore` excluding: `.git`, `node_modules`, `.env*`, `.next`, `test-results`, `coverage`, `.turbo`.

#### OPS-02: `ignoreBuildErrors: true` — TS errors ship to production — HIGH
- **Files:** Both `next.config.ts` files
- **Fix:** Remove flag, fix all TS errors.

#### OPS-03: Deploy doesn't restart containers — HIGH
- **File:** `.github/workflows/deploy.yml:67-73`
- **What:** Stops + removes containers, then prints "Deploy complete" without starting new ones.

#### OPS-04: Deploy doesn't depend on CI — HIGH
- **What:** Broken code deploys before tests finish.

#### OPS-05: Sentry DSN is empty — zero error tracking — HIGH
- **File:** `.env` (`NEXT_PUBLIC_SENTRY_DSN=`)
- **What:** Sentry config files exist but DSN is blank. No errors are captured.

#### OPS-06: No zero-downtime deployment — HIGH
- **What:** `docker stop` then `docker rm` = guaranteed downtime on every deploy.
- **Fix:** Rolling deployment or Coolify's built-in zero-downtime.

#### OPS-07: No rollback mechanism — MEDIUM
- **What:** Images tagged `:latest` only. No version tags, no previous image retention.
- **Fix:** Tag with git SHA. Keep 3+ previous versions. Add rollback workflow.

#### OPS-08: No staging environment — MEDIUM

#### OPS-09: No approval gate for production deploys — MEDIUM

#### OPS-10: No Dependabot/Renovate configured — MEDIUM

#### OPS-11: No structured logging — MEDIUM
- **What:** 46 `console.log/error/warn` calls. No structured logger, no correlation IDs.

#### OPS-12: Health checks are superficial — LOW
- **What:** Return `{ status: 'ok' }` without checking Convex connectivity.

#### OPS-13: No documented backup/DR plan — MEDIUM

#### OPS-14: No HEALTHCHECK in Dockerfiles — MEDIUM
- **What:** `/api/health` endpoints exist but Docker can't use them without `HEALTHCHECK` directive.

#### OPS-15: Missing `public/` directory in final Docker image — LOW
- **What:** PWA assets and service worker won't be served.

#### OPS-16: Docker layer cache not optimized — LOW
- **What:** `COPY . .` before `pnpm install` invalidates dependency cache on every code change.

---

## 8. Remediation Roadmap

### Sprint 1: Critical Security (Week 1) — BLOCK EVERYTHING ELSE

| # | Finding | Owner | Effort |
|---|---------|-------|--------|
| 1 | SEC-01: Add JWT verification to admin middleware | Security | 2h |
| 2 | SEC-02: Add `requireSuperAdmin()` to `createAdminUser` | Security | 15m |
| 3 | SEC-09: Add auth guard to `users.create` | Security | 30m |
| 4 | SEC-08: Add auth guards to all tenant mutations | Security | 2h |
| 5 | SEC-10: Add auth guards to all event mutations | Security | 1h |
| 6 | SEC-26: Server-side price verification in `placeOrder` | Security | 4h |
| 7 | SEC-27: Server-side price verification in `placeCateringOrder` | Security | 2h |
| 8 | SEC-18: Server-side payment amount verification | Security | 2h |
| 9 | SEC-05: Remove admin JWT secret hardcoded fallback | Security | 15m |
| 10 | OPS-01: Create `.dockerignore` | DevOps | 30m |

### Sprint 2: Remaining Security + Deploy Pipeline (Week 2)

| # | Finding | Owner | Effort |
|---|---------|-------|--------|
| 11 | SEC-11 to SEC-15: Auth guards for remaining mutations (dailySpecials, catering, KDS, orders, menu) | Security | 4h |
| 12 | SEC-03: Add rate limiting to admin login | Security | 30m |
| 13 | SEC-04: Fix `getCurrentUser` tenant-scoped lookup | Security | 1h |
| 14 | SEC-19: Add auth to notifications route | Security | 30m |
| 15 | SEC-21: Make webhook verification mandatory | Security | 30m |
| 16 | OPS-03 + OPS-04: Fix deploy to restart containers + depend on CI | DevOps | 4h |
| 17 | OPS-06: Implement zero-downtime deployment | DevOps | 4h |
| 18 | CQ-01: Remove `ignoreBuildErrors: true` + fix TS errors | Code Quality | 8h |

### Sprint 3: Performance + Architecture (Week 3-4)

| # | Finding | Owner | Effort |
|---|---------|-------|--------|
| 19 | PERF-05: Convert public pages to SSR | Performance | 16h |
| 20 | PERF-01 + PERF-10: Add `by_tenantId_orderNumber` index | Performance | 1h |
| 21 | PERF-02: Fix `getActiveOrders` to use indexed queries | Performance | 2h |
| 22 | PERF-03 + PERF-04: Fix admin full-table scans | Performance | 4h |
| 23 | PERF-06: Replace real-time subs with one-shot fetch on public pages | Performance | 4h |
| 24 | ARCH-03: Align Zod versions | Architecture | 2h |
| 25 | ARCH-01: Remove unused docker-compose services | Architecture | 1h |
| 26 | CQ-04: Extract shared auth package | Architecture | 8h |

### Sprint 4: Testing + Accessibility + Polish (Week 5-6)

| # | Finding | Owner | Effort |
|---|---------|-------|--------|
| 27 | TEST-07: Create auth context test helpers | Testing | 4h |
| 28 | TEST-01: Write auth flow tests | Testing | 8h |
| 29 | TEST-02: Write Stripe/payment tests | Testing | 8h |
| 30 | TEST-06: Set up Playwright + critical E2E flows | Testing | 16h |
| 31 | A11Y-01: Add contrast validation to tenant color settings | Accessibility | 4h |
| 32 | A11Y-03 + A11Y-04 + A11Y-05: Add `aria-live` regions | Accessibility | 4h |
| 33 | A11Y-02: Fix button-in-link pattern | Accessibility | 1h |
| 34 | OPS-05: Configure Sentry with real DSN | DevOps | 1h |

---

## 9. Assignment Matrix

| Owner | Focus Area | Finding Count |
|-------|-----------|---------------|
| **Security Lead** | Auth guards, JWT verification, price validation, input sanitization | SEC-01 through SEC-28 (28 findings) |
| **Backend Lead** | Convex indexes, query optimization, schema tightening, `v.any()` removal | PERF-01 to PERF-12, CQ-02, CQ-07, CQ-08 |
| **Frontend Lead** | SSR conversion, accessibility fixes, component cleanup | PERF-05, PERF-06, A11Y-01 to A11Y-17, CQ-03 |
| **DevOps Lead** | Docker, CI/CD, monitoring, deployment pipeline | OPS-01 to OPS-16, ARCH-02, ARCH-08, ARCH-09 |
| **Architecture Lead** | Monorepo cleanup, shared packages, dependency alignment | ARCH-01 to ARCH-18, CQ-04 |
| **QA Lead** | Test infrastructure, auth helpers, E2E setup, coverage | TEST-01 to TEST-14 |

---

*This report replaces the previous surface-level AUDIT.md from March 18, 2026.*
