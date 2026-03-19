'use client';

import { Button } from '@restaurantos/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold">Failed to load Kitchen Display</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <Button onClick={reset} size="sm">Try again</Button>
      </div>
    </div>
  );
}
