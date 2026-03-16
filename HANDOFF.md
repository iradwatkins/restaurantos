# RestaurantOS — Project Handoff Document

**Date:** March 16, 2026
**Status:** MVP Complete — All 5 Sprints Delivered
**Repo:** https://github.com/iradwatkins/restaurantos

---

## What Was Built

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

### Convex Database Schema (13 tables)

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

### Convex Functions (8 modules, 30+ functions)

- **admin/** — getAdminByEmail, createAdminUser, updateLastLogin
- **tenants/** — list, getById, getBySubdomain, create, update, switchDeliveryMode
- **users/** — getUserByEmail, listByTenant, getByTenantAndEmail, create, updateLastLogin
- **menu/** — getCategories, getItems, getItemsByCategory, getAvailableItems, getModifierGroups, getModifierOptions, createCategory, updateCategory, deleteCategory, createItem, updateItem, deleteItem, toggle86, createModifierGroup, createModifierOption
- **orders/** — getByTenant, getActiveOrders, getById, getByTable, getTables, getPayments, create, addItems, updateStatus, recordPayment, createTable, updateTableStatus
- **kds/** — getActiveTickets, getRecallQueue, getTicketByOrder, createTicket, bumpTicket, bumpItem, recallTicket
- **webhooks/** — ingestDeliveryOrder, logWebhookEvent, getRecentLogs, getFailedLogs
- **public/** — getTenantBySubdomain, getMenu, getModifiersForItem, placeOrder
- **reports/** — getDailySales, getTopItems
- **onboarding** — onboardClient (full client setup with sample menu + tables)

---

## What Needs To Be Done

### Priority 1 — Production Hardening (Before First Client)

1. **Generate permanent RSA keypair for JWT signing**
   - Currently using ephemeral keys that reset on server restart (tokens invalidate)
   - Run: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
   - Base64-encode and set `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` env vars on both apps
   - Update Convex auth.config.ts with production JWKS URLs

2. **Change default passwords**
   - admin@restaurantos.com password needs to be changed from `admin123!@#`
   - Maria's Kitchen demo owner password needs to be changed
   - Generate strong secrets for AUTH_SECRET and JWT_SECRET env vars

3. **Stripe integration**
   - Card payment in POS currently shows "Stripe terminal integration coming" placeholder
   - Need: Stripe account approved for restaurant vertical, API keys configured
   - Wire `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env vars
   - Implement Stripe Payment Intents in orders/mutations.ts and the Orders page pay dialog
   - Online ordering checkout needs Stripe Elements or Checkout Session

4. **Twilio SMS confirmation**
   - Online orders should send SMS to customer with order number and estimated time
   - Need: Twilio account, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - Add Convex action that calls Twilio API after order placement

5. **KitchenHub account setup**
   - Need KitchenHub reseller account and API credentials
   - Configure `KITCHENHUB_API_URL`, `KITCHENHUB_API_KEY`, `KITCHENHUB_WEBHOOK_SECRET`
   - Add webhook signature verification in /api/webhooks/kitchenhub route
   - Test with live DoorDash/UberEats/Grubhub test orders

6. **Wildcard SSL for tenant subdomains**
   - Currently each new tenant subdomain needs individual cert (HTTP challenge)
   - To support unlimited tenants: set up Cloudflare DNS challenge on Traefik
   - Requires adding `CF_DNS_API_TOKEN` to Traefik and a `dnsChallenge` cert resolver
   - Alternative: use Cloudflare proxy (orange cloud) which provides SSL automatically

### Priority 2 — Feature Completions

7. **Menu photo uploads**
   - Menu items have `imageUrl` field but no upload UI
   - Use Convex file storage or S3-compatible storage (MinIO)
   - Add photo upload to the menu item create/edit dialogs

8. **Receipt printing**
   - POS needs to print receipts (network printer or digital via email/SMS)
   - Standard ESC/POS commands for thermal printers or PDF generation

9. **Floor plan visual editor**
   - Tables have `posX`, `posY`, `shape` fields but no drag-and-drop visual layout
   - Build a canvas-based floor plan editor for table positioning

10. **Staff management in portal**
    - Portal settings page is a placeholder
    - Owners need to add/edit/remove their own staff (managers, servers, cashiers)
    - Business hours configuration
    - Tax rate configuration (currently hardcoded 8.75%)

11. **86 item sync to delivery platforms**
    - When an item is 86'd, it should propagate to KitchenHub to disable on DoorDash/UberEats/Grubhub
    - Add a Convex action in the toggle86 mutation that calls KitchenHub API

12. **Auto-confirmation of delivery orders**
    - KitchenHub orders should be auto-confirmed within platform SLA windows
    - DoorDash: 3 min, Uber Eats: 11.5 min
    - Add scheduled Convex function or immediate confirmation in webhook handler

13. **Order history and search**
    - Orders page only shows active orders
    - Add completed/cancelled order history tab
    - Search by order number, customer name, date range

### Priority 3 — Post-MVP Roadmap (Phase 1.5)

14. **Catering module** ($79/mo add-on)
    - Catering order entry with event date, headcount, delivery/pickup
    - Separate catering menu with bulk pricing
    - Deposit management and payment scheduling
    - Event calendar view

15. **Loyalty program** ($49/mo add-on)
    - Points per dollar spent, tracked by phone number
    - Reward redemption
    - Tiered rewards (Bronze/Silver/Gold)

16. **Email/SMS marketing** ($49/mo add-on)
    - Send promotional emails/texts to customer list
    - Automated re-engagement for inactive customers
    - Birthday offers

17. **Table reservations** ($39/mo add-on)
    - Online reservation booking
    - Integration with floor plan

18. **Direct DoorDash/Uber Eats/Grubhub APIs** (Phase 2)
    - Replace KitchenHub middleware to eliminate $55/mo cost per client
    - Requires platform-specific API applications and approvals
    - Admin toggle already built — just need the direct API adapters

19. **Self-serve client onboarding** (Phase 2)
    - Currently manual via admin dashboard or CLI
    - Build a signup flow for restaurants to onboard themselves
    - Stripe subscription creation during signup

20. **Native iOS/Android KDS app** (Phase 3)
    - Current KDS runs in tablet browser (works but not optimized)
    - Native app for better performance and offline capability

### Priority 4 — Infrastructure & DevOps

21. **CI/CD pipeline**
    - No automated testing or deployment currently
    - Set up GitHub Actions: lint → test → build → deploy to Coolify
    - Run `npx convex deploy` on push to main

22. **Monitoring and alerting**
    - Add Sentry for error tracking (@sentry/nextjs)
    - Webhook failure alerting (email when ingestion success rate drops below 98%)
    - Uptime monitoring for all services

23. **Database backups**
    - Convex self-hosted stores data in SQLite
    - Set up automated backups of `/convex/data` volume
    - Consider migrating Convex to PostgreSQL backend for production reliability

24. **Load testing**
    - MVP spec requires 30 simultaneous orders without degradation
    - Run load test with k6 or Artillery against the webhook endpoint and order creation

25. **Remove unused containers**
    - `restaurantos-postgres` (port 5433) — no longer needed after Convex migration
    - `restaurantos-redis` (port 6380) — no longer needed

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
| Convex schema | packages/backend/convex/schema.ts |
| Convex auth config | packages/backend/convex/auth.config.ts |
| Auth helpers | packages/backend/convex/lib/auth.ts |
| Admin login | apps/admin/src/app/login/page.tsx |
| Admin dashboard | apps/admin/src/app/(dashboard)/dashboard/page.tsx |
| Portal login | apps/portal/src/app/login/page.tsx |
| Portal sidebar | apps/portal/src/components/portal-sidebar.tsx |
| KDS page | apps/portal/src/app/(dashboard)/kds/page.tsx |
| Menu management | apps/portal/src/app/(dashboard)/menu/page.tsx |
| POS / Orders | apps/portal/src/app/(dashboard)/orders/page.tsx |
| Online ordering | apps/portal/src/app/order/page.tsx |
| Sales dashboard | apps/portal/src/app/(dashboard)/reports/page.tsx |
| Webhook endpoint | apps/portal/src/app/api/webhooks/kitchenhub/route.ts |
| JWT/JWKS | apps/admin/src/lib/auth/jwks.ts |
| Session manager | apps/admin/src/lib/auth/session-manager.ts |
| Convex client | apps/admin/src/lib/auth/convex-client.ts |
| CSS theme | apps/admin/src/app/globals.css |
| Onboarding script | packages/backend/convex/onboarding.ts |
| Seed script | packages/backend/convex/seed.ts |
| Convex self-hosted env | packages/backend/.env.local |
