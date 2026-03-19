'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Button,
  Label,
  Separator,
} from '@restaurantos/ui';
import { Check } from 'lucide-react';
import { formatCents } from '@/lib/format';
import type { Id } from '@restaurantos/backend/dataModel';

interface ModifierSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (modifiers: { name: string; priceAdjustment: number }[]) => void;
  menuItemId: Id<"menuItems">;
  menuItemName: string;
  tenantId: Id<"tenants">;
}

export function ModifierSheet({
  open,
  onClose,
  onConfirm,
  menuItemId,
  menuItemName,
  tenantId,
}: ModifierSheetProps) {
  const modifierGroups = useQuery(
    api.menu.queries.getModifierGroupsForItem,
    open ? { tenantId, menuItemId } : 'skip'
  );

  const [selections, setSelections] = useState<Record<string, string[]>>({});

  function toggleOption(groupId: string, optionName: string, maxSelections: number) {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionName)) {
        return { ...prev, [groupId]: current.filter((n) => n !== optionName) };
      }
      if (maxSelections === 1) {
        return { ...prev, [groupId]: [optionName] };
      }
      if (current.length >= maxSelections) return prev;
      return { ...prev, [groupId]: [...current, optionName] };
    });
  }

  function canConfirm(): boolean {
    if (!modifierGroups) return false;
    return modifierGroups.every((group) => {
      const selected = selections[group._id]?.length ?? 0;
      return selected >= (group.minSelections ?? 0);
    });
  }

  function handleConfirm() {
    if (!modifierGroups) return;
    const modifiers: { name: string; priceAdjustment: number }[] = [];

    for (const group of modifierGroups) {
      const selectedNames = selections[group._id] || [];
      for (const opt of group.options) {
        if (selectedNames.includes(opt.name)) {
          modifiers.push({ name: opt.name, priceAdjustment: opt.priceAdjustment ?? 0 });
        }
      }
    }

    onConfirm(modifiers);
    setSelections({});
  }

  function handleClose() {
    setSelections({});
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{menuItemName}</DialogTitle>
          <DialogDescription className="sr-only">Select options for this item</DialogDescription>
        </DialogHeader>

        {!modifierGroups ? (
          <div className="py-8 text-center text-muted-foreground">Loading modifiers...</div>
        ) : modifierGroups.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground text-sm">
            No modifiers for this item.
          </div>
        ) : (
          <div className="space-y-5">
            {modifierGroups.map((group) => {
              const selected = selections[group._id] || [];
              const isRequired = (group.minSelections ?? 0) >= 1;
              return (
                <div key={group._id}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">{group.name}</Label>
                    <span className="text-xs text-muted-foreground">
                      {isRequired ? 'Required' : 'Optional'}
                      {group.maxSelections > 1 && ` (up to ${group.maxSelections})`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.options.map((opt) => {
                      const isSelected = selected.includes(opt.name);
                      return (
                        <button
                          key={opt._id}
                          type="button"
                          onClick={() => toggleOption(group._id, opt.name, group.maxSelections ?? 10)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm">{opt.name}</span>
                          </div>
                          {(opt.priceAdjustment ?? 0) !== 0 && (
                            <span className="text-sm text-muted-foreground">
                              +${formatCents(opt.priceAdjustment ?? 0)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <Separator className="mt-4" />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm()}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
