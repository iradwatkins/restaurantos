import { Button } from '@restaurantos/ui';
import { Check, Clock } from 'lucide-react';

interface OrderConfirmationProps {
  orderPlaced: {
    orderNumber: number;
    orderId: string;
    estimatedReadyAt?: number;
  };
  onNewOrder: () => void;
}

export function OrderConfirmation({ orderPlaced, onNewOrder }: OrderConfirmationProps) {
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
          Estimated ready: {new Date(orderPlaced.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      <p className="text-muted-foreground mb-6">
        Your order has been sent to the kitchen.
      </p>
      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `/order/track?order=${orderPlaced.orderNumber}`;
          }}
        >
          Track Order
        </Button>
        <Button onClick={onNewOrder}>
          New Order
        </Button>
      </div>
    </div>
  );
}
