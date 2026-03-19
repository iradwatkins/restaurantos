/**
 * Shared input validators for Convex mutations.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s()+-]{7,20}$/;

// IANA timezone database list (common US + international)
const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "America/Phoenix", "America/Puerto_Rico", "Pacific/Guam",
  "UTC",
];

const VALID_TIMEZONES = new Set(COMMON_TIMEZONES);

export function validateEmail(email: string): void {
  if (!EMAIL_RE.test(email)) {
    throw new Error(`Invalid email address: ${email}`);
  }
}

export function validatePhone(phone: string): void {
  if (!PHONE_RE.test(phone)) {
    throw new Error(`Invalid phone number: ${phone}`);
  }
}

export function validateTimezone(tz: string): void {
  if (!VALID_TIMEZONES.has(tz)) {
    throw new Error(`Invalid timezone: ${tz}`);
  }
}

export function validatePasswordComplexity(password: string): void {
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) throw new Error('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) throw new Error('Password must contain a lowercase letter');
  if (!/[0-9]/.test(password)) throw new Error('Password must contain a digit');
}
