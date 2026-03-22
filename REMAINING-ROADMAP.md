# RestaurantOS — Remaining Roadmap

**Created:** 2026-03-21
**Author:** Miranda (GM)
**Status:** Ready for execution
**Context:** RestaurantOS is at B+ competitive grade vs Toast. Everything below is incremental — not a launch blocker. These features close the gap toward A-.

---

## Sprint Sequence Overview

| Sprint | Theme | Stories | Est. Duration | Business Value |
|--------|-------|---------|---------------|----------------|
| **S1** | Reporting Expansion | 4 | 1 week | Owners live in reports — more reports = easier sales demos |
| **S2** | KDS Enhancements | 3 | 1 week | Station routing is expected by any kitchen with multiple stations |
| **S3** | POS Completeness (Gift Cards) | 4 | 2 weeks | Gift cards are a revenue multiplier — customers prepay and often don't redeem full value |
| **S4** | POS Completeness (Open Tabs) | 3 | 1 week | Bars and full-service restaurants require open tabs |
| **S5** | SMS Campaigns | 3 | 1 week | Completes the marketing stack — email alone isn't enough for restaurant re-engagement |
| **S6** | Delivery API Expansion | 4 | 2 weeks | Eliminates KitchenHub dependency ($55/mo/location saved per restaurant) |
| **S7** | Native Mobile Ordering App | 5 | 3–4 weeks | Largest effort — customer-facing native app for iOS + Android |

**Total estimated duration: 10–12 weeks**

---

## S1 — Reporting Expansion

> **Goal:** Go from 11 reports to 15+. Add the two reports restaurant owners ask about most: menu engineering and daypart analysis.

### S1-1: Menu Engineering Report
**What:** Classify every menu item into Stars (high profit, high popularity), Puzzles (high profit, low popularity), Plowhorses (low profit, high popularity), and Dogs (low profit, low popularity). Display as a quadrant scatter chart + sortable table.

| Agent | Scope |
|-------|-------|
| `/oracle` | Schema: Add `foodCostCents` field to menuItems if not already present. Ensure ingredient cost data feeds into this. |
| `/spencer` | Backend: `getMenuEngineeringReport` query — takes tenantId + date range, returns each item with: name, quantity sold, revenue, food cost %, contribution margin, category (Star/Puzzle/Plowhorse/Dog). Classification thresholds: median popularity + median margin. |
| `/adrian` | Frontend: Menu Engineering page under Reports. Quadrant scatter chart (x=popularity, y=margin). Color-coded by classification. Sortable table below. Date range picker. |
| `/kelsey` | E2E: Verify classification logic with known test data. Verify chart renders with correct quadrant placement. |

**Acceptance Criteria:**
- Owner can see which items make money and which don't
- Classification matches industry-standard menu engineering methodology
- CSV export includes all data points

---

### S1-2: Daypart Analysis Report
**What:** Break sales down by time blocks (breakfast, lunch, happy hour, dinner, late night). Show revenue, covers, avg ticket, and top items per daypart.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: `getDaypartAnalysis` query. Default dayparts: Breakfast (6–11am), Lunch (11am–3pm), Happy Hour (3–5pm), Dinner (5–9pm), Late Night (9pm–close). Allow tenant to customize daypart boundaries in settings. Return: revenue, order count, avg ticket, top 5 items per daypart. |
| `/adrian` | Frontend: Daypart Analysis page under Reports. Stacked bar chart (revenue by daypart over time). Table with daypart breakdown. Daypart configuration in Settings > Reports. |
| `/kelsey` | E2E: Verify orders bucket into correct dayparts. Verify custom daypart boundaries work. |

**Acceptance Criteria:**
- Owner can see which time periods drive the most revenue
- Daypart boundaries are configurable per tenant
- Comparison view: this week vs last week by daypart

---

