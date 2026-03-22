'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Separator,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@restaurantos/ui';
import {
  CreditCard,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  ExternalLink,
  Unplug,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

type PaymentProcessor = 'none' | 'stripe' | 'square';

interface PaymentsTabProps {
  tenant: any;
  tenantId: Id<'tenants'>;
}

export function PaymentsTab({ tenant, tenantId }: PaymentsTabProps) {
  const updatePaymentSettings = useMutation(api.tenants.mutations.updatePaymentSettings);

  const [processor, setProcessor] = useState<PaymentProcessor>(
    (tenant.paymentProcessor as PaymentProcessor) ?? 'none'
  );
  const [pendingProcessor, setPendingProcessor] = useState<PaymentProcessor | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState(tenant.stripeAccountId ?? '');
  const [terminalLocationId, setTerminalLocationId] = useState(
    tenant.stripeTerminalLocationId ?? ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Stripe test/reader state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [readers, setReaders] = useState<
    { id: string; label: string; status: string; deviceType: string }[]
  >([]);
  const [isLoadingReaders, setIsLoadingReaders] = useState(false);

  // Square state
  const [isConnectingSquare, setIsConnectingSquare] = useState(false);
  const [isDisconnectingSquare, setIsDisconnectingSquare] = useState(false);
  const [isTestingSquare, setIsTestingSquare] = useState(false);
  const [squareTestResult, setSquareTestResult] = useState<'success' | 'error' | null>(null);
  const [squareDevices, setSquareDevices] = useState<
    { id: string; name: string; status: string }[]
  >([]);
  const [isLoadingSquareDevices, setIsLoadingSquareDevices] = useState(false);

  // Reset test results and readers when processor changes
  useEffect(() => {
    setTestResult(null);
    setReaders([]);
    setSquareTestResult(null);
    setSquareDevices([]);
  }, [processor]);

  // Determine if Square is connected based on tenant data
  const isSquareConnected = !!(tenant.squareMerchantId && tenant.squareAccessToken);
  const squareMerchantId = tenant.squareMerchantId ?? null;
  const squareLocationId = tenant.squareLocationId ?? null;

  function handleProcessorSwitch(target: PaymentProcessor) {
    if (target === processor) return;

    // If switching away from a connected processor, show confirmation
    const currentIsConnected =
      (processor === 'stripe' && (stripeAccountId || terminalLocationId)) ||
      (processor === 'square' && isSquareConnected);

    if (currentIsConnected && target !== processor) {
      setPendingProcessor(target);
    } else {
      setProcessor(target);
    }
  }

  function confirmProcessorSwitch() {
    if (pendingProcessor !== null) {
      setProcessor(pendingProcessor);
      setPendingProcessor(null);
    }
  }

  function cancelProcessorSwitch() {
    setPendingProcessor(null);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updatePaymentSettings({
        tenantId,
        paymentProcessor: processor,
        stripeAccountId: processor === 'stripe' ? stripeAccountId || undefined : undefined,
        stripeTerminalLocationId:
          processor === 'stripe' ? terminalLocationId || undefined : undefined,
      });
      toast.success('Payment settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save payment settings');
    } finally {
      setIsSaving(false);
    }
  }

  // ==================== Stripe Handlers ====================

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/terminal/connection-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Connection test failed' }));
        throw new Error(data.error || 'Connection test failed');
      }

      const data = await res.json();
      if (data.secret) {
        setTestResult('success');
        toast.success('Stripe Terminal connection verified');
      } else {
        throw new Error('No connection token returned');
      }
    } catch (err: any) {
      setTestResult('error');
      toast.error(err.message || 'Stripe Terminal connection failed');
    } finally {
      setIsTesting(false);
    }
  }

  async function handleLoadReaders() {
    setIsLoadingReaders(true);
    try {
      const { loadStripeTerminal } = await import('@stripe/terminal-js');
      const stripeTerminal = await loadStripeTerminal();
      if (!stripeTerminal) {
        throw new Error('Failed to load Stripe Terminal SDK');
      }

      const fetchToken = async (): Promise<string> => {
        const res = await fetch('/api/terminal/connection-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch token');
        const data = await res.json();
        return data.secret;
      };

      const terminal = stripeTerminal.create({
        onFetchConnectionToken: fetchToken,
        onUnexpectedReaderDisconnect: () => {},
      });

      const result = await terminal.discoverReaders({ simulated: false });

      if ('error' in result) {
        throw new Error(result.error?.message || 'Failed to discover readers');
      }

      const discovered = result.discoveredReaders.map((r) => ({
        id: r.id,
        label: r.label ?? r.id,
        status: r.status ?? 'unknown',
        deviceType: r.device_type ?? 'unknown',
      }));

      setReaders(discovered);

      if (discovered.length === 0) {
        toast.info('No readers found. Make sure your reader is powered on and connected to the network.');
      } else {
        toast.success(`Found ${discovered.length} reader${discovered.length > 1 ? 's' : ''}`);
      }

      terminal.disconnectReader().catch(() => {});
    } catch (err: any) {
      toast.error(err.message || 'Failed to discover readers');
    } finally {
      setIsLoadingReaders(false);
    }
  }

  // ==================== Square Handlers ====================

  async function handleConnectSquare() {
    setIsConnectingSquare(true);
    try {
      const res = await fetch('/api/square/authorize', {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to start Square authorization' }));
        throw new Error(data.error || 'Failed to start Square authorization');
      }

      const { url } = await res.json();

      if (!url) {
        throw new Error('No authorization URL returned');
      }

      // Redirect to Square OAuth
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect to Square');
      setIsConnectingSquare(false);
    }
  }

  async function handleDisconnectSquare() {
    setIsDisconnectingSquare(true);
    try {
      const res = await fetch('/api/square/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to disconnect Square' }));
        throw new Error(data.error || 'Failed to disconnect Square');
      }

      toast.success('Square account disconnected');
      // Force reload to reflect disconnected state in tenant data
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect Square');
    } finally {
      setIsDisconnectingSquare(false);
    }
  }

  async function handleTestSquareConnection() {
    setIsTestingSquare(true);
    setSquareTestResult(null);

    try {
      const res = await fetch('/api/terminal/square/status?checkoutId=test-connection', {
        credentials: 'include',
      });

      if (!res.ok) {
        // For a test connection, a 400 with a specific message about the checkout ID
        // is fine — it means the API is reachable and the credentials are valid.
        // A 401/403 means credentials are invalid.
        if (res.status === 401 || res.status === 403) {
          throw new Error('Square credentials are invalid or expired. Please reconnect.');
        }
        // Any other non-200 that's not a "checkout not found" is a real error
        const data = await res.json().catch(() => ({ error: 'Connection test failed' }));
        if (data.error?.includes('not found') || data.error?.includes('invalid checkout')) {
          // This is expected — the test checkout ID doesn't exist, but the API was reachable
          setSquareTestResult('success');
          toast.success('Square Terminal connection verified');
          return;
        }
        throw new Error(data.error || 'Connection test failed');
      }

      setSquareTestResult('success');
      toast.success('Square Terminal connection verified');
    } catch (err: any) {
      setSquareTestResult('error');
      toast.error(err.message || 'Square Terminal connection failed');
    } finally {
      setIsTestingSquare(false);
    }
  }

  async function handleLoadSquareDevices() {
    setIsLoadingSquareDevices(true);
    try {
      const res = await fetch('/api/terminal/square/devices', {
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to load devices' }));
        throw new Error(data.error || 'Failed to load Square devices');
      }

      const { devices } = await res.json();

      const mapped = (devices ?? []).map((d: any) => ({
        id: d.id ?? d.device_id ?? 'unknown',
        name: d.name ?? d.id ?? 'Square Terminal',
        status: d.status ?? 'unknown',
      }));

      setSquareDevices(mapped);

      if (mapped.length === 0) {
        toast.info('No Square Terminal devices found. Make sure your device is registered and online.');
      } else {
        toast.success(`Found ${mapped.length} device${mapped.length > 1 ? 's' : ''}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to discover Square devices');
    } finally {
      setIsLoadingSquareDevices(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payment Processing</CardTitle>
          <CardDescription>
            Configure how you accept card payments at the POS terminal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Processor Selection */}
          <div className="space-y-3">
            <Label>Payment Processor</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleProcessorSwitch('none')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  processor === 'none'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <p className="font-medium text-sm">None</p>
                <p className="text-xs text-muted-foreground mt-1">Cash only</p>
              </button>
              <button
                type="button"
                onClick={() => handleProcessorSwitch('stripe')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  processor === 'stripe'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <p className="font-medium text-sm">Stripe Terminal</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Card readers</p>
              </button>
              <button
                type="button"
                onClick={() => handleProcessorSwitch('square')}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  processor === 'square'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <p className="font-medium text-sm">Square Terminal</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Square readers</p>
              </button>
            </div>
          </div>

          <Separator />

          {/* None selected */}
          {processor === 'none' && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Your POS is operating in cash-only mode. To accept card payments, select a payment
                processor above and configure your terminal settings.
              </p>
            </div>
          )}

          {/* Stripe configuration */}
          {processor === 'stripe' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-account-id">Stripe Account ID</Label>
                <Input
                  id="stripe-account-id"
                  value={stripeAccountId}
                  onChange={(e) => setStripeAccountId(e.target.value)}
                  placeholder="acct_..."
                />
                <p className="text-xs text-muted-foreground">
                  Your Stripe account identifier. Find this in your Stripe Dashboard under Settings.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terminal-location-id">Terminal Location ID</Label>
                <Input
                  id="terminal-location-id"
                  value={terminalLocationId}
                  onChange={(e) => setTerminalLocationId(e.target.value)}
                  placeholder="tml_..."
                />
                <p className="text-xs text-muted-foreground">
                  The Stripe Terminal location for this restaurant. Create one in Stripe Dashboard
                  under Terminal &gt; Locations.
                </p>
              </div>

              <Separator />

              {/* Test Connection */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : testResult === 'success' ? (
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  ) : testResult === 'error' ? (
                    <XCircle className="mr-2 h-4 w-4 text-destructive" />
                  ) : (
                    <Wifi className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
                {testResult === 'success' && (
                  <span className="text-sm text-green-600 font-medium">
                    Connection verified
                  </span>
                )}
                {testResult === 'error' && (
                  <span className="text-sm text-destructive font-medium">
                    Connection failed — check your Stripe API key in environment variables
                  </span>
                )}
              </div>

              <Separator />

              {/* Reader Discovery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Card Readers</h3>
                    <p className="text-xs text-muted-foreground">
                      Discover and view connected Stripe Terminal readers
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadReaders}
                    disabled={isLoadingReaders}
                  >
                    {isLoadingReaders ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wifi className="mr-2 h-3.5 w-3.5" />
                    )}
                    Discover Readers
                  </Button>
                </div>

                {readers.length > 0 && (
                  <div className="space-y-2">
                    {readers.map((reader) => (
                      <div
                        key={reader.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {reader.status === 'online' ? (
                            <Wifi className="h-4 w-4 text-green-600" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{reader.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {reader.deviceType} &middot; {reader.id}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={reader.status === 'online' ? 'success' : 'secondary'}
                          className="capitalize"
                        >
                          {reader.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {readers.length === 0 && !isLoadingReaders && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Click &ldquo;Discover Readers&rdquo; to find available card readers on your
                      network.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Square configuration */}
          {processor === 'square' && (
            <div className="space-y-4">
              {/* Connection status */}
              {!isSquareConnected ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your Square account to accept card payments through Square Terminal.
                      You will be redirected to Square to authorize access.
                    </p>
                  </div>
                  <Button
                    onClick={handleConnectSquare}
                    disabled={isConnectingSquare}
                  >
                    {isConnectingSquare ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-2 h-4 w-4" />
                    )}
                    Connect Square
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected merchant info */}
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <p className="font-medium text-sm text-green-700 dark:text-green-400">
                        Square account connected
                      </p>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Merchant ID:</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {squareMerchantId}
                        </code>
                      </div>
                      {squareLocationId && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Location ID:</span>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {squareLocationId}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Disconnect button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnectSquare}
                    disabled={isDisconnectingSquare}
                  >
                    {isDisconnectingSquare ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-4 w-4" />
                    )}
                    Disconnect Square
                  </Button>

                  <Separator />

                  {/* Test Connection */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleTestSquareConnection}
                      disabled={isTestingSquare}
                    >
                      {isTestingSquare ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : squareTestResult === 'success' ? (
                        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      ) : squareTestResult === 'error' ? (
                        <XCircle className="mr-2 h-4 w-4 text-destructive" />
                      ) : (
                        <Wifi className="mr-2 h-4 w-4" />
                      )}
                      Test Connection
                    </Button>
                    {squareTestResult === 'success' && (
                      <span className="text-sm text-green-600 font-medium">
                        Connection verified
                      </span>
                    )}
                    {squareTestResult === 'error' && (
                      <span className="text-sm text-destructive font-medium">
                        Connection failed — try reconnecting your Square account
                      </span>
                    )}
                  </div>

                  <Separator />

                  {/* Square Device Discovery */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">Square Terminal Devices</h3>
                        <p className="text-xs text-muted-foreground">
                          View registered Square Terminal devices for this location
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadSquareDevices}
                        disabled={isLoadingSquareDevices}
                      >
                        {isLoadingSquareDevices ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wifi className="mr-2 h-3.5 w-3.5" />
                        )}
                        Discover Devices
                      </Button>
                    </div>

                    {squareDevices.length > 0 && (
                      <div className="space-y-2">
                        {squareDevices.map((device) => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              {device.status === 'PAIRED' || device.status === 'online' ? (
                                <Wifi className="h-4 w-4 text-green-600" />
                              ) : (
                                <WifiOff className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{device.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {device.id}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                device.status === 'PAIRED' || device.status === 'online'
                                  ? 'success'
                                  : 'secondary'
                              }
                              className="capitalize"
                            >
                              {device.status.toLowerCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {squareDevices.length === 0 && !isLoadingSquareDevices && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground text-center">
                          Click &ldquo;Discover Devices&rdquo; to find registered Square Terminal
                          devices.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Payment Settings
          </Button>
        </CardContent>
      </Card>

      {/* Processor Switch Confirmation Dialog */}
      <Dialog open={pendingProcessor !== null} onOpenChange={(open) => { if (!open) cancelProcessorSwitch(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Switch Payment Processor?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Switching from{' '}
              <span className="font-medium text-foreground">
                {processor === 'stripe' ? 'Stripe Terminal' : processor === 'square' ? 'Square Terminal' : 'None'}
              </span>
              {' '}to{' '}
              <span className="font-medium text-foreground">
                {pendingProcessor === 'stripe' ? 'Stripe Terminal' : pendingProcessor === 'square' ? 'Square Terminal' : 'None (cash only)'}
              </span>
              {' '}will disconnect the current payment processor.
            </p>
            <p className="text-sm text-muted-foreground">
              Any active terminal connections will be dropped. You will need to configure the new
              processor before card payments can be accepted again.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelProcessorSwitch}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmProcessorSwitch}>
              Switch Processor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
