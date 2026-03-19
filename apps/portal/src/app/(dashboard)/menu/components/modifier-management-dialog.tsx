'use client';

import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Separator,
} from '@restaurantos/ui';
import { Plus } from 'lucide-react';
import type { Doc, Id } from '@restaurantos/backend/dataModel';
import { ModifierGroupCard } from './modifier-group-card';

interface ModifierManagementDialogProps {
  managingModifiersFor: Doc<'menuItems'> | null;
  setManagingModifiersFor: (item: Doc<'menuItems'> | null) => void;
  getItemModifierGroups: (itemId: Id<'menuItems'>) => any[];
  handleDeleteModifierGroup: (groupId: Id<'modifierGroups'>) => Promise<void>;
  handleAddModifierOption: (groupId: Id<'modifierGroups'>, name: string, priceStr: string) => Promise<void>;
  handleDeleteModifierOption: (optionId: Id<'modifierOptions'>) => Promise<void>;
  showModifierDialog: boolean;
  setShowModifierDialog: (show: boolean) => void;
  editingModifierGroup: Doc<'modifierGroups'> | null;
  setEditingModifierGroup: (group: Doc<'modifierGroups'> | null) => void;
  handleCreateModifierGroup: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function ModifierManagementDialog({
  managingModifiersFor,
  setManagingModifiersFor,
  getItemModifierGroups,
  handleDeleteModifierGroup,
  handleAddModifierOption,
  handleDeleteModifierOption,
  showModifierDialog,
  setShowModifierDialog,
  editingModifierGroup,
  setEditingModifierGroup,
  handleCreateModifierGroup,
}: ModifierManagementDialogProps) {
  return (
    <>
      {/* Modifier Management Dialog */}
      <Dialog
        open={!!managingModifiersFor}
        onOpenChange={(open) => {
          if (!open) setManagingModifiersFor(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifiers for {managingModifiersFor?.name}</DialogTitle>
            <DialogDescription className="sr-only">Manage modifier groups for this item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {managingModifiersFor &&
              getItemModifierGroups(managingModifiersFor._id).map((group) => (
                <ModifierGroupCard
                  key={group._id}
                  group={group}
                  onAddOption={handleAddModifierOption}
                  onDeleteGroup={handleDeleteModifierGroup}
                  onDeleteOption={handleDeleteModifierOption}
                />
              ))}

            {managingModifiersFor &&
              getItemModifierGroups(managingModifiersFor._id).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No modifier groups yet.
                </p>
              )}

            <Separator />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEditingModifierGroup(null);
                setShowModifierDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Modifier Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Modifier Group Dialog */}
      <Dialog open={showModifierDialog} onOpenChange={setShowModifierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingModifierGroup ? 'Edit Modifier Group' : 'New Modifier Group'}
            </DialogTitle>
            <DialogDescription className="sr-only">Configure modifier group settings</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateModifierGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mod-name">Group Name</Label>
              <Input
                id="mod-name"
                name="name"
                defaultValue={editingModifierGroup?.name ?? ''}
                placeholder="Size, Toppings, Add-ons..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mod-min">Min Selections</Label>
                <Input
                  id="mod-min"
                  name="minSelections"
                  type="number"
                  min="0"
                  defaultValue={editingModifierGroup?.minSelections ?? 0}
                  required
                />
                <p className="text-xs text-muted-foreground">0 = optional</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mod-max">Max Selections</Label>
                <Input
                  id="mod-max"
                  name="maxSelections"
                  type="number"
                  min="1"
                  defaultValue={editingModifierGroup?.maxSelections ?? 1}
                  required
                />
                <p className="text-xs text-muted-foreground">1 = single choice</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingModifierGroup ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
