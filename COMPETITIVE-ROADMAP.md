# RestaurantOS — Competitive Gap Roadmap

**Date:** March 19, 2026
**Source:** Adversarial review benchmarked against Toast, Square for Restaurants, Clover, Lightspeed, Revel, Aloha
**Companion docs:** `AUDIT-REPORT.md` (130 code-level findings), `HANDOFF.md` (build history + known issues)

---

## How to Read This Document

This roadmap covers **features that don't exist yet** — the gaps between RestaurantOS and $100M restaurant platforms. It does NOT duplicate the code-level bugs in `AUDIT-REPORT.md`. Each work package is assigned to the agent who owns it, with dependencies called out.

**Priority Legend:**
- **P0** — Showstopper. Cannot launch without this. Legal or operational blocker.
- **P1** — Must-have for production. Restaurants expect this on day one.
- **P2** — Competitive parity. Needed to match Toast/Square within 6 months.
- **P3** — Differentiation. Sets RestaurantOS apart from competitors.

---

## Current Scorecard

| Area | Grade | Target | Gap Summary |
|------|-------|--------|-------------|
| Architecture | A- | A | Solid multi-tenant foundation |
| Online Ordering | B | A | Missing delivery, guest accounts, reorder |
| POS | C+ | A | Missing tips, discounts, voids, split bills, receipts |
| KDS | B+ | A | Missing station routing, audio alerts |
| Menu Management | B+ | A- | Missing combos, nutritional info, bulk pricing |
| Reporting | D | B+ | Only 2 reports vs Toast's 50+ |
| Staff Management | D+ | B | No time clock, scheduling, labor tracking |
| Table Management | C | B | No visual editor, reservations, waitlist |
| Inventory | F | B | Does not exist |
| CRM | F | B | Does not exist |
| Loyalty | F | B- | Feature flag only, no implementation |
| Integrations | C- | B | KitchenHub only, no accounting/payroll |
| Mobile | C | B+ | No native app, not tablet-optimized |
| Offline | F | B | No offline capability |
| Security | F | A | 5 CRITICAL findings (see AUDIT-REPORT.md) |
| Testing | B+ | A | 146 E2E tests, but no unit tests for business logic |

---

## P0 — SHOWSTOPPERS

> **DEPENDENCY: All P0 security items from AUDIT-REPORT.md must be completed FIRST.**
> See AUDIT-REPORT.md Sprint 1 (SEC-01 through SEC-28). Assigned to: `/sentinel`

### P0-1: Tip Entry & Reporting
**Why:** IRS requires tip reporting. Employees expect tip tracking. No restaurant will adopt a POS without tip support.
**Current state:** `payments` table has a `tip` field but zero UI to set it.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend: `recordPayment` mutation accepts tip amount. New query: `getTipReport` (by server, by date range, by payment method). Tip pooling configuration on tenant settings. | Tip stored on payment record. Tip report returns per-server breakdown. |
| `/adrian` | Frontend: Tip entry screen after payment method selection (suggested %, custom amount). Tip column in orders table. Tip report page under Reports. | Cashier can enter tip. Server can view their tips. Owner sees tip report. |
| `/kelsey` | E2E tests: Cash payment with tip, card payment with tip, tip report accuracy. | Tests cover tip entry + reporting for both payment methods. |

**Depends on:** P0 security fixes (auth guards on mutations)

