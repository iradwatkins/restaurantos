'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
} from '@restaurantos/ui';
import {
  Truck,
  MapPin,
  Phone,
  ExternalLink,
  User,
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';

type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  pending: { label: 'Created', variant: 'secondary' },
  assigned: { label: 'Confirmed', variant: 'warning' },
  picked_up: { label: 'Picked Up', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const TIMELINE_STEPS: { status: DeliveryStatus; label: string; icon: typeof Truck }[] = [
  { status: 'pending', label: 'Created', icon: Package },
  { status: 'assigned', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'picked_up', label: 'Picked Up', icon: MapPin },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_ORDER: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'delivered'];

function formatTime(epoch: number | string | undefined): string {
  if (!epoch) return '-';
  const d = typeof epoch === 'string' ? new Date(epoch) : new Date(epoch);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface DeliveryPanelProps {
  orderId: Id<'orders'>;
  tenantId: Id<'tenants'>;
  order: any;
  doordashEnabled: boolean;
}

export function DeliveryPanel({ orderId, tenantId, order, doordashEnabled }: DeliveryPanelProps) {
  const tenant = useQuery(
    api.tenants.queries.getById,
    { id: tenantId }
  );

  const delivery = useQuery(
    api.delivery.queries.getByOrderId,
    { orderId }
  );

  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<{
    fee: number;
    estimatedPickup: string;
    estimatedDropoff: string;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  // Only show for delivery orders when DoorDash is enabled
  if (order.orderType !== 'delivery' || !doordashEnabled) {
    return null;
  }

  // If a delivery already exists, show the status tracker
  if (delivery) {
    return <DeliveryStatusTracker delivery={delivery} />;
  }

  // Build pickup address from restaurant's address
  const pickupAddress = tenant?.address
    ? {
        street: tenant.address.street,
        city: tenant.address.city,
        state: tenant.address.state,
        zip: tenant.address.zip,
      }
    : null;

  // Build dropoff address from order's delivery address
  const dropoffAddress = order.deliveryAddress;

  async function handleQuote() {
    if (!pickupAddress || !dropoffAddress) {
      toast.error('Restaurant address or delivery address is missing');
      return;
    }
    setQuoting(true);
    setQuote(null);
    try {
      const res = await fetch('/api/delivery/doordash/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupAddress,
          dropoffAddress,
          orderValue: order.total,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get delivery quote');
      }
      const data = await res.json();
      setQuote({
        fee: data.estimatedFee,
        estimatedPickup: data.estimatedPickupTime,
        estimatedDropoff: data.estimatedDropoffTime,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to get delivery quote');
    } finally {
      setQuoting(false);
    }
  }

  async function handleConfirmDelivery() {
    if (!quote || !pickupAddress || !dropoffAddress) return;
    setCreating(true);
    try {
      const res = await fetch('/api/delivery/doordash/create-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          pickupAddress,
          dropoffAddress,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create delivery');
      }

      // Server-side API route already calls createDeliveryRequest mutation
      toast.success('DoorDash delivery created');
      setQuote(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create delivery');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Truck className="h-4 w-4 text-orange-500" />
          DoorDash Delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!quote ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleQuote}
            disabled={quoting}
          >
            {quoting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting quote...
              </>
            ) : (
              <>
                <Truck className="mr-2 h-4 w-4" />
                Request DoorDash Driver
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Delivery Fee
                </span>
                <span className="font-bold">${formatCents(quote.fee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Est. Pickup
                </span>
                <span>{formatTime(quote.estimatedPickup)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Est. Delivery
                </span>
                <span>{formatTime(quote.estimatedDropoff)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleConfirmDelivery}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Confirm Delivery'
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setQuote(null)}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeliveryStatusTracker({ delivery }: { delivery: any }) {
  const statusCfg = STATUS_CONFIG[delivery.status as DeliveryStatus] ?? STATUS_CONFIG.pending;
  const currentIdx = STATUS_ORDER.indexOf(delivery.status as DeliveryStatus);

  if (delivery.status === 'cancelled') {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <span className="font-medium text-sm">Delivery Cancelled</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-orange-500" />
            DoorDash Delivery
          </CardTitle>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Timeline */}
        <div className="flex items-center gap-1">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentIdx;
            return (
              <div key={step.status} className="flex items-center flex-1">
                <div
                  className={`h-1.5 flex-1 rounded-full ${
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          {TIMELINE_STEPS.map((step) => (
            <span key={step.status}>{step.label}</span>
          ))}
        </div>

        {/* Driver Info */}
        {delivery.driverName && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{delivery.driverName}</span>
              </div>
              {delivery.driverPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${delivery.driverPhone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {delivery.driverPhone}
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        {/* ETA + Fee */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            ETA: {formatTime(delivery.estimatedDropoff)}
          </span>
          <span>
            Fee: {delivery.fee ? `$${formatCents(delivery.fee)}` : '-'}
          </span>
        </div>

        {/* Tracking Link */}
        {delivery.trackingUrl && (
          <a
            href={delivery.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full rounded-md border p-2 text-xs font-medium text-primary hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Track Delivery
          </a>
        )}
      </CardContent>
    </Card>
  );
}
