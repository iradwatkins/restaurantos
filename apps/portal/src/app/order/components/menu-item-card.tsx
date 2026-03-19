'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@restaurantos/ui';
import { Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { formatCents } from '@/lib/format';
import type { Id } from '@restaurantos/backend/dataModel';

interface MenuItem {
  _id: Id<'menuItems'>;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isSpecial?: boolean;
  dietaryTags?: string[];
}

interface MenuItemCardProps {
  item: MenuItem;
  tenantId: Id<'tenants'>;
  onAdd: (item: { _id: Id<'menuItems'>; name: string; price: number }) => void;
  onAddWithModifiers: (item: { _id: Id<'menuItems'>; name: string; price: number }, modifiers: { name: string; priceAdjustment: number }[]) => void;
}

export function MenuItemCard({
  item,
  tenantId,
  onAdd,
  onAddWithModifiers,
}: MenuItemCardProps) {
  const modifierGroups = useQuery(api.public.queries.getModifiersForItem, {
    tenantId,
    menuItemId: item._id as Id<'menuItems'>,
  });
  const [showModifiers, setShowModifiers] = useState(false);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const hasModifiers = modifierGroups && modifierGroups.length > 0;

  function handleAdd() {
    if (hasModifiers) {
      setSelections({});
      setShowModifiers(true);
    } else {
      onAdd(item);
    }
  }

  function handleConfirmModifiers() {
    // Validate required groups
    for (const group of modifierGroups!) {
      const selected = selections[group._id] ?? [];
      if (selected.length < group.minSelections) {
        toast.error(`Please select at least ${group.minSelections} option(s) for ${group.name}`);
        return;
      }
    }

    // Build modifier list
    const mods: { name: string; priceAdjustment: number }[] = [];
    for (const group of modifierGroups!) {
      const selected = selections[group._id] ?? [];
      for (const opt of group.options) {
        if (selected.includes(opt._id)) {
          mods.push({ name: opt.name, priceAdjustment: opt.priceAdjustment });
        }
      }
    }

    onAddWithModifiers(item, mods);
    setShowModifiers(false);
  }

  function toggleOption(groupId: string, optionId: string, maxSelections: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (maxSelections === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (current.length >= maxSelections) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  return (
    <>
      <Card className="overflow-hidden">
        {item.imageUrl && (
          <Image src={item.imageUrl} alt={item.name} width={400} height={128} className="h-32 w-full object-cover" />
        )}
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{item.name}</h3>
                {item.isSpecial && (
                  <Badge className="text-[10px] bg-yellow-500">
                    <Star className="h-2 w-2 mr-0.5" /> Special
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.dietaryTags?.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right ml-3">
              <p className="font-bold">${formatCents(item.price)}</p>
            </div>
          </div>
          <Button size="sm" className="w-full mt-2" variant="outline" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {hasModifiers ? 'Customize & Add' : 'Add to Order'}
          </Button>
        </CardContent>
      </Card>

      {/* Modifier Selection Dialog */}
      {hasModifiers && (
        <Dialog open={showModifiers} onOpenChange={setShowModifiers}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize {item.name}</DialogTitle>
              <DialogDescription className="sr-only">Select modifiers for this item</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {modifierGroups!.map((group) => (
                <div key={group._id} className="space-y-2">
                  <div>
                    <h4 className="font-semibold text-sm">{group.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {group.minSelections > 0 ? 'Required' : 'Optional'}
                      {' · '}
                      {group.maxSelections === 1
                        ? 'Choose one'
                        : `Choose up to ${group.maxSelections}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {group.options.map((opt) => {
                      const isSelected = (selections[group._id] ?? []).includes(opt._id);
                      return (
                        <button
                          key={opt._id}
                          aria-pressed={isSelected}
                          onClick={() =>
                            toggleOption(group._id, opt._id, group.maxSelections)
                          }
                          className={`w-full flex items-center justify-between p-2 rounded-md border text-sm transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-input hover:bg-accent'
                          }`}
                        >
                          <span>{opt.name}</span>
                          <span className="text-muted-foreground">
                            {opt.priceAdjustment > 0
                              ? `+$${formatCents(opt.priceAdjustment)}`
                              : 'Free'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleConfirmModifiers}>
                Add to Order — $
                {formatCents(
                  item.price +
                    Object.entries(selections).reduce((sum, [groupId, optIds]) => {
                      const group = modifierGroups!.find((g) => g._id === groupId);
                      return (
                        sum +
                        (group?.options ?? [])
                          .filter((o) => optIds.includes(o._id))
                          .reduce((s, o) => s + o.priceAdjustment, 0)
                      );
                    }, 0)
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