### P0-2: Discount / Comp / Void System
**Why:** Every restaurant gives discounts (happy hour, employee meals, manager comps, error corrections). Without this, the POS is incomplete.
**Current state:** No discount, comp, or void capability exists anywhere.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/oracle` | Schema: `discounts` table (tenantId, name, type: percentage/fixed, value, active). Add `discounts` array to orders schema (name, type, value, appliedBy). Add `voidReason` field to order items. | Schema supports percentage discounts, fixed discounts, item-level voids with reason. |
| `/spencer` | Backend: `applyDiscount` mutation (order-level or item-level). `voidItem` mutation (requires manager role, logs reason). `compOrder` mutation (zeros total, logs reason). Discount CRUD for tenant. | Discounts applied correctly to totals. Void/comp requires manager+. Audit trail created. |
| `/adrian` | Frontend: Discount button in POS cart (dropdown of saved discounts + custom). Void button per line item (reason required). Comp button on order (reason required). Discount management in Settings. | Touch-friendly discount selection. Reason dialogs for voids/comps. |
| `/kelsey` | E2E: Apply percentage discount, fixed discount, void item, comp full order. Verify totals recalculate correctly. | All discount types tested with correct math. |

**Depends on:** P0 security fixes

---

## P1 — Must-Have for Production

### P1-1: Receipt Printing
**Why:** Customers expect paper receipts. Kitchen needs printed tickets as backup to KDS.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend: Receipt data formatter (order details, itemized list, tax breakdown, payment info, restaurant branding). Generate receipt as structured data. | Receipt data includes all order info + restaurant name/address/phone. |
| `/adrian` | Frontend: Browser print via `window.print()` with receipt-formatted CSS (`@media print`). ESC/POS thermal printer support via Web Serial API or Star CloudPRNT. Print button on order completion + payment dialog. | Receipt prints correctly on paper (thermal or standard). Print preview matches receipt format. |
| `/kelsey` | Test print formatting with mock data. | Receipt contains all required fields, formats correctly. |

### P1-2: Reports Expansion
**Why:** Restaurant owners live in reports. Current 2 reports vs Toast's 50+ is a dealbreaker.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend queries: Daily/weekly/monthly sales summary. Sales by hour (heatmap data). Sales by server. Sales by category. Payment method breakdown. Discount/comp/void report. Tax report. Average ticket size trend. Comparison periods (this week vs last week). | 10 core report queries with date range filtering. |
| `/adrian` | Frontend: Reports dashboard with tab navigation. Date range picker (today, yesterday, this week, last week, this month, custom). Charts (bar, line, heatmap). Data tables with sort. CSV export button. PDF export (browser print). | Owner can view all reports, filter by date, export data. |
| `/kelsey` | E2E: Verify report data matches known test orders. CSV export contains correct data. | Reports show accurate data for test orders. |

**Must include these 10 reports at minimum:**
1. Daily Sales Summary (revenue, orders, avg ticket)
2. Sales by Hour (heatmap — which hours are busiest)
3. Sales by Server (who sold the most)
4. Sales by Category (which menu sections perform)
5. Sales by Channel (dine-in vs online vs delivery)
6. Payment Method Breakdown (cash vs card)
7. Discount & Comp Report (what was given away)
8. Tax Report (for accountant/IRS)
9. Top Items (quantity + revenue)
10. Comparison Report (this period vs last period)

### P1-3: Customer Database
**Why:** Without a customer database, no loyalty program, no email marketing, no order history, no personalization.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/oracle` | Schema: `customers` table (tenantId, name, email, phone, firstOrderAt, lastOrderAt, totalOrders, totalSpent, notes). Index on phone + email. Link `orders.customerId` to customer. | Customer records created and linked to orders. |
| `/spencer` | Backend: Auto-create customer on order placement (match by phone or email). `getCustomerHistory` query. `searchCustomers` query. `updateCustomer` mutation. | Customer auto-created on first order. Subsequent orders link to same customer by phone/email match. |
| `/adrian` | Frontend: Customer lookup in POS (search by name/phone). Customer detail page (order history, total spent, notes). Customer list page under a new "Customers" nav item. | Cashier can look up returning customer. Owner can view customer list + history. |
| `/kelsey` | E2E: Place two orders with same phone, verify single customer record with 2 orders. | Customer deduplication works. Order history accurate. |

### P1-4: Split Bill UI
**Why:** Groups dining together need to split the check. Schema exists (`paymentMethod: 'split'`), no UI.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend: `splitPayment` mutation — accepts array of payment splits (amount, method per split). Updates order paymentStatus when all splits sum to total. | Multiple partial payments recorded. Order marked paid when fully covered. |
| `/adrian` | Frontend: Split bill dialog — split equally by N guests, split by item selection, or custom amounts. Each split gets its own payment method (cash/card). Progress bar showing paid vs remaining. | Cashier can split 3 ways equally, or let guests pick their items. |
| `/kelsey` | E2E: Split 2-way equal, split by items, verify total coverage. | All split methods result in correct payment totals. |

