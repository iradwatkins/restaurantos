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
} from '@restaurantos/ui';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: any;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  editingCategory,
  onSubmit,
}: CategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Edit Category' : 'New Category'}
          </DialogTitle>
          <DialogDescription className="sr-only">Add or edit a menu category</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              name="name"
              defaultValue={editingCategory?.name ?? ''}
              placeholder="Appetizers"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Input
              id="cat-desc"
              name="description"
              defaultValue={editingCategory?.description ?? ''}
              placeholder="Starters and small plates"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-menuType">Menu Type</Label>
              <select
                id="cat-menuType"
                name="menuType"
                defaultValue={editingCategory?.menuType ?? 'all'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Day</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-visFrom">Visible From</Label>
              <Input
                id="cat-visFrom"
                name="visibleFrom"
                type="time"
                defaultValue={editingCategory?.visibleFrom ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-visTo">Visible Until</Label>
              <Input
                id="cat-visTo"
                name="visibleTo"
                type="time"
                defaultValue={editingCategory?.visibleTo ?? ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">{editingCategory ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
