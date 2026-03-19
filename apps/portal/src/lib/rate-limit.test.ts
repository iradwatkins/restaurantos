import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, getClientIp } from './rate-limit';

describe('checkRateLimit', () => {
  const config = { maxRequests: 3, windowMs: 1000 };

  it('allows requests under the limit', () => {
    const key = `test-${Date.now()}-allow`;
    const result = checkRateLimit(key, config);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests over the limit', () => {
    const key = `test-${Date.now()}-block`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks remaining count accurately', () => {
    const key = `test-${Date.now()}-count`;
    expect(checkRateLimit(key, config).remaining).toBe(2);
    expect(checkRateLimit(key, config).remaining).toBe(1);
    expect(checkRateLimit(key, config).remaining).toBe(0);
  });

  it('uses separate buckets for different keys', () => {
    const key1 = `test-${Date.now()}-a`;
    const key2 = `test-${Date.now()}-b`;
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);

    const result = checkRateLimit(key2, config);
    expect(result.success).toBe(true);
  });

  it('returns resetMs when blocked', () => {
    const key = `test-${Date.now()}-reset`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.success).toBe(false);
    expect(result.resetMs).toBeGreaterThan(0);
    expect(result.resetMs).toBeLessThanOrEqual(config.windowMs);
  });

  it('returns windowMs as resetMs when allowed', () => {
    const key = `test-${Date.now()}-resetAllowed`;
    const result = checkRateLimit(key, config);
    expect(result.resetMs).toBe(config.windowMs);
  });

  it('allows requests again after window expires', () => {
    vi.useFakeTimers();
    const key = `test-expired-window`;
    const cfg = { maxRequests: 1, windowMs: 500 };

    checkRateLimit(key, cfg);
    expect(checkRateLimit(key, cfg).success).toBe(false);

    vi.advanceTimersByTime(600);
    expect(checkRateLimit(key, cfg).success).toBe(true);

    vi.useRealTimers();
  });

  it('runs cleanup when interval has passed', () => {
    vi.useFakeTimers();
    const key = `test-cleanup-${Date.now()}`;
    const cfg = { maxRequests: 1, windowMs: 1000 };

    checkRateLimit(key, cfg);

    // Advance past the cleanup interval (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    // This call should trigger cleanup
    const freshKey = `test-cleanup-fresh-${Date.now()}`;
    const result = checkRateLimit(freshKey, cfg);
    expect(result.success).toBe(true);

    vi.useRealTimers();
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('extracts single IP from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(getClientIp(request)).toBe('10.0.0.1');
  });

  it('falls back to x-real-ip when no x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '192.168.1.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  it('returns unknown when no IP headers are present', () => {
    const request = new Request('http://localhost');
    expect(getClientIp(request)).toBe('unknown');
  });

  it('trims whitespace from forwarded IP', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  1.2.3.4 , 5.6.7.8' },
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });
});
