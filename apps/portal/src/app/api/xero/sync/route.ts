import { NextResponse } from 'next/server';
import { getApiSession } from '@/lib/auth/api-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getConvexClient } from '@/lib/auth/convex-client';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';

/**
 * Xero daily journal entry sync.
 *
 * POST: Accepts a date, queries orders for that date, and creates a
 * manual journal in Xero with:
 * - Revenue (credit)
 * - Tax Collected (credit)
 * - Cash (debit)
 * - Card (debit)
 * - Tips (debit to liability)
 *
 * Uses Xero Accounting API.
 */

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
  const rateLimit = checkRateLimit(`xero-sync:${ip}`, {
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

  // Fetch tenant to get Xero credentials
  let tenant;
  try {
    tenant = await convex.query(api.tenants.queries.getById, {
      id: session.tenantId as Id<'tenants'>,
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to fetch tenant for Xero sync');
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  if (tenant.accountingProvider !== 'xero') {
    return NextResponse.json(
      { error: 'Xero is not configured as the accounting provider' },
      { status: 400 }
    );
  }

  if (!tenant.xeroAccessToken || !tenant.xeroTenantId) {
    return NextResponse.json(
      { error: 'Xero is not connected. Please authorize first.' },
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
      summary.totalCard += order.total;
    }
  }

  // Convert cents to dollars for Xero
  const revenueDollars = summary.totalRevenue / 100;
  const taxDollars = summary.totalTax / 100;
  const cashDollars = summary.totalCash / 100;
  const cardDollars = summary.totalCard / 100;
  const tipsDollars = summary.totalTips / 100;

  // Build Xero manual journal
  const journalLines: Array<{
    LineAmount: number;
    AccountCode: string;
    Description: string;
  }> = [];

  // Debit lines (positive amounts)
  if (cashDollars > 0) {
    journalLines.push({
      LineAmount: cashDollars,
      AccountCode: '090', // Cash on Hand (standard Xero code)
      Description: `Cash receipts for ${body.date}`,
    });
  }
  if (cardDollars > 0) {
    journalLines.push({
      LineAmount: cardDollars,
      AccountCode: '092', // Undeposited Funds
      Description: `Card receipts for ${body.date}`,
    });
  }
  if (tipsDollars > 0) {
    journalLines.push({
      LineAmount: tipsDollars,
      AccountCode: '840', // Tips Payable (liability)
      Description: `Tips collected for ${body.date}`,
    });
  }

  // Credit lines (negative amounts in Xero manual journals)
  if (revenueDollars > 0) {
    journalLines.push({
      LineAmount: -revenueDollars,
      AccountCode: '200', // Sales Revenue
      Description: `Revenue for ${body.date}`,
    });
  }
  if (taxDollars > 0) {
    journalLines.push({
      LineAmount: -taxDollars,
      AccountCode: '820', // Sales Tax Payable
      Description: `Sales tax collected for ${body.date}`,
    });
  }

  const manualJournal = {
    Date: body.date,
    Narration: `RestaurantOS daily summary for ${body.date}`,
    JournalLines: journalLines,
  };

  // Send to Xero API
  try {
    const xeroResponse = await fetch(
      'https://api.xero.com/api.xro/2.0/ManualJournals',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenant.xeroAccessToken}`,
          'Xero-tenant-id': tenant.xeroTenantId,
          Accept: 'application/json',
        },
        body: JSON.stringify({ ManualJournals: [manualJournal] }),
      }
    );

    if (!xeroResponse.ok) {
      const errorBody = await xeroResponse.text();
      logger.error(
        { status: xeroResponse.status, body: errorBody, tenantId: session.tenantId },
        'Xero manual journal creation failed'
      );
      return NextResponse.json(
        { error: 'Failed to create Xero journal entry', details: errorBody },
        { status: 502 }
      );
    }

    const result = await xeroResponse.json();
    const journalId = result.ManualJournals?.[0]?.ManualJournalID;

    logger.info(
      { tenantId: session.tenantId, date: body.date, journalId },
      'Xero manual journal created'
    );

    return NextResponse.json({
      success: true,
      journalId,
      summary: {
        revenue: revenueDollars.toFixed(2),
        tax: taxDollars.toFixed(2),
        cash: cashDollars.toFixed(2),
        card: cardDollars.toFixed(2),
        tips: tipsDollars.toFixed(2),
        orderCount: orders.filter(
          (o: { status: string; paymentStatus: string }) =>
            o.status !== 'cancelled' && o.paymentStatus === 'paid'
        ).length,
      },
    });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Xero API request failed');
    return NextResponse.json(
      { error: 'Failed to connect to Xero API' },
      { status: 502 }
    );
  }
}
