import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkLoginRateLimit, recordFailedAttempt, resetAttempts } from './login-rate-limit';

describe('login-rate-limit', () => {
  beforeEach(() => {
    // Reset all attempts between tests by resetting a known key
    // We use unique keys per test to avoid cross-contamination
  });

  it('allows the first attempt', () => {
    const key = 'test-first-attempt';
    const result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it('allows up to 5 failed attempts', () => {
    const key = 'test-five-attempts';
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(key);
    }
    // The 5th attempt was recorded, but checkLoginRateLimit checks count >= MAX_ATTEMPTS
    // So the next check should block
    // Let's verify that after 4 failures, the 5th login attempt is still allowed
    const key2 = 'test-four-attempts';
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(key2);
    }
    const result = checkLoginRateLimit(key2);
    expect(result.allowed).toBe(true);
  });

  it('blocks the 6th attempt after 5 failures', () => {
    const key = 'test-block-sixth';
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(key);
    }
    const result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(false);
  });

  it('returns retryAfterMs when blocked', () => {
    const key = 'test-retry-after';
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(key);
    }
    const result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeDefined();
    expect(result.retryAfterMs).toBeGreaterThan(0);
    // Should be close to 15 minutes (900000ms)
    expect(result.retryAfterMs).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it('resets after successful login', () => {
    const key = 'test-reset-success';
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(key);
    }
    // Reset on successful login
    resetAttempts(key);

    const result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it('resets after the 15-minute window expires', () => {
    const key = 'test-window-expire';
    const realNow = Date.now;

    let currentTime = 1000000;
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    // Record 5 failures
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(key);
    }

    // Verify blocked
    let result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(false);

    // Advance time past the 15-minute window
    currentTime += 15 * 60 * 1000 + 1;

    result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(true);

    vi.restoreAllMocks();
  });
});
