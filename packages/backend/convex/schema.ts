import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ==================== Platform Admin Users ====================
  adminUsers: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("super_admin"),
      v.literal("support"),
      v.literal("viewer")
    ),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // ==================== Tenants (Restaurant Clients) ====================
  tenants: defineTable({
    slug: v.string(), // URL-safe ID: "marias-kitchen"
    name: v.string(),
    subdomain: v.string(), // "marias-kitchen" -> marias-kitchen.restaurantos.app
    customDomain: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("trial"),
      v.literal("churned")
    ),

    // Branding
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()), // hex: "#E63946"
    accentColor: v.optional(v.string()),
    fontFamily: v.optional(v.string()),

    // Delivery
    deliveryMode: v.union(v.literal("kitchenhub"), v.literal("direct_api")),

    // Business settings
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
        country: v.string(),
      })
    ),
    tagline: v.optional(v.string()),
    aboutText: v.optional(v.string()),

    // Tax & Fees
    taxRate: v.optional(v.number()), // decimal e.g. 0.0875 = 8.75%

    // Business Hours
    businessHours: v.optional(
      v.array(
        v.object({
          day: v.number(), // 0=Sunday through 6=Saturday
          open: v.string(), // "09:00"
          close: v.string(), // "22:00"
          isClosed: v.boolean(),
        })
      )
    ),
    holidayHours: v.optional(
      v.array(
        v.object({
          date: v.string(), // "2026-12-25"
          open: v.optional(v.string()),
          close: v.optional(v.string()),
          isClosed: v.boolean(),
          label: v.optional(v.string()), // "Christmas Day"
        })
      )
    ),

    // Alcohol / Liquor Compliance
    liquorLicenseNumber: v.optional(v.string()),
    liquorLicenseExpiry: v.optional(v.number()), // epoch ms
    alcoholSaleHoursStart: v.optional(v.string()), // "07:00"
    alcoholSaleHoursEnd: v.optional(v.string()), // "02:00"

    // Online Ordering Settings
    onlineOrderingSettings: v.optional(
      v.object({
        enabled: v.boolean(),
        minimumOrderCents: v.optional(v.number()),
        pickupTimeSlotMinutes: v.optional(v.number()), // e.g. 15 = every 15 min
        defaultPrepTimeMinutes: v.optional(v.number()),
      })
    ),

    // Tip Pooling
    tipPoolingEnabled: v.optional(v.boolean()),
    tipPoolingMethod: v.optional(
      v.union(v.literal("equal"), v.literal("hours"), v.literal("points"))
    ),

    // Reservation Settings
    reservationsEnabled: v.optional(v.boolean()),
    reservationSlotMinutes: v.optional(v.number()), // 15, 30, or 60 min intervals
    reservationMaxPartySize: v.optional(v.number()),
    reservationMaxDaysAhead: v.optional(v.number()), // how far in advance
    reservationDefaultDuration: v.optional(v.number()), // minutes
    reservationAutoConfirm: v.optional(v.boolean()), // auto-confirm online reservations

    // Features & Plan
    features: v.optional(
      v.object({
        onlineOrdering: v.optional(v.boolean()),
        catering: v.optional(v.boolean()),
        loyalty: v.optional(v.boolean()),
        marketing: v.optional(v.boolean()),
        reservations: v.optional(v.boolean()),
        analytics: v.optional(v.boolean()),
      })
    ),
    plan: v.union(
      v.literal("starter"),
      v.literal("growth"),
      v.literal("pro")
    ),
    stripeCustomerId: v.optional(v.string()),

    // Payment processing (POS terminal)
    paymentProcessor: v.optional(
      v.union(v.literal("stripe"), v.literal("square"), v.literal("none"))
    ), // defaults to "none"
    stripeAccountId: v.optional(v.string()), // for Stripe Connect
    stripeTerminalLocationId: v.optional(v.string()), // Stripe Terminal location

    // Square payment processing
    squareAccessToken: v.optional(v.string()), // Square OAuth access token (encrypted)
    squareRefreshToken: v.optional(v.string()), // Square OAuth refresh token (encrypted)
    squareLocationId: v.optional(v.string()), // Square location ID
    squareMerchantId: v.optional(v.string()), // Square merchant ID

    // Website content (configurable per-tenant, with fallback defaults)
    heroHeading: v.optional(v.string()), // e.g. "Soul Food."
    heroSubheading: v.optional(v.string()), // e.g. "Made Fresh Daily."
    deliveryMessage: v.optional(v.string()), // e.g. "Yes We Deliver"
    deliveryPartners: v.optional(
      v.array(v.object({ name: v.string(), color: v.string() }))
    ), // e.g. [{name:"DoorDash",color:"#FF3008"}]
    footerTagline: v.optional(v.string()), // e.g. "Fresh food, great service."

    // Own Delivery Settings (for restaurant's own delivery fleet)
    deliveryEnabled: v.optional(v.boolean()),
    deliveryFee: v.optional(v.number()), // flat fee in cents
    deliveryMinimum: v.optional(v.number()), // minimum order total in cents
    deliveryRadius: v.optional(v.number()), // radius in miles
    deliveryZones: v.optional(
      v.array(
        v.object({
          name: v.string(),
          zipCodes: v.array(v.string()),
          fee: v.number(), // cents
        })
      )
    ),

    // DoorDash Drive Settings (on-demand delivery via DoorDash)
    doordashDriveEnabled: v.optional(v.boolean()),
    doordashDeveloperId: v.optional(v.string()),
    doordashKeyId: v.optional(v.string()),
    doordashSigningSecret: v.optional(v.string()),

    // Website
    websiteEnabled: v.optional(v.boolean()),
    heroImageStorageId: v.optional(v.id("_storage")),
    featuredItemIds: v.optional(v.array(v.id("menuItems"))),
    socialLinks: v.optional(
      v.object({
        facebook: v.optional(v.string()),
        instagram: v.optional(v.string()),
        twitter: v.optional(v.string()),
        yelp: v.optional(v.string()),
      })
    ),
    googleMapsEmbedUrl: v.optional(v.string()),

    // Accounting Integration
    accountingProvider: v.optional(
      v.union(v.literal("quickbooks"), v.literal("xero"), v.literal("none"))
    ),
    quickbooksAccessToken: v.optional(v.string()),
    quickbooksRefreshToken: v.optional(v.string()),
    quickbooksRealmId: v.optional(v.string()),
    quickbooksConnectedAt: v.optional(v.number()),
    xeroAccessToken: v.optional(v.string()),
    xeroRefreshToken: v.optional(v.string()),
    xeroTenantId: v.optional(v.string()),
    xeroConnectedAt: v.optional(v.number()),

    accountingAutoSyncEnabled: v.optional(v.boolean()),
    accountingLastSyncTime: v.optional(v.number()),

    // Daypart boundaries for reporting (custom per-tenant)
    daypartConfig: v.optional(
      v.array(
        v.object({
          name: v.string(),
          startHour: v.number(),
          endHour: v.number(),
        })
      )
    ),

    // KDS configuration
    kdsSettings: v.optional(
      v.object({
        stations: v.optional(v.array(v.string())),
        audioEnabled: v.optional(v.boolean()),
        audioVolume: v.optional(v.number()),
        newTicketSound: v.optional(v.string()),
        warningSound: v.optional(v.string()),
        overdueSound: v.optional(v.string()),
        warningThresholdMinutes: v.optional(v.number()),
        overdueThresholdMinutes: v.optional(v.number()),
      })
    ),

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_subdomain", ["subdomain"])
    .index("by_status", ["status"]),

  // ==================== Tenant Themes ====================
  tenantThemes: defineTable({
    tenantId: v.id("tenants"),
    name: v.optional(v.string()),
    isActive: v.optional(v.boolean()),

    // HSL CSS variables for shadcn
    background: v.optional(v.string()),
    foreground: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    primaryForeground: v.optional(v.string()),
    secondary: v.optional(v.string()),
    secondaryForeground: v.optional(v.string()),
    accent: v.optional(v.string()),
    accentForeground: v.optional(v.string()),
    muted: v.optional(v.string()),
    mutedForeground: v.optional(v.string()),
    card: v.optional(v.string()),
    cardForeground: v.optional(v.string()),
    popover: v.optional(v.string()),
    popoverForeground: v.optional(v.string()),
    border: v.optional(v.string()),
    input: v.optional(v.string()),
    ring: v.optional(v.string()),
    destructive: v.optional(v.string()),
    destructiveForeground: v.optional(v.string()),
    chart1: v.optional(v.string()),
    chart2: v.optional(v.string()),
    chart3: v.optional(v.string()),
    chart4: v.optional(v.string()),
    chart5: v.optional(v.string()),
    sidebar: v.optional(v.string()),
    sidebarForeground: v.optional(v.string()),
    sidebarPrimary: v.optional(v.string()),
    sidebarPrimaryForeground: v.optional(v.string()),
    sidebarAccent: v.optional(v.string()),
    sidebarAccentForeground: v.optional(v.string()),
    sidebarBorder: v.optional(v.string()),
    sidebarRing: v.optional(v.string()),

    // Dark mode overrides (boolean flag — true enables dark mode variant)
    darkMode: v.optional(v.boolean()),

    // Typography
    fontSans: v.optional(v.string()),
    fontHeading: v.optional(v.string()),
    radius: v.optional(v.string()),

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_tenantId", ["tenantId"]),

  // ==================== Tenant Users (Restaurant Staff) ====================
  users: defineTable({
    tenantId: v.id("tenants"),
    email: v.string(),
    passwordHash: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("server"),
      v.literal("cashier")
    ),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"))),
    lastLoginAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_email", ["tenantId", "email"])
    .index("by_tenantId_status", ["tenantId", "status"]),

  // ==================== Delivery Configs ====================
  deliveryConfigs: defineTable({
    tenantId: v.id("tenants"),
    mode: v.union(v.literal("kitchenhub"), v.literal("direct_api")),

    // KitchenHub config
    khStoreId: v.optional(v.string()),
    khApiKey: v.optional(v.string()),
    khWebhookSecret: v.optional(v.string()),

    // Direct API configs
    doordashConfig: v.optional(
      v.object({
        developerId: v.optional(v.string()),
        keyId: v.optional(v.string()),
        signingSecret: v.optional(v.string()),
        storeId: v.optional(v.string()),
        enabled: v.optional(v.boolean()),
      })
    ),
    ubereatsConfig: v.optional(
      v.object({
        clientId: v.optional(v.string()),
        clientSecret: v.optional(v.string()),
        storeId: v.optional(v.string()),
        enabled: v.optional(v.boolean()),
      })
    ),
    grubhubConfig: v.optional(
      v.object({
        accessToken: v.optional(v.string()),
        restaurantId: v.optional(v.string()),
        enabled: v.optional(v.boolean()),
      })
    ),

    // State tracking
    lastModeSwitch: v.optional(v.number()),
    switchInitiatedBy: v.optional(v.string()),

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_tenantId", ["tenantId"]),

  // ==================== Audit Logs ====================
  auditLogs: defineTable({
    action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    entityType: v.string(),
    entityId: v.string(),
    userId: v.optional(v.string()),
    userType: v.optional(v.string()), // admin, tenant_user, system
    userEmail: v.optional(v.string()),
    // Audit log captures arbitrary before/after state — v.any() is intentional
    // because these log the full shape of whatever entity was modified.
    oldValues: v.optional(v.any()),
    newValues: v.optional(v.any()),
    changes: v.optional(v.any()),
    tenantId: v.optional(v.string()),
    // Freeform metadata for audit context (action type, IP, etc.)
    metadata: v.optional(v.any()),
    createdAt: v.optional(v.number()),
  })
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_userId", ["userId"]),

  // ==================== POS: Menu Categories ====================
  menuCategories: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.optional(v.boolean()),

    // Daypart filtering
    menuType: v.optional(
      v.union(
        v.literal("all"),
        v.literal("lunch"),
        v.literal("dinner")
      )
    ), // defaults to "all"
    visibleFrom: v.optional(v.string()), // time like "11:00"
    visibleTo: v.optional(v.string()), // time like "16:00"

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_sortOrder", ["tenantId", "sortOrder"]),

  // ==================== POS: Menu Items ====================
  menuItems: defineTable({
    tenantId: v.id("tenants"),
    categoryId: v.id("menuCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(), // cents
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")), // Convex file storage
    dietaryTags: v.optional(v.array(v.string())), // vegan, gluten-free, etc.
    isAvailable: v.boolean(),
    is86d: v.optional(v.boolean()), // out of stock across all platforms
    sortOrder: v.optional(v.number()),
    prepTimeMinutes: v.optional(v.number()),
    foodCostCents: v.optional(v.number()), // cost to prepare this item in cents
    station: v.optional(v.string()), // KDS station assignment ("grill", "fry", "cold", "bar", etc.)

    // Item type (food vs alcohol categories)
    type: v.optional(
      v.union(
        v.literal("food"),
        v.literal("beer"),
        v.literal("wine"),
        v.literal("spirits"),
        v.literal("non_alcoholic_beverage")
      )
    ), // defaults to "food" in queries

    // Limited Time Offers / Specials
    isSpecial: v.optional(v.boolean()),
    availableFrom: v.optional(v.number()), // epoch ms
    availableTo: v.optional(v.number()), // epoch ms

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_categoryId", ["categoryId"])
    .index("by_tenantId_available", ["tenantId", "isAvailable"]),

  // ==================== POS: Modifier Groups ====================
  modifierGroups: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(), // "Size", "Toppings", "Sides"
    minSelections: v.number(), // 0 = optional, 1+ = required
    maxSelections: v.number(), // 1 = single select, N = multi select
    menuItemIds: v.array(v.id("menuItems")), // items this group applies to
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"]),

  // ==================== POS: Modifier Options ====================
  modifierOptions: defineTable({
    tenantId: v.id("tenants"),
    groupId: v.id("modifierGroups"),
    name: v.string(), // "Large", "Extra Cheese"
    priceAdjustment: v.number(), // cents (can be 0)
    isDefault: v.optional(v.boolean()),
    isAvailable: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  })
    .index("by_groupId", ["groupId"])
    .index("by_tenantId", ["tenantId"]),

  // ==================== POS: Discounts ====================
  discounts: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(), // e.g., "Happy Hour 20%", "Military Discount", "Employee Meal"
    type: v.union(v.literal("percentage"), v.literal("fixed")),
    value: v.number(), // percentage (e.g., 20 for 20%) or cents (e.g., 500 for $5.00)
    isActive: v.boolean(),
    requiresApproval: v.boolean(), // whether manager approval is needed to apply
    createdAt: v.number(),
  }).index("by_tenantId", ["tenantId"]),

  // ==================== POS: Tables / Floor Plan ====================
  tables: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(), // "Table 1", "Bar 3", "Patio 5"
    seats: v.optional(v.number()),
    section: v.optional(v.string()), // "Main", "Patio", "Bar"
    status: v.union(
      v.literal("open"),
      v.literal("occupied"),
      v.literal("reserved"),
      v.literal("closing")
    ),
    // Floor plan position & dimensions (for visual layout editor)
    posX: v.optional(v.number()),
    posY: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    shape: v.optional(
      v.union(
        v.literal("circle"),
        v.literal("square"),
        v.literal("rectangle"),
        v.literal("round") // legacy — prefer "circle" going forward
      )
    ),
    rotation: v.optional(v.number()), // degrees 0-360
    floor: v.optional(v.string()), // multi-floor support: "1st Floor", "Rooftop"
    currentOrderId: v.optional(v.id("orders")),
    createdAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"]),

  // ==================== POS: Orders ====================
  orders: defineTable({
    tenantId: v.id("tenants"),
    orderNumber: v.number(), // sequential per tenant per day
    source: v.union(
      v.literal("dine_in"),
      v.literal("online"),
      v.literal("doordash"),
      v.literal("ubereats"),
      v.literal("grubhub")
    ),
    status: v.union(
      v.literal("open"),
      v.literal("sent_to_kitchen"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    tableId: v.optional(v.id("tables")),
    tableName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),

    // Line items stored denormalized for speed
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(), // cents
        modifiers: v.optional(
          v.array(
            v.object({
              name: v.string(),
              priceAdjustment: v.number(),
            })
          )
        ),
        specialInstructions: v.optional(v.string()),
        lineTotal: v.number(), // cents
        // Void fields
        isVoided: v.optional(v.boolean()),
        voidedBy: v.optional(v.string()),
        voidReason: v.optional(v.string()),
        course: v.optional(v.number()), // course number, default 1
      })
    ),

    subtotal: v.number(), // cents
    tax: v.number(), // cents
    tip: v.optional(v.number()), // cents
    total: v.number(), // cents

    // Payment
    paymentStatus: v.union(
      v.literal("unpaid"),
      v.literal("partial"),
      v.literal("paid"),
      v.literal("refunded")
    ),
    paymentMethod: v.optional(
      v.union(
        v.literal("card"),
        v.literal("cash"),
        v.literal("split")
      )
    ),
    stripePaymentIntentId: v.optional(v.string()),

    // Discount / Comp
    discountId: v.optional(v.id("discounts")),
    discountType: v.optional(
      v.union(v.literal("percentage"), v.literal("fixed"), v.literal("comp"))
    ),
    discountValue: v.optional(v.number()), // the value that was applied
    discountAmount: v.optional(v.number()), // actual dollar amount deducted (in cents)
    discountReason: v.optional(v.string()), // reason for comp/void
    isComped: v.optional(v.boolean()), // whether the entire order was comped
    compedBy: v.optional(v.string()), // who authorized the comp

    // Tip
    tipAmount: v.optional(v.number()), // tip amount in cents
    tipMethod: v.optional(v.union(v.literal("cash"), v.literal("card"))),

    // Order type & delivery fields (own delivery)
    orderType: v.optional(
      v.union(v.literal("pickup"), v.literal("delivery"), v.literal("dine_in"))
    ),
    deliveryAddress: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),
    deliveryFee: v.optional(v.number()), // cents
    deliveryInstructions: v.optional(v.string()),
    deliveryStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("assigned"),
        v.literal("picked_up"),
        v.literal("delivered")
      )
    ),

    // Offline sync deduplication
    offlineId: v.optional(v.string()),

    // External delivery order reference
    externalOrderId: v.optional(v.string()),
    estimatedPickupTime: v.optional(v.number()),
    scheduledPickupTime: v.optional(v.number()), // customer-selected future pickup time
    estimatedReadyAt: v.optional(v.number()), // calculated from prep times

    // Course firing
    firedCourses: v.optional(v.array(v.number())), // tracks which courses have been fired to KDS

    // Timestamps
    createdAt: v.number(),
    sentToKitchenAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),

    // Staff
    serverId: v.optional(v.id("users")),
    serverName: v.optional(v.string()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_tenantId_createdAt", ["tenantId", "createdAt"])
    .index("by_tenantId_orderNumber", ["tenantId", "orderNumber"])
    .index("by_tenantId_offlineId", ["tenantId", "offlineId"])
    .index("by_tableId", ["tableId"]),

  // ==================== POS: Payments ====================
  payments: defineTable({
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
    amount: v.number(), // cents
    method: v.union(
      v.literal("card"),
      v.literal("cash")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    cashReceived: v.optional(v.number()), // for cash payments
    changeGiven: v.optional(v.number()),
    tip: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_tenantId", ["tenantId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),

  // ==================== KDS: Kitchen Tickets ====================
  kdsTickets: defineTable({
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
    orderNumber: v.number(),
    source: v.union(
      v.literal("dine_in"),
      v.literal("online"),
      v.literal("doordash"),
      v.literal("ubereats"),
      v.literal("grubhub")
    ),
    sourceBadge: v.string(), // Display label: "Dine-In", "DoorDash", etc.
    status: v.union(
      v.literal("new"),
      v.literal("in_progress"),
      v.literal("bumped"),
      v.literal("recalled")
    ),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        modifiers: v.optional(v.array(v.string())),
        specialInstructions: v.optional(v.string()),
        station: v.optional(v.string()), // grill, fry, cold, expo
        isBumped: v.optional(v.boolean()),
        course: v.optional(v.number()), // course number
      })
    ),
    courseNumber: v.optional(v.number()), // which course this ticket represents
    tableName: v.optional(v.string()),
    customerName: v.optional(v.string()),
    estimatedPickupTime: v.optional(v.number()),

    // Timing
    receivedAt: v.number(),
    bumpedAt: v.optional(v.number()),
    recalledAt: v.optional(v.number()),

    // Station routing
    station: v.optional(v.string()), // primary station assignment
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_orderId", ["orderId"]),

  // ==================== KDS: Bumped Ticket History (Recall Queue) ====================
  kdsBumpHistory: defineTable({
    tenantId: v.id("tenants"),
    ticketId: v.id("kdsTickets"),
    orderId: v.id("orders"),
    orderNumber: v.number(),
    source: v.union(
      v.literal("dine_in"),
      v.literal("online"),
      v.literal("doordash"),
      v.literal("ubereats"),
      v.literal("grubhub")
    ),
    bumpedAt: v.number(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        modifiers: v.optional(v.array(v.string())),
      })
    ),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_bumpedAt", ["tenantId", "bumpedAt"]),

  // ==================== Catering: Categories ====================
  cateringCategories: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"]),

  // ==================== Catering: Menu Items ====================
  cateringMenuItems: defineTable({
    tenantId: v.id("tenants"),
    categoryId: v.id("cateringCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    servingSize: v.string(), // "Serves 10-12"
    pricePerPerson: v.optional(v.number()), // cents
    flatPrice: v.optional(v.number()), // cents (alternative)
    minimumQuantity: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
    isAvailable: v.boolean(),
    sortOrder: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_categoryId", ["categoryId"]),

  // ==================== Catering: Orders ====================
  cateringOrders: defineTable({
    tenantId: v.id("tenants"),
    orderNumber: v.number(),
    status: v.union(
      v.literal("inquiry"),
      v.literal("confirmed"),
      v.literal("deposit_paid"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),

    // Customer
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),

    // Event
    eventDate: v.number(), // epoch ms
    eventTime: v.string(), // "18:00"
    headcount: v.number(),
    fulfillmentType: v.union(v.literal("pickup"), v.literal("delivery")),
    deliveryAddress: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),

    // Items
    items: v.array(
      v.object({
        cateringMenuItemId: v.id("cateringMenuItems"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(), // cents
        lineTotal: v.number(), // cents
      })
    ),

    // Financials
    subtotal: v.number(),
    tax: v.number(),
    total: v.number(),

    // Deposit & Balance
    depositRequired: v.number(), // cents
    depositPaid: v.optional(v.number()),
    depositPaidAt: v.optional(v.number()),
    depositStripePaymentIntentId: v.optional(v.string()),
    balanceDue: v.optional(v.number()),
    balanceDueDate: v.optional(v.number()),
    balancePaidAt: v.optional(v.number()),
    balanceStripePaymentIntentId: v.optional(v.string()),

    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_tenantId_eventDate", ["tenantId", "eventDate"]),

  // ==================== Billing: Subscriptions ====================
  subscriptions: defineTable({
    tenantId: v.id("tenants"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("trialing")
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    addons: v.optional(
      v.array(
        v.object({
          name: v.string(), // "catering", "loyalty", etc.
          stripePriceId: v.string(),
          active: v.boolean(),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  // ==================== Billing: Invoices ====================
  invoices: defineTable({
    tenantId: v.id("tenants"),
    stripeInvoiceId: v.string(),
    amountDue: v.number(), // cents
    amountPaid: v.number(), // cents
    status: v.union(v.literal("paid"), v.literal("open"), v.literal("void"), v.literal("draft")),
    invoiceDate: v.number(), // epoch ms
    paidAt: v.optional(v.number()),
    invoiceUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_stripeInvoiceId", ["stripeInvoiceId"]),

  // ==================== Events ====================
  events: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    category: v.union(
      v.literal("buffet"),
      v.literal("special"),
      v.literal("prix_fixe"),
      v.literal("holiday"),
      v.literal("other")
    ),
    recurrence: v.union(
      v.literal("once"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    dayOfWeek: v.optional(v.number()), // 0=Sunday for weekly events
    startDate: v.optional(v.number()), // epoch ms for one-time events
    endDate: v.optional(v.number()),
    startTime: v.string(), // "11:00"
    endTime: v.string(), // "18:00"
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"]),

  // ==================== Event Pricing Tiers ====================
  eventPricingTiers: defineTable({
    tenantId: v.id("tenants"),
    eventId: v.id("events"),
    tierName: v.string(), // "Adults", "Seniors", "Kids 2-12"
    price: v.number(), // cents
    sortOrder: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_tenantId", ["tenantId"]),

  // ==================== Daily Specials ====================
  dailySpecials: defineTable({
    tenantId: v.id("tenants"),
    dayOfWeek: v.number(), // 0=Sunday through 6=Saturday
    name: v.string(), // "Tuesday Special"
    description: v.optional(v.string()),
    items: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        price: v.number(), // cents
      })
    ),
    startTime: v.optional(v.string()), // "11:00"
    endTime: v.optional(v.string()), // "14:00"
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_dayOfWeek", ["tenantId", "dayOfWeek"]),

  // ==================== Order Counters (daily sequential numbering) ====================
  orderCounters: defineTable({
    tenantId: v.id("tenants"),
    date: v.string(), // "YYYY-MM-DD"
    count: v.number(),
  }).index("by_tenantId_date", ["tenantId", "date"]),

  // ==================== Webhook Ingestion Log ====================
  webhookLogs: defineTable({
    tenantId: v.id("tenants"),
    platform: v.string(), // kitchenhub, doordash, ubereats, grubhub
    eventType: v.string(), // order.created, order.updated, etc.
    externalOrderId: v.optional(v.string()),
    status: v.union(
      v.literal("received"),
      v.literal("processed"),
      v.literal("failed")
    ),
    // Webhook payloads are external platform JSON — shape varies per provider.
    // v.any() is intentional since we store raw payloads for debugging.
    payload: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    receivedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"]),

  // ==================== Customers (CRM) ====================
  customers: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    orderCount: v.number(),
    totalSpent: v.number(), // cents
    lastOrderDate: v.optional(v.number()), // epoch ms
    firstOrderDate: v.number(), // epoch ms
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_email", ["tenantId", "email"])
    .index("by_tenantId_phone", ["tenantId", "phone"]),

  // ==================== Inventory: Ingredients ====================
  ingredients: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    unit: v.string(), // "oz", "lb", "each", "cup", "gal", etc.
    currentStock: v.number(), // current quantity in the unit
    lowStockThreshold: v.number(), // trigger alert when below this
    costPerUnit: v.number(), // cents — purchase cost per unit
    par: v.optional(v.number()), // target stock level
    category: v.optional(v.string()), // "Produce", "Protein", "Dairy", etc.
    supplier: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_category", ["tenantId", "category"]),

  // ==================== Inventory: Menu Item ↔ Ingredient Links ====================
  menuItemIngredients: defineTable({
    tenantId: v.id("tenants"),
    menuItemId: v.id("menuItems"),
    ingredientId: v.id("ingredients"),
    quantity: v.number(), // amount of ingredient used per menu item
  })
    .index("by_menuItemId", ["menuItemId"])
    .index("by_ingredientId", ["ingredientId"])
    .index("by_tenantId", ["tenantId"]),

  // ==================== Inventory: Stock Change Logs ====================
  inventoryLogs: defineTable({
    tenantId: v.id("tenants"),
    ingredientId: v.id("ingredients"),
    type: v.union(
      v.literal("order_deduction"),
      v.literal("receive"),
      v.literal("waste"),
      v.literal("adjustment"),
      v.literal("count")
    ),
    quantityChange: v.number(), // positive for additions, negative for deductions
    previousStock: v.number(),
    newStock: v.number(),
    orderId: v.optional(v.id("orders")), // for order deductions
    reason: v.optional(v.string()),
    performedBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenantId_createdAt", ["tenantId", "createdAt"])
    .index("by_ingredientId_createdAt", ["ingredientId", "createdAt"]),

  // ==================== Reservations ====================
  reservations: defineTable({
    tenantId: v.id("tenants"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    partySize: v.number(),
    date: v.string(), // "YYYY-MM-DD"
    time: v.string(), // "HH:MM" 24hr
    endTime: v.optional(v.string()), // estimated end "HH:MM"
    duration: v.number(), // minutes, default 90
    tableId: v.optional(v.id("tables")), // assigned table
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("seated"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    source: v.union(
      v.literal("online"),
      v.literal("phone"),
      v.literal("walk_in")
    ),
    notes: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    waitlistPosition: v.optional(v.number()), // for waitlist entries
    createdAt: v.number(),
  })
    .index("by_tenantId_date", ["tenantId", "date"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_tenantId_createdAt", ["tenantId", "createdAt"]),

  // ==================== Time Clock: Shifts ====================
  shifts: defineTable({
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    clockIn: v.number(), // epoch ms
    clockOut: v.optional(v.number()), // epoch ms
    breakMinutes: v.optional(v.number()), // total break time in minutes
    role: v.string(), // role during this shift
    hourlyRate: v.optional(v.number()), // cents — wage rate
    notes: v.optional(v.string()),
    isActive: v.boolean(), // true while clocked in
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_userId", ["tenantId", "userId"])
    .index("by_tenantId_createdAt", ["tenantId", "createdAt"]),

  // ==================== Scheduling: Planned Shifts ====================
  schedules: defineTable({
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    startTime: v.string(), // "HH:MM" 24hr
    endTime: v.string(), // "HH:MM" 24hr
    role: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenantId_date", ["tenantId", "date"])
    .index("by_tenantId_userId", ["tenantId", "userId"]),

  // ==================== Accounting Sync Logs ====================
  accountingSyncLogs: defineTable({
    tenantId: v.id("tenants"),
    syncType: v.union(v.literal("manual"), v.literal("auto")),
    status: v.union(v.literal("success"), v.literal("error")),
    recordsSynced: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_timestamp", ["tenantId", "timestamp"]),

  // ==================== Loyalty Programs ====================
  loyaltyPrograms: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    pointsPerDollar: v.number(), // points earned per $1 spent
    redemptionRules: v.array(
      v.object({
        pointsRequired: v.number(),
        rewardType: v.union(
          v.literal("discount_percentage"),
          v.literal("discount_fixed"),
          v.literal("free_item")
        ),
        rewardValue: v.number(),
        description: v.string(),
      })
    ),
    tiers: v.optional(
      v.array(
        v.object({
          name: v.string(),
          minPoints: v.number(),
          multiplier: v.number(), // e.g., Gold = 2x points
        })
      )
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_tenantId", ["tenantId"]),

  // ==================== Loyalty Accounts ====================
  loyaltyAccounts: defineTable({
    tenantId: v.id("tenants"),
    customerId: v.id("customers"),
    programId: v.id("loyaltyPrograms"),
    currentPoints: v.number(),
    lifetimePoints: v.number(),
    currentTier: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_customerId", ["customerId"])
    .index("by_tenantId_customerId", ["tenantId", "customerId"]),

  // ==================== Loyalty Transactions ====================
  loyaltyTransactions: defineTable({
    tenantId: v.id("tenants"),
    accountId: v.id("loyaltyAccounts"),
    orderId: v.optional(v.id("orders")),
    type: v.union(
      v.literal("earn"),
      v.literal("redeem"),
      v.literal("adjust"),
      v.literal("expire")
    ),
    points: v.number(), // positive for earn, negative for redeem
    description: v.string(),
    createdAt: v.number(),
  }).index("by_accountId_createdAt", ["accountId", "createdAt"]),

  // ==================== Marketing: Campaigns ====================
  campaigns: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    subject: v.string(),
    body: v.string(), // HTML string
    segmentFilter: v.string(), // segment name to target
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("cancelled")
    ),
    scheduledAt: v.optional(v.number()), // epoch ms
    sentAt: v.optional(v.number()), // epoch ms
    recipientCount: v.number(),
    openCount: v.number(),
    clickCount: v.number(),
    createdAt: v.number(),
  }).index("by_tenantId_createdAt", ["tenantId", "createdAt"]),

  // ==================== Marketing: Campaign Recipients ====================
  campaignRecipients: defineTable({
    tenantId: v.id("tenants"),
    campaignId: v.id("campaigns"),
    customerId: v.id("customers"),
    email: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced")
    ),
    sentAt: v.optional(v.number()), // epoch ms
    openedAt: v.optional(v.number()), // epoch ms
  }).index("by_campaignId", ["campaignId"]),

  // ==================== Marketing: Automated Triggers ====================
  automatedTriggers: defineTable({
    tenantId: v.id("tenants"),
    type: v.union(
      v.literal("birthday"),
      v.literal("inactive_30d"),
      v.literal("inactive_60d"),
      v.literal("anniversary"),
      v.literal("first_order_followup")
    ),
    templateSubject: v.string(),
    templateBody: v.string(), // HTML string
    isActive: v.boolean(),
    lastRunAt: v.optional(v.number()), // epoch ms
    createdAt: v.number(),
  }).index("by_tenantId", ["tenantId"]),

  // ==================== Contact Form Submissions ====================
  contactSubmissions: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    email: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("read"),
      v.literal("replied")
    ),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_tenantId_createdAt", ["tenantId", "createdAt"]),

  // ==================== Deliveries (Third-Party Delivery Tracking) ====================
  deliveries: defineTable({
    tenantId: v.id("tenants"),
    orderId: v.id("orders"),
    provider: v.union(
      v.literal("doordash"),
      v.literal("ubereats"),
      v.literal("grubhub"),
      v.literal("own")
    ),
    externalId: v.string(), // provider's delivery ID
    status: v.union(
      v.literal("pending"),
      v.literal("assigned"),
      v.literal("picked_up"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    driverName: v.optional(v.string()),
    driverPhone: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    fee: v.optional(v.number()), // cents
    estimatedPickup: v.optional(v.number()), // epoch ms
    estimatedDropoff: v.optional(v.number()), // epoch ms
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"])
    .index("by_orderId", ["orderId"])
    .index("by_externalId", ["externalId"]),
});
