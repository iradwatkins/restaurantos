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
  Input,
  Label,
  Badge,
  Separator,
} from '@restaurantos/ui';
import { Clock, Check, ChefHat, Package, Search } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STEPS = [
  { key: 'sent_to_kitchen', label: 'Order Received', icon: Check },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready for Pickup', icon: Package },
  { key: 'completed', label: 'Completed', icon: Check },
] as const;

export default function OrderTrackPage() {
  const { tenantId } = useTenant();

  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupParams, setLookupParams] = useState<{
    tenantId: any;
    orderNumber: number;
    customerPhone: string;
  } | null>(null);

  const order = useQuery(
    api.public.queries.getOrderStatus,
    lookupParams ?? 'skip'
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !orderNumber || !phone) return;

    // Validate phone format (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLookupParams({
      tenantId,
      orderNumber: parseInt(orderNumber),
      customerPhone: phone,
    });
    setSearching(true);
  }

  function getStatusIndex(status: string): number {
    return STATUS_STEPS.findIndex((s) => s.key === status);
  }

  if (!tenantId) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Track Your Order</h1>
        <p className="text-muted-foreground">Enter your order number and phone to check status</p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNum">Order Number</Label>
                <Input
                  id="orderNum"
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trackPhone">Phone Number</Label>
                <Input
                  id="trackPhone"
                  type="tel"
                  placeholder="(312) 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Track Order
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Order Status */}
      {searching && order === null && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      )}

      {searching && order && 'error' in order && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {order.error === 'order_not_found'
              ? 'No order found with that number. Please check and try again.'
              : 'Phone number does not match this order. Please check the number you used when placing the order.'}
          </CardContent>
        </Card>
      )}

      {order && !('error' in order) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Order #{order.orderNumber}</CardTitle>
              <Badge
                variant={
                  order.status === 'ready' || order.status === 'completed'
                    ? 'default'
                    : 'secondary'
                }
                className="capitalize"
              >
                {order.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Steps */}
            <div className="space-y-3">
              {STATUS_STEPS.map((step, idx) => {
                const currentIdx = getStatusIndex(order.status);
                const isActive = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-sm ${
                        isActive ? 'font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && order.status !== 'completed' && (
                      <span className="text-xs text-primary animate-pulse ml-auto">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Estimated Time */}
            {order.estimatedReadyAt && order.status !== 'completed' && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Estimated ready:{' '}
                  <strong>
                    {new Date(order.estimatedReadyAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </span>
              </div>
            )}

            {order.scheduledPickupTime && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Scheduled pickup:{' '}
                  <strong>
                    {new Date(order.scheduledPickupTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </span>
              </div>
            )}

            <Separator />

            {/* Order Items */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Items</h3>
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.modifiers.map((m: any) => m.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Order Total */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${(order.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>${(order.tax / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${(order.total / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Payment</span>
                <Badge
                  variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
