import { NextRequest, NextResponse } from 'next/server';
import { api } from '@restaurantos/backend';
import { Id } from '@restaurantos/backend/dataModel';
import { convexClient } from '@/lib/auth/convex-client';
import { sendSms } from '@/lib/notifications/sms';
import { logger } from '@/lib/logger';

/**
 * Keywords that signal an opt-out request (TCPA compliance).
 * Case-insensitive matching.
 */
const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];

/**
 * Keywords that signal an opt-in request.
 * Case-insensitive matching.
 */
const OPT_IN_KEYWORDS = ['START'];

/**
 * POST /api/webhooks/twilio
 *
 * Receives inbound SMS from Twilio when a customer replies to our messages.
 * Handles STOP (opt-out) and START (opt-in) keywords per TCPA requirements.
 *
 * Twilio sends form-urlencoded data with fields including:
 * - Body: the message text
 * - From: the sender's phone number (e.g., "+15551234567")
 * - To: the Twilio number that received the message
 */
export async function POST(request: NextRequest) {
  try {
    // Twilio sends application/x-www-form-urlencoded
    const formData = await request.formData();
    const messageBody = formData.get('Body') as string | null;
    const fromPhone = formData.get('From') as string | null;

    // Validate required fields from Twilio
    if (!messageBody || !fromPhone) {
      logger.warn(
        { body: messageBody, from: fromPhone },
        'Twilio webhook missing required fields'
      );
      return buildTwimlResponse();
    }

    const normalizedBody = messageBody.trim().toUpperCase();

    // Check for opt-out keywords
    const isOptOut = OPT_OUT_KEYWORDS.some(
      (kw) => normalizedBody === kw || normalizedBody.startsWith(kw + ' ')
    );

    // Check for opt-in keywords
    const isOptIn = OPT_IN_KEYWORDS.some(
      (kw) => normalizedBody === kw || normalizedBody.startsWith(kw + ' ')
    );

    if (isOptOut) {
      await handleOptOut(fromPhone);
    } else if (isOptIn) {
      await handleOptIn(fromPhone);
    } else {
      // Not a recognized keyword — log for reference
      logger.info(
        { from: fromPhone, body: messageBody },
        'Inbound SMS received (no action keyword)'
      );
    }

    // Always return 200 with valid TwiML to acknowledge receipt
    return buildTwimlResponse();
  } catch (error) {
    logger.error({ err: error }, 'Twilio webhook error');
    // Return 200 anyway to prevent Twilio from retrying
    return buildTwimlResponse();
  }
}

/**
 * Handle a STOP/opt-out message.
 * Finds all customers with this phone number across all tenants and marks them opted out.
 * Sends a confirmation reply.
 */
async function handleOptOut(phone: string): Promise<void> {
  logger.info({ phone }, 'Processing SMS opt-out');

  // Find all customers with this phone number
  const customers = await convexClient.query(
    api.marketing.queries.findCustomersByPhone,
    { phone }
  );

  if (customers.length === 0) {
    logger.warn({ phone }, 'Opt-out received but no matching customer found');
  }

  // Group customers by tenant and process opt-out for each
  const tenantIds = new Set(customers.map((c) => c.tenantId));
  for (const tenantId of tenantIds) {
    await convexClient.mutation(api.marketing.mutations.processSmsOptOut, {
      tenantId: tenantId as Id<"tenants">,
      phone,
    });
  }

  // Send confirmation reply
  await sendSms(
    phone,
    'You have been unsubscribed. Reply START to re-subscribe.'
  );
}

/**
 * Handle a START/opt-in message.
 * Finds all customers with this phone number and re-enables SMS consent.
 * Sends a confirmation reply.
 */
async function handleOptIn(phone: string): Promise<void> {
  logger.info({ phone }, 'Processing SMS opt-in');

  const customers = await convexClient.query(
    api.marketing.queries.findCustomersByPhone,
    { phone }
  );

  if (customers.length === 0) {
    logger.warn({ phone }, 'Opt-in received but no matching customer found');
  }

  const tenantIds = new Set(customers.map((c) => c.tenantId));
  for (const tenantId of tenantIds) {
    await convexClient.mutation(api.marketing.mutations.processSmsOptIn, {
      tenantId: tenantId as Id<"tenants">,
      phone,
    });
  }

  // Send confirmation reply
  await sendSms(
    phone,
    'You have been re-subscribed to SMS updates. Reply STOP to unsubscribe.'
  );
}

/**
 * Build a minimal TwiML response.
 * Twilio expects XML with a <Response> element.
 * An empty response tells Twilio we handled it with no auto-reply via TwiML
 * (we send replies via the REST API instead for better control).
 */
function buildTwimlResponse(): NextResponse {
  const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
