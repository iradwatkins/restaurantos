/**
 * ESC/POS command builder for thermal receipt printers (Epson, Star, etc.)
 * connected via the Web Serial API (USB/serial).
 *
 * Zero external dependencies — all byte sequences are built from the ESC/POS
 * specification directly.
 *
 * NOTE: The Web Serial API is only available in Chromium-based browsers behind
 * a secure context (HTTPS or localhost). Use {@link isPrinterSupported} to
 * guard feature availability at runtime.
 */

import type { ReceiptData } from './receipt';

// ---------------------------------------------------------------------------
// Web Serial API type declarations (experimental API, not in default TS lib)
// ---------------------------------------------------------------------------

interface WebSerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

interface WebSerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface WebSerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  getInfo(): WebSerialPortInfo;
  open(options: { baudRate: number; [key: string]: unknown }): Promise<void>;
  close(): Promise<void>;
}

interface WebSerial {
  requestPort(options?: { filters?: WebSerialPortFilter[] }): Promise<WebSerialPort>;
  getPorts(): Promise<WebSerialPort[]>;
}

declare global {
  interface Navigator {
    readonly serial?: WebSerial;
  }
}

// ---------------------------------------------------------------------------
// ESC/POS command bytes
// ---------------------------------------------------------------------------

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Standard 80mm thermal paper: 42 chars in Font A at normal width */
const CHARS_PER_LINE = 42;

const CMD = {
  /** Reset printer to default state */
  INIT: new Uint8Array([ESC, 0x40]),

  /** Align left / center / right */
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),

  /** Bold on / off */
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),

  /** Double-height text on / off */
  DOUBLE_HEIGHT_ON: new Uint8Array([GS, 0x21, 0x01]),
  DOUBLE_HEIGHT_OFF: new Uint8Array([GS, 0x21, 0x00]),

  /** Double-width + double-height (large text) */
  LARGE_ON: new Uint8Array([GS, 0x21, 0x11]),
  LARGE_OFF: new Uint8Array([GS, 0x21, 0x00]),

  /** Feed N lines */
  feedLines: (n: number) => {
    const buf = new Uint8Array(n);
    buf.fill(LF);
    return buf;
  },

  /** Full cut (with small feed) */
  CUT: new Uint8Array([GS, 0x56, 0x00]),

  /** Partial cut */
  PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x01]),
} as const;

// ---------------------------------------------------------------------------
// Text encoding helper
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function encode(text: string): Uint8Array {
  return encoder.encode(text);
}

function padLine(left: string, right: string): string {
  const gap = CHARS_PER_LINE - left.length - right.length;
  return left + ' '.repeat(Math.max(gap, 1)) + right;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Receipt byte-stream builder
// ---------------------------------------------------------------------------

/**
 * Build the full ESC/POS byte sequence for a receipt.
 * Returns a single `Uint8Array` ready to write to a serial port.
 */
export function buildEscPosReceipt(receipt: ReceiptData): Uint8Array {
  const parts: Uint8Array[] = [];

  function push(...chunks: Uint8Array[]) {
    parts.push(...chunks);
  }

  function text(s: string) {
    push(encode(s + '\n'));
  }

  function line() {
    text('-'.repeat(CHARS_PER_LINE));
  }

  // ---- Initialize ----
  push(CMD.INIT);

  // ---- Header ----
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT_ON);
  text(receipt.businessName);
  push(CMD.DOUBLE_HEIGHT_OFF, CMD.BOLD_OFF);

  if (receipt.address) {
    text(receipt.address);
  }
  if (receipt.phone) {
    text(receipt.phone);
  }

  push(CMD.ALIGN_LEFT);
  line();

  // ---- Order info ----
  text(padLine(`Order #${receipt.orderNumber}`, receipt.orderType));
  text(padLine(receipt.date, receipt.time));
  if (receipt.serverName) {
    text(`Server: ${receipt.serverName}`);
  }
  if (receipt.tableName) {
    text(`Table: ${receipt.tableName}`);
  }

  line();

  // ---- Items ----
  for (const item of receipt.items) {
    if (item.isVoided) {
      text(padLine(`** VOID ${item.quantity}x ${item.name}`, ''));
      continue;
    }

    const lineTotal = item.quantity * item.price;
    const left = item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name;
    text(padLine(left, dollars(lineTotal)));

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        text(`  + ${mod}`);
      }
    }
  }

  line();

  // ---- Totals ----
  text(padLine('Subtotal', dollars(receipt.subtotal)));

  if (receipt.discount) {
    text(padLine(receipt.discount.name, `-${dollars(receipt.discount.amount)}`));
  }

  text(padLine('Tax', dollars(receipt.tax)));

  if (receipt.tip && receipt.tip > 0) {
    text(padLine('Tip', dollars(receipt.tip)));
  }

  line();

  // TOTAL — bold + large
  push(CMD.BOLD_ON, CMD.LARGE_ON);
  text(padLine('TOTAL', dollars(receipt.total)));
  push(CMD.LARGE_OFF, CMD.BOLD_OFF);

  // ---- Payment ----
  push(CMD.feedLines(1));
  text(padLine('Payment:', receipt.paymentMethod));

  // ---- Footer ----
  push(CMD.feedLines(1), CMD.ALIGN_CENTER);
  text(receipt.footer);
  push(CMD.feedLines(1));
  text(`[ #${receipt.orderNumber} ]`);

  // ---- Feed + cut ----
  push(CMD.feedLines(4), CMD.PARTIAL_CUT);

  return concatBytes(parts);
}