### S1-3: Server Performance Report
**What:** Rank servers by: total sales, avg ticket size, upsell rate (modifiers/add-ons per order), tip %, table turn time.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: `getServerPerformanceReport` query — returns per-server metrics for date range. Includes rank position for each metric. |
| `/adrian` | Frontend: Server Performance page under Reports. Leaderboard-style layout. Sparklines for trend over time. Filter by date range. |
| `/kelsey` | E2E: Verify metrics match known test order data per server. |

**Acceptance Criteria:**
- Owner can identify top-performing and underperforming servers
- Data is accurate against actual order history

---

### S1-4: Waste & Shrinkage Report
**What:** Aggregate all inventory waste logs and void/comp data into a single cost-of-waste report.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: `getWasteReport` query — aggregates waste logs + voids + comps by date range. Returns: total waste cost, waste by category (food waste, voids, comps), top 10 wasted items, trend over time. |
| `/adrian` | Frontend: Waste & Shrinkage page under Reports. Donut chart (waste by type). Line chart (trend). Table with details. |
| `/kelsey` | E2E: Verify waste totals match known void/comp/waste log entries. |

**Acceptance Criteria:**
- Owner can see total cost of waste and where it's happening
- Trend shows whether waste is improving or worsening

---

## S2 — KDS Enhancements

> **Goal:** Support kitchens with multiple stations (grill, fryer, bar, salad) and fine-dining multi-course meal pacing.

### S2-1: KDS Station Routing
**What:** Items route to the correct KDS screen based on their station assignment. A burger goes to the grill station, fries go to the fryer station, a cocktail goes to the bar.

| Agent | Scope |
|-------|-------|
| `/oracle` | Schema: Add `station` field to menuItems (string, e.g., "grill", "fryer", "bar", "salad", "expo"). Add `stations` array to tenant settings (list of station names). Add `station` filter to KDS ticket queries. |
| `/spencer` | Backend: When an order is placed, split items into station-specific KDS tickets (or tag items within the ticket by station). KDS query accepts `station` filter param. Expo station sees ALL items. Each station only sees its items. |
| `/adrian` | Frontend: Station selector on KDS page (dropdown or tab bar). Each station shows only its items. Expo view shows full tickets with station labels. Station configuration in Settings > Kitchen. Color-code items by station on the expo view. |
| `/kelsey` | E2E: Place order with items from 3 stations. Verify each station KDS shows only its items. Verify expo shows all. |

**Acceptance Criteria:**
- Kitchen with 3 stations sees only relevant items on each screen
- Expo station sees everything and can bump the full ticket when all stations are done
- Station assignment is per menu item, configurable in menu management

---

### S2-2: Course Firing
**What:** Multi-course meals fire to kitchen in sequence, not all at once. Server marks "fire next course" from the POS.

| Agent | Scope |
|-------|-------|
| `/oracle` | Schema: Add `course` field to order items (integer, default 1). Add `firedCourses` array to orders (tracks which courses have been sent to kitchen). |
| `/spencer` | Backend: `fireNextCourse` mutation — sends next unfired course to KDS. Only course 1 fires automatically on order placement. Subsequent courses wait for manual fire. Query: get order with course status. |
| `/adrian` | Frontend: Course assignment during order entry (dropdown per item: Course 1, 2, 3, etc.). "Fire Course" button on active order detail (shows which courses are pending). KDS shows course number on each item. Visual separator between courses on KDS tickets. |
| `/kelsey` | E2E: Create 3-course order. Verify only course 1 appears on KDS. Fire course 2, verify it appears. Fire course 3, verify. |

**Acceptance Criteria:**
- Fine dining server can pace a multi-course meal
- Kitchen only sees the current course until the server fires the next one
- Default behavior (course=1 for all items) preserves current workflow for non-coursed orders

---

### S2-3: KDS Audio Alerts
**What:** Audible notification when new tickets arrive or when a ticket timer exceeds threshold.

