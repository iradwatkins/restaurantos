'use client';

import { useState } from 'react';
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
} from '@restaurantos/ui';
import { Check, Plus, Minus, CalendarDays, Users, Utensils } from 'lucide-react';
import { toast } from 'sonner';

interface CateringCartItem {
  cateringMenuItemId: any;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export default function CateringPage() {
  const { tenant, tenantId } = useTenant();

  const cateringMenu = useQuery(
    api.public.queries.getCateringMenu,
    tenantId ? { tenantId } : 'skip'
  );

  const placeCateringOrder = useMutation(api.catering.mutations.placeCateringOrder);

  const TAX_RATE = tenant?.taxRate ?? 0.0875;

  const [cart, setCart] = useState<CateringCartItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{
    orderNumber: number;
    depositRequired: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!tenant) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!tenant.features?.catering) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Catering</h1>
        <p className="text-muted-foreground">
          Catering services coming soon. Please call us at {tenant.phone || 'our number'} to discuss catering options.
        </p>
      </div>
    );
  }

  function addToCart(item: any) {
    const price = item.flatPrice ?? (item.pricePerPerson ?? 0);
    setCart((prev) => {
      const existing = prev.find((c) => c.cateringMenuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.cateringMenuItemId === item._id
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice }
            : c
        );
      }
      return [...prev, {
        cateringMenuItemId: item._id,
        name: item.name,
        quantity: item.minimumQuantity ?? 1,
        unitPrice: price,
        lineTotal: price * (item.minimumQuantity ?? 1),
      }];
    });
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.cateringMenuItemId === itemId
            ? { ...c, quantity: c.quantity + delta, lineTotal: (c.quantity + delta) * c.unitPrice }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const deposit = Math.round(total * 0.5);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Add items to your catering order');
      return;
    }
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const eventDateStr = form.get('eventDate') as string;
    const eventDate = new Date(eventDateStr).getTime();

    try {
      const result = await placeCateringOrder({
        tenantId: tenantId!,
        customerName: form.get('name') as string,
        customerPhone: form.get('phone') as string,
        customerEmail: (form.get('email') as string) || undefined,
        eventDate,
        eventTime: form.get('eventTime') as string,
        headcount: parseInt(form.get('headcount') as string),
        fulfillmentType: form.get('fulfillmentType') as 'pickup' | 'delivery',
        deliveryAddress:
          form.get('fulfillmentType') === 'delivery'
            ? {
                street: form.get('street') as string,
                city: form.get('city') as string,
                state: form.get('state') as string,
                zip: form.get('zip') as string,
              }
            : undefined,
        items: cart,
        subtotal,
        tax,
        total,
        notes: (form.get('notes') as string) || undefined,
      });

      setOrderPlaced({
        orderNumber: result.orderNumber,
        depositRequired: result.depositRequired,
      });
      setCart([]);
      toast.success('Catering inquiry submitted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  if (orderPlaced) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Catering Inquiry Submitted!</h2>
        <p className="text-4xl font-mono font-bold text-primary mb-4">
          #{orderPlaced.orderNumber}
        </p>
        <p className="text-muted-foreground mb-2">
          We&apos;ll review your order and contact you to confirm.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Estimated deposit: <strong>${(orderPlaced.depositRequired / 100).toFixed(2)}</strong> (50% of total)
        </p>
        <Button onClick={() => { setOrderPlaced(null); setShowForm(false); }}>
          Submit Another Inquiry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Catering</h1>
        <p className="text-muted-foreground">
          Let us cater your next event. Browse our catering menu and submit an inquiry.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Menu */}
        <div className="lg:col-span-2 space-y-8">
          {cateringMenu?.map((category: any) => (
            <section key={category._id}>
              <h2 className="text-xl font-bold mb-4">{category.name}</h2>
              <div className="space-y-3">
                {category.items.map((item: any) => (
                  <Card key={item._id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                          <div className="flex gap-2 mt-2 text-sm">
                            <Badge variant="secondary">{item.servingSize}</Badge>
                            {item.minimumQuantity && (
                              <Badge variant="outline">Min: {item.minimumQuantity}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold">
                            {item.flatPrice
                              ? `$${(item.flatPrice / 100).toFixed(2)}`
                              : `$${(item.pricePerPerson! / 100).toFixed(2)}/person`}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}

          {(!cateringMenu || cateringMenu.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              Catering menu coming soon. Call us to discuss options.
            </div>
          )}
        </div>

        {/* Cart + Form */}
        <div className="lg:sticky lg:top-20">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                Your Catering Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Add items from the catering menu
                </p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.cateringMenuItemId} className="flex items-center justify-between text-sm">
                      <span className="flex-1">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.cateringMenuItemId, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="h-6 w-6 rounded border flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.cateringMenuItemId, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-6 w-6 rounded border flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <span className="w-16 text-right">${(item.lineTotal / 100).toFixed(2)}</span>
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
                      <span>Tax</span>
                      <span>${(tax / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${(total / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-primary text-xs pt-1">
                      <span>Deposit (50%)</span>
                      <span>${(deposit / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {!showForm ? (
                    <Button className="w-full" onClick={() => setShowForm(true)}>
                      Continue to Details
                    </Button>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                      <Separator />
                      <div className="space-y-2">
                        <Label htmlFor="cat-name">Name</Label>
                        <Input id="cat-name" name="name" required placeholder="Your name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cat-phone">Phone</Label>
                        <Input id="cat-phone" name="phone" type="tel" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cat-email">Email</Label>
                        <Input id="cat-email" name="email" type="email" />
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="eventDate">
                            <CalendarDays className="inline h-3 w-3 mr-1" />
                            Event Date
                          </Label>
                          <Input id="eventDate" name="eventDate" type="date" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eventTime">Time</Label>
                          <Input id="eventTime" name="eventTime" type="time" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="headcount">
                          <Users className="inline h-3 w-3 mr-1" />
                          Headcount
                        </Label>
                        <Input id="headcount" name="headcount" type="number" min="1" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Fulfillment</Label>
                        <select
                          name="fulfillmentType"
                          defaultValue="pickup"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="pickup">Pickup</option>
                          <option value="delivery">Delivery</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cat-notes">Notes</Label>
                        <Input id="cat-notes" name="notes" placeholder="Allergies, special requests..." />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Catering Inquiry'}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
