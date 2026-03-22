import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed the database with a super admin user and a demo tenant.
 * Run via: npx convex run seed:seedDatabase
 */
export const seedDatabase = mutation({
  args: {
    adminPasswordHash: v.string(),
    ownerPasswordHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if admin already exists
    const existingAdmin = await ctx.db
      .query("adminUsers")
      .withIndex("by_email", (q) => q.eq("email", "admin@restaurantos.com"))
      .first();

    if (!existingAdmin) {
      await ctx.db.insert("adminUsers", {
        email: "admin@restaurantos.com",
        passwordHash: args.adminPasswordHash,
        name: "Super Admin",
        role: "super_admin",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      console.log("Created super admin: admin@restaurantos.com");
    } else {
      console.log("Super admin already exists");
    }

    // Check if demo tenant exists
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", "marias-kitchen"))
      .first();

    if (!existingTenant) {
      const tenantId = await ctx.db.insert("tenants", {
        slug: "marias-kitchen",
        name: "Maria's Kitchen",
        subdomain: "marias-kitchen",
        status: "active",
        primaryColor: "#E63946",
        accentColor: "#457B9D",
        deliveryMode: "kitchenhub",
        timezone: "America/Chicago",
        plan: "growth",
        phone: "(312) 555-0100",
        email: "maria@mariaskitchen.com",
        address: {
          street: "123 Main Street",
          city: "Chicago",
          state: "IL",
          zip: "60601",
          country: "US",
        },
        features: { onlineOrdering: true },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create default theme
      await ctx.db.insert("tenantThemes", {
        tenantId,
        name: "Default",
        isActive: true,
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        primaryColor: "0 72% 51%",
        primaryForeground: "210 40% 98%",
        secondary: "210 40% 96.1%",
        secondaryForeground: "222.2 47.4% 11.2%",
        accent: "210 40% 96.1%",
        accentForeground: "222.2 47.4% 11.2%",
        muted: "210 40% 96.1%",
        mutedForeground: "215.4 16.3% 46.9%",
        card: "0 0% 100%",
        cardForeground: "222.2 84% 4.9%",
        popover: "0 0% 100%",
        popoverForeground: "222.2 84% 4.9%",
        border: "214.3 31.8% 91.4%",
        input: "214.3 31.8% 91.4%",
        ring: "0 72% 51%",
        destructive: "0 84.2% 60.2%",
        destructiveForeground: "210 40% 98%",
        createdAt: Date.now(),
      });

      // Create delivery config
      await ctx.db.insert("deliveryConfigs", {
        tenantId,
        mode: "kitchenhub",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create owner user
      await ctx.db.insert("users", {
        tenantId,
        email: "maria@mariaskitchen.com",
        passwordHash: args.ownerPasswordHash,
        name: "Maria Rodriguez",
        role: "owner",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log("Created demo tenant: Maria's Kitchen");
    } else {
      console.log("Demo tenant already exists");
    }
  },
});

/**
 * Re-seed menu items and tables for an existing tenant.
 * Run via: npx convex run seed:reseedMenuAndTables '{"tenantId":"..."}'
 */
export const reseedMenuAndTables = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tenantId = args.tenantId;

    // Check if categories already exist
    const existingCats = await ctx.db
      .query("menuCategories")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    if (existingCats.length > 0) {
      console.log(`Tenant already has ${existingCats.length} categories, skipping menu seed`);
    } else {
      // Create categories
      const appetizers = await ctx.db.insert("menuCategories", {
        tenantId, name: "Appetizers", description: "Starters and small plates",
        sortOrder: 0, isActive: true, createdAt: now, updatedAt: now,
      });
      const entrees = await ctx.db.insert("menuCategories", {
        tenantId, name: "Entrees", description: "Main courses",
        sortOrder: 1, isActive: true, createdAt: now, updatedAt: now,
      });
      const drinks = await ctx.db.insert("menuCategories", {
        tenantId, name: "Drinks", description: "Non-alcoholic beverages",
        sortOrder: 2, isActive: true, createdAt: now, updatedAt: now,
      });
      const beer = await ctx.db.insert("menuCategories", {
        tenantId, name: "Beer", description: "Draft and bottled beer",
        sortOrder: 3, isActive: true, createdAt: now, updatedAt: now,
      });
      const wine = await ctx.db.insert("menuCategories", {
        tenantId, name: "Wine", description: "House wines",
        sortOrder: 4, isActive: true, createdAt: now, updatedAt: now,
      });

      const items = [
        // Appetizers
        { cat: appetizers, name: "Chips & Guacamole", price: 899, desc: "Fresh-made guacamole with tortilla chips", tags: ["vegetarian", "gluten-free"], type: "food" as const },
        { cat: appetizers, name: "Wings (8pc)", price: 1299, desc: "Crispy wings with your choice of sauce", tags: [], type: "food" as const },
        { cat: appetizers, name: "Caesar Salad", price: 999, desc: "Romaine, parmesan, croutons, caesar dressing", tags: ["vegetarian"], type: "food" as const },
        // Entrees
        { cat: entrees, name: "Grilled Chicken", price: 1599, desc: "Herb-marinated chicken with seasonal vegetables", tags: ["gluten-free"], type: "food" as const },
        { cat: entrees, name: "Cheeseburger", price: 1399, desc: "Half-pound Angus beef with cheddar, lettuce, tomato", tags: [], type: "food" as const },
        { cat: entrees, name: "Fish Tacos", price: 1499, desc: "Beer-battered cod with slaw and chipotle aioli", tags: [], type: "food" as const },
        { cat: entrees, name: "Pasta Primavera", price: 1299, desc: "Penne with seasonal vegetables in garlic cream sauce", tags: ["vegetarian"], type: "food" as const },
        { cat: entrees, name: "Ribeye Steak", price: 2999, desc: "12oz ribeye with garlic butter and mashed potatoes", tags: ["gluten-free"], type: "food" as const },
        // Drinks
        { cat: drinks, name: "Soft Drink", price: 299, desc: "Coke, Diet Coke, Sprite, Dr Pepper", tags: [], type: "non_alcoholic_beverage" as const },
        { cat: drinks, name: "Fresh Lemonade", price: 399, desc: "House-made lemonade", tags: ["vegan"], type: "non_alcoholic_beverage" as const },
        { cat: drinks, name: "Iced Tea", price: 299, desc: "Sweet or unsweetened", tags: ["vegan"], type: "non_alcoholic_beverage" as const },
        // Beer
        { cat: beer, name: "IPA Draft", price: 699, desc: "Rotating local IPA on tap", tags: [], type: "beer" as const },
        { cat: beer, name: "Lager Draft", price: 599, desc: "Classic American lager", tags: [], type: "beer" as const },
        { cat: beer, name: "Modelo Especial", price: 599, desc: "Mexican lager bottle", tags: [], type: "beer" as const },
        // Wine
        { cat: wine, name: "House Cabernet", price: 999, desc: "Glass of California Cabernet Sauvignon", tags: [], type: "wine" as const },
        { cat: wine, name: "House Chardonnay", price: 999, desc: "Glass of California Chardonnay", tags: [], type: "wine" as const },
      ];

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        await ctx.db.insert("menuItems", {
          tenantId,
          categoryId: item.cat,
          name: item.name,
          description: item.desc,
          price: item.price,
          dietaryTags: item.tags.length > 0 ? item.tags : undefined,
          isAvailable: true,
          is86d: false,
          sortOrder: i,
          type: item.type,
          createdAt: now,
          updatedAt: now,
        });
      }
      console.log(`Created ${items.length} menu items in 5 categories (including beer & wine)`);
    }

    // Check if tables exist
    const existingTables = await ctx.db
      .query("tables")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();

    if (existingTables.length > 0) {
      console.log(`Tenant already has ${existingTables.length} tables, skipping`);
    } else {
      for (let i = 1; i <= 8; i++) {
        await ctx.db.insert("tables", {
          tenantId,
          name: `Table ${i}`,
          seats: i <= 4 ? 2 : 4,
          section: i <= 4 ? "Main" : "Patio",
          status: "open",
          posX: (i - 1) % 4 * 120 + 60,
          posY: Math.floor((i - 1) / 4) * 120 + 60,
          shape: i <= 4 ? "square" : "round",
          createdAt: now,
        });
      }
      console.log("Created 8 tables");
    }

    return { success: true };
  },
});

/**
 * Seed D&K Soul Food as a new tenant with full menu, events, and daily specials.
 * Run via: npx convex run seed:seedDKSoulFood '{"ownerPasswordHash":"..."}'
 */
export const seedDKSoulFood = mutation({
  args: { ownerPasswordHash: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if already exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", "dk-soul-food"))
      .first();
    if (existing) {
      throw new Error("D&K Soul Food tenant already exists");
    }

    // 1. Create tenant
    const tenantId = await ctx.db.insert("tenants", {
      slug: "dk-soul-food",
      name: "D & K Soul Food",
      subdomain: "dk-soul-food",
      status: "active",
      primaryColor: "#D4A017",
      accentColor: "#8B0000",
      deliveryMode: "kitchenhub",
      timezone: "America/Chicago",
      currency: "USD",
      plan: "growth",
      phone: "(219) 487-5306",
      email: "dk@dksoulfood.com",
      address: {
        street: "3669 Broadway",
        city: "Gary",
        state: "IN",
        zip: "46409",
        country: "US",
      },
      tagline: "The Best Soul Food in Gary and Northwest Indiana",
      aboutText: "D & K Soul Food is dedicated to serving meals with excellent quality and exceptional freshness. Our chef has refined traditional recipes with contemporary techniques to create unique flavor experiences. Home Cooked Meals, Made Fresh Daily — Soul Food, Salads, Wraps, Sweets & More.",
      taxRate: 0.07,
      businessHours: [
        { day: 0, open: "11:00", close: "18:00", isClosed: false },
        { day: 1, open: "11:00", close: "20:00", isClosed: true },
        { day: 2, open: "11:00", close: "20:00", isClosed: false },
        { day: 3, open: "11:00", close: "20:00", isClosed: false },
        { day: 4, open: "11:00", close: "20:00", isClosed: false },
        { day: 5, open: "11:00", close: "20:00", isClosed: false },
        { day: 6, open: "11:00", close: "18:00", isClosed: false },
      ],
      websiteEnabled: true,
      features: { onlineOrdering: true, catering: true },
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create theme (warm gold tones)
    await ctx.db.insert("tenantThemes", {
      tenantId,
      name: "D&K Gold",
      isActive: true,
      background: "45 100% 96%",
      foreground: "0 0% 10%",
      primaryColor: "43 80% 45%",
      primaryForeground: "0 0% 100%",
      secondary: "0 60% 30%",
      secondaryForeground: "0 0% 100%",
      accent: "43 60% 90%",
      accentForeground: "0 0% 10%",
      muted: "43 30% 92%",
      mutedForeground: "0 0% 40%",
      card: "0 0% 100%",
      cardForeground: "0 0% 10%",
      popover: "0 0% 100%",
      popoverForeground: "0 0% 10%",
      border: "43 20% 85%",
      input: "43 20% 85%",
      ring: "43 80% 45%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 100%",
      createdAt: now,
    });

    // 3. Create delivery config
    await ctx.db.insert("deliveryConfigs", {
      tenantId,
      mode: "kitchenhub",
      createdAt: now,
      updatedAt: now,
    });

    // 4. Create owner user
    await ctx.db.insert("users", {
      tenantId,
      email: "dk@dksoulfood.com",
      passwordHash: args.ownerPasswordHash,
      name: "D&K Owner",
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // 5. Create menu categories
    const soulRolls = await ctx.db.insert("menuCategories", {
      tenantId, name: "D&K Soul Rolls", description: "Fried egg roll wrappers with complimentary sauce",
      sortOrder: 0, isActive: true, createdAt: now, updatedAt: now,
    });
    const dinners = await ctx.db.insert("menuCategories", {
      tenantId, name: "Soul Food Dinners", description: "All dinners include two sides and cornbread",
      sortOrder: 1, isActive: true, createdAt: now, updatedAt: now,
    });
    const salads = await ctx.db.insert("menuCategories", {
      tenantId, name: "D&K Gourmet Salads", description: "Fresh crisp romaine with juicy toppings",
      sortOrder: 2, isActive: true, createdAt: now, updatedAt: now,
    });
    const wraps = await ctx.db.insert("menuCategories", {
      tenantId, name: "D&K Wraps", description: "Served with chips",
      sortOrder: 3, isActive: true, createdAt: now, updatedAt: now,
    });
    const soups = await ctx.db.insert("menuCategories", {
      tenantId, name: "Soups", description: "Daily soups",
      sortOrder: 4, isActive: true, createdAt: now, updatedAt: now,
    });
    const desserts = await ctx.db.insert("menuCategories", {
      tenantId, name: "Debra's Desserts", description: "Rotating desserts - call ahead for flavors",
      sortOrder: 5, isActive: true, createdAt: now, updatedAt: now,
    });
    const smoothies = await ctx.db.insert("menuCategories", {
      tenantId, name: "Smoothies", description: "Fresh blended smoothies",
      sortOrder: 6, isActive: true, createdAt: now, updatedAt: now,
    });
    const alaCarte = await ctx.db.insert("menuCategories", {
      tenantId, name: "A La Carte Proteins", description: "Proteins only — no sides",
      sortOrder: 7, isActive: true, createdAt: now, updatedAt: now,
    });
    const sides = await ctx.db.insert("menuCategories", {
      tenantId, name: "Sides", description: "Individual side dishes",
      sortOrder: 8, isActive: true, createdAt: now, updatedAt: now,
    });
    const drinks = await ctx.db.insert("menuCategories", {
      tenantId, name: "Drinks", description: "Beverages",
      sortOrder: 9, isActive: true, createdAt: now, updatedAt: now,
    });

    // 6. Create menu items
    const allItems = [
      // Soul Rolls
      { cat: soulRolls, name: "Holiday Rolls (2)", price: 799, desc: "Seasonal stuffed egg rolls", img: "https://www.fbgcdn.com/pictures/96d25bb5-7d71-4c4a-ba9f-a4cf06c52cc2.jpg" },
      { cat: soulRolls, name: "Jerk Chicken Rolls (2)", price: 799, desc: "Jerk chicken stuffed egg rolls" },
      { cat: soulRolls, name: "Macaroni and Cheese Rolls (2)", price: 799, desc: "Mac & cheese stuffed egg rolls" },
      { cat: soulRolls, name: "Philly Chicken Rolls (2)", price: 799, desc: "Philly chicken stuffed egg rolls" },
      // Dinners (all include 2 sides + cornbread)
      { cat: dinners, name: "Smothered Turkey Chops", price: 1699, desc: "Tender turkey chops smothered in gravy with 2 sides & cornbread", img: "https://www.fbgcdn.com/pictures/606ad169-7758-4c2b-b896-ae74ad8cd18d.jpg" },
      { cat: dinners, name: "Smothered Pork Chops", price: 1550, desc: "Pork chops smothered in gravy with 2 sides & cornbread" },
      { cat: dinners, name: "Baked Chicken Quarter", price: 1499, desc: "Baked chicken quarter with 2 sides & cornbread" },
      { cat: dinners, name: "Jerk Chicken", price: 1499, desc: "Caribbean jerk chicken with 2 sides & cornbread" },
      { cat: dinners, name: "Fried Chicken Quarter", price: 1499, desc: "Golden fried chicken quarter with 2 sides & cornbread" },
      { cat: dinners, name: "Fried Chicken Wings", price: 1499, desc: "Crispy fried wings with 2 sides & cornbread" },
      { cat: dinners, name: "Fried Chicken Breasts", price: 1499, desc: "Fried chicken breasts with 2 sides & cornbread" },
      { cat: dinners, name: "Grilled Chicken Breasts", price: 1499, desc: "Grilled chicken breasts with 2 sides & cornbread" },
      { cat: dinners, name: "Fried Catfish Fillets", price: 1699, desc: "Golden fried catfish fillets with 2 sides & cornbread" },
      { cat: dinners, name: "Grilled Catfish Fillets", price: 1699, desc: "Grilled catfish fillets with 2 sides & cornbread" },
      { cat: dinners, name: "Grilled Salmon", price: 1599, desc: "Grilled salmon fillet with 2 sides & cornbread" },
      { cat: dinners, name: "Jerk Salmon", price: 1599, desc: "Jerk seasoned salmon with 2 sides & cornbread" },
      { cat: dinners, name: "Jerk Shrimp (7 Jumbo)", price: 1399, desc: "7 jumbo jerk shrimp with 2 sides & cornbread" },
      { cat: dinners, name: "Grilled Shrimp (7 Jumbo)", price: 1399, desc: "7 jumbo grilled shrimp with 2 sides & cornbread" },
      { cat: dinners, name: "Stuffed Turkey Feast", price: 2599, desc: "Roasted turkey leg stuffed with cornbread dressing, 3 additional sides, gravy, cranberry sauce & cornbread" },
      { cat: dinners, name: "Mini Stuffed Turkey Feast", price: 1599, desc: "Smaller portion turkey feast with cornbread dressing, gravy, cranberry sauce & cornbread" },
      { cat: dinners, name: "BBQ Turkey Leg", price: 1599, desc: "Slow-smoked BBQ turkey leg with 2 sides & cornbread" },
      { cat: dinners, name: "Veggie Plate", price: 1499, desc: "Choose 4 veggie sides with cornbread", tags: ["vegetarian"] },
      // Salads
      { cat: salads, name: "Meatless Salad", price: 1050, desc: "Fresh romaine with cherry tomatoes, cucumbers, carrots, onion, egg & cheddar cheese", tags: ["vegetarian"] },
      { cat: salads, name: "Jerk Chicken Salad", price: 1399, desc: "Fresh salad topped with jerk chicken" },
      { cat: salads, name: "D&K Grilled Chicken Salad", price: 1450, desc: "Fresh salad topped with grilled chicken" },
      { cat: salads, name: "Grilled Shrimp Salad", price: 1499, desc: "Fresh salad topped with grilled shrimp" },
      { cat: salads, name: "Grilled Jerk Salmon Salad", price: 1599, desc: "Fresh salad topped with jerk salmon" },
      // Wraps
      { cat: wraps, name: "Veggie Wrap", price: 1099, desc: "Fresh veggie wrap served with chips", tags: ["vegetarian"] },
      { cat: wraps, name: "Grilled Chicken Caesar Wrap", price: 1299, desc: "Grilled chicken Caesar wrap with chips" },
      { cat: wraps, name: "Jerk Chicken Wrap", price: 1450, desc: "Jerk chicken wrap served with chips" },
      { cat: wraps, name: "Jerk Salmon Wrap", price: 1550, desc: "Jerk salmon wrap served with chips" },
      { cat: wraps, name: "Grilled Salmon Wrap", price: 1550, desc: "Grilled salmon wrap served with chips" },
      // Soups
      { cat: soups, name: "Vegetable Soup", price: 599, desc: "Daily vegetable soup", tags: ["vegan"] },
      { cat: soups, name: "Turkey Chili", price: 599, desc: "Hearty turkey chili" },
      // Desserts
      { cat: desserts, name: "Banana Pudding", price: 475, desc: "Homemade banana pudding" },
      { cat: desserts, name: "Peach Cobbler", price: 475, desc: "Warm peach cobbler" },
      { cat: desserts, name: "Pound Cake", price: 475, desc: "Variety homemade pound cakes" },
      { cat: desserts, name: "Cheesecake", price: 600, desc: "Classic cheesecake" },
      { cat: desserts, name: "Flavored Cheesecake", price: 800, desc: "Rotating flavored cheesecake" },
      // Smoothies
      { cat: smoothies, name: "Berry Berry", price: 799, desc: "Mixed berry smoothie" },
      { cat: smoothies, name: "Peanut Butter Bliss", price: 799, desc: "Peanut butter smoothie" },
      { cat: smoothies, name: "Strawberry Banana", price: 799, desc: "Strawberry banana smoothie" },
      // A La Carte Proteins
      { cat: alaCarte, name: "Grilled Shrimp", price: 600, desc: "Grilled shrimp (protein only)" },
      { cat: alaCarte, name: "Jerk Shrimp", price: 600, desc: "Jerk shrimp (protein only)" },
      { cat: alaCarte, name: "Grilled Chicken", price: 500, desc: "Grilled chicken (protein only)" },
      { cat: alaCarte, name: "Jerk Chicken", price: 500, desc: "Jerk chicken (protein only)" },
      { cat: alaCarte, name: "Grilled Salmon", price: 650, desc: "Grilled salmon (protein only)" },
      { cat: alaCarte, name: "Jerk Salmon", price: 650, desc: "Jerk salmon (protein only)" },
      { cat: alaCarte, name: "Grilled Catfish", price: 700, desc: "Grilled catfish (protein only)" },
      { cat: alaCarte, name: "Pork Chops", price: 700, desc: "Pork chops (protein only)" },
      { cat: alaCarte, name: "Turkey Chops", price: 700, desc: "Turkey chops (protein only)" },
      { cat: alaCarte, name: "Fried Chicken Quarter", price: 500, desc: "Fried chicken quarter (protein only)" },
      { cat: alaCarte, name: "Fried Chicken Wings", price: 500, desc: "Fried wings (protein only)" },
      // Sides
      { cat: sides, name: "Macaroni and Cheese", price: 450, desc: "Creamy mac & cheese", tags: ["vegetarian"] },
      { cat: sides, name: "Collard Greens", price: 450, desc: "Collard greens with smoked turkey" },
      { cat: sides, name: "Candied Sweet Potatoes", price: 450, desc: "Sweet candied yams", tags: ["vegetarian"] },
      { cat: sides, name: "Cornbread Dressing w/ Gravy", price: 450, desc: "Southern cornbread dressing with gravy" },
      { cat: sides, name: "White Rice w/ Gravy", price: 450, desc: "Buttered white rice with gravy" },
      { cat: sides, name: "Green Beans & Potatoes", price: 450, desc: "Green beans with potatoes" },
      { cat: sides, name: "French Fries", price: 450, desc: "Golden french fries" },
      { cat: sides, name: "Yellow Rice", price: 450, desc: "Herb buttered yellow rice" },
      // Drinks
      { cat: drinks, name: "Pop", price: 129, desc: "Canned soda", type: "non_alcoholic_beverage" as const },
      { cat: drinks, name: "Water", price: 169, desc: "Bottled water", type: "non_alcoholic_beverage" as const },
      { cat: drinks, name: "Kool-Aid", price: 199, desc: "Fresh Kool-Aid", type: "non_alcoholic_beverage" as const },
    ];

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i]!;
      await ctx.db.insert("menuItems", {
        tenantId,
        categoryId: item.cat,
        name: item.name,
        description: item.desc,
        price: item.price,
        imageUrl: (item as any).img,
        dietaryTags: (item as any).tags?.length > 0 ? (item as any).tags : undefined,
        isAvailable: true,
        is86d: false,
        sortOrder: i,
        type: (item as any).type ?? "food",
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`Created ${allItems.length} menu items in 10 categories`);

    // 7. Create tables (for future use)
    for (let i = 1; i <= 8; i++) {
      await ctx.db.insert("tables", {
        tenantId,
        name: `Table ${i}`,
        seats: i <= 4 ? 2 : 4,
        section: i <= 4 ? "Main" : "Patio",
        status: "open",
        posX: (i - 1) % 4 * 120 + 60,
        posY: Math.floor((i - 1) / 4) * 120 + 60,
        shape: "square",
        createdAt: now,
      });
    }

    // 8. Create Sunday Buffet Event
    const buffetEvent = await ctx.db.insert("events", {
      tenantId,
      name: "Sunday All You Can Eat Soul Food Buffet",
      description: "All you can eat soul food buffet every Sunday! Featuring rotating selections of our best dishes — fried chicken, smothered pork chops, catfish, mac & cheese, collard greens, candied yams, cornbread, and more. Last seating at 5pm.",
      category: "buffet",
      recurrence: "weekly",
      dayOfWeek: 0, // Sunday
      startTime: "11:00",
      endTime: "18:00",
      isActive: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Buffet pricing tiers
    await ctx.db.insert("eventPricingTiers", {
      tenantId, eventId: buffetEvent, tierName: "Adults", price: 2699, sortOrder: 0,
    });
    await ctx.db.insert("eventPricingTiers", {
      tenantId, eventId: buffetEvent, tierName: "Seniors", price: 1999, sortOrder: 1,
    });
    await ctx.db.insert("eventPricingTiers", {
      tenantId, eventId: buffetEvent, tierName: "Kids 2-12", price: 1499, sortOrder: 2,
    });
    console.log("Created Sunday Buffet event with 3 pricing tiers");

    // 9. Create Daily Specials
    const dailySpecialsData = [
      {
        day: 2, name: "Tuesday Special",
        desc: "Teriyaki Rice or Noodle Bowl",
        items: [
          { name: "Teriyaki Rice or Noodle Bowl", price: 700 },
          { name: "Add Chicken", description: "Add chicken to bowl", price: 1100 },
          { name: "Add Salmon or Shrimp", description: "Add salmon or shrimp to bowl", price: 1300 },
        ],
      },
      {
        day: 3, name: "Wednesday — Senior Discount Day",
        desc: "Seniors 55+ receive a discounted meal. 1 meal per day per senior, must be present.",
        items: [
          { name: "1/4 Baked Dark w/ 2 sides & corn bread", price: 775 },
          { name: "2 Fried Catfish Fillets w/ 2 sides & corn bread", price: 850 },
          { name: "2 Smothered Pork Chops w/ 2 sides & corn bread", price: 850 },
          { name: "1/4 Fried Chicken w/ 2 sides & corn bread", price: 775 },
        ],
      },
      {
        day: 4, name: "Thursday Special",
        desc: "Meatloaf Plate",
        items: [
          { name: "Meatloaf Plate", description: "Served w/ mashed potatoes, green beans & corn bread", price: 1399 },
        ],
      },
      {
        day: 5, name: "Friday Special",
        desc: "Cheesy Spaghetti & Fish Specials",
        items: [
          { name: "Cheesy Spaghetti w/ 6 Fried or Hot Honey Wings & white bread", price: 1399 },
          { name: "Fried or Hot Honey Catfish", price: 1699 },
        ],
      },
      {
        day: 6, name: "Saturday & Sunday Specials",
        desc: "Stuffed Turkey Feast specials",
        items: [
          { name: "Stuffed Feast", description: "Roasted Turkey Leg stuffed with corn bread dressing, 3 additional sides, gravy, cranberry sauce & cornbread", price: 2699 },
          { name: "Mini Feast", description: "Roasted Turkey Leg stuffed with corn bread dressing, gravy, cranberry sauce & cornbread", price: 1599 },
          { name: "Cooley Veggie Platter", description: "Three Jumbo Sides served w/ 3 cornbreads", price: 2499 },
        ],
      },
      {
        day: 0, name: "Sunday Specials",
        desc: "Sunday buffet + additional Sunday sides",
        items: [
          { name: "All You Can Eat Buffet — Adults", price: 2699 },
          { name: "All You Can Eat Buffet — Seniors", price: 1999 },
          { name: "All You Can Eat Buffet — Kids 2-12", price: 1499 },
          { name: "Green Beans & White Potatoes in Smoked Turkey (side)", price: 450 },
          { name: "Black Eye Peas over White Rice (side)", price: 450 },
        ],
      },
    ];

    for (const special of dailySpecialsData) {
      await ctx.db.insert("dailySpecials", {
        tenantId,
        dayOfWeek: special.day,
        name: special.name,
        description: special.desc,
        items: special.items.map((i) => ({
          name: i.name,
          description: (i as any).description,
          price: i.price,
        })),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log("Created 6 daily specials (Tue-Sun)");

    return {
      tenantId,
      subdomain: "dk-soul-food",
      portalUrl: "dk-soul-food.localhost:3006",
      itemCount: allItems.length,
    };
  },
});