| Agent | Scope |
|-------|-------|
| `/adrian` | Frontend: Web Audio API — configurable sounds for: new ticket, ticket aging warning (yellow threshold), ticket overdue (red threshold). Volume control. Mute toggle. Sound selection in Settings > Kitchen. Use short, distinct tones (not annoying in a kitchen environment). |
| `/kelsey` | E2E: Verify audio plays on new ticket arrival (check Audio API calls). Verify mute toggle works. |

**Acceptance Criteria:**
- Kitchen staff hear when new orders come in (critical if they step away from the screen)
- Aging alerts catch tickets that are being forgotten
- Can be muted for quieter environments

---

## S3 — Gift Cards (Physical + Digital)

> **Goal:** Gift cards are a revenue multiplier. Customers prepay, and ~20% of gift card value goes unredeemed. This is pure margin.

### S3-1: Gift Card Schema & Backend
**What:** Full gift card system — issue, reload, redeem, check balance.

| Agent | Scope |
|-------|-------|
| `/oracle` | Schema: `giftCards` table (tenantId, code, balanceCents, initialAmountCents, status: active/depleted/disabled, isDigital: boolean, purchaserName, purchaserEmail, recipientName, recipientEmail, createdAt, lastUsedAt). `giftCardTransactions` table (giftCardId, type: purchase/reload/redeem, amountCents, orderId, staffId, createdAt). |
| `/spencer` | Backend: `purchaseGiftCard` mutation (creates card, processes Stripe payment, returns code). `redeemGiftCard` mutation (deducts from balance, links to order). `checkBalance` query (by code). `reloadGiftCard` mutation (adds funds). `getGiftCardReport` query (outstanding liability, redemption rate). Generate unique codes: 16-char alphanumeric, check for collisions. |

**Acceptance Criteria:**
- Gift cards can be purchased, reloaded, and redeemed
- Balance accurately tracks all transactions
- Codes are unique and collision-resistant

---

### S3-2: Gift Card Purchase & Digital Delivery
**What:** Customers can buy digital gift cards online. Staff can sell physical gift cards at the register.

| Agent | Scope |
|-------|-------|
| `/adrian` | Frontend: Public gift card purchase page (`/gift-cards`) — select amount (preset: $25, $50, $100, custom), enter recipient name/email, optional message, pay with Stripe. Email delivery of digital card (code + restaurant branding). POS gift card sale flow — cashier enters amount, prints code on receipt or hands physical card. |
| `/felicity` | UX: Digital gift card email template design. Gift card purchase page layout. Physical card display format for receipt printing. |

**Acceptance Criteria:**
- Customer can buy a digital gift card and recipient gets it via email
- Cashier can sell a physical gift card and print the code
- Gift card amounts are flexible (preset + custom)

---

### S3-3: Gift Card Redemption at Checkout
**What:** Apply a gift card as a payment method during checkout (POS + online ordering).

| Agent | Scope |
|-------|-------|
| `/adrian` | Frontend: "Gift Card" payment option in POS payment dialog and online checkout. Enter code → show balance → apply to order. If balance < order total, remaining goes to other payment method (split with cash/card). If balance > order total, show remaining balance after. |
| `/kelsey` | E2E: Buy gift card, redeem full amount, verify balance is 0. Buy gift card, partial redeem, verify remaining balance. Attempt invalid code, verify error. |

**Acceptance Criteria:**
- Gift card works as payment in both POS and online ordering
- Partial redemptions correctly track remaining balance
- Invalid/depleted codes show clear error messages

---

### S3-4: Gift Card Reporting & Liability
**What:** Gift card liability report — outstanding balances are a financial liability that accountants need to track.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: `getGiftCardLiabilityReport` query — total outstanding balance, cards issued vs redeemed, average redemption time, breakage estimate (unredeemed >12 months). |
| `/adrian` | Frontend: Gift Card Report under Reports. Summary cards (total outstanding, total issued, redemption rate). Table of all active cards with balances. |

**Acceptance Criteria:**
- Owner/accountant can see total gift card liability
- Report is accurate against all gift card transactions

---

