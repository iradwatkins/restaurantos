'use client';

import { useState } from 'react';
import {
  Switch,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@restaurantos/ui';
import { toast } from 'sonner';

interface DeliveryToggleProps {
  tenantId: string;
  currentMode: string;
}

export function DeliveryToggle({ tenantId, currentMode }: DeliveryToggleProps) {
  const [mode, setMode] = useState(currentMode);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingMode, setPendingMode] = useState<string | null>(null);

  function handleToggle(checked: boolean) {
    const newMode = checked ? 'direct_api' : 'kitchenhub';
    setPendingMode(newMode);
    setShowConfirm(true);
  }

  async function confirmSwitch() {
    if (!pendingMode) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/delivery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: pendingMode }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to switch delivery mode');
        return;
      }

      setMode(pendingMode);
      toast.success(`Switched to ${pendingMode === 'kitchenhub' ? 'KitchenHub' : 'Direct API'} mode`);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setPendingMode(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={mode === 'kitchenhub' ? 'default' : 'secondary'}>
              {mode === 'kitchenhub' ? 'KitchenHub' : 'Direct API'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === 'kitchenhub'
              ? 'Orders routed through KitchenHub middleware'
              : 'Direct platform API connections active'}
          </p>
        </div>
        <Switch checked={mode === 'direct_api'} onCheckedChange={handleToggle} />
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Delivery Mode</DialogTitle>
            <DialogDescription>
              You are about to switch from{' '}
              <strong>{mode === 'kitchenhub' ? 'KitchenHub' : 'Direct API'}</strong> to{' '}
              <strong>{pendingMode === 'kitchenhub' ? 'KitchenHub' : 'Direct API'}</strong> mode.
              This will change how delivery orders are routed for this tenant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={confirmSwitch} disabled={loading}>
              {loading ? 'Switching...' : 'Confirm Switch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
