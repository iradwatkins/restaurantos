'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import {
  Truck,
  MapPin,
  Clock,
  Phone,
  ExternalLink,
  User,
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { formatCents } from '@/lib/format';

type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  pending: { label: 'Created', variant: 'secondary' },
  assigned: { label: 'Confirmed', variant: 'warning' },
  picked_up: { label: 'Picked Up', variant: 'default' },
  delivered: { label: 'Delivered', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

function formatTime(epoch: number | undefined): string {
  if (!epoch) return '-';
  return new Date(epoch).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateTime(epoch: number | undefined): string {
  if (!epoch) return '-';
  return new Date(epoch).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function calculateDuration(start: number, end: number | undefined): string {
  if (!end) return '-';
  const diff = end - start;
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default function DeliveriesContent() {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  const activeDeliveries = useQuery(
    api.delivery.queries.getActiveDeliveries,
    tenantId ? { tenantId } : 'skip'
  );

  const deliveryHistory = useQuery(
    api.delivery.queries.getDeliveryHistory,
    tenantId && activeTab === 'history' ? { tenantId } : 'skip'
  );

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
        <p className="text-muted-foreground">
          Track DoorDash Drive deliveries for your orders
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('active')}
        >
          <Truck className="mr-1.5 h-3.5 w-3.5" />
          Active Deliveries
          {activeDeliveries && activeDeliveries.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {activeDeliveries.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('history')}
        >
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Delivery History
        </Button>
      </div>

      <Separator />

      {/* Active Deliveries Tab */}
      {activeTab === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Deliveries</CardTitle>
            <CardDescription>
              In-progress deliveries being handled by DoorDash drivers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!activeDeliveries ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeDeliveries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No active deliveries</p>
                <p className="text-sm mt-1">
                  Deliveries will appear here when a DoorDash driver is requested for an order.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeDeliveries.map((delivery: any) => {
                    const statusCfg = STATUS_CONFIG[delivery.status as DeliveryStatus] ?? STATUS_CONFIG.pending;
                    return (
                      <TableRow key={delivery._id}>
                        <TableCell>
                          <div className="font-mono font-bold text-sm">
                            #{delivery.externalId?.slice(-6) ?? '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {delivery.driverName || 'Awaiting driver'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatTime(delivery.estimatedDropoff)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {delivery.fee ? `$${formatCents(delivery.fee)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDelivery(delivery)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery History</CardTitle>
            <CardDescription>
              Past deliveries completed or cancelled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!deliveryHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : deliveryHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No delivery history</p>
                <p className="text-sm mt-1">
                  Completed and cancelled deliveries will appear here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryHistory.map((delivery: any) => {
                    const statusCfg = STATUS_CONFIG[delivery.status as DeliveryStatus] ?? STATUS_CONFIG.delivered;
                    return (
                      <TableRow key={delivery._id}>
                        <TableCell className="text-sm">
                          {formatDateTime(delivery.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono font-bold text-sm">
                            #{delivery.externalId?.slice(-6) ?? '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {delivery.fee ? `$${formatCents(delivery.fee)}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {delivery.status === 'delivered'
                            ? calculateDuration(delivery.createdAt, delivery.estimatedDropoff)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDelivery(delivery)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Detail Dialog */}
      <Dialog
        open={!!selectedDelivery}
        onOpenChange={(open) => { if (!open) setSelectedDelivery(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Details
            </DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <DeliveryDetailPanel delivery={selectedDelivery} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveryDetailPanel({ delivery }: { delivery: any }) {
  const statusCfg = STATUS_CONFIG[delivery.status as DeliveryStatus] ?? STATUS_CONFIG.pending;

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Status</span>
        <Badge variant={statusCfg.variant} className="text-sm">
          {statusCfg.label}
        </Badge>
      </div>

      <Separator />

      {/* Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Timeline</h4>
        <DeliveryTimeline status={delivery.status} createdAt={delivery.createdAt} />
      </div>

      <Separator />

      {/* Driver Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Driver</h4>
        {delivery.driverName ? (
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Driver not yet assigned
          </p>
        )}
      </div>

      <Separator />

      {/* Delivery Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Delivery Fee</span>
          <span className="font-medium">
            {delivery.fee ? `$${formatCents(delivery.fee)}` : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Est. Pickup</span>
          <span>{formatTime(delivery.estimatedPickup)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Est. Delivery</span>
          <span>{formatTime(delivery.estimatedDropoff)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Created</span>
          <span>{formatDateTime(delivery.createdAt)}</span>
        </div>
      </div>

      {/* Tracking URL */}
      {delivery.trackingUrl && (
        <>
          <Separator />
          <a
            href={delivery.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-lg border p-3 text-sm font-medium text-primary hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open Tracking Page
          </a>
        </>
      )}
    </div>
  );
}

const TIMELINE_STEPS: { status: DeliveryStatus; label: string; icon: typeof Truck }[] = [
  { status: 'pending', label: 'Created', icon: Package },
  { status: 'assigned', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'picked_up', label: 'Picked Up', icon: MapPin },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_ORDER: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'delivered'];

function DeliveryTimeline({ status, createdAt }: { status: DeliveryStatus; createdAt: number }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3">
        <XCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">Delivery Cancelled</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(createdAt)}
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, idx) => {
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = step.icon;

        return (
          <div key={step.status} className="flex gap-3">
            {/* Vertical line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                  isCompleted
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/30 bg-background text-muted-foreground/40'
                } ${isCurrent ? 'ring-2 ring-primary/20' : ''}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`w-0.5 h-6 ${
                    idx < currentIdx ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </div>
            {/* Label */}
            <div className="flex items-center h-7">
              <span
                className={`text-sm ${
                  isCompleted ? 'font-medium text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