## S4 — Open Tabs

> **Goal:** Bars and full-service restaurants need to start a tab (often linked to a credit card), add items over time, and close it at the end.

### S4-1: Open Tab Backend
**What:** Create a tab, add items incrementally, hold a card on file, close with final payment.

| Agent | Scope |
|-------|-------|
| `/oracle` | Schema: Add `isTab` boolean to orders. Add `tabStatus` field (open/closed). Add `heldPaymentMethodId` (Stripe SetupIntent ID for card hold). Add `tabOpenedAt` field. |
| `/spencer` | Backend: `openTab` mutation — creates order with isTab=true, optionally holds a card via Stripe SetupIntent (pre-auth $0, or configurable hold amount). `addToTab` mutation — appends items to existing open tab. `closeTab` mutation — calculates total, charges held card or accepts other payment. `getOpenTabs` query — all open tabs for tenant. Auto-close warning: flag tabs open >4 hours. |

**Acceptance Criteria:**
- Tab can be opened with or without a held card
- Items can be added to a tab over time
- Tab close charges the correct total
- Stripe hold/capture flow works correctly

---

### S4-2: Open Tab Frontend
**What:** POS UI for opening, managing, and closing tabs.

| Agent | Scope |
|-------|-------|
| `/adrian` | Frontend: "Open Tab" button in POS (next to "New Order"). Tab creation: customer name (required), optional card swipe/tap for hold. Open tabs panel — list of all active tabs with customer name, running total, time open. Tap a tab to add items. "Close Tab" button with payment flow. Badge on open tabs showing count. Warning indicator on tabs open >4 hours. |
| `/felicity` | UX: Tab management layout — needs to be fast for bartenders. Tab switching should be < 2 taps. |

**Acceptance Criteria:**
- Bartender can open a tab in under 5 seconds
- Adding items to an existing tab is as fast as adding to a new order
- Closing a tab flows into the standard payment dialog (with held card pre-selected)

---

### S4-3: Open Tab Testing
**What:** Full E2E coverage of the tab lifecycle.

| Agent | Scope |
|-------|-------|
| `/kelsey` | E2E: Open tab without card hold → add 3 items → close with cash. Open tab with card hold → add items → close with held card (Stripe capture). Open 3 tabs simultaneously → verify correct items on each. Verify 4-hour warning appears. |

**Acceptance Criteria:**
- All tab lifecycle scenarios tested
- Stripe hold/capture flow verified
- Multi-tab isolation confirmed

---

## S5 — SMS Campaigns

> **Goal:** Email campaigns are built. Add SMS via Twilio to complete the marketing toolkit. Restaurant re-engagement is 3x more effective via SMS than email.

### S5-1: Twilio SMS Integration
**What:** Send SMS messages to customers via Twilio API.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: Twilio client integration (account SID, auth token, from number — stored in Infisical). `sendSms` function — accepts phone number + message body. Rate limiting (1 msg/customer/day, 4/customer/month). Opt-out handling: if customer replies STOP, mark `smsOptedOut=true` on customer record. Delivery status webhook from Twilio → log success/failure. |
| `/oracle` | Schema: Add `smsOptedOut` boolean to customers. Add `smsConsent` boolean + `smsConsentAt` timestamp. Add `smsDeliveryLogs` table (customerId, message, status, twilioSid, createdAt). |

**Acceptance Criteria:**
- SMS sends successfully via Twilio
- Opt-out (STOP) is handled automatically and immediately
- Rate limits prevent spam
- TCPA compliance: only send to customers with smsConsent=true

---

### S5-2: SMS Campaign Builder
**What:** Extend the existing email campaign builder to support SMS as a channel.

