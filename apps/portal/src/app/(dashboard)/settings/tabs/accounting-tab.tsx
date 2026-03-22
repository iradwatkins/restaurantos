'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
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
  Switch,
  Separator,
} from '@restaurantos/ui';
import {
  Calculator,
  ExternalLink,
  Unplug,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

type AccountingProvider = 'none' | 'quickbooks' | 'xero';

interface AccountingTabProps {
  tenantId: Id<'tenants'>;
}

export function AccountingTab({ tenantId }: AccountingTabProps) {
  const accountingSettings = useQuery(
    api.accounting.queries.getSettings,
    { tenantId }
  );
  const syncHistory = useQuery(
    api.accounting.queries.getSyncHistory,
    { tenantId, limit: 10 }
  );

  const updateProvider = useMutation(api.accounting.mutations.updateProvider);
  const disconnectProvider = useMutation(api.accounting.mutations.disconnect);
  const triggerSync = useMutation(api.accounting.mutations.triggerSync);
  const toggleAutoSync = useMutation(api.accounting.mutations.toggleAutoSync);

  const [provider, setProvider] = useState<AccountingProvider>(
    (accountingSettings?.provider as AccountingProvider) ?? 'none'
  );
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Sync state from query when it loads
  const settingsLoaded = accountingSettings !== undefined;
  const [stateInitialized, setStateInitialized] = useState(false);
  if (settingsLoaded && !stateInitialized) {
    setProvider((accountingSettings?.provider as AccountingProvider) ?? 'none');
    setStateInitialized(true);
  }

  const isConnected = accountingSettings?.isConnected ?? false;
  const autoSyncEnabled = accountingSettings?.autoSyncEnabled ?? false;
  const lastSyncTime = accountingSettings?.lastSyncTime;
  const connectedOrgName = accountingSettings?.connectedOrgName;
  const connectedRealmId = accountingSettings?.connectedRealmId;

  async function handleProviderChange(newProvider: AccountingProvider) {
    setProvider(newProvider);
    if (newProvider === 'none') {
      try {
        await updateProvider({ tenantId, provider: 'none' });
        toast.success('Accounting integration disabled');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to update provider');
      }
    }
  }

  function handleConnect() {
    if (provider === 'quickbooks') {
      window.location.href = `/api/quickbooks/authorize?tenantId=${tenantId}`;
    } else if (provider === 'xero') {
      window.location.href = `/api/xero/authorize?tenantId=${tenantId}`;
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectProvider({ tenantId });
      toast.success('Accounting provider disconnected');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await triggerSync({ tenantId });
      toast.success('Sync started');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleAutoSync() {
    try {
      await toggleAutoSync({ tenantId, enabled: !autoSyncEnabled });
      toast.success(
        autoSyncEnabled ? 'Auto-sync disabled' : 'Auto-sync enabled (daily at midnight)'
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update auto-sync');
    }
  }

  function formatSyncTime(timestamp: number) {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Accounting Integration
          </CardTitle>
          <CardDescription>
            Connect your accounting software to automatically sync revenue, expenses, and tax data.
            Synced data includes daily sales summaries, tax collected, tips, and refunds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Accounting Provider</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleProviderChange('none')}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  provider === 'none'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'hover:bg-accent'
                }`}
              >
                <p className="font-medium text-sm">None</p>
                <p className="text-xs text-muted-foreground mt-1">No integration</p>
              </button>
              <button
                onClick={() => handleProviderChange('quickbooks')}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  provider === 'quickbooks'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'hover:bg-accent'
                }`}
              >
                <p className="font-medium text-sm">QuickBooks Online</p>
                <p className="text-xs text-muted-foreground mt-1">Intuit QuickBooks</p>
              </button>
              <button
                onClick={() => handleProviderChange('xero')}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  provider === 'xero'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary'
                    : 'hover:bg-accent'
                }`}
              >
                <p className="font-medium text-sm">Xero</p>
                <p className="text-xs text-muted-foreground mt-1">Xero Accounting</p>
              </button>
            </div>
          </div>

          {/* QuickBooks Section */}
          {provider === 'quickbooks' && !isConnected && (
            <>
              <Separator />
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Connect your QuickBooks Online account to automatically sync daily sales,
                  tax collected, and tip data. You&apos;ll be redirected to Intuit to authorize access.
                </p>
                <Button onClick={handleConnect}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect QuickBooks
                </Button>
              </div>
            </>
          )}

          {/* Xero Section */}
          {provider === 'xero' && !isConnected && (
            <>
              <Separator />
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Connect your Xero account to automatically sync daily sales,
                  tax collected, and tip data. You&apos;ll be redirected to Xero to authorize access.
                </p>
                <Button onClick={handleConnect}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect Xero
                </Button>
              </div>
            </>
          )}

          {/* Connected State */}
          {provider !== 'none' && isConnected && (
            <>
              <Separator />

              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">
                        {provider === 'quickbooks' ? 'QuickBooks Online' : 'Xero'} Connected
                      </p>
                      {provider === 'quickbooks' && connectedRealmId && (
                        <p className="text-xs text-muted-foreground">
                          Realm ID: {connectedRealmId}
                        </p>
                      )}
                      {provider === 'xero' && connectedOrgName && (
                        <p className="text-xs text-muted-foreground">
                          Organization: {connectedOrgName}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-3.5 w-3.5" />
                    )}
                    Disconnect
                  </Button>
                </div>

                {/* Last sync + Sync Now */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {lastSyncTime ? (
                      <span>Last synced: {formatSyncTime(lastSyncTime)}</span>
                    ) : (
                      <span>Never synced</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncNow}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>

                <Separator />

                {/* Auto-sync toggle */}
                <label className="flex items-center gap-3">
                  <Switch
                    checked={autoSyncEnabled}
                    onCheckedChange={handleToggleAutoSync}
                  />
                  <div>
                    <span className="font-medium text-sm">Auto-Sync Daily</span>
                    <p className="text-xs text-muted-foreground">
                      Automatically sync data every day at midnight (server time)
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      {provider !== 'none' && isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync History</CardTitle>
            <CardDescription>Recent synchronization activity</CardDescription>
          </CardHeader>
          <CardContent>
            {(!syncHistory || syncHistory.length === 0) ? (
              <p className="text-center text-muted-foreground py-8">
                No sync history yet. Trigger a sync above to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {syncHistory.map((entry: any) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {entry.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {entry.syncType === 'manual' ? 'Manual Sync' : 'Auto Sync'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSyncTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={entry.status === 'success' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {entry.status}
                      </Badge>
                      {entry.recordsSynced !== undefined && entry.status === 'success' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.recordsSynced} records
                        </p>
                      )}
                      {entry.errorMessage && (
                        <p className="text-xs text-destructive mt-0.5 max-w-[200px] truncate">
                          {entry.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
