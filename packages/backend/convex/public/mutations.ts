import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Submit a contact form message (no auth required — customer-facing).
 * Validates email format and non-empty fields server-side.
 * Rate-limited: max 5 submissions per email per tenant per hour.
 */
export const submitContactForm = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    email: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // ── Validation ──
    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const message = args.message.trim();

    if (!name) throw new Error("Name is required");
    if (!email) throw new Error("Email is required");
    if (!message) throw new Error("Message is required");

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    if (message.length > 5000) {
      throw new Error("Message must be 5,000 characters or fewer");
    }

    // ── Verify tenant exists ──
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant not found");
    }

    // ── Rate limiting: max 5 submissions per email per tenant per hour ──
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentSubmissions = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_tenantId_createdAt", (q) =>
        q.eq("tenantId", args.tenantId).gte("createdAt", oneHourAgo)
      )
      .collect();

    const fromThisEmail = recentSubmissions.filter((s) => s.email === email);
    if (fromThisEmail.length >= 5) {
      throw new Error("Too many submissions. Please try again later.");
    }

    // ── Store submission ──
    await ctx.db.insert("contactSubmissions", {
      tenantId: args.tenantId,
      name,
      email,
      message,
      status: "new",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Place an online order (no auth required — customer-facing).
 * All prices are verified server-side from the database.
 * Client-supplied price fields are ignored for calculations.
 */
export const placeOrder = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    orderType: v.union(v.literal("pickup"), v.literal("delivery")),
    deliveryAddress: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
      })
    ),
    deliveryInstructions: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    scheduledPickupTime: v.optional(v.number()), // epoch ms — customer-selected future time
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        modifiers: v.optional(
          v.array(
            v.object({
              name: v.string(),
              priceAdjustment: v.number(),
            })
          )
        ),
        specialInstructions: v.optional(v.string()),
        lineTotal: v.number(),
      })
    ),
    subtotal: v.number(),
    tax: v.number(),
    tip: v.optional(v.number()),
    total: v.number(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // ── Verify tenant exists and is active ──
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant || tenant.status !== "active") {
      throw new Error("Restaurant is not currently accepting orders");
    }

    // ── Delivery validation ──
    let deliveryFee = 0;
    let deliveryZoneName: string | undefined;

    if (args.orderType === "delivery") {
      if (!tenant.deliveryEnabled) {
        throw new Error("This restaurant does not offer delivery");
      }
      if (!args.deliveryAddress) {
        throw new Error("Delivery address is required for delivery orders");
      }

      // Check zip code against delivery zones
      const zones = tenant.deliveryZones;
      if (zones && zones.length > 0) {
        const matchedZone = zones.find((zone) =>
          zone.zipCodes.includes(args.deliveryAddress!.zip)
        );
        if (!matchedZone) {
          throw new Error(
            "Delivery is not available to this zip code"
          );
        }
        deliveryFee = matchedZone.fee;
        deliveryZoneName = matchedZone.name;
      } else if (tenant.deliveryFee !== undefined) {
        // Fall back to flat delivery fee if no zones configured
        deliveryFee = tenant.deliveryFee;
      }
    }

    // ── Server-side price verification ──
    // Look up every menu item from the database and recalculate all prices.
    // Client-supplied unitPrice, lineTotal, subtotal, tax, and total are ignored.

    // Pre-load all modifier options for this tenant (used for modifier price verification)
    const allModifierOptions = await ctx.db
      .query("modifierOptions")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    // Build a lookup map: lowercase name -> modifierOption (for matching client-sent modifier names)
    const modifierOptionsByName = new Map<string, { name: string; priceAdjustment: number }>();
    for (const opt of allModifierOptions) {
      modifierOptionsByName.set(opt.name.toLowerCase(), {
        name: opt.name,
        priceAdjustment: opt.priceAdjustment,
      });
    }

    const verifiedItems: Array<{
      menuItemId: Id<"menuItems">;
      name: string;
      quantity: number;
      unitPrice: number;
      modifiers?: Array<{ name: string; priceAdjustment: number }>;
      specialInstructions?: string;
      lineTotal: number;
    }> = [];

    let serverSubtotal = 0;

    for (const clientItem of args.items) {
      const menuItem = await ctx.db.get(clientItem.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item not found: ${clientItem.menuItemId}`);
      }
      if (menuItem.tenantId !== args.tenantId) {
        throw new Error("Menu item does not belong to this restaurant");
      }
      if (!menuItem.isAvailable || menuItem.is86d) {
        throw new Error(`Menu item "${menuItem.name}" is currently unavailable`);
      }
      if (clientItem.quantity < 1 || !Number.isInteger(clientItem.quantity)) {
        throw new Error(`Invalid quantity for "${menuItem.name}"`);
      }

      // Use the database price (cents), not the client-supplied price
      const serverUnitPrice = menuItem.price;

      // Verify modifiers against the database
      let modifierTotal = 0;
      const verifiedModifiers: Array<{ name: string; priceAdjustment: number }> = [];

      if (clientItem.modifiers && clientItem.modifiers.length > 0) {
        for (const clientMod of clientItem.modifiers) {
          const dbModifier = modifierOptionsByName.get(clientMod.name.toLowerCase());
          if (!dbModifier) {
            throw new Error(
              `Unknown modifier "${clientMod.name}" for item "${menuItem.name}"`
            );
          }
          // Use the database price adjustment, not the client-supplied one
          verifiedModifiers.push({
            name: dbModifier.name,
            priceAdjustment: dbModifier.priceAdjustment,
          });
          modifierTotal += dbModifier.priceAdjustment;
        }
      }

      const serverLineTotal = (serverUnitPrice + modifierTotal) * clientItem.quantity;
      serverSubtotal += serverLineTotal;

      verifiedItems.push({
        menuItemId: clientItem.menuItemId,
        name: menuItem.name,
        quantity: clientItem.quantity,
        unitPrice: serverUnitPrice,
        modifiers: verifiedModifiers.length > 0 ? verifiedModifiers : undefined,
        specialInstructions: clientItem.specialInstructions,
        lineTotal: serverLineTotal,
      });
    }

    // Calculate tax from the tenant's configured tax rate
    const taxRate = tenant.taxRate ?? 0;
    const serverTax = Math.round(serverSubtotal * taxRate);

    // Enforce delivery minimum order amount (checked against food subtotal, before fees)
    if (args.orderType === "delivery" && tenant.deliveryMinimum !== undefined) {
      if (serverSubtotal < tenant.deliveryMinimum) {
        throw new Error(
          `Minimum order for delivery is $${(tenant.deliveryMinimum / 100).toFixed(2)}`
        );
      }
    }

    // Tip is user-supplied (validated to be non-negative)
    const tip = args.tip && args.tip > 0 ? Math.round(args.tip) : 0;
    if (args.tip !== undefined && args.tip < 0) {
      throw new Error("Tip cannot be negative");
    }

    const serverTotal = serverSubtotal + serverTax + deliveryFee + tip;

    // Generate order number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const todayOrders = await ctx.db
      .query("orders")
      .withIndex("by_tenantId_createdAt", (q) =>
        q.eq("tenantId", args.tenantId).gte("createdAt", todayStart)
      )
      .collect();

    const orderNumber = todayOrders.length + 1;

    // Calculate estimated ready time from max prep time of items
    let estimatedReadyAt: number | undefined;
    const maxPrepTime = await getMaxPrepTime(ctx, verifiedItems.map((i) => i.menuItemId));
    if (maxPrepTime > 0) {
      estimatedReadyAt = (args.scheduledPickupTime ?? now) + maxPrepTime * 60 * 1000;
    }

    const orderId = await ctx.db.insert("orders", {
      tenantId: args.tenantId,
      orderNumber,
      source: "online",
      status: "sent_to_kitchen",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      specialInstructions: args.specialInstructions,
      orderType: args.orderType,
      deliveryAddress: args.orderType === "delivery" ? args.deliveryAddress : undefined,
      deliveryFee: args.orderType === "delivery" ? deliveryFee : undefined,
      deliveryInstructions: args.orderType === "delivery" ? args.deliveryInstructions : undefined,
      deliveryStatus: args.orderType === "delivery" ? "pending" : undefined,
      items: verifiedItems,
      subtotal: serverSubtotal,
      tax: serverTax,
      tip: tip || undefined,
      total: serverTotal,
      paymentStatus: args.stripePaymentIntentId ? "paid" : "unpaid",
      paymentMethod: args.stripePaymentIntentId ? "card" : undefined,
      stripePaymentIntentId: args.stripePaymentIntentId,
      scheduledPickupTime: args.scheduledPickupTime,
      estimatedReadyAt,
      createdAt: now,
      sentToKitchenAt: now,
      updatedAt: now,
    });

    // Create KDS ticket immediately
    await ctx.db.insert("kdsTickets", {
      tenantId: args.tenantId,
      orderId,
      orderNumber,
      source: "online",
      sourceBadge: "Online",
      status: "new",
      items: verifiedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        modifiers: item.modifiers?.map((m) => m.name),
        specialInstructions: item.specialInstructions,
        isBumped: false,
      })),
      customerName: args.customerName,
      estimatedPickupTime: args.scheduledPickupTime,
      receivedAt: now,
    });

    // Record payment if Stripe
    if (args.stripePaymentIntentId) {
      await ctx.db.insert("payments", {
        tenantId: args.tenantId,
        orderId,
        amount: serverTotal,
        method: "card",
        status: "succeeded",
        stripePaymentIntentId: args.stripePaymentIntentId,
        createdAt: now,
      });
    }

    // ── Auto-create or update customer record ──
    // Dedup by phone first, then email
    let existingCustomer = null;

    if (args.customerPhone) {
      existingCustomer = await ctx.db
        .query("customers")
        .withIndex("by_tenantId_phone", (q) =>
          q.eq("tenantId", args.tenantId).eq("phone", args.customerPhone)
        )
        .first();
    }

    if (!existingCustomer && args.customerEmail) {
      existingCustomer = await ctx.db
        .query("customers")
        .withIndex("by_tenantId_email", (q) =>
          q.eq("tenantId", args.tenantId).eq("email", args.customerEmail)
        )
        .first();
    }

    if (existingCustomer) {
      await ctx.db.patch(existingCustomer._id, {
        orderCount: existingCustomer.orderCount + 1,
        totalSpent: existingCustomer.totalSpent + serverTotal,
        lastOrderDate: now,
      });
    } else {
      await ctx.db.insert("customers", {
        tenantId: args.tenantId,
        name: args.customerName,
        email: args.customerEmail,
        phone: args.customerPhone,
        orderCount: 1,
        totalSpent: serverTotal,
        lastOrderDate: now,
        firstOrderDate: now,
        createdAt: now,
      });
    }

    // ── Inventory: auto-deduct ingredients for each item ──
    await deductInventoryForOrder(ctx, args.tenantId, verifiedItems, orderId);

    // ── Loyalty: auto-earn points if customer has a loyalty account ──
    await autoEarnLoyaltyPoints(ctx, args.tenantId, orderId, serverSubtotal, args.customerEmail, args.customerPhone);

    return {
      orderId,
      orderNumber,
      estimatedReadyAt,
      deliveryFee: args.orderType === "delivery" ? deliveryFee : undefined,
      deliveryZone: deliveryZoneName,
    };
  },
});

/**
 * Deduct inventory for each ordered item.
 * For each line item, look up its linked ingredients, deduct stock, log it,
 * and auto-86 menu items when ingredient stock reaches 0.
 */
async function deductInventoryForOrder(
  ctx: { db: any },
  tenantId: Id<"tenants">,
  items: Array<{ menuItemId: Id<"menuItems">; quantity: number }>,
  orderId: Id<"orders">
) {
  const now = Date.now();

  for (const item of items) {
    // Find ingredient links for this menu item
    const links = await ctx.db
      .query("menuItemIngredients")
      .withIndex("by_menuItemId", (q: any) => q.eq("menuItemId", item.menuItemId))
      .collect();

    for (const link of links) {
      const ingredient = await ctx.db.get(link.ingredientId);
      if (!ingredient || !ingredient.isActive) continue;

      const deductAmount = link.quantity * item.quantity;
      const previousStock = ingredient.currentStock;
      const newStock = previousStock - deductAmount;

      // Update stock
      await ctx.db.patch(link.ingredientId, { currentStock: newStock });

      // Log the deduction
      await ctx.db.insert("inventoryLogs", {
        tenantId,
        ingredientId: link.ingredientId,
        type: "order_deduction" as const,
        quantityChange: -deductAmount,
        previousStock,
        newStock,
        orderId,
        reason: `Order deduction`,
        createdAt: now,
      });

      // Auto-86: if stock drops to 0 or below, mark linked menu items as sold out
      if (newStock <= 0) {
        const allLinksForIngredient = await ctx.db
          .query("menuItemIngredients")
          .withIndex("by_ingredientId", (q: any) =>
            q.eq("ingredientId", link.ingredientId)
          )
          .collect();

        for (const affectedLink of allLinksForIngredient) {
          const menuItem = await ctx.db.get(affectedLink.menuItemId);
          if (menuItem && !menuItem.is86d) {
            await ctx.db.patch(affectedLink.menuItemId, {
              is86d: true,
              isAvailable: false,
              updatedAt: now,
            });
          }
        }
      }
    }
  }
}

// ==================== Loyalty Auto-Earn Helper ====================

/**
 * Automatically earn loyalty points for a customer after an online order.
 * Looks up the customer by email or phone, finds their loyalty account,
 * and awards points based on the active program rules.
 */
async function autoEarnLoyaltyPoints(
  ctx: { db: any },
  tenantId: Id<"tenants">,
  orderId: Id<"orders">,
  subtotal: number,
  customerEmail?: string,
  customerPhone?: string
) {
  if (!customerEmail && !customerPhone) return;

  // Find the active loyalty program
  const programs = await ctx.db
    .query("loyaltyPrograms")
    .withIndex("by_tenantId", (q: any) => q.eq("tenantId", tenantId))
    .collect();

  const activeProgram = programs.find((p: any) => p.isActive);
  if (!activeProgram) return;

  // Find the customer by phone or email
  let customer = null;
  if (customerPhone) {
    customer = await ctx.db
      .query("customers")
      .withIndex("by_tenantId_phone", (q: any) =>
        q.eq("tenantId", tenantId).eq("phone", customerPhone)
      )
      .first();
  }
  if (!customer && customerEmail) {
    customer = await ctx.db
      .query("customers")
      .withIndex("by_tenantId_email", (q: any) =>
        q.eq("tenantId", tenantId).eq("email", customerEmail)
      )
      .first();
  }
  if (!customer) return;

  // Find the customer's loyalty account
  const loyaltyAccount = await ctx.db
    .query("loyaltyAccounts")
    .withIndex("by_tenantId_customerId", (q: any) =>
      q.eq("tenantId", tenantId).eq("customerId", customer._id)
    )
    .first();

  if (!loyaltyAccount) return;

  // Calculate points
  const orderDollars = subtotal / 100;
  let basePoints = Math.floor(orderDollars * activeProgram.pointsPerDollar);

  // Apply tier multiplier
  let multiplier = 1;
  if (loyaltyAccount.currentTier && activeProgram.tiers) {
    const currentTier = activeProgram.tiers.find(
      (t: any) => t.name === loyaltyAccount.currentTier
    );
    if (currentTier) {
      multiplier = currentTier.multiplier;
    }
  }

  const earnedPoints = Math.floor(basePoints * multiplier);
  if (earnedPoints <= 0) return;

  const newCurrentPoints = loyaltyAccount.currentPoints + earnedPoints;
  const newLifetimePoints = loyaltyAccount.lifetimePoints + earnedPoints;

  // Determine new tier
  let newTier: string | undefined = loyaltyAccount.currentTier;
  if (activeProgram.tiers && activeProgram.tiers.length > 0) {
    const sortedTiers = [...activeProgram.tiers].sort(
      (a: any, b: any) => b.minPoints - a.minPoints
    );
    const qualifyingTier = sortedTiers.find(
      (t: any) => newLifetimePoints >= t.minPoints
    );
    newTier = qualifyingTier?.name;
  }

  await ctx.db.patch(loyaltyAccount._id, {
    currentPoints: newCurrentPoints,
    lifetimePoints: newLifetimePoints,
    currentTier: newTier,
  });

  const order = await ctx.db.get(orderId);
  const orderNumber = order?.orderNumber ?? 0;

  await ctx.db.insert("loyaltyTransactions", {
    tenantId,
    accountId: loyaltyAccount._id,
    orderId,
    type: "earn" as const,
    points: earnedPoints,
    description: `Earned ${earnedPoints} points from order #${orderNumber}`,
    createdAt: Date.now(),
  });
}

// Helper: get max prep time from menu items
async function getMaxPrepTime(ctx: any, menuItemIds: any[]): Promise<number> {
  let maxPrep = 0;
  for (const id of menuItemIds) {
    const item = await ctx.db.get(id);
    if (item?.prepTimeMinutes && item.prepTimeMinutes > maxPrep) {
      maxPrep = item.prepTimeMinutes;
    }
  }
  // Default 20 min if no prep times set
  return maxPrep || 20;
}
