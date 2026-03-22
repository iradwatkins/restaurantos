'use client';

import { useState, useMemo } from 'react';
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
  DialogDescription,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@restaurantos/ui';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Search,
  ArrowDownToLine,
  RotateCcw,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@restaurantos/backend/dataModel';

// ==================== Constants ====================

const INGREDIENT_CATEGORIES = [
  'Proteins',
  'Produce',
  'Dairy',
  'Grains & Starches',
  'Oils & Fats',
  'Spices & Seasonings',
  'Beverages',
  'Condiments & Sauces',
  'Baked Goods',
  'Frozen',
  'Other',
] as const;

const WASTE_REASONS = [
  'Spoilage',
  'Overcooked',
  'Dropped',
  'Expired',
  'Contaminated',
  'Other',
] as const;

const UNITS = [
  'oz',
  'lb',
  'each',
  'cup',
  'gal',
  'qt',
  'pt',
  'fl oz',
  'g',
  'kg',
  'ml',
  'L',
  'bunch',
  'case',
  'bag',
] as const;

type ActiveTab = 'ingredients' | 'waste-log' | 'food-cost';

// ==================== Main Component ====================

export default function InventoryContent() {
  const { tenantId } = useTenant();

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('ingredients');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog state
  const [showIngredientDialog, setShowIngredientDialog] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveIngredientId, setReceiveIngredientId] = useState<Id<'ingredients'> | null>(null);
  const [showWasteDialog, setShowWasteDialog] = useState(false);
  const [wasteIngredientId, setWasteIngredientId] = useState<Id<'ingredients'> | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateIngredientId, setDeactivateIngredientId] = useState<Id<'ingredients'> | null>(null);
  const [deactivateIngredientName, setDeactivateIngredientName] = useState('');

  // Waste log date range (default: last 30 days)
  const [wasteStartDate, setWasteStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0]!;
  });
  const [wasteEndDate, setWasteEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]!;
  });

  // ==================== Queries ====================

  const ingredients = useQuery(
    api.inventory.queries.getIngredients,
    tenantId
      ? categoryFilter !== 'all'
        ? { tenantId, category: categoryFilter }
        : { tenantId }
      : 'skip'
  );

  const lowStockAlerts = useQuery(
    api.inventory.queries.getLowStockAlerts,
    tenantId ? { tenantId } : 'skip'
  );

  const wasteLog = useQuery(
    api.inventory.queries.getWasteLog,
    tenantId
      ? {
          tenantId,
          startDate: new Date(wasteStartDate).getTime(),
          endDate: new Date(wasteEndDate + 'T23:59:59.999Z').getTime(),
        }
      : 'skip'
  );

  const foodCostReport = useQuery(
    api.inventory.queries.getFoodCostReport,
    tenantId ? { tenantId } : 'skip'
  );

  // ==================== Mutations ====================

  const createIngredient = useMutation(api.inventory.mutations.createIngredient);
  const updateIngredient = useMutation(api.inventory.mutations.updateIngredient);
  const deleteIngredient = useMutation(api.inventory.mutations.deleteIngredient);
  const receiveStock = useMutation(api.inventory.mutations.receiveStock);
  const recordWaste = useMutation(api.inventory.mutations.recordWaste);

  // ==================== Filtered Ingredients ====================

  const filteredIngredients = useMemo(() => {
    if (!ingredients) return [];
    if (!searchTerm) return ingredients;
    const lower = searchTerm.toLowerCase();
    return ingredients.filter(
      (ing) =>
        ing.name.toLowerCase().includes(lower) ||
        (ing.supplier && ing.supplier.toLowerCase().includes(lower))
    );
  }, [ingredients, searchTerm]);

  // ==================== Category list from data ====================

  const categoriesFromData = useMemo(() => {
    if (!ingredients) return [];
    const cats = new Set<string>();
    for (const ing of ingredients) {
      if (ing.category) cats.add(ing.category);
    }
    return Array.from(cats).sort();
  }, [ingredients]);

  // ==================== Food cost summary ====================

  const foodCostSummary = useMemo(() => {
    if (!foodCostReport || foodCostReport.length === 0) {
      return { avgFoodCost: 0, count: 0 };
    }
    const total = foodCostReport.reduce((sum, r) => sum + r.foodCostPercent, 0);
    return {
      avgFoodCost: Math.round((total / foodCostReport.length) * 100) / 100,
      count: foodCostReport.length,
    };
  }, [foodCostReport]);

  // ==================== Handlers ====================

  async function handleSaveIngredient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const costStr = form.get('costPerUnit') as string;
    const costPerUnit = Math.round(parseFloat(costStr) * 100);

    try {
      if (editingIngredient) {
        await updateIngredient({
          id: editingIngredient._id,
          name: form.get('name') as string,
          unit: form.get('unit') as string,
          lowStockThreshold: parseFloat(form.get('lowStockThreshold') as string),
          costPerUnit,
          par: form.get('par') ? parseFloat(form.get('par') as string) : undefined,
          category: (form.get('category') as string) || undefined,
          supplier: (form.get('supplier') as string) || undefined,
        });
        toast.success('Ingredient updated');
      } else {
        await createIngredient({
          tenantId: tenantId!,
          name: form.get('name') as string,
          unit: form.get('unit') as string,
          currentStock: parseFloat(form.get('currentStock') as string),
          lowStockThreshold: parseFloat(form.get('lowStockThreshold') as string),
          costPerUnit,
          par: form.get('par') ? parseFloat(form.get('par') as string) : undefined,
          category: (form.get('category') as string) || undefined,
          supplier: (form.get('supplier') as string) || undefined,
        });
        toast.success('Ingredient created');
      }
      setShowIngredientDialog(false);
      setEditingIngredient(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save ingredient');
    }
  }

  async function handleReceiveStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!receiveIngredientId) return;
    const form = new FormData(e.currentTarget);
    const quantity = parseFloat(form.get('quantity') as string);
    const notes = (form.get('notes') as string) || undefined;

    try {
      const result = await receiveStock({
        ingredientId: receiveIngredientId,
        quantity,
        reason: notes,
      });
      toast.success(
        `Stock received. Updated: ${result.previousStock} -> ${result.newStock}`
      );
      setShowReceiveDialog(false);
      setReceiveIngredientId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to receive stock');
    }
  }

  async function handleRecordWaste(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!wasteIngredientId) return;
    const form = new FormData(e.currentTarget);
    const quantity = parseFloat(form.get('quantity') as string);
    const reason = form.get('reason') as string;
    const customReason = (form.get('customReason') as string) || '';
    const finalReason = reason === 'Other' && customReason ? customReason : reason;

    try {
      const result = await recordWaste({
        ingredientId: wasteIngredientId,
        quantity,
        reason: finalReason,
      });
      toast.success(
        `Waste recorded. Stock: ${result.previousStock} -> ${result.newStock}`
      );
      setShowWasteDialog(false);
      setWasteIngredientId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record waste');
    }
  }

  async function handleDeactivate() {
    if (!deactivateIngredientId) return;
    try {
      await deleteIngredient({ id: deactivateIngredientId });
      toast.success('Ingredient deactivated');
      setShowDeactivateDialog(false);
      setDeactivateIngredientId(null);
      setDeactivateIngredientName('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate');
    }
  }

  function openReceiveDialog(ingredientId: Id<'ingredients'>) {
    setReceiveIngredientId(ingredientId);
    setShowReceiveDialog(true);
  }

  function openWasteDialog(ingredientId: Id<'ingredients'>) {
    setWasteIngredientId(ingredientId);
    setShowWasteDialog(true);
  }

  function openDeactivateDialog(ingredientId: Id<'ingredients'>, name: string) {
    setDeactivateIngredientId(ingredientId);
    setDeactivateIngredientName(name);
    setShowDeactivateDialog(true);
  }

  // ==================== Render ====================

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            {ingredients?.length ?? 0} ingredients
            {lowStockAlerts && lowStockAlerts.length > 0 && (
              <span className="text-destructive font-medium">
                {' '}&middot; {lowStockAlerts.length} low stock
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingIngredient(null);
            setShowIngredientDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Ingredient
        </Button>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts && lowStockAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alerts ({lowStockAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockAlerts.map((alert) => (
                <div
                  key={alert._id}
                  className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-background px-3 py-2 text-sm"
                >
                  <span className="font-medium">{alert.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {alert.currentStock} {alert.unit}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    (need {alert.lowStockThreshold})
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs ml-1"
                    onClick={() => openReceiveDialog(alert._id)}
                  >
                    <ArrowDownToLine className="mr-1 h-3 w-3" />
                    Receive
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'ingredients' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('ingredients')}
        >
          <Package className="mr-1 h-3 w-3" />
          Ingredients
        </Button>
        <Button
          variant={activeTab === 'waste-log' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('waste-log')}
        >
          <TrendingDown className="mr-1 h-3 w-3" />
          Waste Log
        </Button>
        <Button
          variant={activeTab === 'food-cost' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('food-cost')}
        >
          <DollarSign className="mr-1 h-3 w-3" />
          Food Cost
        </Button>
      </div>

      {/* ==================== Ingredients Tab ==================== */}
      {activeTab === 'ingredients' && (
        <>
          {/* Search and Filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ingredients or suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {INGREDIENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                {categoriesFromData
                  .filter(
                    (c) =>
                      !INGREDIENT_CATEGORIES.includes(
                        c as (typeof INGREDIENT_CATEGORIES)[number]
                      )
                  )
                  .map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ingredients Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Par Level</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIngredients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {ingredients?.length === 0
                            ? 'No ingredients yet. Add your first ingredient to get started.'
                            : 'No ingredients match your search.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredIngredients.map((ing) => (
                      <TableRow key={ing._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {ing.name}
                            {ing.isLowStock && (
                              <Badge variant="destructive" className="text-xs">
                                Low
                              </Badge>
                            )}
                            {!ing.isLowStock && ing.isBelowPar && (
                              <Badge className="text-xs bg-yellow-500 text-white">
                                Below Par
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ing.category ?? '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              ing.isLowStock
                                ? 'text-destructive font-semibold'
                                : ing.isBelowPar
                                  ? 'text-yellow-600 font-medium'
                                  : ''
                            }
                          >
                            {ing.currentStock}
                          </span>{' '}
                          <span className="text-muted-foreground text-xs">{ing.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {ing.par !== undefined ? `${ing.par} ${ing.unit}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          ${(ing.costPerUnit / 100).toFixed(2)}/{ing.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ing.supplier ?? '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Receive stock"
                              onClick={() => openReceiveDialog(ing._id)}
                            >
                              <ArrowDownToLine className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Record waste"
                              onClick={() => openWasteDialog(ing._id)}
                            >
                              <RotateCcw className="h-4 w-4 text-orange-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit ingredient"
                              onClick={() => {
                                setEditingIngredient(ing);
                                setShowIngredientDialog(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Deactivate ingredient"
                              onClick={() => openDeactivateDialog(ing._id, ing.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ==================== Waste Log Tab ==================== */}
      {activeTab === 'waste-log' && (
        <>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                value={wasteStartDate}
                onChange={(e) => setWasteStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                value={wasteEndDate}
                onChange={(e) => setWasteEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            {wasteLog && (
              <p className="text-sm text-muted-foreground pb-2">
                {wasteLog.length} waste entries
                {wasteLog.length > 0 && (
                  <span className="text-destructive font-medium">
                    {' '}&middot; $
                    {(
                      wasteLog.reduce((sum, w) => sum + w.wasteCostCents, 0) / 100
                    ).toFixed(2)}{' '}
                    total waste cost
                  </span>
                )}
              </p>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Recorded By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!wasteLog || wasteLog.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          No waste entries for this date range.
                        </TableCell>
                      </TableRow>
                    )}
                    {wasteLog?.map((entry) => (
                      <TableRow key={entry._id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.ingredientName}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.abs(entry.quantityChange)} {entry.ingredientUnit}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          ${(entry.wasteCostCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.performedBy}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ==================== Food Cost Tab ==================== */}
      {activeTab === 'food-cost' && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Average Food Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={`text-2xl font-bold ${
                    foodCostSummary.avgFoodCost < 30
                      ? 'text-green-600'
                      : foodCostSummary.avgFoodCost <= 35
                        ? 'text-yellow-600'
                        : 'text-destructive'
                  }`}
                >
                  {foodCostSummary.avgFoodCost}%
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Menu Items with Ingredients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{foodCostSummary.count}</span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Target Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-green-600 text-xs">&lt;30%</Badge>
                  <Badge className="bg-yellow-500 text-xs text-white">30-35%</Badge>
                  <Badge variant="destructive" className="text-xs">&gt;35%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Food Cost Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu Item</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Ingredient Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Food Cost %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!foodCostReport || foodCostReport.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No food cost data available. Link ingredients to menu items to see
                          cost analysis.
                        </TableCell>
                      </TableRow>
                    )}
                    {foodCostReport?.map((item) => (
                      <TableRow key={item.menuItemId}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.menuItemName}</span>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {item.ingredientBreakdown.map((ing) => (
                                <span key={ing.ingredientName} className="mr-2">
                                  {ing.quantity} {ing.unit} {ing.ingredientName}
                                </span>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${(item.sellingPriceCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${(item.totalIngredientCostCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.profitCents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={`text-xs ${
                              item.foodCostPercent < 30
                                ? 'bg-green-600'
                                : item.foodCostPercent <= 35
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-destructive'
                            }`}
                          >
                            {item.foodCostPercent}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ==================== Add/Edit Ingredient Dialog ==================== */}
      <Dialog
        open={showIngredientDialog}
        onOpenChange={(open) => {
          setShowIngredientDialog(open);
          if (!open) setEditingIngredient(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIngredient ? 'Edit Ingredient' : 'Add Ingredient'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveIngredient} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="ing-name">Name</Label>
              <Input
                id="ing-name"
                name="name"
                defaultValue={editingIngredient?.name ?? ''}
                placeholder="Ground Beef"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ing-unit">Unit</Label>
                <select
                  id="ing-unit"
                  name="unit"
                  defaultValue={editingIngredient?.unit ?? 'oz'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ing-category">Category</Label>
                <select
                  id="ing-category"
                  name="category"
                  defaultValue={editingIngredient?.category ?? ''}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No category</option>
                  {INGREDIENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!editingIngredient && (
              <div className="space-y-2">
                <Label htmlFor="ing-stock">Initial Stock</Label>
                <Input
                  id="ing-stock"
                  name="currentStock"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ing-threshold">Low Stock Threshold</Label>
                <Input
                  id="ing-threshold"
                  name="lowStockThreshold"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingIngredient?.lowStockThreshold ?? '10'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ing-par">Par Level</Label>
                <Input
                  id="ing-par"
                  name="par"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingIngredient?.par ?? ''}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ing-cost">Cost per Unit ($)</Label>
              <Input
                id="ing-cost"
                name="costPerUnit"
                type="number"
                step="0.01"
                min="0"
                defaultValue={
                  editingIngredient
                    ? (editingIngredient.costPerUnit / 100).toFixed(2)
                    : ''
                }
                placeholder="0.50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ing-supplier">Supplier</Label>
              <Input
                id="ing-supplier"
                name="supplier"
                defaultValue={editingIngredient?.supplier ?? ''}
                placeholder="Sysco, US Foods, etc."
              />
            </div>

            <DialogFooter>
              <Button type="submit">
                {editingIngredient ? 'Save Changes' : 'Add Ingredient'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== Receive Stock Dialog ==================== */}
      <Dialog
        open={showReceiveDialog}
        onOpenChange={(open) => {
          setShowReceiveDialog(open);
          if (!open) setReceiveIngredientId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Stock</DialogTitle>
            <DialogDescription>
              {receiveIngredientId &&
                ingredients?.find((i) => i._id === receiveIngredientId) && (
                  <>
                    Current stock:{' '}
                    <strong>
                      {ingredients.find((i) => i._id === receiveIngredientId)!.currentStock}{' '}
                      {ingredients.find((i) => i._id === receiveIngredientId)!.unit}
                    </strong>
                  </>
                )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReceiveStock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recv-qty">Quantity Received</Label>
              <Input
                id="recv-qty"
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="50"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recv-notes">Notes (optional)</Label>
              <Input
                id="recv-notes"
                name="notes"
                placeholder="Invoice #, delivery details..."
              />
            </div>
            <DialogFooter>
              <Button type="submit">Receive Stock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== Record Waste Dialog ==================== */}
      <Dialog
        open={showWasteDialog}
        onOpenChange={(open) => {
          setShowWasteDialog(open);
          if (!open) setWasteIngredientId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Waste</DialogTitle>
            <DialogDescription>
              {wasteIngredientId &&
                ingredients?.find((i) => i._id === wasteIngredientId) && (
                  <>
                    Current stock:{' '}
                    <strong>
                      {ingredients.find((i) => i._id === wasteIngredientId)!.currentStock}{' '}
                      {ingredients.find((i) => i._id === wasteIngredientId)!.unit}
                    </strong>
                  </>
                )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordWaste} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="waste-qty">Quantity Wasted</Label>
              <Input
                id="waste-qty"
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="5"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waste-reason">Reason</Label>
              <WasteReasonSelect />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive">
                Record Waste
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== Deactivate Confirmation Dialog ==================== */}
      <Dialog
        open={showDeactivateDialog}
        onOpenChange={(open) => {
          setShowDeactivateDialog(open);
          if (!open) {
            setDeactivateIngredientId(null);
            setDeactivateIngredientName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Ingredient</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <strong>{deactivateIngredientName}</strong>?
              This will hide it from the active ingredients list but preserve its history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Sub-component: Waste Reason Select ====================

function WasteReasonSelect() {
  const [reason, setReason] = useState('Spoilage');
  const [showCustom, setShowCustom] = useState(false);

  return (
    <>
      <select
        name="reason"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setShowCustom(e.target.value === 'Other');
        }}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        required
      >
        {WASTE_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {showCustom && (
        <Input
          name="customReason"
          placeholder="Describe the reason..."
          className="mt-2"
          required
        />
      )}
    </>
  );
}
