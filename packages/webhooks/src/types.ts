export type DeliveryMode = 'kitchenhub' | 'direct_api';

export type DeliveryPlatform = 'doordash' | 'ubereats' | 'grubhub';

export interface WebhookEvent {
  id: string;
  tenantId: string;
  platform: DeliveryPlatform;
  eventType: 'order.created' | 'order.updated' | 'order.cancelled' | 'order.completed';
  payload: unknown;
  receivedAt: Date;
  processedAt: Date | null;
  status: 'pending' | 'processed' | 'failed';
  retryCount: number;
}

export interface DeliveryAdapter {
  platform: DeliveryPlatform;
  acceptOrder(orderId: string): Promise<void>;
  rejectOrder(orderId: string, reason: string): Promise<void>;
  updateItemAvailability(itemId: string, available: boolean): Promise<void>;
  getOrderStatus(orderId: string): Promise<string>;
}
