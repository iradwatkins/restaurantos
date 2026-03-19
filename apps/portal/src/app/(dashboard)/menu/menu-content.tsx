'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
} from '@restaurantos/ui';
import { Plus, Pencil, Trash2, Ban, Check, Upload, Star, Wine, ImageIcon, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Doc, Id } from '@restaurantos/backend/dataModel';

const ITEM_TYPES = [
  { value: 'food', label: 'Food' },
  { value: 'beer', label: 'Beer' },
  { value: 'wine', label: 'Wine' },
  { value: 'spirits', label: 'Spirits' },
  { value: 'non_alcoholic_beverage', label: 'Non-Alcoholic Beverage' },
] as const;

const ALCOHOL_TYPES = ['beer', 'wine', 'spirits'];

type ItemType = (typeof ITEM_TYPES)[number]['value'];

export default function MenuPage() {
  const { tenantId } = useTenant();

  const categories = useQuery(
    api.menu.queries.getCategories,
    tenantId ? { tenantId } : 'skip'
  );
  const items = useQuery(
    api.menu.queries.getItems,
    tenantId ? { tenantId } : 'skip'
  );
  const modifierGroups = useQuery(
    api.menu.queries.getModifierGroups,
    tenantId ? { tenantId } : 'skip'
  );

  const createCategory = useMutation(api.menu.mutations.createCategory);
  const updateCategory = useMutation(api.menu.mutations.updateCategory);
  const deleteCategory = useMutation(api.menu.mutations.deleteCategory);
  const createItem = useMutation(api.menu.mutations.createItem);
  const updateItem = useMutation(api.menu.mutations.updateItem);
  const deleteItem = useMutation(api.menu.mutations.deleteItem);
  const toggle86 = useMutation(api.menu.mutations.toggle86);
  const generateUploadUrl = useMutation(api.menu.mutations.generateUploadUrl);
  const createModifierGroup = useMutation(api.menu.mutations.createModifierGroup);
  const updateModifierGroup = useMutation(api.menu.mutations.updateModifierGroup);
  const deleteModifierGroup = useMutation(api.menu.mutations.deleteModifierGroup);
  const createModifierOption = useMutation(api.menu.mutations.createModifierOption);
  const deleteModifierOption = useMutation(api.menu.mutations.deleteModifierOption);

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showModifierDialog, setShowModifierDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Doc<"menuCategories"> | null>(null);
  const [editingItem, setEditingItem] = useState<Doc<"menuItems"> | null>(null);
  const [editingModifierGroup, setEditingModifierGroup] = useState<Doc<"modifierGroups"> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'specials' | 'alcohol'>('all');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [managingModifiersFor, setManagingModifiersFor] = useState<Doc<"menuItems"> | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  // ==================== Category Handlers ====================

  async function handleCreateCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const menuType = (form.get('menuType') as string) || 'all';
      if (editingCategory) {
        await updateCategory({
          id: editingCategory._id,
          name: form.get('name') as string,
          description: (form.get('description') as string) || undefined,
          menuType: menuType as 'all' | 'lunch' | 'dinner',
          visibleFrom: (form.get('visibleFrom') as string) || undefined,
          visibleTo: (form.get('visibleTo') as string) || undefined,
        });
        toast.success('Category updated');
      } else {
        await createCategory({
          tenantId,
          name: form.get('name') as string,
          description: (form.get('description') as string) || undefined,
          menuType: menuType as 'all' | 'lunch' | 'dinner',
          visibleFrom: (form.get('visibleFrom') as string) || undefined,
          visibleTo: (form.get('visibleTo') as string) || undefined,
        });
        toast.success('Category created');
      }
      setShowCategoryDialog(false);
      setEditingCategory(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  // ==================== Item Handlers ====================

  async function handleCreateItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const priceStr = form.get('price') as string;
    const price = Math.round(parseFloat(priceStr) * 100);
    const itemType = (form.get('type') as ItemType) || 'food';
    const isSpecial = form.get('isSpecial') === 'on';
    const availableFromStr = form.get('availableFrom') as string;
    const availableToStr = form.get('availableTo') as string;

    // Upload image if selected
    let imageStorageId: Id<'_storage'> | undefined;
    if (selectedImage) {
      try {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': selectedImage.type },
          body: selectedImage,
        });
        const { storageId } = await result.json();
        imageStorageId = storageId;
      } catch {
        toast.error('Image upload failed');
        return;
      }
    }

    try {
      if (editingItem) {
        await updateItem({
          id: editingItem._id,
          name: form.get('name') as string,
          description: (form.get('description') as string) || undefined,
          price,
          type: itemType,
          isSpecial,
          availableFrom: availableFromStr ? new Date(availableFromStr).getTime() : undefined,
          availableTo: availableToStr ? new Date(availableToStr).getTime() : undefined,
          dietaryTags:
            (form.get('dietaryTags') as string)
              ?.split(',')
              .map((t) => t.trim())
              .filter(Boolean) || undefined,
          prepTimeMinutes: form.get('prepTime')
            ? parseInt(form.get('prepTime') as string)
            : undefined,
          ...(imageStorageId ? { imageStorageId } : {}),
        });
        toast.success('Item updated');
      } else {
        if (!selectedCategory) {
          toast.error('Select a category first');
          return;
        }
        await createItem({
          tenantId,
          categoryId: selectedCategory as Id<"menuCategories">,
          name: form.get('name') as string,
          description: (form.get('description') as string) || undefined,
          price,
          type: itemType,
          isSpecial,
          availableFrom: availableFromStr ? new Date(availableFromStr).getTime() : undefined,
          availableTo: availableToStr ? new Date(availableToStr).getTime() : undefined,
          dietaryTags:
            (form.get('dietaryTags') as string)
              ?.split(',')
              .map((t) => t.trim())
              .filter(Boolean) || undefined,
          prepTimeMinutes: form.get('prepTime')
            ? parseInt(form.get('prepTime') as string)
            : undefined,
          ...(imageStorageId ? { imageStorageId } : {}),
        });
        toast.success('Item created');
      }
      setShowItemDialog(false);
      setEditingItem(null);
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleToggle86(itemId: any) {
    try {
      const result = await toggle86({ id: itemId });
      toast.success(
        result.is86d
          ? `${result.itemName} marked as 86'd (out of stock)`
          : `${result.itemName} back in stock`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleDeleteItem(itemId: any) {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteItem({ id: itemId });
      toast.success('Item deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleDeleteCategory(catId: any) {
    if (!confirm('Delete this category? All items must be removed first.')) return;
    try {
      await deleteCategory({ id: catId });
      toast.success('Category deleted');
      if (selectedCategory === catId) setSelectedCategory(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  // ==================== Modifier Handlers ====================

  async function handleCreateModifierGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      if (editingModifierGroup) {
        await updateModifierGroup({
          id: editingModifierGroup._id,
          name: form.get('name') as string,
          minSelections: parseInt(form.get('minSelections') as string),
          maxSelections: parseInt(form.get('maxSelections') as string),
        });
        toast.success('Modifier group updated');
      } else {
        if (!managingModifiersFor) return;
        await createModifierGroup({
          tenantId,
          name: form.get('name') as string,
          minSelections: parseInt(form.get('minSelections') as string),
          maxSelections: parseInt(form.get('maxSelections') as string),
          menuItemIds: [managingModifiersFor._id],
        });
        toast.success('Modifier group created');
      }
      setShowModifierDialog(false);
      setEditingModifierGroup(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleAddModifierOption(groupId: Id<'modifierGroups'>, name: string, priceStr: string) {
    try {
      await createModifierOption({
        tenantId,
        groupId,
        name,
        priceAdjustment: Math.round(parseFloat(priceStr || '0') * 100),
      });
      toast.success('Option added');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleDeleteModifierGroup(groupId: Id<'modifierGroups'>) {
    if (!confirm('Delete this modifier group and all its options?')) return;
    try {
      await deleteModifierGroup({ id: groupId });
      toast.success('Modifier group deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleDeleteModifierOption(optionId: Id<'modifierOptions'>) {
    try {
      await deleteModifierOption({ id: optionId });
      toast.success('Option deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  // ==================== Filtering ====================

  let filteredItems = items;
  if (selectedCategory) {
    filteredItems = filteredItems?.filter((i) => i.categoryId === selectedCategory);
  }
  if (filterMode === 'specials') {
    filteredItems = filteredItems?.filter((i) => i.isSpecial);
  }
  if (filterMode === 'alcohol') {
    filteredItems = filteredItems?.filter((i) => ALCOHOL_TYPES.includes(i.type ?? 'food'));
  }

  function getItemModifierGroups(itemId: Id<"menuItems">) {
    return modifierGroups?.filter((g) => g.menuItemIds.includes(itemId)) ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-muted-foreground">
            {categories?.length ?? 0} categories, {items?.length ?? 0} items
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingCategory(null);
              setShowCategoryDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Category
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setSelectedImage(null);
              setImagePreview(null);
              setShowItemDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Menu Item
          </Button>
        </div>
      </div>

      {/* Filter mode tabs */}
      <div className="flex gap-2">
        <Button
          variant={filterMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterMode('all')}
        >
          All Items
        </Button>
        <Button
          variant={filterMode === 'specials' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterMode('specials')}
        >
          <Star className="mr-1 h-3 w-3" />
          Specials ({items?.filter((i) => i.isSpecial).length ?? 0})
        </Button>
        <Button
          variant={filterMode === 'alcohol' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterMode('alcohol')}
        >
          <Wine className="mr-1 h-3 w-3" />
          Alcohol ({items?.filter((i) => ALCOHOL_TYPES.includes(i.type ?? 'food')).length ?? 0})
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All ({items?.length ?? 0})
        </Button>
        {categories?.map((cat) => {
          const count = items?.filter((i) => i.categoryId === cat._id).length ?? 0;
          return (
            <div key={cat._id} className="flex items-center gap-1">
              <Button
                variant={selectedCategory === cat._id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat._id)}
              >
                {cat.name} ({count})
                {cat.menuType && cat.menuType !== 'all' && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {cat.menuType}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditingCategory(cat);
                  setShowCategoryDialog(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => handleDeleteCategory(cat._id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Items grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems?.map((item) => {
          const itemType = item.type ?? 'food';
          const isAlcohol = ALCOHOL_TYPES.includes(itemType);
          const itemGroups = getItemModifierGroups(item._id);

          return (
            <Card key={item._id} className={item.is86d ? 'opacity-50' : ''}>
              {item.imageStorageId && (
                <ItemImage storageId={item.imageStorageId} name={item.name} />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      {isAlcohol && (
                        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                          {itemType}
                        </Badge>
                      )}
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
                  </div>
                  <span className="text-lg font-bold ml-2">
                    ${(item.price / 100).toFixed(2)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {item.is86d && <Badge variant="destructive">86&apos;d</Badge>}
                    {item.dietaryTags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.prepTimeMinutes && (
                      <Badge variant="secondary" className="text-xs">
                        {item.prepTimeMinutes}min
                      </Badge>
                    )}
                    {itemGroups.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {itemGroups.length} modifier{itemGroups.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {item.availableFrom && item.availableTo && (
                      <Badge variant="outline" className="text-[10px]">
                        LTO
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle86(item._id)}
                      title={item.is86d ? 'Mark available' : 'Mark 86 (out of stock)'}
                    >
                      {item.is86d ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Ban className="h-4 w-4 text-red-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setManagingModifiersFor(item);
                      }}
                      title="Manage modifiers"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingItem(item);
                        setSelectedImage(null);
                        setImagePreview(null);
                        setShowItemDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteItem(item._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredItems?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No menu items yet. Create a category, then add items.
          </div>
        )}
      </div>

      {/* ==================== Category Dialog ==================== */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
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

      {/* ==================== Item Dialog ==================== */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'New Menu Item'}</DialogTitle>
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
                  defaultValue={editingItem ? (editingItem.price / 100).toFixed(2) : ''}
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

      {/* ==================== Modifier Management Dialog ==================== */}
      <Dialog
        open={!!managingModifiersFor}
        onOpenChange={(open) => {
          if (!open) setManagingModifiersFor(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifiers for {managingModifiersFor?.name}</DialogTitle>
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

      {/* ==================== New Modifier Group Dialog ==================== */}
      <Dialog open={showModifierDialog} onOpenChange={setShowModifierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingModifierGroup ? 'Edit Modifier Group' : 'New Modifier Group'}
            </DialogTitle>
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
    </div>
  );
}

// ==================== Sub-components ====================

function ItemImage({ storageId, name }: { storageId: Id<'_storage'>; name: string }) {
  const imageUrl = useQuery(api.menu.queries.getImageUrl, { storageId });

  if (!imageUrl) {
    return (
      <div className="h-32 bg-muted flex items-center justify-center rounded-t-lg">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="h-32 w-full object-cover rounded-t-lg"
    />
  );
}

function ModifierGroupCard({
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
                  ? `+$${(opt.priceAdjustment / 100).toFixed(2)}`
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
