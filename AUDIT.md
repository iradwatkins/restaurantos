# RestaurantOS — Full Project Audit

**Date:** March 18, 2026
**Audited by:** Claude (automated)
**Repo:** https://github.com/iradwatkins/restaurantos

---

## What RestaurantOS Is

A multi-tenant restaurant management platform. Each restaurant gets their own subdomain (e.g., dk-soul-food.restaurants.irawatkins.com) with:

- **Public website** (homepage, menu, about, contact, events)
- **Online ordering** (pickup, with Stripe payment)
- **POS system** (dine-in orders, table management)
- **Kitchen Display System** (ticket queue, bump/recall)
- **Dashboard** (settings, menu management, reports)
- **Admin panel** (manage all tenants, analytics, audit logs)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind v4, shadcn/ui |
| Backend | Convex (self-hosted at 72.60.28.175:3214) |
| Auth | Custom JWT (RS256) with JWKS endpoints |
| Payments | Stripe (Elements + Payment Intents) |
| Hosting | Docker on Coolify (VPS 72.60.28.175) |
| Monorepo | pnpm + Turborepo |

---

## What's Built and Working (Core Product — Included)

### POS & Orders
- [x] Dine-in order creation with table assignment
- [x] Item modifiers (single-select, multi-select)
- [x] Tax calculation with configurable rates
- [x] Cash payment processing
- [x] Order status workflow (open → kitchen → preparing → ready → completed)
- [x] Order number assignment (sequential per tenant per day)

### Kitchen Display System
- [x] Real-time ticket queue via Convex subscriptions
- [x] Color-coded order sources (Dine-In, DoorDash, Uber Eats, Grubhub, Online)
- [x] Individual item bump + full ticket bump
- [x] Recall queue (last 20 bumped tickets within 30 min)

### Online Ordering
- [x] Public ordering page with menu, cart, modifiers
- [x] Alcohol items filtered out (server-side + client info banner)
- [x] Scheduled pickup time selection
- [x] Stripe Elements payment form
- [x] Order tracking by order number + phone
- [x] Specific error messages (order not found vs phone mismatch)
- [x] Customer name, phone, minimum order validation

### Public Website
- [x] Tenant-configurable homepage (hero heading, subheading, delivery message, colors)
- [x] Menu showcase with categories, prices, images, sold-out badges
- [x] About page with hero image, hours, contact info
- [x] Events page with pricing tiers and daily specials
- [x] Footer with social links (Facebook, Instagram, Twitter, Yelp)
- [x] Responsive nav with active link highlighting, mobile menu

### Menu Management
- [x] Categories with daypart filtering (lunch/dinner/all)
- [x] Items with images, dietary tags, pricing, availability
- [x] 86'd (sold out) toggle
- [x] Item types (food, beer, wine, spirits, non-alcoholic)
- [x] Modifier groups and options with price adjustments
- [x] Image upload to Convex storage

### Settings Dashboard
- [x] Business info (name, phone, email, address)
- [x] Business hours (per-day open/close with holiday overrides)
- [x] Tax rate configuration
- [x] Alcohol settings (license number, expiry, sale hours with validation)
- [x] Staff management (add, edit, deactivate, reset password)
- [x] Online ordering settings (enable/disable, minimum order, pickup intervals)
- [x] Branding (logo URL, primary/accent colors with synced hex picker)
- [x] Website content (hero text, delivery partners, footer tagline, social links)
- [x] Timezone support (8 US zones including Alaska, Hawaii, Arizona, PR, Guam)

### Admin Panel
- [x] Dashboard with real-time metrics (active tenants, monthly orders/revenue)
- [x] Tenant list with search, filter by status/plan, bulk actions
- [x] Tenant detail editing (plan, features, status)
- [x] Audit log viewer
- [x] Client onboarding script

