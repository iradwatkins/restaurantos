'use client';

import { RefObject } from 'react';
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
import { Upload, Star, ImageIcon } from 'lucide-react';
import { formatCents } from '@/lib/format';

const ITEM_TYPES = [
  { value: 'food', label: 'Food' },
  { value: 'beer', label: 'Beer' },
  { value: 'wine', label: 'Wine' },
  { value: 'spirits', label: 'Spirits' },
  { value: 'non_alcoholic_beverage', label: 'Non-Alcoholic Beverage' },
] as const;

export function ItemFormDialog({
  open,
  onOpenChange,
  editingItem,
  handleCreateItem,
  imagePreview,
  selectedImage,
  imageInputRef,
  handleImageSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: any;
  handleCreateItem: (e: React.FormEvent<HTMLFormElement>) => void;
  imagePreview: string | null;
  selectedImage: File | null;
  imageInputRef: RefObject<HTMLInputElement | null>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Item' : 'New Menu Item'}</DialogTitle>
          <DialogDescription className="sr-only">Add or edit a menu item with pricing and details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateItem} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              name="name"
              defaultValue={editingItem?.name ?? ''}
              placeholder="Grilled Chicken"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">Description</Label>
            <Input
              id="item-desc"
              name="description"
              defaultValue={editingItem?.description ?? ''}
              placeholder="Herb-marinated with seasonal vegetables"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-price">Price ($)</Label>
              <Input
                id="item-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editingItem ? formatCents(editingItem.price) : ''}
                placeholder="12.99"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-type">Type</Label>
              <select
                id="item-type"
                name="type"
                defaultValue={editingItem?.type ?? 'food'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-prep">Prep Time (min)</Label>
              <Input
                id="item-prep"
                name="prepTime"
                type="number"
                min="0"
                defaultValue={editingItem?.prepTimeMinutes ?? ''}
                placeholder="15"
              />
            </div>
            <div className="space-y-2 flex items-end gap-2">
              <label className="flex items-center gap-2 h-10 cursor-pointer">
                <input
                  type="checkbox"
                  name="isSpecial"
                  defaultChecked={editingItem?.isSpecial ?? false}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">
                  <Star className="inline h-3 w-3 mr-1" />
                  Mark as Special / LTO
                </span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-availFrom">Available From</Label>
              <Input
                id="item-availFrom"
                name="availableFrom"
                type="date"
                defaultValue={
                  editingItem?.availableFrom
                    ? new Date(editingItem.availableFrom).toISOString().split('T')[0]
                    : ''
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-availTo">Available Until</Label>
              <Input
                id="item-availTo"
                name="availableTo"
                type="date"
                defaultValue={
                  editingItem?.availableTo
                    ? new Date(editingItem.availableTo).toISOString().split('T')[0]
                    : ''
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-tags">Dietary Tags (comma-separated)</Label>
            <Input
              id="item-tags"
              name="dietaryTags"
              defaultValue={editingItem?.dietaryTags?.join(', ') ?? ''}
              placeholder="gluten-free, vegan"
            />
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="flex items-center gap-4">
              {(imagePreview || editingItem?.imageStorageId) && (
                <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              )}
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {selectedImage ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {selectedImage && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedImage.name}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit">{editingItem ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
