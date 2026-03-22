'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@restaurantos/ui';
import { ShoppingCart, Plus, Minus, Check, Star, Clock, Wine, MapPin, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface CartItem {
  menuItemId: any;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { name: string; priceAdjustment: number }[];
  specialInstructions?: string;
  lineTotal: number;
}

type OrderType = 'pickup' | 'delivery';

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface DeliveryValidation {
  valid: boolean;
  fee?: number;
  zoneName?: string;
  error?: string;
}

export default function OnlineOrderPage() {
  const { tenant, tenantId } = useTenant();

  const TAX_RATE = tenant?.taxRate ?? 0.0875;

  const menuData = useQuery(
    api.public.queries.getMenu,
    tenantId ? { tenantId } : 'skip'
  );

  const deliverySettings = useQuery(
    api.public.queries.getDeliverySettings,
    tenantId ? { tenantId } : 'skip'
  );

  const placeOrder = useMutation(api.public.mutations.placeOrder);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryValidation, setDeliveryValidation] = useState<DeliveryValidation | null>(null);
  const [validatingZip, setValidatingZip] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{
    orderNumber: number;
    orderId: string;
    estimatedReadyAt?: number;
    orderType: OrderType;
    deliveryAddress?: DeliveryAddress;
    deliveryFee?: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [, setPaymentIntentId] = useState<string | null>(null);

  // Validate delivery zip code when it changes
  const zipValidationQuery = useQuery(
    api.public.queries.validateDeliveryZip,
    tenantId && orderType === 'delivery' && deliveryAddress.zip.length === 5
      ? { tenantId, zipCode: deliveryAddress.zip }
      : 'skip'
  );

  useEffect(() => {
    if (zipValidationQuery !== undefined && deliveryAddress.zip.length === 5) {
      setDeliveryValidation(zipValidationQuery as DeliveryValidation);
      setValidatingZip(false);
    }
  }, [zipValidationQuery, deliveryAddress.zip]);

  if (!tenantId || !menuData) {
    return (
      <div role="status" aria-live="polite" className="text-center py-20 text-muted-foreground">Loading menu...</div>
    );
  }

  const menu = menuData.categories;
  const hasAlcoholItems = menuData.hasAlcoholItems;
  const deliveryAvailable = deliverySettings?.deliveryEnabled ?? false;

  const onlineSettings = tenant?.onlineOrderingSettings;
  const pickupSlot = onlineSettings?.pickupTimeSlotMinutes ?? 15;

  // Delivery fee from validation result
  const deliveryFee = orderType === 'delivery' && deliveryValidation?.valid
    ? (deliveryValidation.fee ?? 0)
    : 0;

  function generateTimeSlots(): string[] {
    const slots: string[] = [];
    const now = new Date();
    const prepMin = onlineSettings?.defaultPrepTimeMinutes ?? 20;
    const startMin = now.getHours() * 60 + now.getMinutes() + prepMin;
    const firstSlot = Math.ceil(startMin / pickupSlot) * pickupSlot;

    for (let m = firstSlot; m < 22 * 60; m += pickupSlot) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      slots.push(`${displayH}:${min.toString().padStart(2, '0')} ${period}`);
    }
    return slots.slice(0, 20);
  }

  function addToCart(item: any) {
    setCart((prev) => {
      const existing = prev.find(
        (c) =>
          c.menuItemId === item._id &&
          JSON.stringify(c.modifiers) === JSON.stringify(undefined)
      );
      if (existing && !item._hasModifiers) {
        return prev.map((c) =>
          c.menuItemId === item._id && !c.modifiers
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice }
            : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          quantity: 1,
          unitPrice: item.price,
          modifiers: item._selectedModifiers,
          lineTotal: item.price + (item._modifierTotal ?? 0),
        },
      ];
    });
  }

  function addToCartWithModifiers(
    item: any,
    modifiers: { name: string; priceAdjustment: number }[]
  ) {
    const modifierTotal = modifiers.reduce((sum, m) => sum + m.priceAdjustment, 0);
    const lineTotal = item.price + modifierTotal;
    setCart((prev) => [
      ...prev,
      {
        menuItemId: item._id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        modifiers,
        lineTotal,
      },
    ]);
  }

  function updateQuantity(index: number, delta: number) {
    setCart((prev) =>
      prev
        .map((c, i) => {
          if (i !== index) return c;
          const newQty = c.quantity + delta;
          const modTotal = c.modifiers?.reduce((s, m) => s + m.priceAdjustment, 0) ?? 0;
          return {
            ...c,
            quantity: newQty,
            lineTotal: newQty * (c.unitPrice + modTotal),
          };
        })
        .filter((c) => c.quantity > 0)
    );
  }

  function handleZipChange(value: string) {
    const cleaned = value.replace(/\D/g, '').slice(0, 5);
    setDeliveryAddress((prev) => ({ ...prev, zip: cleaned }));
    if (cleaned.length < 5) {
      setDeliveryValidation(null);
    } else {
      setValidatingZip(true);
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax + deliveryFee;
  const taxDisplay = `${(TAX_RATE * 100).toFixed(2)}%`;

  async function initiatePayment() {
    if (!stripePromise) {
      await submitOrder(undefined);
      return;
    }

    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          currency: 'usd',
          metadata: { tenantId, source: 'online_ordering' },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Payment setup failed');
        return;
      }

      const { clientSecret: cs, paymentIntentId: pi } = await res.json();
      setClientSecret(cs);
      setPaymentIntentId(pi);
    } catch {
      toast.error('Failed to initialize payment');
    }
  }

  async function submitOrder(stripePaymentIntentId: string | undefined) {
    setSubmitting(true);

    const customerName = (document.getElementById('name') as HTMLInputElement)?.value?.trim();
    const customerPhone = (document.getElementById('phone') as HTMLInputElement)?.value?.trim();

    if (!customerName) {
      toast.error('Please enter your name');
      setSubmitting(false);
      return;
    }

    const phoneDigits = customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      setSubmitting(false);
      return;
    }

    // Enforce minimum order amount
    const minimumCents = onlineSettings?.minimumOrderCents ?? 0;
    if (minimumCents > 0 && subtotal < minimumCents) {
      toast.error(`Minimum order amount is $${(minimumCents / 100).toFixed(2)}`);
      setSubmitting(false);
      return;
    }

    // Validate delivery address if delivery order
    if (orderType === 'delivery') {
      if (!deliveryAddress.street.trim()) {
        toast.error('Please enter a delivery street address');
        setSubmitting(false);
        return;
      }
      if (!deliveryAddress.city.trim()) {
        toast.error('Please enter a city');
        setSubmitting(false);
        return;
      }
      if (!deliveryAddress.state.trim()) {
        toast.error('Please enter a state');
        setSubmitting(false);
        return;
      }
      if (deliveryAddress.zip.length !== 5) {
        toast.error('Please enter a valid 5-digit zip code');
        setSubmitting(false);
        return;
      }
      if (!deliveryValidation?.valid) {
        toast.error(deliveryValidation?.error || 'Delivery address is not in our delivery area');
        setSubmitting(false);
        return;
      }
      // Check delivery minimum
      const delMinimum = deliverySettings?.deliveryMinimum ?? 0;
      if (delMinimum > 0 && subtotal < delMinimum) {
        toast.error(`Minimum order for delivery is $${(delMinimum / 100).toFixed(2)}`);
        setSubmitting(false);
        return;
      }
    }

    // Parse scheduled time
    let scheduledPickupTime: number | undefined;
    if (scheduledTime) {
      const today = new Date();
      const parts = scheduledTime.split(' ');
      const timePart = parts[0] ?? '0:0';
      const period = parts[1];
      const timeParts = timePart.split(':').map(Number);
      let h = timeParts[0] ?? 0;
      const m = timeParts[1] ?? 0;
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      today.setHours(h, m, 0, 0);
      scheduledPickupTime = today.getTime();

      if (scheduledPickupTime < Date.now()) {
        toast.error('Scheduled time must be in the future');
        setSubmitting(false);
        return;
      }
    }

    try {
      const result = await placeOrder({
        tenantId: tenantId!,
        customerName,
        customerPhone,
        customerEmail:
          (document.getElementById('email') as HTMLInputElement)?.value?.trim() || undefined,
        orderType,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
        deliveryInstructions: orderType === 'delivery' && deliveryInstructions.trim()
          ? deliveryInstructions.trim()
          : undefined,
        specialInstructions:
          (document.getElementById('notes') as HTMLInputElement).value || undefined,
        scheduledPickupTime,
        items: cart,
        subtotal,
        tax,
        total,
        stripePaymentIntentId,
      });

      setOrderPlaced({
        orderNumber: result.orderNumber,
        orderId: result.orderId as string,
        estimatedReadyAt: result.estimatedReadyAt,
        orderType,
        deliveryAddress: orderType === 'delivery' ? { ...deliveryAddress } : undefined,
        deliveryFee: orderType === 'delivery' ? deliveryFee : undefined,
      });
      setCart([]);
      setClientSecret(null);
      setPaymentIntentId(null);
      toast.success('Order placed!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  // Order confirmation
  if (orderPlaced) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
        <p className="text-4xl font-mono font-bold text-primary mb-4">
          #{orderPlaced.orderNumber}
        </p>
        {orderPlaced.estimatedReadyAt && (
          <p className="text-lg mb-2">
            <Clock className="inline h-4 w-4 mr-1" />
            Estimated {orderPlaced.orderType === 'delivery' ? 'delivery' : 'ready'}:{' '}
            {new Date(orderPlaced.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <p className="text-muted-foreground mb-2">
          {orderPlaced.orderType === 'delivery'
            ? 'Your order has been sent to the kitchen and will be delivered.'
            : 'Your order has been sent to the kitchen.'}
        </p>
        {orderPlaced.orderType === 'delivery' && orderPlaced.deliveryAddress && (
          <div className="bg-muted rounded-lg p-4 text-left text-sm mb-4">
            <p className="font-medium flex items-center gap-1.5 mb-1">
              <MapPin className="h-3.5 w-3.5" /> Delivery Address
            </p>
            <p>{orderPlaced.deliveryAddress.street}</p>
            <p>
              {orderPlaced.deliveryAddress.city}, {orderPlaced.deliveryAddress.state}{' '}
              {orderPlaced.deliveryAddress.zip}
            </p>
            {orderPlaced.deliveryFee !== undefined && orderPlaced.deliveryFee > 0 && (
              <p className="mt-2 text-muted-foreground">
                Delivery fee: ${(orderPlaced.deliveryFee / 100).toFixed(2)}
              </p>
            )}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = `/order/track?order=${orderPlaced.orderNumber}`;
            }}
          >
            Track Order
          </Button>
          <Button
            onClick={() => {
              setOrderPlaced(null);
              setShowCheckout(false);
            }}
          >
            New Order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Menu */}
      <div className="lg:col-span-2 space-y-6">
        {/* Order Type Selector */}
        {deliveryAvailable && (
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => {
                setOrderType('pickup');
                setDeliveryValidation(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                orderType === 'pickup'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              Pickup
            </button>
            <button
              onClick={() => setOrderType('delivery')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                orderType === 'delivery'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Truck className="h-4 w-4" />
              Delivery
            </button>
          </div>
        )}

        {/* Delivery Address Form */}
        {orderType === 'delivery' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="del-street">Street Address</Label>
                <Input
                  id="del-street"
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, street: e.target.value }))}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="del-city">City</Label>
                  <Input
                    id="del-city"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Chicago"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="del-state">State</Label>
                  <Input
                    id="del-state"
                    value={deliveryAddress.state}
                    onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, state: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="IL"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="del-zip">Zip Code</Label>
                  <Input
                    id="del-zip"
                    value={deliveryAddress.zip}
                    onChange={(e) => handleZipChange(e.target.value)}
                    placeholder="60601"
                    maxLength={5}
                  />
                </div>
              </div>

              {/* Zip validation feedback */}
              {validatingZip && deliveryAddress.zip.length === 5 && (
                <p className="text-sm text-muted-foreground">Checking delivery area...</p>
              )}
              {deliveryValidation && !validatingZip && deliveryAddress.zip.length === 5 && (
                deliveryValidation.valid ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {deliveryValidation.zoneName}
                      {deliveryValidation.fee !== undefined && deliveryValidation.fee > 0
                        ? ` — $${(deliveryValidation.fee / 100).toFixed(2)} delivery fee`
                        : ' — Free delivery'}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {deliveryValidation.error}
                  </div>
                )
              )}

              <div className="space-y-2">
                <Label htmlFor="del-instructions">Delivery Instructions (optional)</Label>
                <Input
                  id="del-instructions"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Gate code, apartment number, etc."
                />
              </div>

              {deliverySettings && deliverySettings.deliveryMinimum > 0 && (
                <p className="text-xs text-muted-foreground">
                  Minimum order for delivery: ${(deliverySettings.deliveryMinimum / 100).toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {hasAlcoholItems && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
            <Wine className="h-4 w-4 flex-shrink-0" />
            <span>Beer, wine &amp; spirits are available for dine-in only and cannot be ordered online.</span>
          </div>
        )}
        {menu.map((category) => (
          <div key={category._id}>
            <h2 className="text-xl font-bold mb-3">{category.name}</h2>
            {category.description && (
              <p className="text-muted-foreground mb-3">{category.description}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {category.items.map((item: any) => (
                <MenuItemCard
                  key={item._id}
                  item={item}
                  tenantId={tenantId}
                  onAdd={addToCart}
                  onAddWithModifiers={(item, mods) => {
                    addToCartWithModifiers(item, mods);
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {menu.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            Menu is being prepared. Check back soon!
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <div className="lg:sticky lg:top-6 space-y-4" aria-live="polite">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart aria-hidden="true" className="h-4 w-4" />
              Your Order
              {orderType === 'delivery' && (
                <Badge variant="secondary" className="text-xs">
                  <Truck className="h-3 w-3 mr-1" />
                  Delivery
                </Badge>
              )}
              {cart.length > 0 && (
                <Badge variant="default" className="ml-auto">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Browse the menu and add items
              </p>
            ) : (
              <>
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.name}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.modifiers.map((m) => m.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="w-16 text-right font-medium">
                        ${(item.lineTotal / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({taxDisplay})</span>
                    <span>${(tax / 100).toFixed(2)}</span>
                  </div>
                  {orderType === 'delivery' && deliveryFee > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Delivery Fee</span>
                      <span>${(deliveryFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {orderType === 'delivery' && deliveryFee === 0 && deliveryValidation?.valid && (
                    <div className="flex justify-between text-green-600">
                      <span>Delivery Fee</span>
                      <span>Free</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1">
                    <span>Total</span>
                    <span>${(total / 100).toFixed(2)}</span>
                  </div>
                </div>

                {!showCheckout ? (
                  <Button
                    className="w-full"
                    onClick={() => setShowCheckout(true)}
                    disabled={
                      orderType === 'delivery' &&
                      (!deliveryValidation?.valid || !deliveryAddress.street.trim())
                    }
                  >
                    Checkout — ${(total / 100).toFixed(2)}
                  </Button>
                ) : clientSecret && stripePromise ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripeCheckoutForm
                      onSuccess={(piId) => submitOrder(piId)}
                      submitting={submitting}
                      total={total}
                    />
                  </Elements>
                ) : (
                  <form
                    className="space-y-3 pt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (stripePromise) {
                        initiatePayment();
                      } else {
                        submitOrder(undefined);
                      }
                    }}
                  >
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        placeholder="(312) 555-0100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@email.com"
                      />
                    </div>

                    {/* Scheduled time */}
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">
                        <Clock aria-hidden="true" className="inline h-3 w-3 mr-1" />
                        {orderType === 'delivery' ? 'Delivery Time' : 'Pickup Time'}
                      </Label>
                      <select
                        id="scheduledTime"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">ASAP</option>
                        {generateTimeSlots().map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Order Notes (optional)</Label>
                      <Input
                        id="notes"
                        name="notes"
                        placeholder="Any special requests"
                      />
                    </div>

                    {stripePromise ? (
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={submitting}
                      >
                        {submitting
                          ? 'Processing...'
                          : `Pay $${(total / 100).toFixed(2)}`}
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={submitting}
                      >
                        {submitting
                          ? 'Placing Order...'
                          : `Place Order — $${(total / 100).toFixed(2)}`}
                      </Button>
                    )}
                  </form>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== Menu Item Card with Modifier Support ====================

function MenuItemCard({
  item,
  tenantId,
  onAdd,
  onAddWithModifiers,
}: {
  item: any;
  tenantId: any;
  onAdd: (item: any) => void;
  onAddWithModifiers: (item: any, modifiers: { name: string; priceAdjustment: number }[]) => void;
}) {
  const modifierGroups = useQuery(api.public.queries.getModifiersForItem, {
    tenantId,
    menuItemId: item._id,
  });
  const [showModifiers, setShowModifiers] = useState(false);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const hasModifiers = modifierGroups && modifierGroups.length > 0;

  function handleAdd() {
    if (hasModifiers) {
      setSelections({});
      setShowModifiers(true);
    } else {
      onAdd(item);
    }
  }

  function handleConfirmModifiers() {
    for (const group of modifierGroups!) {
      const selected = selections[group._id] ?? [];
      if (selected.length < group.minSelections) {
        toast.error(`Please select at least ${group.minSelections} option(s) for ${group.name}`);
        return;
      }
    }

    const mods: { name: string; priceAdjustment: number }[] = [];
    for (const group of modifierGroups!) {
      const selected = selections[group._id] ?? [];
      for (const opt of group.options) {
        if (selected.includes(opt._id)) {
          mods.push({ name: opt.name, priceAdjustment: opt.priceAdjustment });
        }
      }
    }

    onAddWithModifiers(item, mods);
    setShowModifiers(false);
  }

  function toggleOption(groupId: string, optionId: string, maxSelections: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (maxSelections === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (current.length >= maxSelections) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  return (
    <>
      <Card className="overflow-hidden">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.name} className="h-32 w-full object-cover" />
        )}
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{item.name}</h3>
                {item.isSpecial && (
                  <Badge className="text-[10px] bg-yellow-500">
                    <Star className="h-2 w-2 mr-0.5" /> Special
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.dietaryTags?.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right ml-3">
              <p className="font-bold">${(item.price / 100).toFixed(2)}</p>
            </div>
          </div>
          <Button size="sm" className="w-full mt-2" variant="outline" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {hasModifiers ? 'Customize & Add' : 'Add to Order'}
          </Button>
        </CardContent>
      </Card>

      {/* Modifier Selection Dialog */}
      {hasModifiers && (
        <Dialog open={showModifiers} onOpenChange={setShowModifiers}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize {item.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {modifierGroups!.map((group: any) => (
                <div key={group._id} className="space-y-2">
                  <div>
                    <h4 className="font-semibold text-sm">{group.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {group.minSelections > 0 ? 'Required' : 'Optional'}
                      {' · '}
                      {group.maxSelections === 1
                        ? 'Choose one'
                        : `Choose up to ${group.maxSelections}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {group.options.map((opt: any) => {
                      const isSelected = (selections[group._id] ?? []).includes(opt._id);
                      return (
                        <button
                          key={opt._id}
                          aria-pressed={isSelected}
                          onClick={() =>
                            toggleOption(group._id, opt._id, group.maxSelections)
                          }
                          className={`w-full flex items-center justify-between p-2 rounded-md border text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-input hover:bg-accent'
                          }`}
                        >
                          <span>{opt.name}</span>
                          <span className="text-muted-foreground">
                            {opt.priceAdjustment > 0
                              ? `+$${(opt.priceAdjustment / 100).toFixed(2)}`
                              : 'Free'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleConfirmModifiers}>
                Add to Order — $
                {(
                  (item.price +
                    Object.entries(selections).reduce((sum, [groupId, optIds]) => {
                      const group = modifierGroups!.find((g: any) => g._id === groupId);
                      return (
                        sum +
                        (group?.options ?? [])
                          .filter((o: any) => optIds.includes(o._id))
                          .reduce((s: number, o: any) => s + o.priceAdjustment, 0)
                      );
                    }, 0)) /
                  100
                ).toFixed(2)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ==================== Stripe Checkout Form ====================

function StripeCheckoutForm({
  onSuccess,
  submitting,
  total,
}: {
  onSuccess: (paymentIntentId: string) => void;
  submitting: boolean;
  total: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <Separator />
      <PaymentElement />
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || processing || submitting}
      >
        {processing ? 'Processing...' : `Pay $${(total / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}
