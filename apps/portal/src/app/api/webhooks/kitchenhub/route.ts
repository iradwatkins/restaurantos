import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { api } from '@restaurantos/backend';
import { convexClient } from '@/lib/auth/convex-client';

/**
 * KitchenHub Webhook Endpoint
 *
 * Receives delivery orders from DoorDash, Uber Eats, and Grubhub
 * via KitchenHub middleware. Normalizes the payload and creates
 * an order + KDS ticket in RestaurantOS.
 *
 * Expected payload from KitchenHub:
 * {
 *   store_id: string,
 *   platform: "doordash" | "ubereats" | "grubhub",
 *   external_order_id: string,
 *   customer_name: string,
 *   estimated_pickup_time: ISO string,
 *   items: [{ name, quantity, unit_price, modifiers: [{ name, price }], special_instructions }],
 *   subtotal: number (cents),
 *   tax: number (cents),
 *   total: number (cents),
 * }
 */

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const sig = signature.replace(/^sha256=/, '');
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Verify KitchenHub webhook signature
    const webhookSecret = process.env.KITCHENHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-kitchenhub-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
      }
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Find tenant by KitchenHub store ID
    // For now, use subdomain from the URL or a header
    const tenantSubdomain = request.headers.get('x-tenant-subdomain');

    if (!tenantSubdomain && !payload.store_id) {
      return NextResponse.json({ error: 'Missing tenant identifier' }, { status: 400 });
    }

    // Look up tenant
    let tenant;
    if (tenantSubdomain) {
      tenant = await convexClient.query(api.tenants.queries.getBySubdomain, {
        subdomain: tenantSubdomain,
      });
    }

    if (!tenant) {
      // Log the failed webhook
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Normalize KitchenHub payload
    const normalizedItems = (payload.items || []).map((item: any) => ({
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: item.unit_price || item.unitPrice || 0,
      modifiers: item.modifiers?.map((m: any) => ({
        name: m.name,
        priceAdjustment: m.price || m.priceAdjustment || 0,
      })),
      specialInstructions: item.special_instructions || item.specialInstructions,
    }));

    const result = await convexClient.mutation(api.webhooks.mutations.ingestDeliveryOrder, {
      tenantId: tenant._id,
      platform: payload.platform || 'doordash',
      externalOrderId: payload.external_order_id || payload.externalOrderId || `KH-${Date.now()}`,
      customerName: payload.customer_name || payload.customerName,
      estimatedPickupTime: payload.estimated_pickup_time
        ? new Date(payload.estimated_pickup_time).getTime()
        : undefined,
      items: normalizedItems,
      subtotal: payload.subtotal || 0,
      tax: payload.tax || 0,
      total: payload.total || 0,
      rawPayload: payload,
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
    });
  } catch (error: any) {
    console.error('[KitchenHub Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
