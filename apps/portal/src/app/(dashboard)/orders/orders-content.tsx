'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Plus, ShoppingBag, CreditCard, DollarSign, Send, Wine } from 'lucide-react';
import { toast } from 'sonner';

const ALCOHOL_TYPES = ['beer', 'wine', 'spirits'];

interface CartItem {
  menuItemId: any;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { name: string; priceAdjustment: number }[];
  specialInstructions?: string;
  lineTotal: number;
}

export default function OrdersPage() {
  const { tenant, tenantId } = useTenant();

  const activeOrders = useQuery(
    api.orders.queries.getActiveOrders,
    tenantId ? { tenantId } : 'skip'
  );
  const tables = useQuery(
    api.orders.queries.getTables,
    tenantId ? { tenantId } : 'skip'
  );
  const categories = useQuery(
    api.menu.queries.getCategories,
    tenantId ? { tenantId } : 'skip'
  );
  const menuItems = useQuery(
    api.menu.queries.getAvailableItems,
    tenantId ? { tenantId } : 'skip'
  );

  const TAX_RATE = tenant?.taxRate ?? 0.0875;

  const createOrder = useMutation(api.orders.mutations.create);
  const updateOrderStatus = useMutation(api.orders.mutations.updateStatus);
  const recordPayment = useMutation(api.orders.mutations.recordPayment);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState<string | null>(null);

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  function isWithinAlcoholHours(): boolean {
    if (!tenant?.alcoholSaleHoursStart || !tenant?.alcoholSaleHoursEnd) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = tenant.alcoholSaleHoursStart.split(':').map(Number);
    const [endH, endM] = tenant.alcoholSaleHoursEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes > startMinutes) {
      // Normal range (e.g., 07:00 to 22:00)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight range (e.g., 07:00 to 02:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  function addToCart(item: any) {
    const itemType = item.type ?? 'food';
    const isAlcohol = ALCOHOL_TYPES.includes(itemType);

    // Alcohol compliance checks
    if (isAlcohol) {
      if (!isWithinAlcoholHours()) {
        toast.error(
          `Alcohol sales restricted. Allowed hours: ${tenant?.alcoholSaleHoursStart ?? '07:00'} - ${tenant?.alcoholSaleHoursEnd ?? '02:00'}`
        );
        return;
      }
      if (!confirm('Has the customer been verified as 21 or older?')) {
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id
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
          lineTotal: item.price,
        },
      ];
    });
  }

  function removeFromCart(menuItemId: string) {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  async function handleSubmitOrder() {
    if (cart.length === 0) {
      toast.error('Add items to the order first');
      return;
    }

    try {
      await createOrder({
        tenantId,
        source: 'dine_in',
        tableId: selectedTable as Id<"tables"> || undefined,
        tableName: tables?.find((t) => t._id === selectedTable)?.name,
        items: cart,
        subtotal,
        tax,
        total,
      });

      toast.success('Order created and sent to kitchen');
      setCart([]);
      setSelectedTable(null);
      setShowNewOrder(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    }
  }

  async function handleSendToKitchen(orderId: any) {
    try {
      await updateOrderStatus({ orderId, status: 'sent_to_kitchen' });
      toast.success('Sent to kitchen');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleCashPayment(orderId: any, orderTotal: number) {
    try {
      await recordPayment({
        tenantId,
        orderId,
        amount: orderTotal,
        method: 'cash',
      });
      await updateOrderStatus({ orderId, status: 'completed' });
      toast.success('Cash payment recorded, order completed');
      setShowPayDialog(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filteredMenuItems = selectedCat
    ? menuItems?.filter((i) => i.categoryId === selectedCat)
    : menuItems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">{activeOrders?.length ?? 0} active orders</p>
        </div>
        <Button onClick={() => setShowNewOrder(!showNewOrder)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* New Order - POS Terminal */}
      {showNewOrder && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Menu Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Select Items</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Category filter */}
                <div className="flex gap-2 flex-wrap mb-4">
                  <Button
                    variant={selectedCat === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCat(null)}
                  >
                    All
                  </Button>
                  {categories?.map((cat) => (
                    <Button
                      key={cat._id}
                      variant={selectedCat === cat._id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCat(cat._id)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredMenuItems?.map((item) => {
                    const itemType = item.type ?? 'food';
                    const isAlcohol = ALCOHOL_TYPES.includes(itemType);
                    return (
                      <button
                        key={item._id}
                        onClick={() => addToCart(item)}
                        className={`p-3 border rounded-lg text-left hover:bg-accent transition-colors ${isAlcohol ? 'border-amber-300' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          {isAlcohol && <Wine className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ${(item.price / 100).toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart / Order Summary */}
          <div>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Order
                  </CardTitle>
                  {tables && tables.length > 0 && (
                    <select
                      className="text-sm border rounded px-2 py-1"
                      value={selectedTable ?? ''}
                      onChange={(e) => setSelectedTable(e.target.value || null)}
                    >
                      <option value="">No table</option>
                      {tables
                        .filter((t) => t.status === 'open')
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Tap items to add
                  </p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.quantity}x</span>
                          <span>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>${(item.lineTotal / 100).toFixed(2)}</span>
                          <button
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="text-destructive text-xs hover:underline"
                          >
                            Remove
                          </button>
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
                        <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                        <span>${(tax / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>${(total / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleSubmitOrder}>
                      <Send className="mr-2 h-4 w-4" />
                      Place Order
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Active Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeOrders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No active orders
                  </TableCell>
                </TableRow>
              )}
              {activeOrders?.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-mono font-bold">#{order.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {order.source.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.tableName ?? '-'}</TableCell>
                  <TableCell>{order.items.length} items</TableCell>
                  <TableCell className="font-medium">
                    ${(order.total / 100).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === 'ready'
                          ? 'success'
                          : order.status === 'preparing'
                            ? 'warning'
                            : 'secondary'
                      }
                      className="capitalize"
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={order.paymentStatus === 'paid' ? 'success' : 'destructive'}
                      className="capitalize"
                    >
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {order.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendToKitchen(order._id)}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Kitchen
                        </Button>
                      )}
                      {order.paymentStatus === 'unpaid' && (
                        <Button
                          size="sm"
                          onClick={() => setShowPayDialog(order._id)}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Pay
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!showPayDialog} onOpenChange={() => setShowPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          {showPayDialog && (() => {
            const order = activeOrders?.find((o) => o._id === showPayDialog);
            if (!order) return null;
            return (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">${(order.total / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Order #{order.orderNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="h-16"
                    variant="outline"
                    onClick={() => handleCashPayment(order._id, order.total)}
                  >
                    <DollarSign className="mr-2 h-5 w-5" />
                    Cash
                  </Button>
                  <Button
                    className="h-16"
                    onClick={() => {
                      toast.info('Card payments require Stripe Terminal setup. Configure in Settings > Online Ordering.');
                    }}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Card
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
