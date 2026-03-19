import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSession } from './use-session';

describe('useSession', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in loading state', () => {
    (fetch as any).mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSession());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('returns user when session fetch succeeds', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      tenantId: 'tenant1',
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: mockUser }),
    });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('returns null user when fetch returns non-ok', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('returns null user when fetch throws', async () => {
    (fetch as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('returns null user when response has no user', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useSession());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('fetches from /api/auth/session', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderHook(() => useSession());

    expect(fetch).toHaveBeenCalledWith('/api/auth/session');
  });
});
