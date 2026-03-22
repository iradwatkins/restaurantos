import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@restaurantos/backend';
import { sendEmail } from '@/lib/notifications/email';
import { renderGiftCardEmail } from '@/lib/notifications/templates/gift-card';
import { logger } from '@/lib/logger';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { recipientEmail, recipientName, purchaserName, message, code, amountCents, tenantId } =
      await request.json();

    if (!recipientEmail || !recipientName || !purchaserName || !code || !amountCents || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load tenant for restaurant name
    const tenant = await convex.query(api.tenants.queries.getById, { id: tenantId });
    const restaurantName = tenant?.name ?? 'Restaurant';

    // Build the restaurant URL from subdomain
    const restaurantUrl = tenant?.subdomain
      ? `https://${tenant.subdomain}.restaurantos.app`
      : undefined;

    const balanceFormatted = `$${(amountCents / 100).toFixed(2)}`;

    const html = renderGiftCardEmail({
      restaurantName,
      recipientName,
      purchaserName,
      message: message || undefined,
      code,
      balanceFormatted,
      restaurantUrl,
    });

    await sendEmail(
      recipientEmail,
      `You've received a gift card from ${restaurantName}!`,
      html
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to send gift card email');
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
