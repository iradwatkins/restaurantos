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
  CardDescription,
  Input,
  Label,
  Badge,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { Plus, Pencil, Trash2, CalendarDays, DollarSign, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import type { Doc, Id } from '@restaurantos/backend/dataModel';
import type { BadgeProps } from '@restaurantos/ui';

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const STATUS_COLORS: Record<string, BadgeVariant> = {
  inquiry: 'secondary',
  confirmed: 'default',
  deposit_paid: 'default',
  preparing: 'warning',
  ready: 'success',
  completed: 'success',
  cancelled: 'destructive',
};

export default function CateringManagementPage() {
  const { tenant, tenantId } = useTenant();

  const categories = useQuery(
    api.catering.queries.getCategories,
    tenantId ? { tenantId } : 'skip'
  );
  const items = useQuery(
    api.catering.queries.getItems,
    tenantId ? { tenantId } : 'skip'
  );
  const orders = useQuery(
    api.catering.queries.getOrders,
    tenantId ? { tenantId } : 'skip'
  );
  const upcomingEvents = useQuery(
    api.catering.queries.getUpcomingEvents,
    tenantId ? { tenantId } : 'skip'
  );

  const createCategory = useMutation(api.catering.mutations.createCategory);
  const createItem = useMutation(api.catering.mutations.createItem);
  const updateItem = useMutation(api.catering.mutations.updateItem);
  const deleteItem = useMutation(api.catering.mutations.deleteItem);
  const updateOrderStatus = useMutation(api.catering.mutations.updateOrderStatus);
  const recordDeposit = useMutation(api.catering.mutations.recordDeposit);

  const [activeView, setActiveView] = useState<'orders' | 'menu' | 'calendar'>('orders');
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Doc<"cateringMenuItems"> | null>(null);
  const [showCatDialog, setShowCatDialog] = useState(false);

  if (!tenantId || !tenant) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  if (!tenant.features?.catering) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Catering</h1>
        <p className="text-muted-foreground">
          Catering is a paid add-on. Contact your platform admin to enable it.
        </p>
      </div>
    );
  }

  async function handleCreateCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createCategory({ tenantId: tenantId!, name: form.get('name') as string });
      toast.success('Category created');
      setShowCatDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleCreateItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const pricingType = form.get('pricingType') as string;
    const priceStr = form.get('price') as string;
    const price = Math.round(parseFloat(priceStr) * 100);

    try {
      if (editingItem) {
        await updateItem({
          id: editingItem._id,
          name: form.get('name') as string,
          description: (form.get('description') as string) || undefined,
          servingSize: form.get('servingSize') as string,
          ...(pricingType === 'per_person'
            ? { pricePerPerson: price, flatPrice: undefined }
            : { flatPrice: price, pricePerPerson: undefined }),
          minimumQuantity: form.get('minimumQuantity')
            ? parseInt(form.get('minimumQuantity') as string)
            : undefined,
        });
        toast.success('Item updated');
      } else {
        await createItem({
          tenantId: tenantId!,
          categoryId: form.get('categoryId') as string as Id<"cateringCategories">,
          name: form.get('name') as string,
          description: (form.get('description') as string) || undefined,
          servingSize: form.get('servingSize') as string,
          ...(pricingType === 'per_person'
            ? { pricePerPerson: price }
            : { flatPrice: price }),
          minimumQuantity: form.get('minimumQuantity')
            ? parseInt(form.get('minimumQuantity') as string)
            : undefined,
        });
        toast.success('Item created');
      }
      setShowItemDialog(false);
      setEditingItem(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  const sortedOrders = orders
    ?.slice()
    .sort((a, b) => b.createdAt - a.createdAt) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catering</h1>
          <p className="text-muted-foreground">
            {orders?.length ?? 0} orders, {upcomingEvents?.length ?? 0} upcoming events
          </p>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeView === 'orders' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('orders')}
        >
          Orders
        </Button>
        <Button
          variant={activeView === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('calendar')}
        >
          <CalendarDays className="mr-1 h-3 w-3" />
          Upcoming Events
        </Button>
        <Button
          variant={activeView === 'menu' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('menu')}
        >
          <Utensils className="mr-1 h-3 w-3" />
          Menu
        </Button>
      </div>

      <Separator />

      {/* ==================== Orders View ==================== */}
      {activeView === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle>Catering Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Headcount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No catering orders yet
                    </TableCell>
                  </TableRow>
                )}
                {sortedOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-mono font-bold">#{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(order.eventDate).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-muted-foreground">{order.eventTime}</span>
                    </TableCell>
                    <TableCell>{order.headcount}</TableCell>
                    <TableCell className="font-medium">${(order.total / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      {order.depositPaid ? (
                        <Badge variant="default">${(order.depositPaid / 100).toFixed(2)} paid</Badge>
                      ) : (
                        <Badge variant="outline">${(order.depositRequired / 100).toFixed(2)} due</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[order.status]} className="capitalize">
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {order.status === 'inquiry' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await updateOrderStatus({ id: order._id, status: 'confirmed' });
                              toast.success('Order confirmed');
                            }}
                          >
                            Confirm
                          </Button>
                        )}
                        {order.status === 'confirmed' && !order.depositPaid && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await recordDeposit({
                                id: order._id,
                                amount: order.depositRequired,
                              });
                              toast.success('Deposit recorded');
                            }}
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Record Deposit
                          </Button>
                        )}
                        {order.status === 'deposit_paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await updateOrderStatus({ id: order._id, status: 'preparing' });
                              toast.success('Marked as preparing');
                            }}
                          >
                            Start Prep
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await updateOrderStatus({ id: order._id, status: 'ready' });
                              toast.success('Marked as ready');
                            }}
                          >
                            Ready
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await updateOrderStatus({ id: order._id, status: 'completed' });
                              toast.success('Order completed');
                            }}
                          >
                            Complete
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
      )}

      {/* ==================== Calendar View ==================== */}
      {activeView === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Catering Events</CardTitle>
            <CardDescription>Next 30 days of confirmed events</CardDescription>
          </CardHeader>
          <CardContent>
            {!upcomingEvents || upcomingEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No upcoming events</p>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event._id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold">
                        {new Date(event.eventDate).getDate()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.eventDate).toLocaleDateString('en-US', {
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{event.customerName}</p>
                        <Badge variant={STATUS_COLORS[event.status]} className="capitalize text-xs">
                          {event.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.eventTime} · {event.headcount} guests · {event.fulfillmentType}
                      </p>
                      <p className="text-sm font-medium">${(event.total / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================== Menu Management ==================== */}
      {activeView === 'menu' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCatDialog(true)}>
              <Plus className="mr-1 h-3 w-3" /> Category
            </Button>
            <Button size="sm" onClick={() => { setEditingItem(null); setShowItemDialog(true); }}>
              <Plus className="mr-1 h-3 w-3" /> Menu Item
            </Button>
          </div>

          {categories?.map((cat) => {
            const catItems = items?.filter((i) => i.categoryId === cat._id) ?? [];
            return (
              <Card key={cat._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{cat.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {catItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No items in this category</p>
                  ) : (
                    <div className="space-y-2">
                      {catItems.map((item) => (
                        <div key={item._id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.servingSize} ·{' '}
                              {item.flatPrice
                                ? `$${(item.flatPrice / 100).toFixed(2)} flat`
                                : `$${((item.pricePerPerson ?? 0) / 100).toFixed(2)}/person`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setEditingItem(item); setShowItemDialog(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={async () => {
                                if (!confirm('Delete this item?')) return;
                                await deleteItem({ id: item._id });
                                toast.success('Deleted');
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ==================== Category Dialog ==================== */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Catering Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" name="name" placeholder="Entrees, Sides, Desserts..." required />
            </div>
            <DialogFooter>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== Item Dialog ==================== */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'New Catering Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4">
            {!editingItem && (
              <div className="space-y-2">
                <Label htmlFor="item-cat">Category</Label>
                <select
                  id="item-cat"
                  name="categoryId"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categories?.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="item-name">Name</Label>
              <Input id="item-name" name="name" defaultValue={editingItem?.name ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-desc">Description</Label>
              <Input id="item-desc" name="description" defaultValue={editingItem?.description ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-serving">Serving Size</Label>
              <Input
                id="item-serving"
                name="servingSize"
                defaultValue={editingItem?.servingSize ?? ''}
                placeholder="Serves 10-12"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricingType">Pricing</Label>
                <select
                  id="pricingType"
                  name="pricingType"
                  defaultValue={editingItem?.flatPrice ? 'flat' : 'per_person'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="per_person">Per Person</option>
                  <option value="flat">Flat Price</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    editingItem
                      ? ((editingItem.flatPrice ?? editingItem.pricePerPerson ?? 0) / 100).toFixed(2)
                      : ''
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minQty">Minimum Quantity</Label>
              <Input
                id="minQty"
                name="minimumQuantity"
                type="number"
                min="1"
                defaultValue={editingItem?.minimumQuantity ?? ''}
              />
            </div>
            <DialogFooter>
              <Button type="submit">{editingItem ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
