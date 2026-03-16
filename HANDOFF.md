# RestaurantOS — Project Handoff Document

**Date:** March 16, 2026
**Status:** MVP Complete + Restaurant Buildout (Phases 1-5)
**Repo:** https://github.com/iradwatkins/restaurantos

---

## What Was Built (Phase 2 — Restaurant Buildout)

### Phase 1: Menu Enhancements + Portal Settings
- **Menu item types**: food, beer, wine, spirits, non-alcoholic beverage
- **Alcohol compliance**: liquor license tracking, sale hour restrictions, POS age verification prompts, alcohol blocked from online ordering
- **Image uploads**: Convex file storage integration for menu item photos
- **Specials/LTO**: items with start/end dates, "Special" badges
- **Modifier management UI**: create/edit/delete modifier groups and options per item
- **Category dayparts**: lunch/dinner categories with time-based visibility
- **Portal settings page** (7 tabs): Business Info, Hours, Tax & Fees, Alcohol, Staff, Online Ordering, Branding
- **Dynamic tax rate**: configurable per restaurant (replaces hardcoded 8.75%)
- **Business hours**: day-by-day configuration with open/close times
- **Staff management**: add/edit/deactivate staff, reset passwords from portal

### Phase 2: Online Ordering + Stripe Payment
- **Modifier selection**: customers choose modifiers when adding items (radio/checkbox, min/max enforcement)
- **Scheduled pickup**: time slot selector based on restaurant's pickup interval settings
- **Stripe Elements payment**: card payment form at checkout (requires STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
- **Estimated ready time**: auto-calculated from max item prep time
- **Order tracking page** (/order/track): customer enters order # + phone, real-time status via Convex subscription
- **Stripe API routes**: POST /api/stripe/create-payment-intent, POST /api/stripe/webhook

### Phase 3: Public Restaurant Website
- **Full branded website** per tenant at their subdomain
- **Pages**: Home (hero, featured items, hours, CTA), Menu (/our-menu), About, Contact (with Google Maps embed)
- **Responsive navigation**: desktop nav + mobile hamburger menu
- **Branded footer**: quick links, contact info, "Powered by RestaurantOS"
- **Website settings tab**: enable/disable, social links, Google Maps embed URL
- **Middleware refactor**: website paths (/, /our-menu, /about, /contact, /catering) are public when accessed via subdomain

### Phase 4: Catering System ($79/mo Add-on)
- **3 new Convex tables**: cateringCategories, cateringMenuItems, cateringOrders
- **Public catering page** (/catering): menu display with serving sizes/pricing, order form (event date, headcount, pickup/delivery), deposit calculation (50% upfront)
- **Portal catering management** (/catering-mgmt): order queue with status workflow (inquiry → confirmed → deposit_paid → preparing → ready → completed), upcoming events calendar view, catering menu CRUD
- **Feature-gated**: only visible when tenant.features.catering is true

### Phase 5: Admin Dashboard Overhaul
- **Tenant list**: search by name/subdomain/email, filter by status/plan, checkbox bulk actions (suspend/activate), per-row actions
- **Tenant detail edit form**: editable name, plan, phone, email, feature toggles (catering $79/mo, loyalty $49/mo, marketing $49/mo, reservations $39/mo)
- **Analytics dashboard**: real metrics — active tenants, monthly orders, monthly revenue, webhook health, plan distribution, per-tenant revenue chart
- **Audit logs page** (/audit-logs): paginated table with action badges, entity info, user, details
- **2 new billing tables**: subscriptions, invoices (ready for Stripe Connect integration)

---

## What Was Built (Phase 1 — Original MVP)

RestaurantOS is a white-label, multi-tenant restaurant management SaaS that consolidates POS, kitchen display, online ordering, and delivery aggregation (DoorDash, Uber Eats, Grubhub via KitchenHub) into one branded dashboard. It's designed to be sold by a reseller to independent restaurants at $249/month.

### Architecture

```
restaurant/
├── apps/
│   ├── admin/          → Super-admin dashboard (Next.js 15)
│   └── portal/         → Tenant restaurant portal (Next.js 15)
├── packages/
│   ├── backend/        → Convex self-hosted (schema, functions, auth)
│   ├── config/         → Shared Zod schemas, constants, types
│   ├── ui/             → 12 shadcn/ui components
│   └── webhooks/       → KitchenHub type definitions
├── turbo.json          → Turborepo config
├── pnpm-workspace.yaml → pnpm monorepo
└── docker-compose.yml  → Local dev services
```

**Stack:** Next.js 15, Tailwind CSS v4, Convex (self-hosted), custom JWT auth (RS256), Manrope + Fraunces fonts, framer-motion, shadcn/ui

### Live URLs

| App | URL | Credentials |
|-----|-----|-------------|
| Admin Dashboard | https://admin.restaurants.irawatkins.com | admin@restaurantos.com / admin123!@# |
| Portal (Maria's Kitchen) | https://marias-kitchen.restaurants.irawatkins.com | maria@mariaskitchen.com / owner123!@# |
| Online Ordering (public) | https://marias-kitchen.restaurants.irawatkins.com/order | No login needed |
| Convex Dashboard | http://72.60.28.175:6793 | No login needed |
| GitHub Repo | https://github.com/iradwatkins/restaurantos | Public |

### Infrastructure (72.60.28.175)

| Container | Purpose | Port |
|-----------|---------|------|
| restaurantos-admin-app | Admin Next.js app | Traefik → 3005 |
| restaurantos-portal-app | Portal Next.js app | Traefik → 3006 |
| restaurantos-convex-backend | Convex database + functions | 3214 (proxied via https://convex.restaurants.irawatkins.com) |
| restaurantos-convex-dashboard | Convex data viewer | 6793 |
| restaurantos-postgres | PostgreSQL 16 (unused, can remove) | 5433 |
| restaurantos-redis | Redis 7 (unused, can remove) | 6380 |

### DNS Records (Cloudflare — irawatkins.com zone)

| Type | Name | Value |
|------|------|-------|
| A | admin.restaurants | 72.60.28.175 |
| A | *.restaurants | 72.60.28.175 |
| A | restaurants | 72.60.28.175 |
| A | convex.restaurants | 72.60.28.175 |

SSL certs auto-issued by Let's Encrypt via Traefik HTTP challenge.

---

## What Was Completed (Sprint by Sprint)

### Sprint 1 — Foundation
- Turborepo monorepo with pnpm workspaces
- Multi-tenant data model in Convex (tenants, users, themes, delivery configs, audit logs)
- Custom JWT auth with RS256 JWKS endpoints (same pattern as mrstub/stepperslife)
- Admin dashboard: login, tenant CRUD (create/edit/delete), delivery mode toggle (KitchenHub ↔ Direct API), staff management per tenant
- Portal shell: subdomain-based tenant routing, per-tenant theme injection from Convex, login for restaurant staff
- RBAC: super_admin/support/viewer (admin), owner/manager/server/cashier (portal)

### Sprint 2 — POS Core
- Menu management: categories, items with prices (cents), dietary tags, prep time, photos placeholder, 86 toggle (out of stock)
- Modifier groups with min/max selection rules and price adjustments
- Order entry POS terminal: browse menu by category, add to cart, table selection, tax calculation (8.75%)
- Payment processing: cash payments with order completion, Stripe integration placeholder
- Table/floor plan: create tables with sections, shapes, seat counts, open/occupied status

### Sprint 3 — KDS + Delivery Aggregation
- Kitchen Display System: real-time ticket queue via Convex reactive queries (auto-updates, no polling)
- Color-coded source badges: Dine-In (blue), DoorDash (red), Uber Eats (green), Grubhub (orange), Online (green)
- Live countdown timers per ticket: green < 5min, yellow 5-10min, red > 10min
- Per-item bump and full-ticket bump functionality
- Recall queue: last 20 bumped tickets within 30 minutes, tap to recall
- KitchenHub webhook endpoint: POST /api/webhooks/kitchenhub normalizes delivery orders → creates order + KDS ticket atomically
- Auto KDS ticket creation when any order is sent to kitchen
- Webhook ingestion logging for monitoring

### Sprint 4 — Online Ordering + Reporting
- Public branded online ordering page at /order (no auth required)
- Menu display grouped by category, dietary tags, add-to-cart with quantity controls
- Cart sidebar with subtotal, tax, total, checkout form (name, phone, email, notes)
- Order confirmation with order number
- Daily sales dashboard: today's revenue, 7-day revenue, average order value
- Revenue breakdown by channel with color-coded progress bars
- Top 5 selling items today
- 7-day daily revenue table

### Sprint 5 — QA, Hardening & Deployment
- Cleaned up unused Drizzle/Lucia/PostgreSQL packages
- Error boundaries and loading states on all pages
- Live portal dashboard with real-time Convex metrics (orders, revenue, kitchen queue, channels)
- Quick action cards linking to POS/KDS/Menu
- Production Dockerfiles with NEXT_PUBLIC_CONVEX_URL baked at build time
- Deployed to Coolify server with Traefik HTTPS routing
- SSL certs for admin and portal subdomains
- Client onboarding seed script (npx convex run onboarding:onboardClient)
- Full UI overhaul: Manrope/Fraunces fonts, indigo color scheme, 1rem border radius, CSS animations, SVG branding

### Convex Database Schema (18 tables)

| Table | Purpose |
|-------|---------|
| adminUsers | Platform super-admins |
| tenants | Restaurant client accounts |
| tenantThemes | Per-tenant HSL CSS variables for shadcn |
| users | Tenant-scoped restaurant staff |
| deliveryConfigs | KitchenHub/Direct API settings per tenant |
| auditLogs | All changes tracked |
| menuCategories | Menu category groupings |
| menuItems | Items with prices, tags, availability |
| modifierGroups | Modifier groups (Size, Toppings) |
| modifierOptions | Individual modifier choices |
| tables | Floor plan / table management |
| orders | All orders (dine-in, online, delivery) |
| payments | Payment records (card/cash) |
| kdsTickets | Kitchen display tickets |
| kdsBumpHistory | Recall queue for bumped tickets |
| webhookLogs | Delivery webhook audit trail |
| cateringCategories | Catering menu category groupings |
| cateringMenuItems | Catering items with serving sizes and bulk pricing |
| cateringOrders | Catering orders with deposit/balance tracking |
| subscriptions | Stripe subscription state per tenant |
| invoices | Stripe invoice records per tenant |

### Convex Functions (9 modules, 60+ functions)

- **admin/** — getAdminByEmail, createAdminUser, updateLastLogin
- **tenants/** — list, getById, getBySubdomain, create, update, switchDeliveryMode
- **users/** — getUserByEmail, listByTenant, getByTenantAndEmail, create, updateLastLogin
- **menu/** — getCategories, getItems, getItemsByCategory, getAvailableItems, getModifierGroups, getModifierOptions, createCategory, updateCategory, deleteCategory, createItem, updateItem, deleteItem, toggle86, createModifierGroup, createModifierOption
- **orders/** — getByTenant, getActiveOrders, getById, getByTable, getTables, getPayments, create, addItems, updateStatus, recordPayment, createTable, updateTableStatus
- **kds/** — getActiveTickets, getRecallQueue, getTicketByOrder, createTicket, bumpTicket, bumpItem, recallTicket
- **webhooks/** — ingestDeliveryOrder, logWebhookEvent, getRecentLogs, getFailedLogs
- **public/** — getTenantBySubdomain, getMenu, getModifiersForItem, placeOrder
- **reports/** — getDailySales, getTopItems
- **catering/** — getCategories, getItems, getOrders, getOrderById, getUpcomingEvents, createCategory, updateCategory, createItem, updateItem, deleteItem, updateOrderStatus, recordDeposit, recordBalancePayment, placeCateringOrder
- **onboarding** — onboardClient (full client setup with sample menu + tables)

---

## What Needs To Be Done

### Priority 1 — Production Hardening (Before First Client)

1. **Generate permanent RSA keypair for JWT signing**
   - Currently using ephemeral keys that reset on server restart (tokens invalidate)
   - Run: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
   - Base64-encode and set `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` env vars on both apps

2. **Change default passwords**
   - admin@restaurantos.com password needs to be changed from `admin123!@#`
   - Maria's Kitchen demo owner password needs to be changed

3. **Configure Stripe keys** (code is built, just needs credentials)
   - Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env vars
   - Set `STRIPE_WEBHOOK_SECRET` for the /api/stripe/webhook endpoint
   - POS card payment still shows placeholder — needs Stripe Terminal SDK for in-person payments

4. **Twilio SMS confirmation**
   - Online orders should send SMS to customer with order number and estimated time
   - Need: Twilio account, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

5. **KitchenHub account setup**
   - Need KitchenHub reseller account and API credentials
   - Add webhook signature verification in /api/webhooks/kitchenhub route

6. **Wildcard SSL for tenant subdomains**
   - Set up Cloudflare DNS challenge on Traefik for unlimited tenant subdomains
   - Alternative: use Cloudflare proxy (orange cloud) which provides SSL automatically

### Priority 2 — Remaining Feature Gaps

7. ~~Menu photo uploads~~ **DONE** — Convex file storage with upload UI
8. **Receipt printing** — ESC/POS thermal printer or PDF generation
9. **Floor plan visual editor** — drag-and-drop canvas for table positioning
10. ~~Staff management in portal~~ **DONE** — settings page with 7 tabs
11. **86 item sync to delivery platforms** — KitchenHub API call on toggle
12. **Auto-confirmation of delivery orders** — within platform SLA windows
13. **Order history and search** — completed/cancelled orders tab with search
14. **POS Stripe Terminal** — in-person card reader (online payment is built)

### Priority 3 — Post-MVP Roadmap

15. ~~Catering module~~ **DONE** — full system with public page, management dashboard, deposit tracking
16. **Loyalty program** ($49/mo add-on) — points, tiers, rewards
17. **Email/SMS marketing** ($49/mo add-on) — campaigns, re-engagement, birthday offers
18. **Table reservations** ($39/mo add-on) — online booking + floor plan integration
19. **Direct DoorDash/Uber Eats/Grubhub APIs** — replace KitchenHub to eliminate $55/mo
20. **Self-serve client onboarding** — restaurant signup flow with Stripe subscription
21. **Native iOS/Android KDS app** — offline-capable tablet app

### Priority 4 — Infrastructure & DevOps

22. **CI/CD pipeline** — GitHub Actions: lint → test → build → deploy
23. **Monitoring** — Sentry error tracking, webhook failure alerting, uptime monitoring
24. **Database backups** — automated /convex/data volume backups
25. **Load testing** — 30 simultaneous orders target
26. **Remove unused containers** — postgres (5433), redis (6380)

---

## How To Deploy Updates

```bash
# 1. Make changes locally
cd /Users/irawatkins/Documents/projects/restaurant
pnpm dev  # Test locally

# 2. Build and verify
pnpm turbo build --filter=@restaurantos/admin --filter=@restaurantos/portal

# 3. Push Convex functions (if changed)
cd packages/backend && npx convex dev --once

# 4. Commit and push
git add -A && git commit -m "description" && git push

# 5. Deploy to server
ssh -i ~/.ssh/vps_codex root@72.60.28.175
cd /opt/restaurantos-app && git pull
docker build -f apps/admin/Dockerfile --build-arg NEXT_PUBLIC_CONVEX_URL=https://convex.restaurants.irawatkins.com -t restaurantos-admin:latest .
docker build -f apps/portal/Dockerfile --build-arg NEXT_PUBLIC_CONVEX_URL=https://convex.restaurants.irawatkins.com -t restaurantos-portal:latest .
docker rm -f restaurantos-admin-app restaurantos-portal-app
# Then run docker run commands (see Dockerfiles or deployment scripts)
```

## How To Onboard a New Client

```bash
cd packages/backend

# 1. Generate password hash
node -e "require('bcryptjs').hash('clientpassword', 12).then(h => console.log(h))"

# 2. Run onboarding
npx convex run onboarding:onboardClient '{
  "name": "Joe'\''s Pizza",
  "subdomain": "joes-pizza",
  "ownerEmail": "joe@joespizza.com",
  "ownerName": "Joe Smith",
  "ownerPasswordHash": "<hash from step 1>",
  "phone": "(312) 555-0200",
  "primaryColor": "#FF6B35",
  "plan": "growth",
  "includeSampleMenu": true,
  "tableCount": 10
}'

# 3. Add subdomain to portal Traefik Host() rule
# Edit the docker run command to include: Host(`joes-pizza.restaurants.irawatkins.com`)
# Or set up Cloudflare DNS challenge for wildcard certs
```

## Key Files Reference

| What | Where |
|------|-------|
| **Backend** | |
| Convex schema (18 tables) | packages/backend/convex/schema.ts |
| Convex auth config | packages/backend/convex/auth.config.ts |
| Menu mutations (type, image, modifiers) | packages/backend/convex/menu/mutations.ts |
| Menu queries (image URL, modifier groups) | packages/backend/convex/menu/queries.ts |
| Public queries (alcohol filter, order tracking) | packages/backend/convex/public/queries.ts |
| Public mutations (placeOrder with scheduling) | packages/backend/convex/public/mutations.ts |
| Tenant mutations (settings, branding) | packages/backend/convex/tenants/mutations.ts |
| User mutations (CRUD, password reset) | packages/backend/convex/users/mutations.ts |
| Catering queries | packages/backend/convex/catering/queries.ts |
| Catering mutations | packages/backend/convex/catering/mutations.ts |
| Admin queries (analytics, audit logs) | packages/backend/convex/admin/queries.ts |
| Admin mutations (tenant CRUD, bulk ops) | packages/backend/convex/admin/mutations.ts |
| Onboarding script | packages/backend/convex/onboarding.ts |
| **Admin App** | |
| Admin dashboard (real analytics) | apps/admin/src/app/(dashboard)/dashboard/page.tsx |
| Tenant list (search, filter, bulk) | apps/admin/src/app/(dashboard)/tenants/page.tsx |
| Tenant detail + edit form | apps/admin/src/app/(dashboard)/tenants/[tenantId]/page.tsx |
| Tenant edit form component | apps/admin/src/components/tenant-edit-form.tsx |
| Audit logs | apps/admin/src/app/(dashboard)/audit-logs/page.tsx |
| Admin sidebar | apps/admin/src/components/sidebar.tsx |
| **Portal App — Dashboard** | |
| Menu management (types, images, modifiers) | apps/portal/src/app/(dashboard)/menu/page.tsx |
| POS / Orders (alcohol compliance, dynamic tax) | apps/portal/src/app/(dashboard)/orders/page.tsx |
| Settings (7 tabs) | apps/portal/src/app/(dashboard)/settings/page.tsx |
| Catering management | apps/portal/src/app/(dashboard)/catering-mgmt/page.tsx |
| KDS page | apps/portal/src/app/(dashboard)/kds/page.tsx |
| Sales dashboard | apps/portal/src/app/(dashboard)/reports/page.tsx |
| Portal sidebar | apps/portal/src/components/portal-sidebar.tsx |
| **Portal App — Public** | |
| Online ordering (modifiers, Stripe, scheduling) | apps/portal/src/app/order/page.tsx |
| Order tracking | apps/portal/src/app/order/track/page.tsx |
| Stripe payment intent API | apps/portal/src/app/api/stripe/create-payment-intent/route.ts |
| Stripe webhook | apps/portal/src/app/api/stripe/webhook/route.ts |
| **Portal App — Public Website** | |
| Website layout (nav + footer) | apps/portal/src/app/(website)/layout.tsx |
| Home page (hero, featured, hours) | apps/portal/src/app/(website)/page.tsx |
| Menu showcase | apps/portal/src/app/(website)/our-menu/page.tsx |
| About page | apps/portal/src/app/(website)/about/page.tsx |
| Contact page (hours, map) | apps/portal/src/app/(website)/contact/page.tsx |
| Public catering page | apps/portal/src/app/(website)/catering/page.tsx |
| Website navigation | apps/portal/src/app/(website)/website-nav.tsx |
| Middleware (public + website routes) | apps/portal/src/middleware.ts |
| **Auth & Config** | |
| JWT/JWKS | apps/admin/src/lib/auth/jwks.ts |
| Session manager | apps/admin/src/lib/auth/session-manager.ts |
| Convex client | apps/admin/src/lib/auth/convex-client.ts |
| Theme CSS generator | apps/portal/src/lib/theme.ts |
| Tenant resolver | apps/portal/src/lib/tenant.ts |
