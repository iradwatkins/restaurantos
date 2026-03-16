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
    status: v.optional(v.string()), // active, inactive
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

    // Dark mode overrides
    darkMode: v.optional(v.any()),

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
    status: v.optional(v.string()), // active, inactive, suspended
    lastLoginAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_email", ["tenantId", "email"]),

  // ==================== Delivery Configs ====================
  deliveryConfigs: defineTable({
    tenantId: v.id("tenants"),
    mode: v.union(v.literal("kitchenhub"), v.literal("direct_api")),

    // KitchenHub config
    khStoreId: v.optional(v.string()),
    khApiKey: v.optional(v.string()),
    khWebhookSecret: v.optional(v.string()),

    // Direct API configs
    doordashConfig: v.optional(v.any()),
    ubereatsConfig: v.optional(v.any()),
    grubhubConfig: v.optional(v.any()),

    // State tracking
    lastModeSwitch: v.optional(v.number()),
    switchInitiatedBy: v.optional(v.string()),

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_tenantId", ["tenantId"]),

  // ==================== Audit Logs ====================
  auditLogs: defineTable({
    action: v.string(), // create, update, delete
    entityType: v.string(),
    entityId: v.string(),
    userId: v.optional(v.string()),
    userType: v.optional(v.string()), // admin, tenant_user, system
    userEmail: v.optional(v.string()),
    oldValues: v.optional(v.any()),
    newValues: v.optional(v.any()),
    changes: v.optional(v.any()),
    tenantId: v.optional(v.string()),
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
    // Floor plan position (for visual layout)
    posX: v.optional(v.number()),
    posY: v.optional(v.number()),
    shape: v.optional(v.union(v.literal("square"), v.literal("round"), v.literal("rectangle"))),
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

    // External delivery order reference
    externalOrderId: v.optional(v.string()),
    estimatedPickupTime: v.optional(v.number()),
    scheduledPickupTime: v.optional(v.number()), // customer-selected future pickup time
    estimatedReadyAt: v.optional(v.number()), // calculated from prep times

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
    source: v.string(), // dine_in, online, doordash, ubereats, grubhub
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
      })
    ),
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
    source: v.string(),
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
    status: v.string(), // paid, open, void, draft
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
    payload: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    receivedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_status", ["tenantId", "status"]),
});
