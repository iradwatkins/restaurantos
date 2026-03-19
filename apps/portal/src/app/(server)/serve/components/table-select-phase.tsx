'use client';

import {
  Button,
  Badge,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@restaurantos/ui';
import {
  Users,
  DollarSign,
  CreditCard,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';
import { printReceipt } from '@/lib/print';
import type { Doc, Id } from '@restaurantos/backend/dataModel';

interface TableSelectPhaseProps {
  user: { id: string; email: string; name: string; role: string; tenantId: string } | null;
  tenant: Doc<'tenants'> | undefined;
  tables: Doc<'tables'>[] | undefined;
  showMyOrders: boolean;
  setShowMyOrders: (val: boolean) => void;
  displayedOrders: Doc<'orders'>[] | undefined;
  payOrder: Doc<'orders'> | null;
  setPayOrder: (val: Doc<'orders'> | null) => void;
  getTableOrder: (tableId: string) => Doc<'orders'> | undefined;
  onTableTap: (table: Doc<'tables'>) => void;
  onQuickSendToKitchen: (orderId: Id<'orders'>) => void;
  onCashPayment: (order: Doc<'orders'>) => void;
}

export function TableSelectPhase({
  user,
  tenant,
  tables,
  showMyOrders,
  setShowMyOrders,
  displayedOrders,
  payOrder,
  setPayOrder,
  getTableOrder,
  onTableTap,
  onQuickSendToKitchen,
  onCashPayment,
}: TableSelectPhaseProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-card shrink-0">
        <h2 className="text-lg font-semibold">Tables</h2>
        <div className="flex items-center gap-2">
          {user && (
            <Button
              variant={showMyOrders ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMyOrders(!showMyOrders)}
            >
              {showMyOrders ? 'My Tables' : 'All Tables'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Table Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables?.filter((table) => {
            if (!showMyOrders || !user) return true;
            const status = table.status || 'open';
            if (status === 'open') return true;
            const order = getTableOrder(table._id);
            return order?.serverId === user.id;
          }).map((table) => {
            const order = getTableOrder(table._id);
            const status = table.status || 'open';
            const isOpen = status === 'open';
            const isOccupied = status === 'occupied';
            return (
              <button
                key={table._id}
                onClick={() => onTableTap(table)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] min-h-[120px] ${
                  isOpen
                    ? 'border-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/30'
                    : isOccupied
                      ? 'border-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                      : 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-lg">{table.name}</span>
                  <Badge
                    variant={isOpen ? 'success' : isOccupied ? 'destructive' : 'warning'}
                    className="text-[10px] px-1.5"
                  >
                    {status}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs">{table.seats ?? '?'} seats</span>
                </div>

                {order && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs font-medium">
                      #{order.orderNumber} &middot; {order.items.length} items
                    </div>
                    <Badge
                      variant={
                        order.status === 'ready'
                          ? 'success'
                          : order.status === 'preparing'
                            ? 'warning'
                            : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                )}

                {/* Quick actions for occupied tables */}
                {isOccupied && order && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {order.status === 'open' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickSendToKitchen(order._id);
                        }}
                        className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-md"
                      >
                        Send
                      </button>
                    )}
                    {order.paymentStatus === 'unpaid' && order.status !== 'open' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayOrder(order);
                        }}
                        className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-md"
                      >
                        Pay
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printReceipt(order, tenant?.name || 'Restaurant');
                      }}
                      aria-label={`Print receipt for order ${order.orderNumber}`}
                      className="text-[10px] bg-muted text-foreground px-2 py-0.5 rounded-md"
                    >
                      <Printer className="h-3 w-3 inline" />
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Orders Summary */}
        {displayedOrders && displayedOrders.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {showMyOrders ? 'My Active Orders' : 'All Active Orders'} ({displayedOrders.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {displayedOrders.map((order) => (
                <Card key={order._id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm">#{order.orderNumber}</span>
                    <Badge
                      variant={
                        order.status === 'ready'
                          ? 'success'
                          : order.status === 'preparing'
                            ? 'warning'
                            : 'secondary'
                      }
                      className="capitalize text-xs"
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-sm text-muted-foreground">
                    <span>{order.tableName ?? 'No table'}</span>
                    <span>${formatCents(order.total)}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!payOrder} onOpenChange={() => setPayOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription className="sr-only">Process payment for this order</DialogDescription>
          </DialogHeader>
          {payOrder && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">${formatCents(payOrder.total)}</p>
                <p className="text-sm text-muted-foreground">Order #{payOrder.orderNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="h-16"
                  variant="outline"
                  onClick={() => onCashPayment(payOrder)}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Cash
                </Button>
                <Button
                  className="h-16"
                  onClick={() =>
                    toast.info('Card payments require Stripe Terminal. Configure in Settings.')
                  }
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Card
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => printReceipt(payOrder, tenant?.name || 'Restaurant')}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
