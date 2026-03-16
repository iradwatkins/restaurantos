'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
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
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { toast } from 'sonner';

const TAX_RATE = 0.0875;

interface CartItem {
  menuItemId: any;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { name: string; priceAdjustment: number }[];
  specialInstructions?: string;
  lineTotal: number;
}

export default function OnlineOrderPage() {
  const tenants = useQuery(api.tenants.queries.list, {});
  const tenantId = tenants?.[0]?._id;

  const menu = useQuery(
    api.public.queries.getMenu,
    tenantId ? { tenantId } : 'skip'
  );

  const placeOrder = useMutation(api.public.mutations.placeOrder);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ orderNumber: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!tenantId || !menu) {
    return (
      <div className="text-center py-20 text-muted-foreground">Loading menu...</div>
    );
  }

  function addToCart(item: any) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice }
            : c
        );
      }
      return [...prev, {
        menuItemId: item._id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        lineTotal: item.price,
      }];
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItemId === menuItemId
            ? { ...c, quantity: c.quantity + delta, lineTotal: (c.quantity + delta) * c.unitPrice }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  async function handlePlaceOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = new FormData(e.currentTarget);

    try {
      const result = await placeOrder({
        tenantId,
        customerName: form.get('name') as string,
        customerPhone: form.get('phone') as string,
        customerEmail: (form.get('email') as string) || undefined,
        orderType: 'pickup',
        specialInstructions: (form.get('notes') as string) || undefined,
        items: cart,
        subtotal,
        tax,
        total,
      });

      setOrderPlaced({ orderNumber: result.orderNumber });
      setCart([]);
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
        <p className="text-muted-foreground mb-8">
          Your order has been sent to the kitchen. You'll receive an SMS confirmation shortly.
        </p>
        <Button onClick={() => { setOrderPlaced(null); setShowCheckout(false); }}>
          Place Another Order
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Menu */}
      <div className="lg:col-span-2 space-y-6">
        {menu.map((category) => (
          <div key={category._id}>
            <h2 className="text-xl font-bold mb-3">{category.name}</h2>
            {category.description && (
              <p className="text-muted-foreground mb-3">{category.description}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {category.items.map((item) => (
                <Card key={item._id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {item.dietaryTags?.map((tag) => (
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
                    <Button
                      size="sm"
                      className="w-full mt-2"
                      variant="outline"
                      onClick={() => addToCart(item)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Order
                    </Button>
                  </CardContent>
                </Card>
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
      <div className="lg:sticky lg:top-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              Your Order
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
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted-foreground">${(item.unitPrice / 100).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, -1)}
                        className="h-7 w-7 rounded border flex items-center justify-center hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, 1)}
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
                    <span>Tax</span>
                    <span>${(tax / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-1">
                    <span>Total</span>
                    <span>${(total / 100).toFixed(2)}</span>
                  </div>
                </div>

                {!showCheckout ? (
                  <Button className="w-full" onClick={() => setShowCheckout(true)}>
                    Checkout — ${(total / 100).toFixed(2)}
                  </Button>
                ) : (
                  <form onSubmit={handlePlaceOrder} className="space-y-3 pt-2">
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" type="tel" required placeholder="(312) 555-0100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input id="email" name="email" type="email" placeholder="you@email.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Order Notes (optional)</Label>
                      <Input id="notes" name="notes" placeholder="Any special requests" />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Placing Order...' : `Place Order — $${(total / 100).toFixed(2)}`}
                    </Button>
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