### P1-5: Delivery Support (Own Orders)
**Why:** Online ordering is pickup-only. Restaurants that deliver need address entry, zones, fees, and driver management.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/oracle` | Schema: Add to tenant settings — `deliveryEnabled`, `deliveryZones` (array of {zipCode, fee}), `deliveryMinimumCents`, `deliveryRadiusMiles`. Add `deliveryAddress` + `deliveryFee` to orders. | Delivery configuration stored per tenant. Orders track delivery details. |
| `/spencer` | Backend: Validate delivery address against zones. Calculate delivery fee. `placeOrder` supports `orderType: 'delivery'`. | Delivery orders accepted with address validation and fee calculation. |
| `/adrian` | Frontend: Order type selector (Pickup / Delivery) on `/order` page. Address form for delivery. Delivery fee displayed in cart. Delivery zone configuration in Settings > Online Ordering. | Customer can choose delivery, enter address, see fee. Owner configures zones. |

---

## P2 — Competitive Parity

### P2-1: Inventory MVP
**Why:** Restaurant margins are 3-5%. Without inventory tracking, owners can't control food cost — the #1 controllable expense.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/oracle` | Schema: `ingredients` (tenantId, name, unit, currentStock, lowStockThreshold, costPerUnit). `menuItemIngredients` (menuItemId, ingredientId, quantityUsed). `inventoryLogs` (type: received/used/waste/adjustment, quantity, reason). | Full ingredient tracking with cost and stock levels. |
| `/spencer` | Backend: Auto-deduct ingredients on order completion. Low-stock alerts (query). Receive inventory (add stock). Waste logging. Food cost calculation (ingredient cost / menu price). Auto-86 when stock hits zero. | Stock decrements on order. Low-stock flagged. Food cost % available. |
| `/adrian` | Frontend: Inventory page (ingredient list, stock levels, color-coded low-stock). Receive stock form. Waste log form. Food cost % on menu items. Ingredient assignment to menu items. | Owner can manage inventory, see costs, receive deliveries. |

### P2-2: Staff Time Clock & Scheduling
**Why:** Labor is restaurants' #1 controllable cost. Without tracking, owners can't manage labor-to-sales ratio.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/oracle` | Schema: `shifts` (userId, tenantId, clockIn, clockOut, breakMinutes, role, hourlyRate). `schedules` (userId, tenantId, date, startTime, endTime, role). | Shift records with clock in/out. Scheduled shifts. |
| `/spencer` | Backend: Clock in/out mutations. Shift history query. Labor cost calculation (hours x rate). Overtime detection (>40 hrs/week). Schedule CRUD. | Accurate time tracking. Labor cost calculated. OT flagged. |
| `/adrian` | Frontend: Clock in/out button on dashboard (big, obvious). Timesheet view for staff. Schedule builder for managers (weekly grid). Labor cost report. | Server can clock in/out. Manager views timesheets and builds schedule. |

### P2-3: Visual Floor Plan Editor
**Why:** Current table management is CRUD-only. Restaurants need to see their layout visually.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/adrian` | Frontend: Canvas-based floor plan editor. Drag tables to position. Resize. Set shape (round/square/rectangle). Real-time status colors (green=open, red=occupied, yellow=reserved). Click table to open order. | Tables visually match restaurant layout. Real-time status reflected. |

**Note:** `posX`, `posY`, `shape` fields already exist in the `tables` schema — just need the UI.

