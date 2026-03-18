import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveStorageUrl } from './storage';

describe('resolveStorageUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns null for null input', () => {
    expect(resolveStorageUrl(null)).toBeNull();
  });

  it('returns absolute URLs unchanged', () => {
    const url = 'https://example.com/image.png';
    expect(resolveStorageUrl(url)).toBe(url);
  });

  it('returns http URLs unchanged', () => {
    const url = 'http://localhost:3214/api/storage/abc123';
    expect(resolveStorageUrl(url)).toBe(url);
  });

  it('prepends CONVEX_CLOUD_URL to relative paths', () => {
    process.env.CONVEX_CLOUD_URL = 'http://72.60.28.175:3214';
    expect(resolveStorageUrl('/api/storage/abc123')).toBe(
      'http://72.60.28.175:3214/api/storage/abc123'
    );
  });

  it('falls back to CONVEX_URL if CONVEX_CLOUD_URL not set', () => {
    delete process.env.CONVEX_CLOUD_URL;
    process.env.CONVEX_URL = 'http://localhost:3214';
    expect(resolveStorageUrl('/api/storage/abc123')).toBe(
      'http://localhost:3214/api/storage/abc123'
    );
  });

  it('returns relative path as-is if no env vars set', () => {
    delete process.env.CONVEX_CLOUD_URL;
    delete process.env.CONVEX_URL;
    expect(resolveStorageUrl('/api/storage/abc123')).toBe('/api/storage/abc123');
  });
});
