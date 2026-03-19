/**
 * Shared frontend types used across multiple components.
 */
import type { Id } from '@restaurantos/backend/dataModel';

export interface CartItem {
  menuItemId: Id<"menuItems">;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { name: string; priceAdjustment: number }[];
  specialInstructions?: string;
  lineTotal: number;
}