### P2-4: Reservations System
**Why:** Planned as $39/mo add-on. Feature flag exists. Toast/OpenTable integration is industry standard.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/oracle` | Schema: `reservations` (tenantId, customerName, phone, email, date, time, partySize, tableId, status: confirmed/seated/completed/cancelled/no_show, notes). | Reservation records with status workflow. |
| `/spencer` | Backend: Create/update/cancel reservation. Check availability (table + time slot). Auto-assign table by party size. Waitlist when full. | Availability accurately reflects table capacity and existing reservations. |
| `/adrian` | Frontend: Public reservation page (`/reservations`). Reservation management in portal (calendar view, today's list). Host stand view (upcoming, walk-ins, waitlist). | Customer books online. Host manages seating. |

---

## P3 — Differentiation

### P3-1: Offline Mode
**Why:** Internet goes down at restaurants regularly. Toast's offline mode is a key selling point. Without it, the POS is dead during outages.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend: Queue system for offline mutations. Conflict resolution for syncing when reconnected. | Orders created offline sync correctly when internet returns. |
| `/adrian` | Frontend: IndexedDB cache for menu data + active orders. Service worker for offline POS operation. Visual indicator (online/offline badge). Queue display showing pending syncs. | Cashier can take orders during 10-minute outage. Orders sync when internet returns. |
| `/marcus` | Architecture: Define sync conflict resolution strategy. Data integrity guarantees. | Document covers all edge cases (duplicate orders, price changes during offline). |

### P3-2: Loyalty Program
**Why:** Customer retention. Feature flag already exists (`features.loyalty`). $49/mo add-on.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/oracle` | Schema: `loyaltyPrograms` (tenantId, pointsPerDollar, tiers, rewards). `loyaltyAccounts` (customerId, points, tier, lifetimePoints). `loyaltyTransactions` (earn/redeem, points, orderId). | Points system with tiers and redemption tracking. |
| `/spencer` | Backend: Auto-earn points on order completion. Redeem points as discount. Tier progression. Points balance query. | Points earned and redeemed correctly. Tier upgrades automatic. |
| `/adrian` | Frontend: Points display during checkout. Loyalty status on customer profile. Loyalty program configuration in Settings. | Customer sees points earned. Owner configures program. |

### P3-3: Accounting Integration
**Why:** Every restaurant has a bookkeeper using QuickBooks or Xero. Manual data entry is error-prone.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend: Daily sales journal entry export (revenue by category, tax collected, tips, discounts). QuickBooks Online API integration (OAuth2 + journal entry creation). | Daily sales automatically posted to QuickBooks. |
| `/adrian` | Frontend: QuickBooks connection flow in Settings (OAuth2). Sync status indicator. Manual re-sync button. | Owner connects QuickBooks once. Daily sync runs automatically. |

### P3-4: Direct Delivery Platform APIs
**Why:** KitchenHub charges $55/mo per location. Direct APIs eliminate that cost.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend: DoorDash Drive API integration. UberEats API integration. Grubhub API integration. Menu sync. Order ingestion. Status updates. | Orders from all 3 platforms flow directly without KitchenHub. |

### P3-5: CRM & Marketing Automation
**Why:** Toast's marketing tools (email campaigns, re-engagement, birthday offers) are a major revenue driver.

| Agent | Scope | Acceptance Criteria |
|-------|-------|-------------------|
| `/spencer` | Backend: Email campaign system (Resend API). Customer segmentation (by last visit, total spent, items ordered). Automated triggers (birthday, 30-day inactive, first visit anniversary). | Campaigns sent to segmented lists. Automated triggers fire correctly. |
| `/adrian` | Frontend: Campaign builder (template, audience, schedule). Campaign analytics (sent, opened, redeemed). Customer segments page. | Owner creates and sends campaigns. Views performance. |

---

## Dependency Chain

```
P0 Security Fixes (AUDIT-REPORT.md)
  └── P0-1: Tips (needs auth-guarded mutations)
  └── P0-2: Discounts/Comps/Voids (needs auth-guarded mutations)
      └── P1-2: Reports (needs discount data to report on)
  └── P1-3: Customer Database
      └── P3-2: Loyalty (needs customer records)
      └── P3-5: CRM (needs customer records)
  └── P1-5: Delivery
  └── P2-1: Inventory
      └── P1-2: Reports (food cost % needs inventory)
  └── P2-2: Time Clock
      └── P1-2: Reports (labor cost needs time data)
```

---

## Agent Assignment Summary

