import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * QuickBooks daily journal entry sync.
 *
 * POST: Accepts a date, queries orders for that date, and creates a
 * journal entry in QuickBooks with:
 * - Revenue (credit)
 * - Tax Collected (credit)
 * - Cash (debit)
 * - Card (debit)
 * - Tips (debit to liability)
 *
 * Uses QuickBooks API v3.
 *
 * Required env vars:
 * - QUICKBOOKS_ENVIRONMENT: 'sandbox' or 'production'
 */

function getQuickBooksApiBaseUrl(): string {
  const env = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
  return env === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

interface OrderSummary {
  totalRevenue: number;
  totalTax: number;
  totalCash: number;
  totalCard: number;
  totalTips: number;
}

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`quickbooks-sync:${ip}`, {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { date: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json(
      { error: 'Date is required in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  const convex = getConvexClient();

  // Fetch tenant to get QuickBooks credentials
  let tenant;
  try {
    tenant = await convex.query(api.tenants.queries.getById, {
      id: session.tenantId as Id<'tenants'>,
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to fetch tenant for QuickBooks sync');
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  if (tenant.accountingProvider !== 'quickbooks') {
    return NextResponse.json(
      { error: 'QuickBooks is not configured as the accounting provider' },
      { status: 400 }
    );
  }

  if (!tenant.quickbooksAccessToken || !tenant.quickbooksRealmId) {
    return NextResponse.json(
      { error: 'QuickBooks is not connected. Please authorize first.' },
      { status: 400 }
    );
  }

  // Query orders for the specified date
  const dateStart = new Date(`${body.date}T00:00:00Z`).getTime();
  const dateEnd = new Date(`${body.date}T23:59:59.999Z`).getTime();

  let orders;
  try {
    orders = await convex.query(api.orders.queries.listByDateRange, {
      tenantId: session.tenantId as Id<'tenants'>,
      startDate: dateStart,
      endDate: dateEnd,
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId, date: body.date }, 'Failed to fetch orders for sync');
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  // Aggregate order data
  const summary: OrderSummary = {
    totalRevenue: 0,
    totalTax: 0,
    totalCash: 0,
    totalCard: 0,
    totalTips: 0,
  };

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    if (order.paymentStatus !== 'paid') continue;

    summary.totalRevenue += order.subtotal;
    summary.totalTax += order.tax;
    summary.totalTips += order.tipAmount ?? order.tip ?? 0;

    if (order.paymentMethod === 'cash') {
      summary.totalCash += order.total;
    } else if (order.paymentMethod === 'card') {
      summary.totalCard += order.total;
    } else {
      // Default to card for split or unknown
      summary.totalCard += order.total;
    }
  }

  // Convert cents to dollars for QuickBooks
  const revenueDollars = (summary.totalRevenue / 100).toFixed(2);
  const taxDollars = (summary.totalTax / 100).toFixed(2);
  const cashDollars = (summary.totalCash / 100).toFixed(2);
  const cardDollars = (summary.totalCard / 100).toFixed(2);
  const tipsDollars = (summary.totalTips / 100).toFixed(2);

  // Build QuickBooks journal entry
  const journalEntry = {
    TxnDate: body.date,
    DocNumber: `DAILY-${body.date}`,
    PrivateNote: `RestaurantOS daily summary for ${body.date}`,
    Line: [
      // Debit: Cash
      ...(parseFloat(cashDollars) > 0
        ? [
            {
              DetailType: 'JournalEntryLineDetail',
              Amount: parseFloat(cashDollars),
              Description: `Cash receipts for ${body.date}`,
              JournalEntryLineDetail: {
                PostingType: 'Debit',
                AccountRef: { name: 'Cash on Hand' },
              },
            },
          ]
        : []),
      // Debit: Card
      ...(parseFloat(cardDollars) > 0
        ? [
            {
              DetailType: 'JournalEntryLineDetail',
              Amount: parseFloat(cardDollars),
              Description: `Card receipts for ${body.date}`,
              JournalEntryLineDetail: {
                PostingType: 'Debit',
                AccountRef: { name: 'Undeposited Funds' },
              },
            },
          ]
        : []),
      // Debit: Tips to liability
      ...(parseFloat(tipsDollars) > 0
        ? [
            {
              DetailType: 'JournalEntryLineDetail',
              Amount: parseFloat(tipsDollars),
              Description: `Tips collected for ${body.date}`,
              JournalEntryLineDetail: {
                PostingType: 'Debit',
                AccountRef: { name: 'Tips Payable' },
              },
            },
          ]
        : []),
      // Credit: Revenue
      ...(parseFloat(revenueDollars) > 0
        ? [
            {
              DetailType: 'JournalEntryLineDetail',
              Amount: parseFloat(revenueDollars),
              Description: `Revenue for ${body.date}`,
              JournalEntryLineDetail: {
                PostingType: 'Credit',
                AccountRef: { name: 'Sales' },
              },
            },
          ]
        : []),
      // Credit: Tax Collected
      ...(parseFloat(taxDollars) > 0
        ? [
            {
              DetailType: 'JournalEntryLineDetail',
              Amount: parseFloat(taxDollars),
              Description: `Sales tax collected for ${body.date}`,
              JournalEntryLineDetail: {
                PostingType: 'Credit',
                AccountRef: { name: 'Sales Tax Payable' },
              },
            },
          ]
        : []),
    ],
  };

  // Send to QuickBooks API v3
  const baseUrl = getQuickBooksApiBaseUrl();
  const qbUrl = `${baseUrl}/v3/company/${tenant.quickbooksRealmId}/journalentry?minorversion=65`;

  try {
    const qbResponse = await fetch(qbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tenant.quickbooksAccessToken}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(journalEntry),
    });

    if (!qbResponse.ok) {
      const errorBody = await qbResponse.text();
      logger.error(
        { status: qbResponse.status, body: errorBody, tenantId: session.tenantId },
        'QuickBooks journal entry creation failed'
      );
      return NextResponse.json(
        { error: 'Failed to create QuickBooks journal entry', details: errorBody },
        { status: 502 }
      );
    }

    const result = await qbResponse.json();

    logger.info(
      { tenantId: session.tenantId, date: body.date, journalEntryId: result.JournalEntry?.Id },
      'QuickBooks journal entry created'
    );

    return NextResponse.json({
      success: true,
      journalEntryId: result.JournalEntry?.Id,
      summary: {
        revenue: revenueDollars,
        tax: taxDollars,
        cash: cashDollars,
        card: cardDollars,
        tips: tipsDollars,
        orderCount: orders.filter(
          (o: { status: string; paymentStatus: string }) =>
            o.status !== 'cancelled' && o.paymentStatus === 'paid'
        ).length,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'QuickBooks API request failed');
    return NextResponse.json(
      { error: 'Failed to connect to QuickBooks API' },
      { status: 502 }
    );
  }
}
