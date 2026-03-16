'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
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
import { Plus, Pencil, Trash2, Ban, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function MenuPage() {
  // For now, we need the tenant ID from context. In a real app this comes from the session.
  // We'll use a query param or context — for Sprint 2, use the first tenant as demo.
  const tenants = useQuery(api.tenants.queries.list, {});
  const tenantId = tenants?.[0]?._id;

  const categories = useQuery(
    api.menu.queries.getCategories,
    tenantId ? { tenantId } : 'skip'
  );
  const items = useQuery(
    api.menu.queries.getItems,
    tenantId ? { tenantId } : 'skip'
  );

  const createCategory = useMutation(api.menu.mutations.createCategory);
  const updateCategory = useMutation(api.menu.mutations.updateCategory);
  const deleteCategory = useMutation(api.menu.mutations.deleteCategory);
  const createItem = useMutation(api.menu.mutations.createItem);
  const updateItem = useMutation(api.menu.mutations.updateItem);
  const deleteItem = useMutation(api.menu.mutations.deleteItem);
  const toggle86 = useMutation(api.menu.mutations.toggle86);

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  async function handleCreateCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory._id,
          name: form.get('name') as string,
          description: form.get('description') as string || undefined,
        });
        toast.success('Category updated');
      } else {
        await createCategory({
          tenantId,
          name: form.get('name') as string,
          description: form.get('description') as string || undefined,
        });
        toast.success('Category created');
      }
      setShowCategoryDialog(false);
      setEditingCategory(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleCreateItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const priceStr = form.get('price') as string;
    const price = Math.round(parseFloat(priceStr) * 100); // convert to cents

    try {
      if (editingItem) {
        await updateItem({
          id: editingItem._id,
          name: form.get('name') as string,
          description: form.get('description') as string || undefined,
          price,
        });
        toast.success('Item updated');
      } else {
        if (!selectedCategory) {
          toast.error('Select a category first');
          return;
        }
        await createItem({
          tenantId,
          categoryId: selectedCategory as any,
          name: form.get('name') as string,
          description: form.get('description') as string || undefined,
          price,
          dietaryTags: (form.get('dietaryTags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || undefined,
          prepTimeMinutes: form.get('prepTime') ? parseInt(form.get('prepTime') as string) : undefined,
        });
        toast.success('Item created');
      }
      setShowItemDialog(false);
      setEditingItem(null);
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

  const filteredItems = selectedCategory
    ? items?.filter((i) => i.categoryId === selectedCategory)
    : items;

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
              setShowItemDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Menu Item
          </Button>
        </div>
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
        {filteredItems?.map((item) => (
          <Card key={item._id} className={item.is86d ? 'opacity-50' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
                <span className="text-lg font-bold">${(item.price / 100).toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {item.is86d && (
                    <Badge variant="destructive">86'd</Badge>
                  )}
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
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleToggle86(item._id)}
                    title={item.is86d ? 'Mark available' : 'Mark 86 (out of stock)'}
                  >
                    {item.is86d ? <Check className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-red-600" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingItem(item);
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
        ))}

        {filteredItems?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No menu items yet. Create a category, then add items.
          </div>
        )}
      </div>

      {/* Category Dialog */}
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
            <DialogFooter>
              <Button type="submit">
                {editingCategory ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'New Menu Item'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateItem} className="space-y-4">
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
            <DialogFooter>
              <Button type="submit">
                {editingItem ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