| Agent | Work Packages | Priority Items |
|-------|--------------|----------------|
| `/sentinel` | P0 Security (AUDIT-REPORT.md SEC-01 through SEC-28) | 28 security findings — MUST BE FIRST |
| `/oracle` | P0-2 (discount schema), P1-3 (customers), P1-5 (delivery schema), P2-1 (inventory), P2-2 (shifts), P2-4 (reservations), P3-2 (loyalty) | 7 schema designs |
| `/spencer` | P0-1 (tip backend), P0-2 (discount backend), P1-1 (receipts), P1-2 (reports queries), P1-3 (customer backend), P1-4 (split payment), P1-5 (delivery backend), P2-1 (inventory backend), P2-2 (time clock backend), P2-4 (reservations backend), P3-1 (offline sync), P3-2 (loyalty backend), P3-3 (QuickBooks), P3-4 (delivery APIs), P3-5 (email campaigns) | 15 backend work packages |
| `/adrian` | P0-1 (tip UI), P0-2 (discount UI), P1-1 (receipt printing), P1-2 (reports dashboard), P1-3 (customer UI), P1-4 (split bill UI), P1-5 (delivery UI), P2-1 (inventory UI), P2-2 (time clock UI), P2-3 (floor plan editor), P2-4 (reservations UI), P3-1 (offline UI), P3-2 (loyalty UI), P3-3 (QuickBooks UI), P3-5 (campaign builder) | 15 frontend work packages |
| `/kelsey` | E2E tests for P0-1, P0-2, P1-2, P1-3, P1-4 | 5 test suites |
| `/marcus` | P3-1 (offline architecture) | 1 architecture document |
| `/cisco` | Accessibility review after P1 UI work | Post-P1 audit |

---

## Restaurant Hardware Setup (Bring Your Own Device)

RestaurantOS runs in the browser — no proprietary hardware required. Here's what a typical restaurant needs:

### Station Map

| Station | Who | Device | URL | Est. Cost |
|---------|-----|--------|-----|-----------|
| **Front Register** | Cashier / Host | iPad on stand or touchscreen monitor | `/orders` (POS terminal) | ~$400 (iPad $329 + stand $50 + cash drawer $40) |
| **Kitchen** | Cook / Line | Wall-mounted touchscreen monitor (handles heat/grease) | `/kds` (ticket board) | ~$250 (24" touch monitor $200 + wall arm $30) |
| **Floor** (x3) | Servers | Their own phones or cheap tablets | `/serve` (table management) | $0 (BYOD) or ~$100/device |
| **Back Office** | Owner / Manager | Existing laptop or desktop | `/dashboard`, `/reports`, `/settings` | $0 (existing device) |
| **Customer** | Dine-in / Pickup | Their own phone | `/order` (online ordering) | $0 |

**Total hardware cost: ~$650** vs Toast's $799+ for a single proprietary terminal.

### How Each Station Works

**Cashier (POS):** Customer walks up or calls in. Cashier taps "New Order," taps items from the menu grid, selects table (or no table for takeout/phone orders), hits "Place Order." For cash payment — taps the bills received, sees exact change due, hits Complete.

**Kitchen (KDS):** Orders appear as cards the instant a server or cashier sends to kitchen. Cooks see what to make, how long it's been waiting (timer turns yellow then red). Tap items as they're plated. Hit "BUMP" when the order is up in the window.

**Server (Floor):** Sees all tables color-coded (green = open, red = occupied). Taps a table, taps menu items to build the order, hits "Send to Kitchen." Can save an open tab if the customer is still deciding.

**Manager:** Checks daily revenue, manages menu (prices, 86 items, specials), manages staff, configures settings. All from any device.

### Kiosk / Fullscreen Mode

iPads and Android tablets can pin the website to the home screen for a fullscreen, app-like experience (no browser chrome). The app already registers a service worker for this. Tap Share > Add to Home Screen.

### vs Toast Hardware Costs

| | RestaurantOS | Toast |
|--|-------------|-------|
| POS terminal | $329 (iPad) | $799+ (proprietary) |
| Monthly software | $249/mo | $69-$165/mo + processing fees |
| KDS screen | $250 (any touch monitor) | $499 (Toast KDS) |
| Server handhelds | $0 (BYOD) | $409 each (Toast Go) |
| Vendor lock-in | None | Toast hardware only works with Toast |

---

## Estimated Timeline

| Phase | Duration | Contents |
|-------|----------|----------|
| **Phase 1: Security + P0** | 2 weeks | All AUDIT-REPORT.md security fixes + Tips + Discounts |
| **Phase 2: P1 Production** | 4 weeks | Receipts, Reports, Customers, Split Bill, Delivery |
| **Phase 3: P2 Parity** | 6 weeks | Inventory, Time Clock, Floor Plan, Reservations |
| **Phase 4: P3 Differentiation** | 8 weeks | Offline, Loyalty, CRM, Integrations |

**Total to competitive parity: ~12 weeks**
**Total to differentiation: ~20 weeks**

---

*This roadmap should be reviewed after each phase. Priorities may shift based on customer feedback and market conditions.*