| Agent | Scope |
|-------|-------|
| `/adrian` | Frontend: Add "SMS" as channel option in campaign builder (alongside existing Email). SMS compose: 160-char limit with counter, preview, merge tags ({firstName}, {restaurantName}). Audience filter: only customers with smsConsent=true AND smsOptedOut=false. Campaign analytics: sent, delivered, failed, opt-outs. |
| `/spencer` | Backend: `sendSmsCampaign` mutation — iterates audience, sends via Twilio with rate limiting. Reuse existing campaign scheduling infrastructure. Campaign status tracking (sent/delivered/failed counts). |

**Acceptance Criteria:**
- Owner can create and send SMS campaigns to opted-in customers
- 160-character limit enforced with live counter
- Campaign analytics show delivery and opt-out rates

---

### S5-3: SMS Automated Triggers
**What:** Extend existing automated triggers (birthday, 30-day inactive, anniversary) to support SMS as delivery channel.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: Add `channel` field to trigger configuration (email, sms, both). When trigger fires, send via selected channel(s). Respect SMS consent and opt-out. |
| `/adrian` | Frontend: Channel selector on each automated trigger (Email / SMS / Both). SMS template editor for each trigger type. |
| `/kelsey` | E2E: Create SMS campaign, verify delivery. Test opt-out flow. Test automated trigger via SMS. Verify TCPA consent enforcement. |

**Acceptance Criteria:**
- Automated triggers can fire via SMS, email, or both
- SMS consent is checked before every send
- Opt-out flow works end-to-end

---

## S6 — Delivery API Expansion

> **Goal:** DoorDash Drive is done. Add UberEats and Grubhub direct APIs to eliminate KitchenHub ($55/mo/location). Same architectural pattern as DoorDash.

### S6-1: UberEats Direct API Integration
**What:** Menu sync, order ingestion, and status updates via UberEats Direct API.

| Agent | Scope |
|-------|-------|
| `/marcus` | Architecture: Review DoorDash Drive integration pattern. Document any differences in UberEats API (auth model, webhook format, menu sync approach). Ensure we can reuse the existing delivery abstraction layer. |
| `/spencer` | Backend: UberEats OAuth2 client credentials flow. Menu sync: push menu to UberEats via their API (map RestaurantOS categories/items/modifiers to UberEats format). Order webhook: receive new orders → create RestaurantOS order with source="ubereats". Status updates: push order status changes back to UberEats. Store integration config per tenant (clientId, clientSecret, storeId). |
| `/adrian` | Frontend: UberEats connection flow in Settings > Integrations (OAuth2). Sync status indicator. Enable/disable toggle. Menu sync button. |
| `/kelsey` | E2E: Test menu sync (mock UberEats API). Test order ingestion. Test status updates. |

**Acceptance Criteria:**
- Menu syncs from RestaurantOS to UberEats
- Orders from UberEats appear in POS and KDS automatically
- Status updates flow back to UberEats (confirmed, preparing, ready)

---

### S6-2: Grubhub Direct API Integration
**What:** Same as UberEats — menu sync, order ingestion, status updates — via Grubhub API.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: Grubhub API client (auth model per their docs). Menu sync. Order webhook ingestion. Status update push. Integration config per tenant. Follow same abstraction pattern as DoorDash + UberEats. |
| `/adrian` | Frontend: Grubhub connection flow in Settings > Integrations. Sync status. Enable/disable. |
| `/kelsey` | E2E: Same test pattern as UberEats — menu sync, order ingestion, status updates. |

**Acceptance Criteria:**
- Same criteria as UberEats — menu sync, order flow, status updates
- All three delivery APIs (DoorDash, UberEats, Grubhub) work independently and simultaneously

---

### S6-3: Delivery Aggregation Dashboard
**What:** Single view showing orders from all delivery platforms + own delivery.

| Agent | Scope |
|-------|-------|
| `/adrian` | Frontend: Delivery dashboard page — filter by source (All, DoorDash, UberEats, Grubhub, Own Delivery). Show: active delivery orders, average prep-to-pickup time per platform, daily order count per platform. Status badges showing platform connection health. |
| `/spencer` | Backend: `getDeliveryDashboard` query — aggregate delivery orders by source, return metrics per platform. |

