'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type SquareCheckoutStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'CANCEL_REQUESTED' | 'TIMED_OUT';

interface SquareCheckoutResult {
  checkoutId: string;
  status: SquareCheckoutStatus;
}

interface UseSquareTerminalReturn {
  /** Whether a payment is currently being processed */
  isProcessing: boolean;
  /** Error message from the last operation, if any */
  error: string | null;
  /** Create a checkout on the Square Terminal and poll for completion */
  collectPayment: (params: {
    amount: number;
    orderId: string;
    deviceId?: string;
  }) => Promise<SquareCheckoutResult>;
  /** Cancel the current in-progress polling */
  cancelCollect: () => void;
}

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 120000; // 2 minutes

export function useSquareTerminal(): UseSquareTerminalReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, []);

  const collectPayment = useCallback(async (params: {
    amount: number;
    orderId: string;
    deviceId?: string;
  }): Promise<SquareCheckoutResult> => {
    setError(null);
    setIsProcessing(true);

    // Create a new abort controller for this payment flow
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Step 1: Create the checkout on Square Terminal
      const createRes = await fetch('/api/terminal/square/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: params.amount,
          orderId: params.orderId,
          deviceId: params.deviceId,
        }),
        signal: controller.signal,
      });

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({ error: 'Failed to create Square checkout' }));
        throw new Error(data.error || 'Failed to create Square checkout');
      }

      const { checkoutId } = await createRes.json();

      if (!checkoutId) {
        throw new Error('No checkout ID returned from Square');
      }

      // Step 2: Poll for status until terminal, cancelled, or timeout
      const startTime = Date.now();

      const result = await new Promise<SquareCheckoutResult>((resolve, reject) => {
        async function poll() {
          if (controller.signal.aborted) {
            reject(new Error('Payment cancelled'));
            return;
          }

          if (Date.now() - startTime > TIMEOUT_MS) {
            reject(new Error('Payment timed out. The Square Terminal did not respond within 2 minutes.'));
            return;
          }

          try {
            const statusRes = await fetch(
              `/api/terminal/square/status?checkoutId=${encodeURIComponent(checkoutId)}`,
              {
                credentials: 'include',
                signal: controller.signal,
              }
            );

            if (!statusRes.ok) {
              const data = await statusRes.json().catch(() => ({ error: 'Failed to check status' }));
              reject(new Error(data.error || 'Failed to check Square checkout status'));
              return;
            }

            const { status } = await statusRes.json() as { status: SquareCheckoutStatus };

            if (status === 'COMPLETED') {
              resolve({ checkoutId, status });
              return;
            }

            if (status === 'CANCELLED' || status === 'CANCEL_REQUESTED') {
              reject(new Error('Payment was cancelled on the Square Terminal'));
              return;
            }

            if (status === 'TIMED_OUT') {
              reject(new Error('Payment timed out on the Square Terminal'));
              return;
            }

            // Still pending or in progress — poll again
            pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
          } catch (err) {
            if (controller.signal.aborted) {
              reject(new Error('Payment cancelled'));
              return;
            }
            reject(err);
          }
        }

        poll();
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Square payment failed';
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, []);

  const cancelCollect = useCallback(() => {
    abortRef.current?.abort();
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  return {
    isProcessing,
    error,
    collectPayment,
    cancelCollect,
  };
}
