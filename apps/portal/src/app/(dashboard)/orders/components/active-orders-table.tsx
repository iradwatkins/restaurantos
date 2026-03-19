'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { CreditCard, Send, Printer, Scissors } from 'lucide-react';

interface ActiveOrdersTableProps {
  activeOrders: any[] | undefined;
  tenantName: string;
  handleSendToKitchen: (orderId: any) => void;
  setShowPayDialog: (orderId: string | null) => void;
  setSplitOrder: (order: any) => void;
  printReceipt: (order: any, tenantName: string) => void;
  formatCents: (cents: number) => string;
}

export function ActiveOrdersTable({
  activeOrders,
  tenantName,
  handleSendToKitchen,
  setShowPayDialog,
  setSplitOrder,
  printReceipt,
  formatCents,
}: ActiveOrdersTableProps) {
  return (
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
                  ${formatCents(order.total)}
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
                      <>
                        <Button
                          size="sm"
                          onClick={() => setShowPayDialog(order._id)}
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Pay
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSplitOrder(order)}
                        >
                          <Scissors className="h-3 w-3 mr-1" />
                          Split
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => printReceipt(order, tenantName)}
                      aria-label={`Print receipt for order ${order.orderNumber}`}
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
