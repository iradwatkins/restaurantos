'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Doc, Id } from '@restaurantos/backend/dataModel';
import { useTenant } from '@/hooks/use-tenant';
import { useSession } from '@/hooks/use-session';
import { toast } from 'sonner';
import { DEFAULT_TAX_RATE, ALCOHOL_TYPES } from '@/lib/constants';
import { isWithinAlcoholHours } from '@/lib/alcohol';
import { useCart } from '@/hooks/use-cart';
import { OrderConfirmationPhase } from './components/order-confirmation-phase';
import { OrderBuildPhase } from './components/order-build-phase';
import { TableSelectPhase } from './components/table-select-phase';

type Phase = 'tables' | 'order' | 'confirmation';

export default function ServeContent() {
  const { tenant, tenantId } = useTenant();
  const { user } = useSession();

  const tables = useQuery(api.orders.queries.getTables, tenantId ? { tenantId } : 'skip');
  const activeOrders = useQuery(api.orders.queries.getActiveOrders, tenantId ? { tenantId } : 'skip');
  const categories = useQuery(api.menu.queries.getCategories, tenantId ? { tenantId } : 'skip');
  const menuItems = useQuery(api.menu.queries.getAvailableItems, tenantId ? { tenantId } : 'skip');
  const modifierGroups = useQuery(api.menu.queries.getModifierGroups, tenantId ? { tenantId } : 'skip');

  const itemsWithModifiers = useMemo(() => {
    const set = new Set<string>();
    modifierGroups?.forEach((g) => g.menuItemIds.forEach((id: string) => set.add(id)));
    return set;
  }, [modifierGroups]);

  const createOrder = useMutation(api.orders.mutations.create);
  const addItemsMutation = useMutation(api.orders.mutations.addItems);
  const updateOrderStatus = useMutation(api.orders.mutations.updateStatus);
  const recordPayment = useMutation(api.orders.mutations.recordPayment);

  const TAX_RATE = tenant?.taxRate ?? DEFAULT_TAX_RATE;

  const {
    cart, addItem, addItemWithModifiers, updateQuantity,
    setSpecialInstructions, clearCart,
    subtotal, tax, total,
  } = useCart(TAX_RATE);

  const [phase, setPhase] = useState<Phase>('tables');
  const [selectedTable, setSelectedTable] = useState<Doc<'tables'> | null>(null);
  const [existingOrder, setExistingOrder] = useState<Doc<'orders'> | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showMyOrders, setShowMyOrders] = useState(true);
  const [confirmationOrderNumber, setConfirmationOrderNumber] = useState<number | null>(null);
  const [modifierItem, setModifierItem] = useState<Doc<'menuItems'> | null>(null);
  const [instructionsItem, setInstructionsItem] = useState<string | null>(null);
  const [instructionsText, setInstructionsText] = useState('');
  const [payOrder, setPayOrder] = useState<Doc<'orders'> | null>(null);
  const [ageVerifyItem, setAgeVerifyItem] = useState<Doc<'menuItems'> | null>(null);
  const [ageVerifiedThisSession, setAgeVerifiedThisSession] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (phase !== 'confirmation') return;
    const timer = setTimeout(() => {
      setPhase('tables');
      setConfirmationOrderNumber(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [phase]);

  function getTableOrder(tableId: string) {
    return activeOrders?.find((o) => o.tableId === tableId);
  }

  function handleTableTap(table: Doc<'tables'>) {
    const order = getTableOrder(table._id);
    setSelectedTable(table);
    setExistingOrder(order ?? null);
    clearCart();
    setSelectedCat(null);
    setPhase('order');
  }

  function handleAddToCart(item: Doc<'menuItems'>) {
    const itemType = item.type ?? 'food';
    const isAlcohol = (ALCOHOL_TYPES as readonly string[]).includes(itemType);

    if (isAlcohol) {
      if (!isWithinAlcoholHours(tenant?.alcoholSaleHoursStart, tenant?.alcoholSaleHoursEnd)) {
        toast.error(
          `Alcohol sales restricted. Hours: ${tenant?.alcoholSaleHoursStart ?? '07:00'} - ${tenant?.alcoholSaleHoursEnd ?? '02:00'}`
        );
        return;
      }
      if (!ageVerifiedThisSession) {
        setAgeVerifyItem(item);
        return;
      }
    }

    if (item.is86d) {
      toast.error(`${item.name} is currently 86'd`);
      return;
    }

    if (!itemsWithModifiers.has(item._id)) {
      addItem(item);
      return;
    }

    setModifierItem(item);
  }

  function handleModifierConfirm(modifiers: { name: string; priceAdjustment: number }[]) {
    if (!modifierItem) return;
    addItemWithModifiers(modifierItem, modifiers);
    setModifierItem(null);
  }

  function handleModifierClose() {
    if (modifierItem) {
      addItem(modifierItem);
    }
    setModifierItem(null);
  }

  async function handleSendToKitchen() {
    if (cart.length === 0) {
      toast.error('Add items first');
      return;
    }

    try {
      if (existingOrder) {
        const existingSubtotal = existingOrder.subtotal ?? 0;
        const newSubtotal = existingSubtotal + subtotal;
        const newTax = Math.round(newSubtotal * TAX_RATE);
        const newTotal = newSubtotal + newTax;

        await addItemsMutation({
          orderId: existingOrder._id,
          items: cart,
          newSubtotal,
          newTax,
          newTotal,
        });

        if (existingOrder.status === 'open') {
          await updateOrderStatus({ orderId: existingOrder._id, status: 'sent_to_kitchen' });
        }

        setConfirmationOrderNumber(existingOrder.orderNumber);
      } else {
        const { orderId, orderNumber } = await createOrder({
          tenantId: tenantId!,
          source: 'dine_in',
          tableId: selectedTable?._id,
          tableName: selectedTable?.name,
          items: cart,
          subtotal,
          tax,
          total,
          serverId: user?.id as Id<'users'>,
          serverName: user?.name,
        });

        await updateOrderStatus({ orderId, status: 'sent_to_kitchen' });
        setConfirmationOrderNumber(orderNumber);
      }

      toast.success('Sent to kitchen!');
      clearCart();
      setPhase('confirmation');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send order');
    }
  }

  async function handleSaveOpen() {
    if (cart.length === 0) {
      toast.error('Add items first');
      return;
    }

    try {
      if (existingOrder) {
        const existingSubtotal = existingOrder.subtotal ?? 0;
        const newSubtotal = existingSubtotal + subtotal;
        const newTax = Math.round(newSubtotal * TAX_RATE);
        const newTotal = newSubtotal + newTax;

        await addItemsMutation({
          orderId: existingOrder._id,
          items: cart,
          newSubtotal,
          newTax,
          newTotal,
        });
      } else {
        await createOrder({
          tenantId: tenantId!,
          source: 'dine_in',
          tableId: selectedTable?._id,
          tableName: selectedTable?.name,
          items: cart,
          subtotal,
          tax,
          total,
          serverId: user?.id as Id<'users'>,
          serverName: user?.name,
        });
      }

      toast.success('Order saved');
      clearCart();
      setPhase('tables');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save order');
    }
  }

  async function handleQuickSendToKitchen(orderId: Id<'orders'>) {
    try {
      await updateOrderStatus({ orderId, status: 'sent_to_kitchen' });
      toast.success('Sent to kitchen');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function handleCashPayment(order: Doc<'orders'>) {
    try {
      await recordPayment({
        tenantId: tenantId!,
        orderId: order._id,
        amount: order.total,
        method: 'cash',
      });
      await updateOrderStatus({ orderId: order._id, status: 'completed' });
      toast.success('Payment recorded');
      setPayOrder(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  const filteredMenuItems = selectedCat
    ? menuItems?.filter((i) => i.categoryId === selectedCat)
    : menuItems;

  const displayedOrders = showMyOrders && user
    ? activeOrders?.filter((o) => o.serverId === user.id)
    : activeOrders;

  if (!tenantId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (phase === 'confirmation') {
    return (
      <OrderConfirmationPhase
        confirmationOrderNumber={confirmationOrderNumber}
        onBackToTables={() => {
          setPhase('tables');
          setConfirmationOrderNumber(null);
        }}
      />
    );
  }

  if (phase === 'order') {
    return (
      <OrderBuildPhase
        selectedTable={selectedTable}
        existingOrder={existingOrder}
        cart={cart}
        categories={categories}
        filteredMenuItems={filteredMenuItems}
        selectedCat={selectedCat}
        setSelectedCat={setSelectedCat}
        subtotal={subtotal}
        tax={tax}
        total={total}
        modifierItem={modifierItem}
        tenantId={tenantId}
        instructionsItem={instructionsItem}
        instructionsText={instructionsText}
        ageVerifyItem={ageVerifyItem}
        ageVerifiedThisSession={ageVerifiedThisSession}
        onBackToTables={() => { setPhase('tables'); clearCart(); }}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={updateQuantity}
        onSetInstructionsItem={setInstructionsItem}
        onSetInstructionsText={setInstructionsText}
        onSetSpecialInstructions={setSpecialInstructions}
        onSendToKitchen={handleSendToKitchen}
        onSaveOpen={handleSaveOpen}
        onModifierClose={handleModifierClose}
        onModifierConfirm={handleModifierConfirm}
        onAgeVerifyDismiss={() => setAgeVerifyItem(null)}
        onAgeVerifyConfirm={() => {
          setAgeVerifiedThisSession(true);
          const item = ageVerifyItem;
          setAgeVerifyItem(null);
          if (item) handleAddToCart(item);
        }}
      />
    );
  }

  return (
    <TableSelectPhase
      user={user}
      tenant={tenant ?? undefined}
      tables={tables}
      showMyOrders={showMyOrders}
      setShowMyOrders={setShowMyOrders}
      displayedOrders={displayedOrders}
      payOrder={payOrder}
      setPayOrder={setPayOrder}
      getTableOrder={getTableOrder}
      onTableTap={handleTableTap}
      onQuickSendToKitchen={handleQuickSendToKitchen}
      onCashPayment={handleCashPayment}
    />
  );
}
