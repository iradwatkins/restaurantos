import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from './use-cart';

const makeItem = (overrides: Partial<{ _id: string; name: string; price: number }> = {}) => ({
  _id: overrides._id ?? ('item1' as any),
  name: overrides.name ?? 'Burger',
  price: overrides.price ?? 1200,
});

describe('useCart', () => {
  it('starts with empty cart', () => {
    const { result } = renderHook(() => useCart(0.08));
    expect(result.current.cart).toEqual([]);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.tax).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('adds an item to the cart', () => {
    const { result } = renderHook(() => useCart(0.08));

    act(() => {
      result.current.addItem(makeItem());
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0]!.name).toBe('Burger');
    expect(result.current.cart[0]!.quantity).toBe(1);
    expect(result.current.cart[0]!.unitPrice).toBe(1200);
    expect(result.current.cart[0]!.lineTotal).toBe(1200);
    expect(result.current.itemCount).toBe(1);
  });

  it('increments quantity when adding the same item again', () => {
    const { result } = renderHook(() => useCart(0.08));

    act(() => {
      result.current.addItem(makeItem());
    });
    act(() => {
      result.current.addItem(makeItem());
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0]!.quantity).toBe(2);
    expect(result.current.cart[0]!.lineTotal).toBe(2400);
    expect(result.current.itemCount).toBe(2);
  });

  it('adds different items as separate entries', () => {
    const { result } = renderHook(() => useCart(0.08));

    act(() => {
      result.current.addItem(makeItem({ _id: 'item1' as any, name: 'Burger', price: 1200 }));
    });
    act(() => {
      result.current.addItem(makeItem({ _id: 'item2' as any, name: 'Fries', price: 500 }));
    });

    expect(result.current.cart).toHaveLength(2);
  });

  it('calculates subtotal correctly', () => {
    const { result } = renderHook(() => useCart(0.1));

    act(() => {
      result.current.addItem(makeItem({ price: 1000 }));
    });
    act(() => {
      result.current.addItem(makeItem({ _id: 'item2' as any, price: 500 }));
    });

    expect(result.current.subtotal).toBe(1500);
  });

  it('calculates tax correctly', () => {
    const { result } = renderHook(() => useCart(0.1));

    act(() => {
      result.current.addItem(makeItem({ price: 1000 }));
    });

    expect(result.current.tax).toBe(100); // 10% of 1000
    expect(result.current.total).toBe(1100);
  });

  it('rounds tax to nearest cent', () => {
    const { result } = renderHook(() => useCart(0.0825));

    act(() => {
      result.current.addItem(makeItem({ price: 999 }));
    });

    // 999 * 0.0825 = 82.4175, rounded = 82
    expect(result.current.tax).toBe(82);
  });

  describe('updateQuantity', () => {
    it('increases item quantity', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem());
      });
      act(() => {
        result.current.updateQuantity(0, 2);
      });

      expect(result.current.cart[0]!.quantity).toBe(3);
      expect(result.current.cart[0]!.lineTotal).toBe(3600);
    });

    it('decreases item quantity', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem());
      });
      act(() => {
        result.current.addItem(makeItem());
      });
      act(() => {
        result.current.updateQuantity(0, -1);
      });

      expect(result.current.cart[0]!.quantity).toBe(1);
    });

    it('removes item when quantity reaches zero', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem());
      });
      act(() => {
        result.current.updateQuantity(0, -1);
      });

      expect(result.current.cart).toHaveLength(0);
    });

    it('ignores invalid index', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem());
      });
      act(() => {
        result.current.updateQuantity(5, 1);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]!.quantity).toBe(1);
    });
  });

  describe('removeItem', () => {
    it('removes item by menuItemId', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem({ _id: 'item1' as any }));
      });
      act(() => {
        result.current.addItem(makeItem({ _id: 'item2' as any, name: 'Fries' }));
      });
      act(() => {
        result.current.removeItem('item1' as any);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]!.name).toBe('Fries');
    });
  });

  describe('setSpecialInstructions', () => {
    it('sets special instructions on an item', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem());
      });
      act(() => {
        result.current.setSpecialInstructions(0, 'No onions');
      });

      expect(result.current.cart[0]!.specialInstructions).toBe('No onions');
    });

    it('clears special instructions when empty string is provided', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem());
      });
      act(() => {
        result.current.setSpecialInstructions(0, 'No onions');
      });
      act(() => {
        result.current.setSpecialInstructions(0, '');
      });

      expect(result.current.cart[0]!.specialInstructions).toBeUndefined();
    });
  });

  describe('clearCart', () => {
    it('removes all items', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItem(makeItem({ _id: 'item1' as any }));
      });
      act(() => {
        result.current.addItem(makeItem({ _id: 'item2' as any }));
      });
      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart).toHaveLength(0);
      expect(result.current.subtotal).toBe(0);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });
  });

  describe('addItemWithModifiers', () => {
    it('adds item with modifiers', () => {
      const { result } = renderHook(() => useCart(0.08));
      const modifiers = [{ name: 'Extra Cheese', priceAdjustment: 150 }];

      act(() => {
        result.current.addItemWithModifiers(makeItem({ price: 1200 }), modifiers);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]!.unitPrice).toBe(1350); // 1200 + 150
      expect(result.current.cart[0]!.lineTotal).toBe(1350);
      expect(result.current.cart[0]!.modifiers).toEqual(modifiers);
    });

    it('increments quantity for same item with same modifiers', () => {
      const { result } = renderHook(() => useCart(0.08));
      const modifiers = [{ name: 'Extra Cheese', priceAdjustment: 150 }];

      act(() => {
        result.current.addItemWithModifiers(makeItem(), modifiers);
      });
      act(() => {
        result.current.addItemWithModifiers(makeItem(), modifiers);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]!.quantity).toBe(2);
      expect(result.current.cart[0]!.lineTotal).toBe(2700); // 2 * 1350
    });

    it('adds separate entry for same item with different modifiers', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItemWithModifiers(makeItem(), [
          { name: 'Extra Cheese', priceAdjustment: 150 },
        ]);
      });
      act(() => {
        result.current.addItemWithModifiers(makeItem(), [
          { name: 'Bacon', priceAdjustment: 200 },
        ]);
      });

      expect(result.current.cart).toHaveLength(2);
    });

    it('handles empty modifiers array', () => {
      const { result } = renderHook(() => useCart(0.08));

      act(() => {
        result.current.addItemWithModifiers(makeItem({ price: 1200 }), []);
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0]!.unitPrice).toBe(1200);
      expect(result.current.cart[0]!.modifiers).toBeUndefined();
    });

    it('handles multiple modifiers', () => {
      const { result } = renderHook(() => useCart(0.08));
      const modifiers = [
        { name: 'Extra Cheese', priceAdjustment: 150 },
        { name: 'Bacon', priceAdjustment: 200 },
      ];

      act(() => {
        result.current.addItemWithModifiers(makeItem({ price: 1200 }), modifiers);
      });

      expect(result.current.cart[0]!.unitPrice).toBe(1550); // 1200 + 150 + 200
    });
  });
});
