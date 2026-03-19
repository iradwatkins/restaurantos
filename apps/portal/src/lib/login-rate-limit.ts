/**
 * Login-specific brute-force protection.
 * Tracks failed attempts by IP + email and blocks after MAX_ATTEMPTS within WINDOW_MS.
 * For production at scale, replace with Redis/Upstash-based implementation.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  firstAttempt: number;
}

const attempts = new Map<string, AttemptRecord>();

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterMs = WINDOW_MS - (now - record.firstAttempt);
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

export function resetAttempts(key: string): void {
  attempts.delete(key);
}

// Cleanup stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 30 * 60 * 1000).unref();
