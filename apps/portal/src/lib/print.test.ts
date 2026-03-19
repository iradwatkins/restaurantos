import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDollars, pad, printReceipt } from './print';

describe('formatDollars', () => {
  it('formats zero cents', () => {
    expect(formatDollars(0)).toBe('$0.00');
  });

  it('formats 1299 cents to $12.99', () => {
    expect(formatDollars(1299)).toBe('$12.99');
  });

  it('formats single cent', () => {
    expect(formatDollars(1)).toBe('$0.01');
  });

  it('formats whole dollar amount', () => {
    expect(formatDollars(500)).toBe('$5.00');
  });

  it('formats large amounts', () => {
    expect(formatDollars(100000)).toBe('$1000.00');
  });
});

describe('pad', () => {
  it('left-aligns left text and right-aligns right text', () => {
    const result = pad('Subtotal', '$10.00', 30);
    expect(result).toHaveLength(30);
    expect(result.startsWith('Subtotal')).toBe(true);
    expect(result.endsWith('$10.00')).toBe(true);
  });

  it('uses at least one space between left and right', () => {
    const result = pad('AAAA', 'BBBB', 5);
    expect(result).toBe('AAAA BBBB');
  });

  it('fills gap with spaces', () => {
    const result = pad('L', 'R', 10);
    expect(result).toBe('L        R');
    expect(result).toHaveLength(10);
  });
});

describe('printReceipt', () => {
  let mockIframe: {
    style: Record<string, string>;
    contentDocument: {
      open: ReturnType<typeof vi.fn>;
      write: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    };
    contentWindow: {
      print: ReturnType<typeof vi.fn>;
      document: {
        open: ReturnType<typeof vi.fn>;
        write: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
      };
    };
    onload: (() => void) | null;
    parentNode: HTMLElement | null;
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockIframe = {
      style: {},
      contentDocument: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
      contentWindow: {
        print: vi.fn(),
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
      },
      onload: null,
      parentNode: document.body,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockIframe as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const baseOrder = {
    orderNumber: 42,
    items: [
      { name: 'Burger', quantity: 2, lineTotal: 2400 },
      { name: 'Fries', quantity: 1, lineTotal: 500 },
    ],
    subtotal: 2900,
    tax: 232,
    total: 3132,
    createdAt: new Date('2026-01-15T12:30:00').getTime(),
  };

  it('creates an iframe and writes receipt HTML', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    expect(document.createElement).toHaveBeenCalledWith('iframe');
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(mockIframe.contentDocument.open).toHaveBeenCalled();
    expect(mockIframe.contentDocument.write).toHaveBeenCalledWith(
      expect.stringContaining('Test Restaurant')
    );
    expect(mockIframe.contentDocument.close).toHaveBeenCalled();
  });

  it('includes order number in receipt', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    const writtenHtml = mockIframe.contentDocument.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Order #42');
  });

  it('includes item names and prices', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    const writtenHtml = mockIframe.contentDocument.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Burger');
    expect(writtenHtml).toContain('Fries');
    expect(writtenHtml).toContain('$24.00');
    expect(writtenHtml).toContain('$5.00');
  });

  it('includes subtotal, tax, and total', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    const writtenHtml = mockIframe.contentDocument.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Subtotal');
    expect(writtenHtml).toContain('$29.00');
    expect(writtenHtml).toContain('Tax');
    expect(writtenHtml).toContain('$2.32');
    expect(writtenHtml).toContain('TOTAL');
    expect(writtenHtml).toContain('$31.32');
  });

  it('includes table name when present', () => {
    printReceipt({ ...baseOrder, tableName: 'Table 5' }, 'Test Restaurant');

    const writtenHtml = mockIframe.contentDocument.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Table: Table 5');
  });

  it('includes customer name when present', () => {
    printReceipt({ ...baseOrder, customerName: 'John' }, 'Test Restaurant');

    const writtenHtml = mockIframe.contentDocument.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Customer: John');
  });

  it('includes payment method when present', () => {
    printReceipt({ ...baseOrder, paymentMethod: 'Visa' }, 'Test Restaurant');

    const writtenHtml = mockIframe.contentDocument.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Paid by: Visa');
  });

  it('includes Thank you message', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    const writtenHtml = mockIframe.contentDocument.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Thank you!');
  });

  it('calls print on contentWindow', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    expect(mockIframe.contentWindow.print).toHaveBeenCalled();
  });

  it('fires print again on iframe onload', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    mockIframe.contentWindow.print.mockClear();
    if (mockIframe.onload) mockIframe.onload();
    expect(mockIframe.contentWindow.print).toHaveBeenCalled();
  });

  it('removes iframe after timeout on onload', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    if (mockIframe.onload) mockIframe.onload();
    vi.advanceTimersByTime(1000);
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('removes iframe via fallback timeout', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    vi.advanceTimersByTime(5000);
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('handles missing contentDocument gracefully', () => {
    mockIframe.contentDocument = null as any;
    (mockIframe as any).contentWindow = { document: undefined };

    // Should not throw
    printReceipt(baseOrder, 'Test Restaurant');
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('handles print throwing an error gracefully', () => {
    mockIframe.contentWindow.print.mockImplementation(() => {
      throw new Error('Print blocked');
    });

    // Should not throw
    expect(() => printReceipt(baseOrder, 'Test Restaurant')).not.toThrow();
  });

  it('sets iframe off-screen styles', () => {
    printReceipt(baseOrder, 'Test Restaurant');

    expect(mockIframe.style.position).toBe('fixed');
    expect(mockIframe.style.top).toBe('-10000px');
    expect(mockIframe.style.left).toBe('-10000px');
  });
});