### Security (Implemented)
- [x] Server-side password hashing (bcrypt, 12 rounds)
- [x] RS256 JWT with permanent keypair support
- [x] Tenant isolation (all queries scoped by tenantId)
- [x] HTTP-only secure session cookies
- [x] RBAC (owner, manager, server, cashier)
- [x] KitchenHub webhook signature verification (HMAC-SHA256)
- [x] Convex storage URL resolver for self-hosted relative paths

### Testing
- [x] Vitest configured for backend and portal
- [x] 11 unit tests (storage URL resolver + webhook signature verification)

### CI/CD
- [x] GitHub Actions CI (type-check, test, build both apps)
- [x] GitHub Actions deploy workflow (build Docker images, SCP to VPS)

### Error Monitoring
- [x] Sentry config files ready (portal + admin, client + server)
- [ ] Needs `@sentry/nextjs` installed and DSN configured

---

## What's NOT Built Yet — Paid Add-Ons

These are revenue opportunities. Feature flags exist in the schema (`features.loyalty`, `features.marketing`, `features.reservations`) but no backing code is built.

| Add-On | Status | Notes |
|--------|--------|-------|
| Loyalty program | Not built | Toggle exists, no backend. Planned $49/mo |
| Email/SMS marketing | Not built | Toggle exists, no backend. Planned $49/mo |
| Table reservations | Not built | Toggle exists, no backend. Planned $39/mo |
| Receipt printing | Not built | Needs ESC/POS or PDF generation |
| Floor plan editor | Not built | Drag-and-drop visual table layout |
| Direct delivery APIs | Not built | Direct DoorDash/Uber Eats/Grubhub APIs (replace KitchenHub) |
| Native KDS app | Not built | iOS/Android native kitchen display |
| Self-serve onboarding | Not built | Stripe subscription + auto-provisioning |

---

## What's NOT Built Yet — Core Gaps

| Item | Priority | Notes |
|------|----------|-------|
| Card payment in POS | High | Needs Stripe Terminal SDK for in-person card reader |
| Order history tab | Medium | Completed/cancelled orders not viewable (only active) |
| 86 item sync to delivery | Medium | When item is 86'd, should notify KitchenHub |
| Auto-confirm delivery orders | Medium | Currently manual |

---

## Infrastructure Status

| Item | Status |
|------|--------|
| VPS (72.60.28.175) | Running — Coolify with Traefik v3 |
| Convex (self-hosted) | Running — port 3214 |
| Portal app | Running — Docker container |
| Admin app | Running — Docker container |
| Wildcard DNS | Configured — *.restaurants.irawatkins.com |
| SSL | Let's Encrypt via Traefik HTTP challenge |
| RSA keypair | Generated — added to .env |
| Postgres container | **Unused** — can be removed |
| Redis container | **Unused** — can be removed |
| Database backups | **Not configured** |
| Uptime monitoring | Available via Uptime Kuma on VPS |

---

## Environment Variables Status

