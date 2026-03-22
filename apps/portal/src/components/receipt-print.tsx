'use client';

/**
 * Browser-based receipt printing for 80mm thermal paper (~300px / ~42 chars).
 *
 * Renders a receipt into a hidden iframe using monospaced layout optimised for
 * thermal printers, then triggers the native browser print dialog.
 *
 * This module also exports a React component <ReceiptPreview> for on-screen
 * preview (e.g. inside a dialog) — useful for "preview before print" flows.
 */

import { formatReceipt, type ReceiptData } from '@/lib/receipt';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Characters per line at 12px Courier on 80mm paper */
const LINE_WIDTH = 42;
const DASHES = '-'.repeat(LINE_WIDTH);

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function center(text: string): string {
  const pad = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function padLine(left: string, right: string): string {
  const gap = LINE_WIDTH - left.length - right.length;
  return left + ' '.repeat(Math.max(gap, 1)) + right;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Receipt text builder
// ---------------------------------------------------------------------------

export function buildReceiptText(receipt: ReceiptData): string {
  const lines: string[] = [];

  // ---- Header ----
  lines.push(center(receipt.businessName));
  if (receipt.address) {
    // Wrap long addresses
    if (receipt.address.length > LINE_WIDTH) {
      const mid = receipt.address.lastIndexOf(',', LINE_WIDTH);
      if (mid > 0) {
        lines.push(center(receipt.address.slice(0, mid + 1).trim()));
        lines.push(center(receipt.address.slice(mid + 1).trim()));
      } else {
        lines.push(center(receipt.address));
      }
    } else {
      lines.push(center(receipt.address));
    }
  }
  if (receipt.phone) {
    lines.push(center(receipt.phone));
  }

  lines.push(DASHES);

  // ---- Order info ----
  lines.push(padLine(`Order #${receipt.orderNumber}`, receipt.orderType));
  lines.push(padLine(receipt.date, receipt.time));
  if (receipt.serverName) {
    lines.push(`Server: ${receipt.serverName}`);
  }
  if (receipt.tableName) {
    lines.push(`Table: ${receipt.tableName}`);
  }

  lines.push(DASHES);

  // ---- Items ----
  for (const item of receipt.items) {
    if (item.isVoided) {
      lines.push(padLine(`** VOID ${item.quantity}x ${item.name}`, ''));
      continue;
    }

    const lineTotal = item.quantity * item.price;
    const left =
      item.quantity > 1
        ? `${item.quantity}x ${item.name}`
        : item.name;
    lines.push(padLine(left, dollars(lineTotal)));

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        lines.push(`  + ${mod}`);
      }
    }
  }

  lines.push(DASHES);

  // ---- Totals ----
  lines.push(padLine('Subtotal', dollars(receipt.subtotal)));

  if (receipt.discount) {
    lines.push(padLine(receipt.discount.name, `-${dollars(receipt.discount.amount)}`));
  }

  lines.push(padLine('Tax', dollars(receipt.tax)));

  if (receipt.tip && receipt.tip > 0) {
    lines.push(padLine('Tip', dollars(receipt.tip)));
  }

  lines.push(DASHES);
  lines.push(padLine('TOTAL', dollars(receipt.total)));

  // ---- Payment ----
  lines.push('');
  lines.push(padLine('Payment:', receipt.paymentMethod));

  // ---- Footer ----
  lines.push('');
  lines.push(center(receipt.footer));
  lines.push('');

  // ---- Order barcode placeholder ----
  lines.push(center(`[ #${receipt.orderNumber} ]`));

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Browser print via hidden iframe
// ---------------------------------------------------------------------------

function buildPrintHtml(receiptText: string): string {
  // Escape HTML entities in the receipt text
  const escaped = receiptText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html>
<head>
<style>
  @page {
    margin: 0;
    size: 80mm auto;
  }
  body {
    font-family: "Courier New", Courier, monospace;
    font-size: 12px;
    line-height: 1.4;
    margin: 0;
    padding: 8px;
    width: 280px;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
</head>
<body><pre>${escaped}</pre></body>
</html>`;
}

/**
 * Render a receipt off-screen in a hidden iframe and trigger the browser
 * print dialog. Accepts either a pre-built {@link ReceiptData} object or
 * raw order + tenant data (which will be formatted automatically).
 */
export function printBrowserReceipt(receiptOrOrder: ReceiptData): void;
export function printBrowserReceipt(
  order: Parameters<typeof formatReceipt>[0],
  tenant: Parameters<typeof formatReceipt>[1],
): void;
export function printBrowserReceipt(
  orderOrReceipt: ReceiptData | Parameters<typeof formatReceipt>[0],
  tenant?: Parameters<typeof formatReceipt>[1],
): void {
  const receipt: ReceiptData =
    tenant !== undefined
      ? formatReceipt(
          orderOrReceipt as Parameters<typeof formatReceipt>[0],
          tenant,
        )
      : (orderOrReceipt as ReceiptData);

  const text = buildReceiptText(receipt);
  const html = buildPrintHtml(text);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  };

  // Fallback — some browsers fire onload synchronously before we assign it
  try {
    iframe.contentWindow?.print();
  } catch {
    // Will fire via onload instead
  }

  // Safety net: remove iframe after 5 s regardless
  setTimeout(() => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }, 5000);
}

// ---------------------------------------------------------------------------
// React preview component
// ---------------------------------------------------------------------------

interface ReceiptPreviewProps {
  receipt: ReceiptData;
  className?: string;
}

/**
 * On-screen receipt preview styled to match 80mm thermal output.
 * Renders inside whatever container the caller provides — no print logic.
 */
export function ReceiptPreview({ receipt, className }: ReceiptPreviewProps) {
  const text = buildReceiptText(receipt);
  return (
    <pre
      className={`font-mono text-xs leading-snug whitespace-pre-wrap break-all bg-white text-black p-3 rounded border max-w-[300px] mx-auto ${className ?? ''}`}
    >
      {text}
    </pre>
  );
}
