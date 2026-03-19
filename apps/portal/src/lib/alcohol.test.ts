import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWithinAlcoholHours } from './alcohol';

describe('isWithinAlcoholHours', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when no hours configured', () => {
    expect(isWithinAlcoholHours()).toBe(true);
    expect(isWithinAlcoholHours(undefined, undefined)).toBe(true);
  });

  it('returns true when only start is configured', () => {
    expect(isWithinAlcoholHours('07:00', undefined)).toBe(true);
  });

  it('returns true within same-day range', () => {
    vi.setSystemTime(new Date('2026-03-18T12:00:00'));
    expect(isWithinAlcoholHours('07:00', '22:00')).toBe(true);
  });

  it('returns false outside same-day range', () => {
    vi.setSystemTime(new Date('2026-03-18T23:00:00'));
    expect(isWithinAlcoholHours('07:00', '22:00')).toBe(false);
  });

  it('handles overnight range (e.g. 07:00 to 02:00)', () => {
    // 10 PM should be within 07:00-02:00
    vi.setSystemTime(new Date('2026-03-18T22:00:00'));
    expect(isWithinAlcoholHours('07:00', '02:00')).toBe(true);

    // 1 AM should be within 07:00-02:00
    vi.setSystemTime(new Date('2026-03-19T01:00:00'));
    expect(isWithinAlcoholHours('07:00', '02:00')).toBe(true);

    // 4 AM should be outside 07:00-02:00
    vi.setSystemTime(new Date('2026-03-19T04:00:00'));
    expect(isWithinAlcoholHours('07:00', '02:00')).toBe(false);
  });

  it('returns true at exact start time', () => {
    vi.setSystemTime(new Date('2026-03-18T07:00:00'));
    expect(isWithinAlcoholHours('07:00', '22:00')).toBe(true);
  });

  it('returns true at exact end time', () => {
    vi.setSystemTime(new Date('2026-03-18T22:00:00'));
    expect(isWithinAlcoholHours('07:00', '22:00')).toBe(true);
  });

  it('returns true for malformed time strings', () => {
    expect(isWithinAlcoholHours('invalid', '22:00')).toBe(true);
  });
});
