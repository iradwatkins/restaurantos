interface PrintableOrder {
  orderNumber: number;
  items: { name: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: number;
  tableName?: string;
  customerName?: string;
  paymentMethod?: string;
}

export function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function pad(left: string, right: string, width: number): string {
  const gap = width - left.length - right.length;
  return left + " ".repeat(Math.max(gap, 1)) + right;
}

const RECEIPT_WIDTH = 40;
const DASHES = "-".repeat(RECEIPT_WIDTH);

/**
 * Print a receipt by writing styled HTML into a hidden iframe and triggering the browser print dialog.
 */
export function printReceipt(
  order: PrintableOrder,
  restaurantName: string,
): void {
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString();
  const timeStr = date.toLocaleTimeString();

  const lines: string[] = [];

  // Header
  const namePad = Math.max(
    0,
    Math.floor((RECEIPT_WIDTH - restaurantName.length) / 2),
  );
  lines.push(" ".repeat(namePad) + restaurantName);
  lines.push(DASHES);

  // Order info
  lines.push(`Order #${order.orderNumber}`);
  lines.push(`${dateStr}  ${timeStr}`);
  if (order.tableName) lines.push(`Table: ${order.tableName}`);
  if (order.customerName) lines.push(`Customer: ${order.customerName}`);
  lines.push(DASHES);

  // Items
  for (const item of order.items) {
    const qty = `${item.quantity}x ${item.name}`;
    const price = formatDollars(item.lineTotal);
    lines.push(pad(qty, price, RECEIPT_WIDTH));
  }

  lines.push(DASHES);

  // Totals
  lines.push(pad("Subtotal", formatDollars(order.subtotal), RECEIPT_WIDTH));
  lines.push(pad("Tax", formatDollars(order.tax), RECEIPT_WIDTH));
  lines.push(DASHES);
  lines.push(pad("TOTAL", formatDollars(order.total), RECEIPT_WIDTH));

  if (order.paymentMethod) {
    lines.push("");
    lines.push(`Paid by: ${order.paymentMethod}`);
  }

  lines.push("");
  lines.push(
    " ".repeat(Math.max(0, Math.floor((RECEIPT_WIDTH - 14) / 2))) +
      "Thank you!",
  );

  const receiptText = lines.join("\n");

  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  @page { margin: 0; }
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
<body><pre>${receiptText}</pre></body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
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
      document.body.removeChild(iframe);
    }, 1000);
  };

  // Fallback if onload already fired (some browsers)
  try {
    iframe.contentWindow?.print();
  } catch {
    // Will fire via onload instead
  }

  setTimeout(() => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }, 5000);
}
