'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@restaurantos/ui';
import { ShoppingBag, Send, Wine } from 'lucide-react';
import { ALCOHOL_TYPES } from '@/lib/constants';
import type { CartItem } from '@/lib/types';
import type { Id } from '@restaurantos/backend/dataModel';

interface PosTerminalProps {
  categories: { _id: string; name: string }[] | undefined;
  filteredMenuItems: { _id: string; name: string; price: number; type?: string }[] | undefined;
  selectedCat: string | null;
  setSelectedCat: (cat: string | null) => void;
  cart: CartItem[];
  tables: { _id: string; name: string; status: string }[] | undefined;
  selectedTable: string | null;
  setSelectedTable: (table: string | null) => void;
  addToCart: (item: any) => void;
  removeFromCart: (menuItemId: Id<"menuItems">) => void;
  subtotal: number;
  tax: number;
  total: number;
  TAX_RATE: number;
  handleSubmitOrder: () => void;
  formatCents: (cents: number) => string;
}

export function PosTerminal({
  categories,
  filteredMenuItems,
  selectedCat,
  setSelectedCat,
  cart,
  tables,
  selectedTable,
  setSelectedTable,
  addToCart,
  removeFromCart,
  subtotal,
  tax,
  total,
  TAX_RATE,
  handleSubmitOrder,
  formatCents,
}: PosTerminalProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Menu Items */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Select Items</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap mb-4" role="tablist" aria-label="Menu categories">
              <Button
                variant={selectedCat === null ? 'default' : 'outline'}
                size="sm"
                role="tab"
                aria-selected={selectedCat === null}
                onClick={() => setSelectedCat(null)}
              >
                All
              </Button>
              {categories?.map((cat) => (
                <Button
                  key={cat._id}
                  variant={selectedCat === cat._id ? 'default' : 'outline'}
                  size="sm"
                  role="tab"
                  aria-selected={selectedCat === cat._id}
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
                const isAlcohol = (ALCOHOL_TYPES as readonly string[]).includes(itemType);
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
                      ${formatCents(item.price)}
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
                  aria-label="Select table"
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
                      <span>${formatCents(item.lineTotal)}</span>
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
                    <span>${formatCents(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                    <span>${formatCents(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>${formatCents(total)}</span>
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
  );
}