**Acceptance Criteria:**
- Owner can see all delivery orders in one place regardless of source
- Platform health is visible (connected, error, disconnected)

---

### S6-4: KitchenHub Migration Guide
**What:** Documentation for restaurants currently using KitchenHub to switch to direct APIs.

| Agent | Scope |
|-------|-------|
| `/edna` | Documentation: Step-by-step migration guide. Before/after cost comparison ($55/mo saved). Checklist for switching each platform. Rollback instructions if issues arise. |

**Acceptance Criteria:**
- Restaurant owner can self-serve the migration from KitchenHub to direct APIs
- Cost savings are clearly documented

---

## S7 — Native Mobile Ordering App

> **Goal:** Largest effort. Customer-facing native app for iOS + Android. This is the only feature that requires a new codebase and new deployment pipeline.

### S7-1: Mobile App Architecture Decision

| Agent | Scope |
|-------|-------|
| `/marcus` | Architecture: Evaluate React Native vs Expo vs progressive web app (PWA) enhancement. Decision criteria: time to market, code reuse with existing Next.js frontend, maintenance burden, App Store requirements, push notification support. Produce architecture decision record (ADR). |

**Acceptance Criteria:**
- Clear technology decision with trade-offs documented
- Build timeline estimate
- Identifies what can be reused from the web app vs what's net-new

---

### S7-2: Mobile App — Core Ordering Flow
**What:** Browse menu, add to cart, customize items with modifiers, checkout with Stripe.

| Agent | Scope |
|-------|-------|
| `/felicity` | UX: Mobile-first ordering flow wireframes. Thumb-friendly navigation. Menu browsing, item detail with modifiers, cart, checkout. Restaurant selector (for multi-tenant). |
| `/adrian` | Frontend: Implement ordering flow per Felicity's wireframes. Reuse API contracts from web ordering. Restaurant selector → menu → item detail → cart → checkout → order confirmation → tracking. |
| `/spencer` | Backend: Ensure all existing ordering APIs support mobile client (CORS, auth tokens for mobile). Push notification support (order status updates). |

**Acceptance Criteria:**
- Customer can browse menu, add items, and complete an order on mobile
- Experience feels native, not like a wrapped website
- All existing modifiers, scheduling, and payment logic work

---

### S7-3: Mobile App — Push Notifications
**What:** Order status updates via push notifications (confirmed, preparing, ready for pickup).

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: Push notification service (Firebase Cloud Messaging for Android, APNs for iOS — or Expo Push if using Expo). Trigger on order status change. Store device tokens per customer. |
| `/adrian` | Frontend: Push notification permission prompt. Display in-app notification when order status changes. Notification preferences in account settings. |

**Acceptance Criteria:**
- Customer gets push notification when order status changes
- Notifications are opt-in with clear permission flow
- Works on both iOS and Android

---

### S7-4: Mobile App — Reorder & Favorites
**What:** Let returning customers reorder previous meals with one tap.

| Agent | Scope |
|-------|-------|
| `/spencer` | Backend: `getOrderHistory` query for authenticated customers (already exists — verify mobile auth works). `reorder` mutation — clone a previous order into a new cart (check item availability, flag unavailable items). `favoriteItem` mutation — save/unsave items per customer. |
| `/adrian` | Frontend: Order history screen. "Reorder" button on past orders. Favorites list. Handle unavailable items gracefully (show what changed). |

**Acceptance Criteria:**
- Customer can reorder a previous meal in 2 taps
- Unavailable items are flagged, not silently dropped
- Favorites persist across sessions

---

### S7-5: App Store Submission
**What:** Prepare and submit to Apple App Store + Google Play Store.

