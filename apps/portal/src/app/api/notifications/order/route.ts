import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@restaurantos/backend';
import { sendEmail } from '@/lib/notifications/email';
import { sendSms } from '@/lib/notifications/sms';
import { renderOrderConfirmationEmail } from '@/lib/notifications/templates/order-confirmation';
import { renderOrderReadyEmail } from '@/lib/notifications/templates/order-ready';
import { getSession } from '@/lib/auth';
import { extractSubdomain } from '@/lib/tenant';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Verify session authentication — always required
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const subdomain = extractSubdomain(host);
    if (!subdomain) {
      return NextResponse.json({ error: 'Unauthorized: missing subdomain' }, { status: 401 });
    }
    const session = await getSession(subdomain);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, tenantId, type } = await request.json();

    if (!orderId || !tenantId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch order details
    const order = await convex.query(api.orders.queries.getById, {
      id: orderId,
    });

    if (!order) {
      return NextResponse.json({ ok: true, skipped: 'order not found' });
    }

    // Fetch tenant for restaurant name
    const tenant = await convex.query(api.tenants.queries.getById, {
      id: tenantId,
    });

    const restaurantName = tenant?.name ?? 'Restaurant';

    // Skip if no contact info
    if (!order.customerEmail && !order.customerPhone) {
      return NextResponse.json({ ok: true, skipped: 'no contact info' });
    }

    if (type === 'confirmation') {
      // Send order confirmation
      if (order.customerEmail) {
        const html = renderOrderConfirmationEmail({
          restaurantName,
          orderNumber: String(order.orderNumber),
          items: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.lineTotal / 100,
          })),
          total: order.total / 100,
          estimatedReadyAt: order.estimatedPickupTime
            ? new Date(order.estimatedPickupTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined,
        });
        await sendEmail(
          order.customerEmail,
          `Order #${order.orderNumber} Confirmed — ${restaurantName}`,
          html
        );
      }

      if (order.customerPhone) {
        await sendSms(
          order.customerPhone,
          `${restaurantName}: Your order #${order.orderNumber} has been confirmed! Total: $${(order.total / 100).toFixed(2)}`
        );
      }
    } else if (type === 'ready') {
      // Send order ready notification
      if (order.customerEmail) {
        const html = renderOrderReadyEmail({
          restaurantName,
          orderNumber: String(order.orderNumber),
        });
        await sendEmail(
          order.customerEmail,
          `Order #${order.orderNumber} is Ready! — ${restaurantName}`,
          html
        );
      }

      if (order.customerPhone) {
        await sendSms(
          order.customerPhone,
          `${restaurantName}: Your order #${order.orderNumber} is ready for pickup!`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to send order notification');
    return NextResponse.json({ ok: true, error: 'notification failed silently' });
  }
}
