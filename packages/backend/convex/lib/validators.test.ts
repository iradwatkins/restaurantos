import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone, validateTimezone } from './validators';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(() => validateEmail('test@example.com')).not.toThrow();
    expect(() => validateEmail('user+tag@sub.domain.com')).not.toThrow();
  });

  it('rejects invalid emails', () => {
    expect(() => validateEmail('')).toThrow('Invalid email');
    expect(() => validateEmail('notanemail')).toThrow('Invalid email');
    expect(() => validateEmail('@missing.com')).toThrow('Invalid email');
    expect(() => validateEmail('no@')).toThrow('Invalid email');
  });
});

describe('validatePhone', () => {
  it('accepts valid phone numbers', () => {
    expect(() => validatePhone('(312) 555-0100')).not.toThrow();
    expect(() => validatePhone('+1 312 555 0100')).not.toThrow();
    expect(() => validatePhone('3125550100')).not.toThrow();
  });

  it('rejects invalid phone numbers', () => {
    expect(() => validatePhone('123')).toThrow('Invalid phone');
    expect(() => validatePhone('')).toThrow('Invalid phone');
    expect(() => validatePhone('abc-def-ghij')).toThrow('Invalid phone');
  });
});

describe('validateTimezone', () => {
  it('accepts valid timezones', () => {
    expect(() => validateTimezone('America/Chicago')).not.toThrow();
    expect(() => validateTimezone('America/New_York')).not.toThrow();
    expect(() => validateTimezone('UTC')).not.toThrow();
  });

  it('rejects invalid timezones', () => {
    expect(() => validateTimezone('Invalid/Timezone')).toThrow('Invalid timezone');
    expect(() => validateTimezone('')).toThrow('Invalid timezone');
  });
});
