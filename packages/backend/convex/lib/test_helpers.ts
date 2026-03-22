/**
 * Create a mock identity for testing auth-dependent functions.
 */
export function createMockIdentity(options: {
  email: string;
  tenantId?: string;
  subject?: string;
}) {
  return {
    email: options.email,
    tenantId: options.tenantId,
    subject: options.subject ?? options.email,
    tokenIdentifier: `test|${options.email}`,
    issuer: "test",
  };
}

/**
 * Create test tenant data matching the schema.
 */
export function createTestTenant(overrides?: Partial<{
  name: string;
  subdomain: string;
  status: string;
  plan: string;
}>) {
  return {
    slug: overrides?.subdomain ?? "test-restaurant",
    name: overrides?.name ?? "Test Restaurant",
    subdomain: overrides?.subdomain ?? "test-restaurant",
    status: overrides?.status ?? "active",
    deliveryMode: "kitchenhub" as const,
    plan: overrides?.plan ?? "growth" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Create test user data matching the schema.
 */
export function createTestUser(tenantId: string, overrides?: Partial<{
  email: string;
  role: string;
  name: string;
}>) {
  return {
    tenantId,
    email: overrides?.email ?? "test@example.com",
    name: overrides?.name ?? "Test User",
    role: overrides?.role ?? "owner",
    status: "active",
    passwordHash: "$2a$12$fakehashfakehashfakehashfakehashfakehashfakehash",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Create test menu item data matching the schema.
 */
export function createTestMenuItem(tenantId: string, categoryId: string, overrides?: Partial<{
  name: string;
  price: number;
  prepTimeMinutes: number;
}>) {
  return {
    tenantId,
    categoryId,
    name: overrides?.name ?? "Test Item",
    price: overrides?.price ?? 999, // $9.99
    isAvailable: true,
    is86d: false,
    sortOrder: 0,
    type: "food" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Create test order data matching the schema.
 */
export function createTestOrder(tenantId: string, overrides?: Partial<{
  status: string;
  paymentStatus: string;
  total: number;
  source: string;
}>) {
  return {
    tenantId,
    orderNumber: 1,
    source: overrides?.source ?? "online" as const,
    status: overrides?.status ?? "open" as const,
    items: [],
    subtotal: overrides?.total ?? 1000,
    tax: Math.round((overrides?.total ?? 1000) * 0.08),
    total: overrides?.total ?? 1080,
    paymentStatus: overrides?.paymentStatus ?? "unpaid" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
