'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@restaurantos/ui';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function SquareCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const success = searchParams.get('success');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error || 'Square authorization failed');
    } else if (success === 'true') {
      setStatus('success');
    } else {
      // The server-side callback at /api/square/callback handles the OAuth exchange.
      // If we land here without success or error params, treat it as an error.
      setStatus('error');
      setErrorMessage('Unexpected callback state. Please try connecting again from Settings.');
    }
  }, [searchParams]);

  // Auto-redirect to settings payments tab after 3 seconds on success
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        router.push('/settings?tab=payments');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  // Also redirect on error after 5 seconds
  useEffect(() => {
    if (status === 'error') {
      const timer = setTimeout(() => {
        router.push('/settings?tab=payments');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="font-medium text-lg">Connecting to Square...</p>
              <p className="text-sm text-muted-foreground text-center">
                Completing authorization with your Square account.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="font-medium text-lg text-green-700 dark:text-green-400">
                Square Connected Successfully
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Your Square account has been linked. You can now accept card payments through
                Square Terminal.
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting to Payment Settings...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-medium text-lg text-destructive">
                Connection Failed
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {errorMessage}
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting to Payment Settings...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
