'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Terminal, Reader, ISdkManagedPaymentIntent } from '@stripe/terminal-js';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

interface PaymentResult {
  paymentIntentId: string;
  status: string;
}

interface UseStripeTerminalReturn {
  /** Whether the Stripe Terminal SDK has been loaded and initialized */
  isInitialized: boolean;
  /** Current connection status to a card reader */
  connectionStatus: ConnectionStatus;
  /** Whether a payment is currently being processed */
  isProcessing: boolean;
  /** The currently connected reader, if any */
  connectedReader: Reader | null;
  /** List of discovered readers */
  readers: Reader[];
  /** Error message from the last operation, if any */
  error: string | null;
  /** Initialize the terminal SDK (call once when entering card payment flow) */
  initialize: () => Promise<void>;
  /** Discover available readers */
  discoverReaders: () => Promise<Reader[]>;
  /** Connect to a specific reader */
  connectReader: (reader: Reader) => Promise<void>;
  /** Process a card payment end-to-end: create intent -> collect -> capture */
  collectPayment: (params: {
    amount: number;
    orderId: string;
    tenantId: string;
    tipAmount?: number;
  }) => Promise<PaymentResult>;
  /** Cancel the current in-progress payment collection */
  cancelCollect: () => void;
  /** Disconnect from the current reader */
  disconnect: () => Promise<void>;
  /** Clean up the terminal instance */
  cleanup: () => void;
}

async function fetchConnectionToken(): Promise<string> {
  const res = await fetch('/api/terminal/connection-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Failed to fetch connection token' }));
    throw new Error(data.error || 'Failed to fetch connection token');
  }
  const data = await res.json();
  return data.secret;
}

export function useStripeTerminal(): UseStripeTerminalReturn {
  const terminalRef = useRef<Terminal | null>(null);
  const cancelableRef = useRef<{ cancel: () => Promise<void> } | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectedReader, setConnectedReader] = useState<Reader | null>(null);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (terminalRef.current) return;

    setError(null);

    try {
      const { loadStripeTerminal } = await import('@stripe/terminal-js');
      const stripeTerminal = await loadStripeTerminal();

      if (!stripeTerminal) {
        throw new Error('Failed to load Stripe Terminal SDK');
      }

      const terminal = stripeTerminal.create({
        onFetchConnectionToken: fetchConnectionToken,
        onUnexpectedReaderDisconnect: () => {
          setConnectionStatus('disconnected');
          setConnectedReader(null);
          setError('Reader disconnected unexpectedly. Please reconnect.');
        },
      });

      terminalRef.current = terminal;
      setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize terminal';
      setError(message);
      throw err;
    }
  }, []);

  const discoverReaders = useCallback(async (): Promise<Reader[]> => {
    const terminal = terminalRef.current;
    if (!terminal) {
      throw new Error('Terminal not initialized. Call initialize() first.');
    }

    setError(null);

    const result = await terminal.discoverReaders({ simulated: false });
    if ('error' in result) {
      const message = result.error?.message || 'Failed to discover readers';
      setError(message);
      throw new Error(message);
    }

    setReaders(result.discoveredReaders);
    return result.discoveredReaders;
  }, []);

  const connectReader = useCallback(async (reader: Reader) => {
    const terminal = terminalRef.current;
    if (!terminal) {
      throw new Error('Terminal not initialized');
    }

    setError(null);
    setConnectionStatus('connecting');

    try {
      const result = await terminal.connectReader(reader);
      if ('error' in result) {
        const message = result.error?.message || 'Failed to connect to reader';
        setConnectionStatus('disconnected');
        setError(message);
        throw new Error(message);
      }

      setConnectionStatus('connected');
      setConnectedReader(result.reader);
    } catch (err) {
      setConnectionStatus('disconnected');
      if (err instanceof Error && !error) {
        setError(err.message);
      }
      throw err;
    }
  }, [error]);

  const collectPayment = useCallback(async (params: {
    amount: number;
    orderId: string;
    tenantId: string;
    tipAmount?: number;
  }): Promise<PaymentResult> => {
    const terminal = terminalRef.current;
    if (!terminal) {
      throw new Error('Terminal not initialized');
    }

    if (connectionStatus !== 'connected') {
      throw new Error('No reader connected. Please connect a reader first.');
    }

    setError(null);
    setIsProcessing(true);

    try {
      // Step 1: Create payment intent via our API
      const totalAmount = params.amount + (params.tipAmount ?? 0);
      const piRes = await fetch('/api/terminal/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: totalAmount,
          orderId: params.orderId,
          tenantId: params.tenantId,
        }),
      });

      if (!piRes.ok) {
        const data = await piRes.json().catch(() => ({ error: 'Failed to create payment intent' }));
        throw new Error(data.error || 'Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId } = await piRes.json();

      // Step 2: Collect payment method from the reader
      const collectResult = await terminal.collectPaymentMethod(clientSecret);

      if ('error' in collectResult) {
        // If user cancelled, don't treat as an error
        if (collectResult.error?.code === 'canceled') {
          throw new Error('Payment collection cancelled');
        }
        throw new Error(collectResult.error?.message || 'Failed to collect payment method');
      }

      // Step 3: Process the payment on the reader
      const processResult = await terminal.processPayment(
        collectResult.paymentIntent as ISdkManagedPaymentIntent
      );

      if ('error' in processResult) {
        throw new Error(processResult.error?.message || 'Payment processing failed');
      }

      // Step 4: Capture the payment via our API
      const captureRes = await fetch('/api/terminal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ paymentIntentId }),
      });

      if (!captureRes.ok) {
        const data = await captureRes.json().catch(() => ({ error: 'Failed to capture payment' }));
        throw new Error(data.error || 'Failed to capture payment');
      }

      const captureData = await captureRes.json();

      return {
        paymentIntentId,
        status: captureData.status,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
      cancelableRef.current = null;
    }
  }, [connectionStatus]);

  const cancelCollect = useCallback(() => {
    const terminal = terminalRef.current;
    if (terminal) {
      terminal.cancelCollectPaymentMethod().catch(() => {
        // Ignore cancel errors — may not be actively collecting
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    try {
      await terminal.disconnectReader();
    } catch {
      // Ignore disconnect errors
    }
    setConnectionStatus('disconnected');
    setConnectedReader(null);
  }, []);

  const cleanup = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.disconnectReader().catch(() => {});
      terminalRef.current = null;
    }
    setIsInitialized(false);
    setConnectionStatus('disconnected');
    setConnectedReader(null);
    setReaders([]);
    setError(null);
    setIsProcessing(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (terminalRef.current) {
        terminalRef.current.disconnectReader().catch(() => {});
        terminalRef.current = null;
      }
    };
  }, []);

  return {
    isInitialized,
    connectionStatus,
    isProcessing,
    connectedReader,
    readers,
    error,
    initialize,
    discoverReaders,
    connectReader,
    collectPayment,
    cancelCollect,
    disconnect,
    cleanup,
  };
}
