'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@restaurantos/ui';
import { CreditCard, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentDialogProps {
  showPayDialog: string | null;
  activeOrders: any[] | undefined;
  handleCashPayment: (orderId: any, orderTotal: number) => void;
  setShowPayDialog: (orderId: string | null) => void;
  ageVerifyItem: any;
  setAgeVerifyItem: (item: any) => void;
  setAgeVerifiedThisSession: (verified: boolean) => void;
  addToCart: (item: any) => void;
  formatCents: (cents: number) => string;
}

export function PaymentDialog({
  showPayDialog,
  activeOrders,
  handleCashPayment,
  setShowPayDialog,
  ageVerifyItem,
  setAgeVerifyItem,
  setAgeVerifiedThisSession,
  addToCart,
  formatCents,
}: PaymentDialogProps) {
  return (
    <>
      {/* Payment Dialog */}
      <Dialog open={!!showPayDialog} onOpenChange={() => setShowPayDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription className="sr-only">Complete order payment</DialogDescription>
          </DialogHeader>
          {showPayDialog && (() => {
            const order = activeOrders?.find((o) => o._id === showPayDialog);
            if (!order) return null;
            return (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">${formatCents(order.total)}</p>
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

      {/* Age Verification Dialog */}
      <Dialog open={!!ageVerifyItem} onOpenChange={() => setAgeVerifyItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Age Verification Required</DialogTitle>
            <DialogDescription className="sr-only">Verify customer age for alcohol service</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Has the customer been verified as 21 years of age or older?
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setAgeVerifyItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAgeVerifiedThisSession(true);
                const item = ageVerifyItem;
                setAgeVerifyItem(null);
                if (item) addToCart(item);
              }}
            >
              Yes, Verified 21+
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
