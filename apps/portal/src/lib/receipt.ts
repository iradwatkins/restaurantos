/**
 * Receipt data formatter — transforms order and tenant data into a structured
 * receipt object suitable for both browser printing and ESC/POS thermal output.
 *
 * All monetary values are in cents throughout; display formatting is the
 * responsibility of the rendering layer (receipt-print.tsx, escpos.ts).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceiptItem {
  name: string;
  quantity: number;
  /** Unit price in cents */
  price: number;
  modifiers?: string[];
  isVoided?: boolean;
}

export interface ReceiptDiscount {
  name: string;
  /** Discount amount in cents */
  amount: number;
}

export interface ReceiptData {
  businessName: string;
  address: string;
  phone: string;
  orderNumber: number;
  /** Formatted date string, e.g. "3/20/2026" */
  date: string;
  /** Formatted time string, e.g. "2:30:45 PM" */
  time: string;
  /** "Dine-In", "Online", "DoorDash", "UberEats", "Grubhub" */
  orderType: string;
  tableName?: string;
  serverName?: string;
  items: ReceiptItem[];
  /** In cents */
  subtotal: number;
  discount?: ReceiptDiscount;
  /** In cents */
  tax: number;
  /** In cents */
  tip?: number;
  /** In cents */
  total: number;
  paymentMethod: string;
  footer: string;
}

// ---------------------------------------------------------------------------
// Source label mapping
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  dine_in: 'Dine-In',
  online: 'Online',
  doordash: 'DoorDash',
  ubereats: 'UberEats',
  grubhub: 'Grubhub',
};

// ---------------------------------------------------------------------------
// Formatter
// ---------------------------------------------------------------------------

/**
 * Build a structured {@link ReceiptData} object from raw order and tenant
 * records returned by the Convex backend.
 *
 * The function is intentionally tolerant of missing optional fields — every
 * property that could be `undefined` in the schema falls back to a sensible
 * default so callers never need to pre-process the data.
 */
export function formatReceipt(
  order: {
    orderNumber: number;
    source: string;
    tableName?: string;
    serverName?: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      modifiers?: Array<{ name: string; priceAdjustment: number }>;
      isVoided?: boolean;
    }>;
    subtotal: number;
    tax: number;
    tip?: number;
    tipAmount?: number;
    total: number;
    paymentMethod?: string;
    discountType?: string;
    discountValue?: number;
    discountAmount?: number;
    isComped?: boolean;
    createdAt: number;
  },
  tenant: {
    name: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
  },
): ReceiptData {
  const createdDate = new Date(order.createdAt);

  // Format address from structured tenant fields
  const address = tenant.address
    ? `${tenant.address.street}, ${tenant.address.city}, ${tenant.address.state} ${tenant.address.zip}`
    : '';

  // Map modifier objects to plain string names for the receipt
  const items: ReceiptItem[] = order.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.unitPrice,
    modifiers: item.modifiers?.map((m) => {
      if (m.priceAdjustment > 0) {
        return `${m.name} (+$${(m.priceAdjustment / 100).toFixed(2)})`;
      }
      return m.name;
    }),
    isVoided: item.isVoided,
  }));

  // Build discount info if present
  let discount: ReceiptDiscount | undefined;
  if (order.isComped) {
    discount = { name: 'COMPED', amount: order.subtotal + order.tax };
  } else if (order.discountAmount && order.discountAmount > 0) {
    const discountLabel =
      order.discountType === 'percentage' && order.discountValue
        ? `Discount (${order.discountValue}%)`
        : order.discountType === 'fixed'
          ? 'Discount'
          : 'Discount';
    discount = { name: discountLabel, amount: order.discountAmount };
  }

  // Resolve tip — the schema has both `tip` and `tipAmount`
  const tipCents = order.tipAmount ?? order.tip ?? 0;

  // Payment method display
  const paymentMethodLabel = order.paymentMethod
    ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)
    : 'Unpaid';

  return {
    businessName: tenant.name,
    address,
    phone: tenant.phone ?? '',
    orderNumber: order.orderNumber,
    date: createdDate.toLocaleDateString(),
    time: createdDate.toLocaleTimeString(),
    orderType: SOURCE_LABELS[order.source] ?? order.source,
    tableName: order.tableName,
    serverName: order.serverName,
    items,
    subtotal: order.subtotal,
    discount,
    tax: order.tax,
    tip: tipCents > 0 ? tipCents : undefined,
    total: order.total,
    paymentMethod: paymentMethodLabel,
    footer: 'Thank you for dining with us!',
  };
}
