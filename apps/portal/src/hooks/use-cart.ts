import { useState } from 'react';
import type { Id } from '@restaurantos/backend/dataModel';
import type { CartItem } from '@/lib/types';

export function useCart(taxRate: number) {
  const [cart, setCart] = useState<CartItem[]>([]);

  function addItem(item: { _id: Id<"menuItems">; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find(
        (c) => c.menuItemId === item._id && !c.modifiers?.length
      );
      if (existing) {
        return prev.map((c) =>
          c === existing
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

  function addItemWithModifiers(
    item: { _id: Id<"menuItems">; name: string; price: number },
    modifiers: { name: string; priceAdjustment: number }[]
  ) {
    const modifierTotal = modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
    const unitPrice = item.price + modifierTotal;

    setCart((prev) => {
      const modKey = modifiers.map((m) => m.name).sort().join(',');
      const existing = prev.find((c) => {
        if (c.menuItemId !== item._id) return false;
        const cKey = (c.modifiers || []).map((m) => m.name).sort().join(',');
        return cKey === modKey;
      });

      if (existing) {
        return prev.map((c) =>
          c === existing
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
          unitPrice,
          modifiers: modifiers.length > 0 ? modifiers : undefined,
          lineTotal: unitPrice,
        },
      ];
    });
  }

  function updateQuantity(index: number, delta: number) {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      return prev.map((c, i) =>
        i === index ? { ...c, quantity: newQty, lineTotal: newQty * c.unitPrice } : c
      );
    });
  }

  function removeItem(menuItemId: Id<"menuItems">) {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  }

  function setSpecialInstructions(index: number, text: string) {
    setCart((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, specialInstructions: text || undefined } : c
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    addItem,
    addItemWithModifiers,
    updateQuantity,
    removeItem,
    setSpecialInstructions,
    clearCart,
    subtotal,
    tax,
    total,
    itemCount,
  };
}
