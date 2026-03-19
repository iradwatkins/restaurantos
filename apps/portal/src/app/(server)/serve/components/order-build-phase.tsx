'use client';

import {
  Button,
  Badge,
  Separator,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@restaurantos/ui';
import {
  ArrowLeft,
  Minus,
  Plus,
  Send,
  Save,
  Wine,
  ShoppingBag,
  MessageSquare,
} from 'lucide-react';
import { formatCents } from '@/lib/format';
import { ALCOHOL_TYPES } from '@/lib/constants';
import { ModifierSheet } from '@/components/modifier-sheet';
import type { CartItem } from '@/lib/types';
import type { Doc, Id } from '@restaurantos/backend/dataModel';

interface OrderBuildPhaseProps {
  selectedTable: Doc<'tables'> | null;
  existingOrder: Doc<'orders'> | null;
  cart: CartItem[];
  categories: Doc<'menuCategories'>[] | undefined;
  filteredMenuItems: Doc<'menuItems'>[] | undefined;
  selectedCat: string | null;
  setSelectedCat: (cat: string | null) => void;
  subtotal: number;
  tax: number;
  total: number;
  modifierItem: Doc<'menuItems'> | null;
  tenantId: Id<'tenants'>;
  instructionsItem: string | null;
  instructionsText: string;
  ageVerifyItem: Doc<'menuItems'> | null;
  ageVerifiedThisSession: boolean;
  onBackToTables: () => void;
  onAddToCart: (item: Doc<'menuItems'>) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onSetInstructionsItem: (val: string | null) => void;
  onSetInstructionsText: (val: string) => void;
  onSetSpecialInstructions: (index: number, text: string) => void;
  onSendToKitchen: () => void;
  onSaveOpen: () => void;
  onModifierClose: () => void;
  onModifierConfirm: (modifiers: { name: string; priceAdjustment: number }[]) => void;
  onAgeVerifyDismiss: () => void;
  onAgeVerifyConfirm: () => void;
}

export function OrderBuildPhase({
  selectedTable,
  existingOrder,
  cart,
  categories,
  filteredMenuItems,
  selectedCat,
  setSelectedCat,
  subtotal,
  tax,
  total,
  modifierItem,
  tenantId,
  instructionsItem,
  instructionsText,
  ageVerifyItem,
  onBackToTables,
  onAddToCart,
  onUpdateQuantity,
  onSetInstructionsItem,
  onSetInstructionsText,
  onSetSpecialInstructions,
  onSendToKitchen,
  onSaveOpen,
  onModifierClose,
  onModifierConfirm,
  onAgeVerifyDismiss,
  onAgeVerifyConfirm,
}: OrderBuildPhaseProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Order Top Bar */}
      <div className="flex items-center gap-3 border-b px-4 py-2 bg-card shrink-0">
        <Button variant="ghost" size="sm" onClick={onBackToTables}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Tables
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <span className="font-semibold">{selectedTable?.name}</span>
        {existingOrder && (
          <Badge variant="secondary">Order #{existingOrder.orderNumber}</Badge>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Menu (70%) */}
        <div className="flex-[7] flex flex-col overflow-hidden border-r">
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto p-3 border-b bg-card shrink-0" role="tablist" aria-label="Menu categories">
            <button
              role="tab"
              aria-selected={selectedCat === null}
              onClick={() => setSelectedCat(null)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCat === null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
              }`}
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat._id}
                role="tab"
                aria-selected={selectedCat === cat._id}
                onClick={() => setSelectedCat(cat._id)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCat === cat._id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredMenuItems?.map((item) => {
                const itemType = item.type ?? 'food';
                const isAlcohol = (ALCOHOL_TYPES as readonly string[]).includes(itemType);
                const is86d = item.is86d;
                return (
                  <button
                    key={item._id}
                    onClick={() => !is86d && onAddToCart(item)}
                    disabled={!!is86d}
                    className={`p-4 border rounded-xl text-left transition-colors min-h-[80px] ${
                      is86d
                        ? 'opacity-50 cursor-not-allowed bg-muted'
                        : 'hover:bg-accent active:bg-accent/80'
                    } ${isAlcohol ? 'border-amber-300' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded object-cover shrink-0" />
                      )}
                      <p className="font-medium text-sm leading-tight">{item.name}</p>
                      {isAlcohol && <Wine className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground">
                        ${formatCents(item.price)}
                      </p>
                      {is86d && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          86'd
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Cart (30%) */}
        <div className="flex-[3] flex flex-col overflow-hidden bg-card">
          <div className="flex items-center gap-2 p-3 border-b">
            <ShoppingBag className="h-4 w-4" />
            <span className="font-semibold text-sm">
              {existingOrder ? 'New Items' : 'Order'}
            </span>
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tap items to add
              </p>
            ) : (
              cart.map((item, index) => (
                <div key={`${item.menuItemId}-${index}`} className="border rounded-lg p-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.modifiers.map((m) => m.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium ml-2">
                      ${formatCents(item.lineTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateQuantity(index, -1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border hover:bg-accent active:bg-accent/80"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(index, 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border hover:bg-accent active:bg-accent/80"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        onSetInstructionsItem(instructionsItem === `${index}` ? null : `${index}`);
                        onSetInstructionsText(item.specialInstructions || '');
                      }}
                      aria-label={`Special instructions for ${item.name}`}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg border hover:bg-accent ${
                        item.specialInstructions ? 'text-primary border-primary' : ''
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {instructionsItem === `${index}` && (
                    <div className="mt-2">
                      <Input
                        placeholder="Special instructions..."
                        value={instructionsText}
                        onChange={(e) => onSetInstructionsText(e.target.value)}
                        onBlur={() => {
                          onSetSpecialInstructions(index, instructionsText);
                          onSetInstructionsItem(null);
                        }}
                        className="text-sm h-8"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Totals & Actions */}
          {cart.length > 0 && (
            <div className="border-t p-3 space-y-3 shrink-0">
              {existingOrder && (
                <div className="text-xs text-muted-foreground">
                  Existing: ${formatCents(existingOrder.total)} + New items below
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${formatCents(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>${formatCents(tax)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${formatCents(total)}</span>
                </div>
              </div>

              <Button className="w-full h-12 text-base" onClick={onSendToKitchen}>
                <Send className="h-4 w-4 mr-2" />
                Send to Kitchen
              </Button>
              <Button variant="outline" className="w-full" onClick={onSaveOpen}>
                <Save className="h-4 w-4 mr-2" />
                Save Open
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modifier Sheet */}
      {modifierItem && tenantId && (
        <ModifierSheet
          open={!!modifierItem}
          onClose={onModifierClose}
          onConfirm={onModifierConfirm}
          menuItemId={modifierItem._id}
          menuItemName={modifierItem.name}
          tenantId={tenantId}
        />
      )}

      {/* Age Verification Dialog */}
      <Dialog open={!!ageVerifyItem} onOpenChange={() => onAgeVerifyDismiss()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Age Verification Required</DialogTitle>
            <DialogDescription className="sr-only">Confirm customer is 21+ for alcohol</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Has the customer been verified as 21 years of age or older?
            This verification will persist for the current session.
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={onAgeVerifyDismiss}>
              Cancel
            </Button>
            <Button onClick={onAgeVerifyConfirm}>
              Yes, Verified 21+
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