// ---------------------------------------------------------------------------
// Byte concatenation
// ---------------------------------------------------------------------------

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Web Serial API helpers
// ---------------------------------------------------------------------------

/**
 * Type alias for the Web Serial port handle returned by {@link connectPrinter}.
 */
export type SerialPrinterPort = WebSerialPort;

/**
 * Returns `true` when the Web Serial API is available in the current browser.
 * Always `false` in SSR / Node contexts.
 */
export function isPrinterSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serial' in navigator;
}

/**
 * Open the browser's serial port picker and return the selected port, already
 * opened at the standard thermal-printer baud rate (9600).
 *
 * Throws if the user cancels the picker or the port fails to open.
 */
export async function connectPrinter(): Promise<SerialPrinterPort> {
  if (!isPrinterSupported()) {
    throw new Error(
      'Web Serial API is not supported in this browser. ' +
      'Use Chrome, Edge, or another Chromium-based browser on desktop.',
    );
  }

  // Common USB vendor IDs for receipt printers
  const filters: WebSerialPortFilter[] = [
    { usbVendorId: 0x04b8 }, // Epson
    { usbVendorId: 0x0519 }, // Star Micronics
    { usbVendorId: 0x0dd4 }, // Custom Engineering
    { usbVendorId: 0x0fe6 }, // ICS Electronics (common USB-serial chip)
    { usbVendorId: 0x067b }, // Prolific (USB-serial adapter)
    { usbVendorId: 0x0403 }, // FTDI (USB-serial adapter)
    { usbVendorId: 0x1a86 }, // QinHeng Electronics CH340 (common adapter)
  ];

  // Request with filters first; if none match, fall back to any port
  let port: WebSerialPort;
  const serial = navigator.serial!;
  try {
    port = await serial.requestPort({ filters });
  } catch {
    // User may have a printer not in the filter list — let them pick any port
    port = await serial.requestPort();
  }

  await port.open({ baudRate: 9600 });
  return port;
}

/**
 * Send a receipt to a connected thermal printer.
 *
 * @param receipt - Structured receipt data (output of {@link formatReceipt}).
 * @param port    - An already-opened serial port from {@link connectPrinter}.
 *                  If omitted, {@link connectPrinter} is called automatically.
 */
export async function printEscPosReceipt(
  receipt: ReceiptData,
  port?: SerialPrinterPort,
): Promise<void> {
  const printerPort = port ?? await connectPrinter();

  const data = buildEscPosReceipt(receipt);

  const writer = printerPort.writable?.getWriter();
  if (!writer) {
    throw new Error('Failed to acquire writer on the serial port.');
  }

  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}

/**
 * Close a previously-opened printer port.
 */
export async function disconnectPrinter(port: SerialPrinterPort): Promise<void> {
  try {
    await port.close();
  } catch {
    // Port may already be closed — ignore
  }
}