| Agent | Scope |
|-------|-------|
| `/felicity` | Design: App icon, splash screen, App Store screenshots (6.7", 6.5", 5.5" sizes), feature graphic (Google Play). |
| `/adrian` | Frontend: Final build configuration. App signing. Privacy policy URL. |
| `/werner` | Release: App Store Connect submission. Google Play Console submission. Review process management. CI/CD for mobile builds. |

**Acceptance Criteria:**
- App approved and live on both stores
- CI/CD pipeline for future updates

---

## Dependency Map

```
S1 (Reporting) ──── No dependencies. Can start immediately.
S2 (KDS) ────────── No dependencies. Can start immediately.
S3 (Gift Cards) ─── No dependencies. Can start immediately.
S4 (Open Tabs) ──── No dependencies. Can start immediately.
S5 (SMS) ────────── Requires Twilio account setup (Infisical config).
S6 (Delivery) ───── Requires UberEats + Grubhub developer accounts and API access approval.
S7 (Mobile App) ─── Requires S7-1 architecture decision before development.
                     Requires Apple Developer ($99/yr) + Google Play ($25 one-time) accounts.
```

**Parallelization opportunities:**
- S1 + S2 can run in parallel (different domains, different team focus)
- S3 + S4 can run in parallel if team capacity allows (both POS, but different flows)
- S5 is independent and small — can slot between larger sprints
- S6-1 + S6-2 can run in parallel (same pattern, different APIs)
- S7 is sequential internally (architecture → dev → submit)

---

## Agent Workload Summary

| Agent | Stories | Sprint Load |
|-------|---------|-------------|
| `/spencer` | 16 stories | Heavy — backend work in every sprint |
| `/adrian` | 17 stories | Heavy — frontend work in every sprint |
| `/oracle` | 5 stories | Medium — schema work front-loaded in S1-S5 |
| `/kelsey` | 10 stories | Medium — testing follows every feature |
| `/felicity` | 3 stories | Light — S3 gift card design, S7 mobile UX + App Store assets |
| `/marcus` | 2 stories | Light — S6 delivery architecture review, S7 mobile architecture decision |
| `/edna` | 1 story | Light — S6 migration guide |
| `/werner` | 1 story | Light — S7 App Store submission + mobile CI/CD |

---

## Recommended Execution Order

**If running sprints serially (1 active sprint at a time):**
```
S1 (1 wk) → S2 (1 wk) → S4 (1 wk) → S3 (2 wk) → S5 (1 wk) → S6 (2 wk) → S7 (3-4 wk)
```
Total: ~11-12 weeks

**If running sprints in parallel (Spencer + Adrian split across tracks):**
```
Week 1-2:  S1 (Spencer: report queries) + S2 (Adrian: KDS UI, Spencer: station routing backend)
Week 3:    S4 (Open Tabs — full team)
Week 4-5:  S3 (Gift Cards — full team)
Week 6:    S5 (SMS — Spencer + Adrian)
Week 7-8:  S6 (Delivery APIs — Spencer + Adrian + Marcus)
Week 9-12: S7 (Mobile App — full team)
```
Total: ~12 weeks with parallel execution

---

## Quality Gates (Per Sprint)

Before marking any sprint complete:

- [ ] All acceptance criteria verified against running code
- [ ] E2E tests passing for new features
- [ ] No regressions in existing test suite
- [ ] Accessibility review on new UI (Cisco spot-check)
- [ ] Security review on new mutations/APIs (Sentinel spot-check on payment-related sprints: S3, S4, S5)
- [ ] Documentation updated for new features (Edna)

---

## How to Use This Document

1. **Pick a sprint** — Start with S1 or S2 (or both in parallel)
2. **Create stories** — Use `/create-story` for each story in the sprint (this doc has the context)
3. **Run sprint planning** — Use `/sprint-plan` to assign and schedule
4. **Execute** — Dispatch Spencer, Adrian, Oracle, Kelsey as specified
5. **Verify** — Run quality gates before marking done
6. **Move to next sprint**

This document is the single source of truth for remaining RestaurantOS work. Update it as sprints complete.

---

*"The path from B+ to A- is paved with incremental excellence. Every one of these features makes the next restaurant easier to close."*
— Miranda
