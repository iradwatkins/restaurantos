'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Button,
} from '@restaurantos/ui';
import { Plus, Trash2 } from 'lucide-react';
import { formatCents } from '@/lib/format';
import type { Id } from '@restaurantos/backend/dataModel';

export function ModifierGroupCard({
  group,
  onAddOption,
  onDeleteGroup,
  onDeleteOption,
}: {
  group: any;
  onAddOption: (groupId: Id<'modifierGroups'>, name: string, price: string) => Promise<void>;
  onDeleteGroup: (groupId: Id<'modifierGroups'>) => Promise<void>;
  onDeleteOption: (optionId: Id<'modifierOptions'>) => Promise<void>;
}) {
  const options = useQuery(api.menu.queries.getModifierOptions, { groupId: group._id });
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">{group.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {group.minSelections === 0 ? 'Optional' : `Required (min ${group.minSelections})`}
              {' · '}
              Max {group.maxSelections} selection{group.maxSelections !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onDeleteGroup(group._id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {options?.map((opt) => (
          <div key={opt._id} className="flex items-center justify-between text-sm">
            <span>{opt.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {opt.priceAdjustment > 0
                  ? `+$${formatCents(opt.priceAdjustment)}`
                  : 'No charge'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => onDeleteOption(opt._id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add option inline form */}
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Option name"
            value={newOptionName}
            onChange={(e) => setNewOptionName(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="$0.00"
            type="number"
            step="0.01"
            min="0"
            value={newOptionPrice}
            onChange={(e) => setNewOptionPrice(e.target.value)}
            className="h-8 text-sm w-24"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={async () => {
              if (!newOptionName.trim()) return;
              await onAddOption(group._id, newOptionName, newOptionPrice);
              setNewOptionName('');
              setNewOptionPrice('');
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