| Variable | Status |
|----------|--------|
| NEXT_PUBLIC_CONVEX_URL | Set (http://72.60.28.175:3214) |
| AUTH_SECRET | Placeholder — needs real random string |
| JWT_SECRET | Placeholder — needs real random string |
| JWT_PRIVATE_KEY | Set (generated) |
| JWT_PUBLIC_KEY | Set (generated) |
| STRIPE_SECRET_KEY | Placeholder (sk_test_...) |
| STRIPE_PUBLISHABLE_KEY | Placeholder (pk_test_...) |
| STRIPE_WEBHOOK_SECRET | Placeholder (whsec_...) |
| TWILIO_* | Placeholder — not configured |
| SENDGRID_API_KEY | Placeholder — not configured |
| KITCHENHUB_* | Placeholder — not configured |
| NEXT_PUBLIC_SENTRY_DSN | Not set — needs Sentry project |

---

## Live Tenants

| Tenant | Subdomain | Status | Menu Items |
|--------|-----------|--------|-----------|
| D&K Soul Food | dk-soul-food | Active | 64 items, 10 categories |
| Maria's Kitchen | marias-kitchen | Active | Demo data |

---

## Database Schema

24 tables across Convex:

**Core:** adminUsers, tenants, tenantThemes, users, deliveryConfigs, auditLogs
**POS:** menuCategories, menuItems, modifierGroups, modifierOptions, tables, orders, payments
**KDS:** kdsTickets, kdsBumpHistory
**Catering:** cateringCategories, cateringMenuItems, cateringOrders
**Events:** events, eventPricingTiers, dailySpecials
**Billing:** subscriptions, invoices
**Webhooks:** webhookLogs

---

## Code Quality

| Metric | Value |
|--------|-------|
| Total TypeScript files | ~213 |
| Convex functions | 60+ |
| Test files | 2 |
| Test count | 11 |
| Explicit TODOs in code | 0 (webhook TODO was resolved) |
| ESLint configured | Yes (Next.js default) |
| Prettier configured | Yes |
| Type safety | Full (Convex schema-driven) |

---

## Security Posture

### Good
- Passwords hashed server-side (bcrypt, 12 rounds)
- JWT RS256 with permanent keypair
- Tenant data isolation enforced at query level
- Webhook signature verification
- HTTP-only secure cookies

### Needs Attention Before Launch
- AUTH_SECRET and JWT_SECRET still using placeholder values
- Stripe keys are placeholders (payments won't work)
- No rate limiting on auth endpoints
- No CSRF tokens on state-changing endpoints
- CORS is permissive (needs lockdown for production)
- Default test passwords in place (intentionally kept for now)

---

## Files Changed This Session

### Commit 1: `611fb24` (18 files)
Server-side password hashing, storage URL resolver, configurable website content, social links, about page, menu sold-out badge, order tracking errors, alcohol filtering banner, color consistency, timezone expansion, color picker fix, form validation.

### Commit 2: `6ea6a4b` (14 files)
Webhook signature verification, RSA keypair script, accessibility aria-labels, order form validation, website content settings UI, Vitest setup with 11 tests.

### Commit 3: (pending — this session's remaining work)
RSA keypair generation, CI/CD pipelines, Sentry config, audit document.

---

## Recommended Next Steps

### Immediate (this week)
1. Generate real AUTH_SECRET and JWT_SECRET (random 64-char strings)
2. Remove unused Postgres and Redis containers from VPS
3. Install `@sentry/nextjs` and configure DSN
4. Set up Convex database backup schedule

### Before First Paying Customer
5. Configure real Stripe keys (test mode first)
6. Test full order flow end-to-end (place order → kitchen → ready → complete → payment)
7. Set up Uptime Kuma monitoring for all services
8. Add rate limiting to auth endpoints
9. Lock down CORS to specific domains
10. Get real food photos from restaurant owners

### When Ready to Sell Add-Ons
11. Build loyalty program backend
12. Build email/SMS marketing integration (SendGrid + Twilio)
13. Build reservations system
14. Integrate Stripe Terminal for in-person card payments

---

## Repository Structure

```
restaurant/
├── apps/
│   ├── admin/          # Super-admin dashboard (Next.js 15)
│   └── portal/         # Tenant portal + website + ordering (Next.js 15)
├── packages/
│   ├── backend/        # Convex schema + 60+ functions
│   ├── config/         # Shared types, constants, Zod schemas
│   ├── ui/             # 12 shadcn/ui components
│   └── webhooks/       # Webhook type definitions
├── scripts/
│   └── generate-keypair.sh  # RSA key generation for JWT
├── .github/workflows/
│   ├── ci.yml          # Lint, type-check, test, build
│   └── deploy.yml      # Docker build + SCP to VPS
├── HANDOFF.md          # Original project handoff document
├── AUDIT.md            # This file
└── .env.example        # Environment template
```
