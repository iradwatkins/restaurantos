import { NextRequest, NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { Id } from '@restaurantos/backend/dataModel';
import { sendSms } from '@/lib/notifications/sms';
import { getApiSession } from '@/lib/auth/api-session';
import { convexClient } from '@/lib/auth/convex-client';
import { logger } from '@/lib/logger';

/** Maximum recipients to process per request to avoid timeout. */
const BATCH_SIZE = 50;

/** Maximum SMS body length per GSM standard (single segment). */
const SMS_CHAR_LIMIT = 160;

interface SendCampaignRequest {
  campaignId: string;
  tenantId: string;
}

/**
 * Apply merge tags to an SMS body template.
 * Supported tags: {firstName}, {restaurantName}
 */
function applyMergeTags(
  template: string,
  customerName: string,
  restaurantName: string
): string {
  const firstName = customerName.split(' ')[0] || customerName;
  return template
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{restaurantName\}/g, restaurantName);
}

/**
 * POST /api/sms/send-campaign
 *
 * Processes pending SMS campaign recipients in batches.
 * Requires authenticated session. Sends SMS via Twilio and
 * updates recipient status + delivery logs in Convex.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getApiSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SendCampaignRequest = await request.json();
    const { campaignId, tenantId } = body;

    if (!campaignId || !tenantId) {
      return NextResponse.json(
        { error: 'campaignId and tenantId are required' },
        { status: 400 }
      );
    }

    // Verify the session user belongs to this tenant
    if (session.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch campaign
    const campaign = await convexClient.query(api.marketing.queries.getCampaignById, {
      campaignId: campaignId as Id<"campaigns">,
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!campaign.smsBody) {
      return NextResponse.json(
        { error: 'Campaign has no SMS body' },
        { status: 400 }
      );
    }

    // Fetch tenant for restaurant name
    const tenant = await convexClient.query(api.tenants.queries.getById, {
      id: tenantId as Id<"tenants">,
    });
    const restaurantName = tenant?.name ?? 'Restaurant';

    // Fetch pending SMS recipients for this campaign
    const allRecipients = await convexClient.query(
      api.marketing.queries.getCampaignRecipients,
      { campaignId: campaignId as Id<"campaigns"> }
    );

    const pendingSmsRecipients = allRecipients.filter(
      (r) => r.channel === 'sms' && r.status === 'pending' && r.phone
    );

    // Process in batches
    const batch = pendingSmsRecipients.slice(0, BATCH_SIZE);
    let sent = 0;
    let failed = 0;

    for (const recipient of batch) {
      const phone = recipient.phone!;

      // Look up customer name for merge tags
      let customerName = 'Customer';
      try {
        const customer = await convexClient.query(
          api.marketing.queries.getCustomerById,
          { customerId: recipient.customerId }
        );
        if (customer) {
          customerName = customer.name;
        }
      } catch {
        // If customer lookup fails, use default name
      }

      // Apply merge tags and enforce character limit
      let message = applyMergeTags(campaign.smsBody, customerName, restaurantName);
      if (message.length > SMS_CHAR_LIMIT) {
        message = message.slice(0, SMS_CHAR_LIMIT - 3) + '...';
      }

      // Send SMS
      const result = await sendSms(phone, message);
      const now = Date.now();

      if (result.success) {
        // Update recipient status to sent
        await convexClient.mutation(api.marketing.mutations.updateRecipientStatus, {
          recipientId: recipient._id,
          status: 'sent',
          sentAt: now,
        });

        // Log successful delivery
        await convexClient.mutation(api.marketing.mutations.createSmsDeliveryLog, {
          tenantId: tenantId as Id<"tenants">,
          customerId: recipient.customerId,
          campaignId: campaignId as Id<"campaigns">,
          phone,
          message,
          status: 'sent',
          twilioSid: result.twilioSid,
          createdAt: now,
        });

        sent++;
      } else {
        // Update recipient status to failed
        await convexClient.mutation(api.marketing.mutations.updateRecipientStatus, {
          recipientId: recipient._id,
          status: 'failed',
        });

        // Log failure
        await convexClient.mutation(api.marketing.mutations.createSmsDeliveryLog, {
          tenantId: tenantId as Id<"tenants">,
          customerId: recipient.customerId,
          campaignId: campaignId as Id<"campaigns">,
          phone,
          message,
          status: 'failed',
          errorMessage: result.error,
          createdAt: now,
        });

        failed++;
      }
    }

    const remaining = pendingSmsRecipients.length - batch.length;

    logger.info(
      { campaignId, tenantId, sent, failed, remaining },
      'SMS campaign batch processed'
    );

    return NextResponse.json({ sent, failed, remaining });
  } catch (error) {
    logger.error({ err: error }, 'SMS campaign send error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
