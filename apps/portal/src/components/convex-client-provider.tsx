'use client';

import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithAuth } from 'convex/react';
import { ReactNode, useMemo, useCallback, useState, useEffect, useRef } from 'react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';

const TOKEN_REFRESH_INTERVAL_MS = 2 * 60 * 1000;

async function fetchTokenWithRetry(maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/auth/convex-token', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        return { token: data.token ?? null, error: null };
      }
      if (response.status === 401) {
        return { token: null, error: 'Session expired' };
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  return { token: null, error: 'Exhausted retries' };
}

function useAuthFromToken() {
  const [authState, setAuthState] = useState<{ token: string | null; isLoading: boolean }>({
    token: null,
    isLoading: true,
  });
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = authState.token;
  }, [authState.token]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetch_ = async () => {
      const result = await fetchTokenWithRetry();
      if (cancelled) return;
      setAuthState({ token: result.token, isLoading: false });
    };

    fetch_();
    intervalId = setInterval(fetch_, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) {
        const result = await fetchTokenWithRetry();
        if (result.token) {
          setAuthState((c) => ({ ...c, token: result.token }));
          return result.token;
        }
        return tokenRef.current;
      }
      return authState.token;
    },
    [authState.token]
  );

  return useMemo(
    () => ({
      isLoading: authState.isLoading,
      isAuthenticated: !!authState.token,
      fetchAccessToken,
    }),
    [authState.isLoading, authState.token, fetchAccessToken]
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    if (!convexUrl) return null;
    return new ConvexReactClient(convexUrl);
  }, []);

  if (!convex) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromToken}>
      {children}
    </ConvexProviderWithAuth>
  );
}
