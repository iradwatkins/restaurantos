'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@restaurantos/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { Plus, ShoppingBag, CreditCard, DollarSign, Send, Wine, X, Tag, Ban, Gift, Printer, Loader2, CheckCircle2, AlertCircle, RefreshCw, Star, Truck, Flame, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { CashTender } from '@/components/cash-tender';
import { ConnectionBadge } from '@/components/connection-badge';
import { formatCents } from '@/lib/format';
import { formatReceipt } from '@/lib/receipt';
import { printBrowserReceipt } from '@/components/receipt-print';
import { isPrinterSupported, printEscPosReceipt } from '@/lib/escpos';
import { useStripeTerminal } from '@/hooks/use-stripe-terminal';
import { useSquareTerminal } from '@/hooks/use-square-terminal';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  savePendingOrder,
  saveMenuCache,
  getMenuCache,
  type CachedMenuItem,
  type CachedCategory,
} from '@/lib/offline/cache';
import { syncPendingOrders, forceSyncNow, refreshPendingCount } from '@/lib/offline/sync';
import { DiscountDialog } from './components/discount-dialog';
import { VoidItemDialog } from './components/void-item-dialog';
import { CompDialog } from './components/comp-dialog';
import { CustomerLookup } from './components/customer-lookup';
import { LoyaltyCheckoutSection, LoyaltyEarnedMessage } from './components/loyalty-checkout-section';
import { DeliveryPanel } from './components/delivery-panel';
import { OpenTabDialog } from './components/open-tab-dialog';
import { GiftCardSaleDialog } from './components/gift-card-sale-dialog';

const ALCOHOL_TYPES = ['beer', 'wine', 'spirits'];

const TIP_PRESETS = [
  { label: '15%', pct: 15 },
  { label: '18%', pct: 18 },
  { label: '20%', pct: 20 },
  { label: '25%', pct: 25 },
] as const;

type TipSelection = { type: 'none' } | { type: 'percent'; pct: number } | { type: 'custom' };

interface CartItem {
  menuItemId: any;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: { name: string; priceAdjustment: number }[];
  specialInstructions?: string;
  lineTotal: number;
  course?: number;
}

export default function OrdersPage() {
  const { tenant, tenantId } = useTenant();
  const { isOnline, pendingCount } = useOnlineStatus();

  const activeOrders = useQuery(
    api.orders.queries.getActiveOrders,
    tenantId ? { tenantId } : 'skip'
  );
  const tables = useQuery(
    api.orders.queries.getTables,
    tenantId ? { tenantId } : 'skip'
  );
  const categories = useQuery(
    api.menu.queries.getCategories,
    tenantId ? { tenantId } : 'skip'
  );
  const menuItems = useQuery(
    api.menu.queries.getAvailableItems,
    tenantId ? { tenantId } : 'skip'
  );

  // Offline: cache menu data when online, load from cache when offline
  const [offlineMenu, setOfflineMenu] = useState<{
    items: CachedMenuItem[];
    categories: CachedCategory[];
  } | null>(null);

  // Cache menu data whenever it changes while online
  useEffect(() => {
    if (isOnline && menuItems && categories && tenantId) {
      const items: CachedMenuItem[] = menuItems.map((item) => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        categoryId: item.categoryId,
        type: item.type,
      }));
      const cats: CachedCategory[] = categories.map((cat) => ({
        _id: cat._id,
        name: cat.name,
      }));
      saveMenuCache({ items, categories: cats, cachedAt: Date.now() });

      // Also notify the service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_MENU_DATA',
          payload: { items, categories: cats },
        });
      }
    }
  }, [isOnline, menuItems, categories, tenantId]);

  // Load cached menu when offline
  useEffect(() => {
    if (!isOnline) {
      getMenuCache().then((cached) => {
        if (cached) {
          setOfflineMenu({ items: cached.items, categories: cached.categories });
        }
      });
    } else {
      setOfflineMenu(null);
    }
  }, [isOnline]);

  // Sync pending orders when coming back online
  const syncOfflineOrder = useMutation(api.offline.mutations.syncOfflineOrders);
  useEffect(() => {
    if (isOnline && tenantId) {
      const syncFn = async (order: any) => {
        await syncOfflineOrder({
          tenantId: order.tenantId,
          orders: [{
            offlineId: order.offlineId ?? String(order.createdAt),
            source: order.source,
            items: order.items,
            subtotal: order.subtotal,
            tax: order.tax,
            total: order.total,
            tableName: order.tableName,
            tableId: order.tableId,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            timestamp: order.createdAt,
          }],
        });
      };
      syncPendingOrders(syncFn);
    }
  }, [isOnline, tenantId, syncOfflineOrder]);

  // Determine effective menu data (live or cached)
  const effectiveMenuItems = isOnline ? menuItems : offlineMenu?.items;
  const effectiveCategories = isOnline ? categories : offlineMenu?.categories;

  const TAX_RATE = tenant?.taxRate ?? 0.0875;

  const createOrder = useMutation(api.orders.mutations.create);
  const updateOrderStatus = useMutation(api.orders.mutations.updateStatus);
  const recordPayment = useMutation(api.orders.mutations.recordPayment);
  const fireNextCourse = useMutation(api.kds.mutations.fireNextCourse);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState<string | null>(null);
  const [showCashTender, setShowCashTender] = useState(false);
  const [tipSelection, setTipSelection] = useState<TipSelection>({ type: 'none' });
  const [customTipCents, setCustomTipCents] = useState(0);
  const customTipInputRef = useRef<HTMLInputElement>(null);

  // Card payment state
  const [showCardPayment, setShowCardPayment] = useState(false);
  type CardPaymentPhase = 'connecting' | 'waiting' | 'processing' | 'success' | 'error';
  const [cardPaymentPhase, setCardPaymentPhase] = useState<CardPaymentPhase>('connecting');
  const [cardPaymentError, setCardPaymentError] = useState<string | null>(null);
  const [_cardPaymentIntentId, setCardPaymentIntentId] = useState<string | null>(null);

  const stripeTerminal = useStripeTerminal();
  const squareTerminal = useSquareTerminal();

  // Loyalty earned points (shown post-payment)
  const [loyaltyPointsEarned, _setLoyaltyPointsEarned] = useState(0);

  // Customer lookup state
  const [selectedCustomer, setSelectedCustomer] = useState<{
    _id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    orderCount: number;
    totalSpent: number;
  } | null>(null);

  // Discount / Void / Comp state
  const [discountOrderId, setDiscountOrderId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<{
    orderId: string;
    itemIndex: number;
    itemName: string;
    itemTotal: number;
  } | null>(null);
  const [compTarget, setCompTarget] = useState<{
    orderId: string;
    orderNumber: number;
    orderTotal: number;
  } | null>(null);

  // Delivery panel state
  const [deliveryOrderId, setDeliveryOrderId] = useState<string | null>(null);
  const doordashEnabled = tenant?.doordashDriveEnabled ?? false;

  // Gift card state
  const [showGiftCardSale, setShowGiftCardSale] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardChecking, setGiftCardChecking] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [showGiftCardPayment, setShowGiftCardPayment] = useState(false);
  const [giftCardAppliedAmount, setGiftCardAppliedAmount] = useState(0);
  const publicCheckBalance = useMutation((api as any).giftCards.mutations.publicCheckBalance);
  const redeemGiftCard = useMutation((api as any).giftCards.mutations.redeemGiftCard);

  // Tab management state
  const [showOpenTab, setShowOpenTab] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const openTabs = useQuery(
    api.orders.queries.getOpenTabs,
    tenantId ? { tenantId } : 'skip'
  );
  const addToTabMut = useMutation(api.orders.mutations.addToTab);
  const closeTabMut = useMutation(api.orders.mutations.closeTab);

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  function isWithinAlcoholHours(): boolean {
    if (!tenant?.alcoholSaleHoursStart || !tenant?.alcoholSaleHoursEnd) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startParts = tenant.alcoholSaleHoursStart.split(':').map(Number);
    const endParts = tenant.alcoholSaleHoursEnd.split(':').map(Number);
    const startH = startParts[0] ?? 0;
    const startM = startParts[1] ?? 0;
    const endH = endParts[0] ?? 0;
    const endM = endParts[1] ?? 0;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes > startMinutes) {
      // Normal range (e.g., 07:00 to 22:00)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight range (e.g., 07:00 to 02:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  function addToCart(item: any) {
    const itemType = item.type ?? 'food';
    const isAlcohol = ALCOHOL_TYPES.includes(itemType);

    // Alcohol compliance checks
    if (isAlcohol) {
      if (!isWithinAlcoholHours()) {
        toast.error(
          `Alcohol sales restricted. Allowed hours: ${tenant?.alcoholSaleHoursStart ?? '07:00'} - ${tenant?.alcoholSaleHoursEnd ?? '02:00'}`
        );
        return;
      }
      if (!confirm('Has the customer been verified as 21 or older?')) {
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id
            ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice }
            : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          quantity: 1,
          unitPrice: item.price,
          lineTotal: item.price,
          course: 1,
        },
      ];
    });
  }

  function removeFromCart(menuItemId: string) {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
  }

  function setCartItemCourse(menuItemId: string, course: number) {
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === menuItemId ? { ...c, course } : c))
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  async function handleSubmitOrder() {
    if (cart.length === 0) {
      toast.error('Add items to the order first');
      return;
    }

    // Tab mode: add items to existing tab instead of creating a new order
    if (activeTabId) {
      try {
        await addToTabMut({
          orderId: activeTabId as Id<'orders'>,
          items: cart.map((item) => ({
            ...item,
            course: item.course ?? 1,
          })),
        });
        toast.success('Items added to tab');
        setCart([]);
        setActiveTabId(null);
        setShowNewOrder(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add items to tab';
        toast.error(message);
      }
      return;
    }

    // Offline mode: save to IndexedDB instead of Convex
    if (!isOnline) {
      try {
        await savePendingOrder({
          tenantId: tenantId!,
          items: cart.map((item) => ({
            menuItemId: item.menuItemId as string,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          })),
          subtotal,
          tax,
          total,
          source: 'dine_in',
          tableName: tables?.find((t) => t._id === selectedTable)?.name,
          tableId: selectedTable ?? undefined,
          customerName: selectedCustomer?.name,
          customerPhone: selectedCustomer?.phone ?? undefined,
          customerEmail: selectedCustomer?.email ?? undefined,
          syncStatus: 'pending',
          syncAttempts: 0,
          createdAt: Date.now(),
        });
        await refreshPendingCount();
        toast.success('Order saved offline (cash only). Will sync when back online.');
        setCart([]);
        setSelectedTable(null);
        setSelectedCustomer(null);
        setShowNewOrder(false);
      } catch (err: any) {
        toast.error(err.message || 'Failed to save offline order');
      }
      return;
    }

    try {
      await createOrder({
        tenantId: tenantId!,
        source: 'dine_in',
        tableId: selectedTable as Id<"tables"> || undefined,
        tableName: tables?.find((t) => t._id === selectedTable)?.name,
        items: cart.map((item) => ({
          ...item,
          course: item.course ?? 1,
        })),
        subtotal,
        tax,
        total,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone ?? undefined,
        customerEmail: selectedCustomer?.email ?? undefined,
      });

      toast.success('Order created and sent to kitchen');
      setCart([]);
      setSelectedTable(null);
      setSelectedCustomer(null);
      setShowNewOrder(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    }
  }

  async function handleSendToKitchen(orderId: any) {
    try {
      await updateOrderStatus({ orderId, status: 'sent_to_kitchen' });
      toast.success('Sent to kitchen');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function calculateTipCents(orderTotal: number): number {
    if (tipSelection.type === 'percent') {
      return Math.round(orderTotal * (tipSelection.pct / 100));
    }
    if (tipSelection.type === 'custom') {
      return customTipCents;
    }
    return 0;
  }

  function resetTipState() {
    setTipSelection({ type: 'none' });
    setCustomTipCents(0);
    setShowCashTender(false);
  }

  function resetGiftCardState() {
    setGiftCardCode('');
    setGiftCardBalance(null);
    setGiftCardChecking(false);
    setGiftCardError(null);
    setShowGiftCardPayment(false);
    setGiftCardAppliedAmount(0);
  }

  function formatGiftCardCode(value: string): string {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    const chunks: string[] = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      chunks.push(cleaned.slice(i, i + 4));
    }
    return chunks.join('-');
  }

  async function handleCheckGiftCardBalance() {
    if (!tenantId || giftCardCode.replace(/-/g, '').length < 4) return;
    setGiftCardChecking(true);
    setGiftCardError(null);
    setGiftCardBalance(null);
    try {
      const result = await publicCheckBalance({
        tenantId,
        code: giftCardCode.replace(/-/g, ''),
      });
      if (result.status !== 'active') {
        setGiftCardError('This gift card is not active.');
      } else if (result.balanceCents <= 0) {
        setGiftCardError('This gift card has no remaining balance.');
      } else {
        setGiftCardBalance(result.balanceCents);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid gift card code';
      setGiftCardError(message);
    } finally {
      setGiftCardChecking(false);
    }
  }

  async function handleGiftCardPayment(
    orderId: string,
    orderGrandTotal: number,
    tipCents: number,
  ) {
    if (!tenantId || giftCardBalance === null) return;

    const applyAmount = Math.min(giftCardBalance, orderGrandTotal);

    try {
      await redeemGiftCard({
        tenantId,
        code: giftCardCode.replace(/-/g, ''),
        amountCents: applyAmount,
        orderId,
        staffId: undefined,
      });

      if (applyAmount >= orderGrandTotal) {
        // Gift card covers full amount
        await recordPayment({
          tenantId,
          orderId,
          amount: orderGrandTotal,
          method: 'gift_card',
          tipAmount: tipCents,
          tipMethod: 'cash',
        });
        await updateOrderStatus({ orderId, status: 'completed' });

        const paidOrder = activeOrders?.find((o) => o._id === orderId);
        if (paidOrder?.isTab && paidOrder.tabStatus === 'open') {
          await closeTabMut({ orderId });
        }

        toast.success('Gift card payment recorded, order completed');
        setShowPayDialog(null);
        resetTipState();
        resetGiftCardState();
      } else {
        // Partial payment — show remaining balance options
        setGiftCardAppliedAmount(applyAmount);
        setShowGiftCardPayment(false);
        toast.success(`$${formatCents(applyAmount)} applied from gift card`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gift card redemption failed';
      toast.error(message);
    }
  }

  async function handleCardPayment(
    orderId: any,
    grandTotal: number,
    tipAmount: number
  ) {
    setShowCardPayment(true);
    setCardPaymentError(null);
    setCardPaymentIntentId(null);

    try {
      // Initialize terminal if needed
      if (!stripeTerminal.isInitialized) {
        setCardPaymentPhase('connecting');
        await stripeTerminal.initialize();
      }

      // Auto-discover and connect to the first available reader if not connected
      if (stripeTerminal.connectionStatus !== 'connected') {
        setCardPaymentPhase('connecting');
        const discoveredReaders = await stripeTerminal.discoverReaders();
        if (discoveredReaders.length === 0) {
          throw new Error(
            'No card readers found. Make sure your reader is powered on and connected to the same network.'
          );
        }
        // Connect to the first online reader, or the first reader if none are online
        const onlineReader = discoveredReaders.find((r) => r.status === 'online');
        await stripeTerminal.connectReader(onlineReader || discoveredReaders[0]!);
      }

      setCardPaymentPhase('waiting');

      // Collect payment
      const result = await stripeTerminal.collectPayment({
        amount: grandTotal,
        orderId,
        tenantId: tenantId!,
        tipAmount,
      });

      setCardPaymentIntentId(result.paymentIntentId);
      setCardPaymentPhase('success');

      // Record the payment in the database
      await recordPayment({
        tenantId: tenantId!,
        orderId,
        amount: grandTotal,
        method: 'card',
        stripePaymentIntentId: result.paymentIntentId,
        tipAmount,
        tipMethod: 'card',
      });
      await updateOrderStatus({ orderId, status: 'completed' });

      // Close tab if this order is a tab
      const paidOrder = activeOrders?.find((o) => o._id === orderId);
      if (paidOrder?.isTab && paidOrder.tabStatus === 'open') {
        await closeTabMut({ orderId });
      }

      toast.success('Card payment successful', {
        action: tenant
          ? {
              label: 'Print Receipt',
              onClick: () => {
                const order = activeOrders?.find((o) => o._id === orderId);
                if (order && tenant) {
                  printBrowserReceipt(order, tenant);
                }
              },
            }
          : undefined,
      });

      // Auto-close after a brief delay on success
      setTimeout(() => {
        setShowPayDialog(null);
        setShowCardPayment(false);
        resetTipState();
      }, 1500);
    } catch (err: any) {
      const message = err?.message || 'Card payment failed';
      setCardPaymentError(message);
      setCardPaymentPhase('error');
    }
  }

  async function handleSquareCardPayment(
    orderId: any,
    grandTotal: number,
    tipAmount: number
  ) {
    setShowCardPayment(true);
    setCardPaymentError(null);
    setCardPaymentIntentId(null);
    setCardPaymentPhase('connecting');

    try {
      setCardPaymentPhase('waiting');

      const result = await squareTerminal.collectPayment({
        amount: grandTotal + tipAmount,
        orderId,
      });

      setCardPaymentIntentId(result.checkoutId);
      setCardPaymentPhase('success');

      // Record the payment in the database
      await recordPayment({
        tenantId: tenantId!,
        orderId,
        amount: grandTotal,
        method: 'card',
        stripePaymentIntentId: result.checkoutId, // Re-using the field for Square checkout ID
        tipAmount,
        tipMethod: 'card',
      });
      await updateOrderStatus({ orderId, status: 'completed' });

      // Close tab if this order is a tab
      const paidOrder = activeOrders?.find((o) => o._id === orderId);
      if (paidOrder?.isTab && paidOrder.tabStatus === 'open') {
        await closeTabMut({ orderId });
      }

      toast.success('Card payment successful', {
        action: tenant
          ? {
              label: 'Print Receipt',
              onClick: () => {
                const order = activeOrders?.find((o) => o._id === orderId);
                if (order && tenant) {
                  printBrowserReceipt(order, tenant);
                }
              },
            }
          : undefined,
      });

      // Auto-close after a brief delay on success
      setTimeout(() => {
        setShowPayDialog(null);
        setShowCardPayment(false);
        resetTipState();
      }, 1500);
    } catch (err: any) {
      const message = err?.message || 'Card payment failed';
      setCardPaymentError(message);
      setCardPaymentPhase('error');
    }
  }

  function handleCustomTipInput(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let formatted = parts[0] || '';
    if (parts.length > 1) {
      formatted += '.' + (parts[1] || '').slice(0, 2);
    }
    const dollars = parseFloat(formatted);
    if (isNaN(dollars) || formatted === '') {
      setCustomTipCents(0);
    } else {
      setCustomTipCents(Math.round(dollars * 100));
    }
  }

  async function handleCashPayment(
    orderId: any,
    grandTotal: number,
    tipAmount: number,
    tipMethod: 'cash' | 'card'
  ) {
    try {
      await recordPayment({
        tenantId: tenantId!,
        orderId,
        amount: grandTotal,
        method: 'cash',
        tipAmount,
        tipMethod,
      });
      await updateOrderStatus({ orderId, status: 'completed' });

      // Close tab if this order is a tab
      const paidOrder = activeOrders?.find((o) => o._id === orderId);
      if (paidOrder?.isTab && paidOrder.tabStatus === 'open') {
        await closeTabMut({ orderId });
      }

      toast.success('Cash payment recorded, order completed', {
        action: tenant
          ? {
              label: 'Print Receipt',
              onClick: () => {
                const order = activeOrders?.find((o) => o._id === orderId);
                if (order && tenant) {
                  printBrowserReceipt(order, tenant);
                }
              },
            }
          : undefined,
      });
      setShowPayDialog(null);
      resetTipState();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filteredMenuItems = selectedCat
    ? effectiveMenuItems?.filter((i: any) => i.categoryId === selectedCat)
    : effectiveMenuItems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">{activeOrders?.length ?? 0} active orders</p>
          </div>
          <ConnectionBadge />
        </div>
        <div className="flex items-center gap-2">
          {/* Sync button when there are pending offline orders */}
          {pendingCount > 0 && isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const syncFn = async (order: any) => {
                  await syncOfflineOrder({
                    tenantId: order.tenantId,
                    orders: [{
                      offlineId: order.offlineId ?? String(order.createdAt),
                      source: order.source,
                      items: order.items,
                      subtotal: order.subtotal,
                      tax: order.tax,
                      total: order.total,
                      tableName: order.tableName,
                      tableId: order.tableId,
                      customerName: order.customerName,
                      customerPhone: order.customerPhone,
                      customerEmail: order.customerEmail,
                      timestamp: order.createdAt,
                    }],
                  });
                };
                forceSyncNow(syncFn).then(() => {
                  toast.success('Sync complete');
                }).catch((err) => {
                  toast.error(err?.message || 'Sync failed');
                });
              }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Sync ({pendingCount})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowGiftCardSale(true)}
          >
            <Gift className="mr-2 h-4 w-4" />
            Sell Gift Card
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowOpenTab(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Open Tab
            {(openTabs?.length ?? 0) > 0 && (
              <Badge className="ml-2" variant="secondary">
                {openTabs?.length}
              </Badge>
            )}
          </Button>
          <Button onClick={() => setShowNewOrder(!showNewOrder)}>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      {/* Open Tabs Panel */}
      {openTabs && openTabs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Open Tabs ({openTabs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {openTabs.map((tab: any) => {
                const openedAt = tab.tabOpenedAt as number;
                const elapsedMs = Date.now() - openedAt;
                const elapsedMinutes = Math.floor(elapsedMs / 60000);
                const elapsedHours = Math.floor(elapsedMinutes / 60);
                const remainderMinutes = elapsedMinutes % 60;
                const timeDisplay =
                  elapsedHours > 0
                    ? `${elapsedHours}h ${remainderMinutes}m`
                    : `${elapsedMinutes}m`;

                const isWarning = elapsedMinutes >= 240 && elapsedMinutes < 480;
                const isDanger = elapsedMinutes >= 480;

                const borderClass = isDanger
                  ? 'border-red-500'
                  : isWarning
                    ? 'border-yellow-500'
                    : 'border-border';

                const itemCount = (tab.items as any[]).filter(
                  (i: any) => !i.isVoided
                ).length;

                return (
                  <div
                    key={tab._id}
                    className={`rounded-lg border-2 ${borderClass} p-4 space-y-3`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm">
                          {tab.tabCustomerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{tab.orderNumber}
                          {tab.tableName && ` \u00b7 ${tab.tableName}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">
                          ${formatCents(tab.total)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{timeDisplay}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setActiveTabId(tab._id);
                          setShowNewOrder(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Items
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => setShowPayDialog(tab._id)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Close Tab
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Order - POS Terminal */}
      {showNewOrder && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Menu Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Select Items</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Offline notice */}
                {!isOnline && (
                  <div className="mb-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-300">
                    You are offline. Orders will be saved locally and synced when you reconnect. Cash payments only.
                  </div>
                )}

                {/* Category filter */}
                <div className="flex gap-2 flex-wrap mb-4">
                  <Button
                    variant={selectedCat === null ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCat(null)}
                  >
                    All
                  </Button>
                  {effectiveCategories?.map((cat: any) => (
                    <Button
                      key={cat._id}
                      variant={selectedCat === cat._id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCat(cat._id)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {filteredMenuItems?.map((item) => {
                    const itemType = item.type ?? 'food';
                    const isAlcohol = ALCOHOL_TYPES.includes(itemType);
                    return (
                      <button
                        key={item._id}
                        onClick={() => addToCart(item)}
                        className={`p-3 border rounded-lg text-left hover:bg-accent transition-colors ${isAlcohol ? 'border-amber-300' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          {isAlcohol && <Wine className="h-3 w-3 text-amber-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ${(item.price / 100).toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart / Order Summary */}
          <div>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    {activeTabId ? 'Add to Tab' : 'Order'}
                    {activeTabId && (
                      <Badge variant="secondary" className="text-xs">
                        TAB
                      </Badge>
                    )}
                  </CardTitle>
                  {tables && tables.length > 0 && (
                    <select
                      className="text-sm border rounded px-2 py-1"
                      value={selectedTable ?? ''}
                      onChange={(e) => setSelectedTable(e.target.value || null)}
                    >
                      <option value="">No table</option>
                      {tables
                        .filter((t) => t.status === 'open')
                        .map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Customer Lookup */}
                <CustomerLookup
                  tenantId={tenantId!}
                  selectedCustomer={selectedCustomer}
                  onSelect={setSelectedCustomer}
                />

                {/* Loyalty Points */}
                {selectedCustomer && (
                  <LoyaltyCheckoutSection
                    customerId={selectedCustomer._id}
                    tenantId={tenantId!}
                    orderTotal={total}
                  />
                )}

                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Tap items to add
                  </p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.menuItemId} className="flex items-center justify-between text-sm gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium shrink-0">{item.quantity}x</span>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={item.course ?? 1}
                            onChange={(e) =>
                              setCartItemCourse(item.menuItemId, parseInt(e.target.value))
                            }
                            className="h-7 min-w-[44px] rounded border border-input bg-background px-1 text-xs"
                            aria-label={`Course for ${item.name}`}
                            title="Course number"
                          >
                            <option value={1}>C1</option>
                            <option value={2}>C2</option>
                            <option value={3}>C3</option>
                          </select>
                          <span>${(item.lineTotal / 100).toFixed(2)}</span>
                          <button
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="text-destructive text-xs hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${(subtotal / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
                        <span>${(tax / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>${(total / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    <Button className="w-full" onClick={handleSubmitOrder}>
                      <Send className="mr-2 h-4 w-4" />
                      {activeTabId
                        ? 'Add to Tab'
                        : isOnline
                          ? 'Place Order'
                          : 'Save Offline Order'}
                    </Button>
                    {activeTabId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => {
                          setActiveTabId(null);
                          setCart([]);
                          setShowNewOrder(false);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel Tab Addition
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Active Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeOrders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No active orders
                  </TableCell>
                </TableRow>
              )}
              {activeOrders?.map((order) => {
                const isModifiable = order.status !== 'completed' && order.status !== 'cancelled';
                return (
                  <TableRow key={order._id}>
                    <TableCell className="font-mono font-bold">
                      <span>#{order.orderNumber}</span>
                      {order.isTab && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 h-4 border-blue-400 text-blue-600">
                          TAB
                        </Badge>
                      )}
                      {order.tabCustomerName && (
                        <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                          {order.tabCustomerName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {order.source.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.tableName ?? '-'}</TableCell>
                    <TableCell>
                      <OrderItemsSummary
                        items={order.items}
                        orderId={order._id}
                        isModifiable={isModifiable}
                        onVoid={(itemIndex, itemName, itemTotal) =>
                          setVoidTarget({ orderId: order._id, itemIndex, itemName, itemTotal })
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <OrderTotalDisplay order={order} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === 'ready'
                            ? 'success'
                            : order.status === 'preparing'
                              ? 'warning'
                              : 'secondary'
                        }
                        className="capitalize"
                      >
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.paymentStatus === 'paid' ? 'success' : 'destructive'}
                        className="capitalize"
                      >
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {order.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendToKitchen(order._id)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Kitchen
                          </Button>
                        )}
                        {isModifiable && order.status !== 'open' && (
                          <FireCourseButton
                            orderId={order._id}
                            onFire={fireNextCourse}
                          />
                        )}
                        {isModifiable && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDiscountOrderId(order._id)}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            Discount
                          </Button>
                        )}
                        {isModifiable && !order.isComped && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setCompTarget({
                                orderId: order._id,
                                orderNumber: order.orderNumber,
                                orderTotal: order.total,
                              })
                            }
                          >
                            <Gift className="h-3 w-3 mr-1" />
                            Comp
                          </Button>
                        )}
                        {order.orderType === 'delivery' && doordashEnabled && isModifiable && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeliveryOrderId(order._id)}
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Delivery
                          </Button>
                        )}
                        {order.paymentStatus === 'unpaid' && (
                          <Button
                            size="sm"
                            onClick={() => setShowPayDialog(order._id)}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        <PrintReceiptButton order={order} tenant={tenant} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={!!showPayDialog} onOpenChange={() => { setShowPayDialog(null); resetTipState(); resetGiftCardState(); setShowCardPayment(false); setCardPaymentPhase('connecting'); setCardPaymentError(null); stripeTerminal.cancelCollect(); squareTerminal.cancelCollect(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const dialogOrder = activeOrders?.find((o) => o._id === showPayDialog);
                if (dialogOrder?.isTab) {
                  return `Close Tab \u2014 ${dialogOrder.tabCustomerName}`;
                }
                return 'Process Payment';
              })()}
            </DialogTitle>
          </DialogHeader>
          {showPayDialog && (() => {
            const order = activeOrders?.find((o) => o._id === showPayDialog);
            if (!order) return null;

            const orderTotal = order.total as number;
            const tipCents = calculateTipCents(orderTotal);
            const grandTotal = orderTotal + tipCents;

            if (showCashTender) {
              return (
                <CashTender
                  totalCents={grandTotal}
                  orderNumber={order.orderNumber}
                  tipCents={tipCents}
                  onComplete={() => handleCashPayment(order._id, grandTotal, tipCents, 'cash')}
                  onBack={() => setShowCashTender(false)}
                />
              );
            }

            return (
              <div className="space-y-4">
                {/* Order total display */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Order #{order.orderNumber}</p>
                  <p className="text-2xl font-bold">${formatCents(orderTotal)}</p>
                  {order.isComped && (
                    <Badge variant="destructive" className="mt-1">COMPED</Badge>
                  )}
                  {order.discountAmount && !order.isComped && (
                    <p className="text-xs text-green-600 mt-1">
                      Discount applied: -${formatCents(order.discountAmount)}
                    </p>
                  )}
                </div>

                {/* Loyalty points earned preview */}
                {order.customerName && (
                  <PaymentLoyaltyPreview
                    tenantId={tenantId!}
                    orderTotal={orderTotal}
                    customerName={order.customerName}
                  />
                )}

                <Separator />

                {/* Tip Selection */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-center">Add Tip</p>

                  <div className="grid grid-cols-5 gap-2">
                    {TIP_PRESETS.map(({ label, pct }) => {
                      const isActive = tipSelection.type === 'percent' && tipSelection.pct === pct;
                      return (
                        <Button
                          key={pct}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className="h-10 text-sm font-semibold"
                          onClick={() =>
                            setTipSelection(isActive ? { type: 'none' } : { type: 'percent', pct })
                          }
                        >
                          {label}
                        </Button>
                      );
                    })}
                    <Button
                      variant={tipSelection.type === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className="h-10 text-sm font-semibold"
                      onClick={() => {
                        if (tipSelection.type === 'custom') {
                          setTipSelection({ type: 'none' });
                          setCustomTipCents(0);
                        } else {
                          setTipSelection({ type: 'custom' });
                          setCustomTipCents(0);
                          setTimeout(() => customTipInputRef.current?.focus(), 50);
                        }
                      }}
                    >
                      Custom
                    </Button>
                  </div>

                  {/* Custom tip input */}
                  {tipSelection.type === 'custom' && (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={customTipInputRef}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="pl-9 text-lg font-bold h-12 text-right"
                        onChange={(e) => handleCustomTipInput(e.target.value)}
                      />
                    </div>
                  )}

                  {/* No Tip button */}
                  {tipSelection.type !== 'none' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => {
                        setTipSelection({ type: 'none' });
                        setCustomTipCents(0);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      No Tip
                    </Button>
                  )}
                </div>

                {/* Tip + Grand Total summary */}
                {tipCents > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order Total</span>
                      <span>${formatCents(orderTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tip</span>
                      <span className="text-green-600 font-medium">+${formatCents(tipCents)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>${formatCents(grandTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Card Payment Flow */}
                {showCardPayment && (
                  <div className="space-y-4">
                    {cardPaymentPhase === 'connecting' && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="font-medium">Connecting to card reader...</p>
                        <p className="text-sm text-muted-foreground">
                          Discovering available readers on your network
                        </p>
                      </div>
                    )}

                    {cardPaymentPhase === 'waiting' && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <div className="relative">
                          <CreditCard className="h-10 w-10 text-primary" />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                          </span>
                        </div>
                        <p className="font-medium">
                          {tenant?.paymentProcessor === 'square'
                            ? 'Waiting for card on Square Terminal...'
                            : 'Waiting for card...'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Present, insert, or tap card on the reader
                        </p>
                        <p className="text-lg font-bold">${formatCents(grandTotal)}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (tenant?.paymentProcessor === 'square') {
                              squareTerminal.cancelCollect();
                            } else {
                              stripeTerminal.cancelCollect();
                            }
                            setShowCardPayment(false);
                            setCardPaymentPhase('connecting');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {cardPaymentPhase === 'processing' && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="font-medium">Processing payment...</p>
                        <p className="text-sm text-muted-foreground">
                          Do not remove the card
                        </p>
                      </div>
                    )}

                    {cardPaymentPhase === 'success' && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                        <p className="font-medium text-green-600">Payment Successful</p>
                        <p className="text-lg font-bold">${formatCents(grandTotal)}</p>
                        <LoyaltyEarnedMessage pointsEarned={loyaltyPointsEarned} />
                      </div>
                    )}

                    {cardPaymentPhase === 'error' && (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                        <p className="font-medium text-destructive">Payment Failed</p>
                        <p className="text-sm text-muted-foreground text-center max-w-xs">
                          {cardPaymentError || 'An unexpected error occurred'}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowCardPayment(false);
                              setCardPaymentPhase('connecting');
                              setCardPaymentError(null);
                            }}
                          >
                            Back
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (tenant?.paymentProcessor === 'square') {
                                handleSquareCardPayment(order._id, grandTotal, tipCents);
                              } else {
                                handleCardPayment(order._id, grandTotal, tipCents);
                              }
                            }}
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gift Card Payment Section */}
                {showGiftCardPayment && !showCardPayment && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Pay with Gift Card
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={giftCardCode}
                        onChange={(e) => setGiftCardCode(formatGiftCardCode(e.target.value))}
                        className="font-mono text-sm tracking-wider"
                        maxLength={19}
                        aria-label="Gift card code"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={giftCardChecking || giftCardCode.replace(/-/g, '').length < 4}
                        onClick={handleCheckGiftCardBalance}
                      >
                        {giftCardChecking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Check'
                        )}
                      </Button>
                    </div>
                    {giftCardError && (
                      <p className="text-sm text-destructive">{giftCardError}</p>
                    )}
                    {giftCardBalance !== null && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm bg-muted/50 rounded-md p-2">
                          <span className="text-muted-foreground">Card Balance</span>
                          <span className="font-bold">${formatCents(giftCardBalance)}</span>
                        </div>
                        {giftCardBalance >= grandTotal ? (
                          <Button
                            className="w-full"
                            onClick={() => handleGiftCardPayment(order._id, grandTotal, tipCents)}
                          >
                            <Gift className="mr-2 h-4 w-4" />
                            Pay ${formatCents(grandTotal)} with Gift Card
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground text-center">
                              Apply ${formatCents(giftCardBalance)} from gift card — remaining ${formatCents(grandTotal - giftCardBalance)} via Cash or Card
                            </p>
                            <Button
                              className="w-full"
                              onClick={() => handleGiftCardPayment(order._id, grandTotal, tipCents)}
                            >
                              <Gift className="mr-2 h-4 w-4" />
                              Apply ${formatCents(giftCardBalance)} Gift Card
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => {
                        setShowGiftCardPayment(false);
                        resetGiftCardState();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Gift Card Applied — Remaining Balance */}
                {giftCardAppliedAmount > 0 && !showCardPayment && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-800 flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5" />
                        Gift Card Applied
                      </span>
                      <span className="font-bold text-green-700">
                        -${formatCents(giftCardAppliedAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>Remaining Due</span>
                      <span>${formatCents(grandTotal - giftCardAppliedAmount)}</span>
                    </div>
                  </div>
                )}

                {/* Payment method buttons */}
                {!showCardPayment && !showGiftCardPayment && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        className="h-16"
                        variant="outline"
                        onClick={() => {
                          if (giftCardAppliedAmount > 0) {
                            handleCashPayment(order._id, grandTotal - giftCardAppliedAmount, tipCents, 'cash');
                          } else {
                            setShowCashTender(true);
                          }
                        }}
                      >
                        <DollarSign className="mr-2 h-5 w-5" />
                        Cash
                      </Button>
                      <Button
                        className="h-16"
                        disabled={!isOnline}
                        onClick={() => {
                          if (!isOnline) {
                            toast.error('Card payments are not available while offline. Use cash instead.');
                            return;
                          }
                          const payTotal = giftCardAppliedAmount > 0
                            ? grandTotal - giftCardAppliedAmount
                            : grandTotal;
                          const proc = tenant?.paymentProcessor;
                          if (proc === 'stripe') {
                            handleCardPayment(order._id, payTotal, tipCents);
                          } else if (proc === 'square') {
                            handleSquareCardPayment(order._id, payTotal, tipCents);
                          } else {
                            toast.info(
                              'Card payments require a payment processor. Configure in Settings > Payments.'
                            );
                          }
                        }}
                      >
                        <CreditCard className="mr-2 h-5 w-5" />
                        {isOnline ? 'Card' : 'Card (Offline)'}
                      </Button>
                    </div>
                    {giftCardAppliedAmount === 0 && (
                      <Button
                        className="w-full h-12"
                        variant="outline"
                        onClick={() => setShowGiftCardPayment(true)}
                      >
                        <Gift className="mr-2 h-4 w-4" />
                        Gift Card
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      {discountOrderId && (() => {
        const order = activeOrders?.find((o) => o._id === discountOrderId);
        if (!order) return null;
        const activeSubtotal = order.items.reduce((sum: number, item: any) => {
          if (item.isVoided) return sum;
          return sum + item.lineTotal;
        }, 0);
        return (
          <DiscountDialog
            open={!!discountOrderId}
            onOpenChange={(open) => { if (!open) setDiscountOrderId(null); }}
            orderId={order._id as Id<"orders">}
            orderSubtotal={activeSubtotal}
            tenantId={tenantId!}
            hasDiscount={!!order.discountType}
            currentDiscountType={order.discountType}
            currentDiscountValue={order.discountValue}
            currentDiscountAmount={order.discountAmount}
            isComped={order.isComped}
          />
        );
      })()}

      {/* Void Item Dialog */}
      <VoidItemDialog
        open={!!voidTarget}
        onOpenChange={(open) => { if (!open) setVoidTarget(null); }}
        orderId={voidTarget?.orderId as Id<"orders"> | null}
        itemIndex={voidTarget?.itemIndex ?? null}
        itemName={voidTarget?.itemName ?? ''}
        itemTotal={voidTarget?.itemTotal ?? 0}
      />

      {/* Comp Order Dialog */}
      <CompDialog
        open={!!compTarget}
        onOpenChange={(open) => { if (!open) setCompTarget(null); }}
        orderId={compTarget?.orderId as Id<"orders"> | null}
        orderNumber={compTarget?.orderNumber ?? 0}
        orderTotal={compTarget?.orderTotal ?? 0}
      />

      {/* Open Tab Dialog */}
      <OpenTabDialog
        open={showOpenTab}
        onOpenChange={setShowOpenTab}
        tenantId={tenantId!}
        tables={(tables ?? []) as Array<{ _id: Id<'tables'>; name: string; status: string }>}
        onTabOpened={() => setShowOpenTab(false)}
      />

      {/* Delivery Panel Dialog */}
      <Dialog
        open={!!deliveryOrderId}
        onOpenChange={(open) => { if (!open) setDeliveryOrderId(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Management
            </DialogTitle>
          </DialogHeader>
          {deliveryOrderId && (() => {
            const order = activeOrders?.find((o) => o._id === deliveryOrderId);
            if (!order) return null;
            return (
              <DeliveryPanel
                orderId={order._id as Id<"orders">}
                tenantId={tenantId!}
                order={order}
                doordashEnabled={doordashEnabled}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Gift Card Sale Dialog */}
      {tenantId && (
        <GiftCardSaleDialog
          open={showGiftCardSale}
          onOpenChange={setShowGiftCardSale}
          tenantId={tenantId}
        />
      )}
    </div>
  );
}

// ==================== Helper Components ====================

/** Displays order items with void buttons for each non-voided item */
function OrderItemsSummary({
  items,
  isModifiable,
  onVoid,
}: {
  items: any[];
  orderId: string;
  isModifiable: boolean;
  onVoid: (itemIndex: number, itemName: string, itemTotal: number) => void;
}) {
  const activeCount = items.filter((i: any) => !i.isVoided).length;
  const voidedCount = items.filter((i: any) => i.isVoided).length;

  return (
    <div className="space-y-1">
      {items.map((item: any, idx: number) => (
        <div
          key={idx}
          className={`flex items-center gap-1 text-xs ${item.isVoided ? 'line-through text-muted-foreground' : ''}`}
        >
          <span>
            {item.quantity}x {item.name}
          </span>
          {item.isVoided && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
              VOID
            </Badge>
          )}
          {!item.isVoided && isModifiable && (
            <button
              onClick={() => onVoid(idx, item.name, item.lineTotal)}
              className="text-destructive hover:text-destructive/80 ml-1 shrink-0"
              title={`Void ${item.name}`}
            >
              <Ban className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {voidedCount > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {activeCount} active, {voidedCount} voided
        </p>
      )}
    </div>
  );
}

/** Displays order total with discount/comp info */
function OrderTotalDisplay({ order }: { order: any }) {
  if (order.isComped) {
    return (
      <div>
        <span className="line-through text-muted-foreground text-xs">
          ${formatCents(order.subtotal + order.tax)}
        </span>
        <div className="flex items-center gap-1">
          <span>$0.00</span>
          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
            COMPED
          </Badge>
        </div>
      </div>
    );
  }

  if (order.discountAmount && order.discountAmount > 0) {
    const originalTotal = order.subtotal + order.tax + order.discountAmount;
    return (
      <div>
        <span className="line-through text-muted-foreground text-xs">
          ${formatCents(originalTotal)}
        </span>
        <div className="flex items-center gap-1">
          <span>${formatCents(order.total)}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-green-600">
            -{formatCents(order.discountAmount)}
          </Badge>
        </div>
      </div>
    );
  }

  return <span>${formatCents(order.total)}</span>;
}

/** Print receipt button with dropdown: Browser Print + Thermal Printer */
function PrintReceiptButton({ order, tenant }: { order: any; tenant: any }) {
  const thermalSupported = isPrinterSupported();

  function handleBrowserPrint() {
    if (!tenant) {
      toast.error('Tenant data not loaded');
      return;
    }
    try {
      printBrowserReceipt(order, tenant);
    } catch (err: any) {
      toast.error(err.message || 'Failed to print receipt');
    }
  }

  async function handleThermalPrint() {
    if (!tenant) {
      toast.error('Tenant data not loaded');
      return;
    }
    try {
      const receipt = formatReceipt(order, tenant);
      await printEscPosReceipt(receipt);
      toast.success('Receipt sent to printer');
    } catch (err: any) {
      if (err.message?.includes('No port selected')) {
        // User cancelled the port picker — not an error
        return;
      }
      toast.error(err.message || 'Failed to print to thermal printer');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Printer className="h-3 w-3 mr-1" />
          Print
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleBrowserPrint}>
          Browser Print
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleThermalPrint}
          disabled={!thermalSupported}
        >
          {thermalSupported ? 'Thermal Printer' : 'Thermal (not supported)'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Shows a small loyalty preview banner in the payment dialog */
function PaymentLoyaltyPreview({
  tenantId,
  orderTotal,
  customerName,
}: {
  tenantId: Id<'tenants'>;
  orderTotal: number;
  customerName: string;
}) {
  const loyaltySettings = useQuery(api.loyalty.queries.getSettings, { tenantId });

  if (!loyaltySettings?.enabled) return null;

  const baseRate = loyaltySettings.pointsPerDollar ?? 1;
  const orderDollars = orderTotal / 100;
  const pointsToEarn = Math.round(orderDollars * baseRate);

  if (pointsToEarn <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-400">
      <Star className="h-3 w-3" />
      <span>
        {customerName} will earn <span className="font-semibold">{pointsToEarn} points</span> from this order
      </span>
    </div>
  );
}

/**
 * Fire Next Course button — shows pending course count and fires next course on click.
 * Only renders when there are pending courses to fire.
 */
function FireCourseButton({
  orderId,
  onFire,
}: {
  orderId: Id<'orders'>;
  onFire: (args: { orderId: Id<'orders'> }) => Promise<{ firedCourse: number; remainingCourses: number[] }>;
}) {
  const pendingCourses = useQuery(api.kds.queries.getPendingCourses, { orderId });
  const [firing, setFiring] = useState(false);

  if (!pendingCourses || pendingCourses.pendingCourses.length === 0) return null;

  async function handleFire() {
    setFiring(true);
    try {
      const result = await onFire({ orderId });
      toast.success(`Course ${result.firedCourse} fired to kitchen`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fire course';
      toast.error(message);
    } finally {
      setFiring(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleFire}
      disabled={firing}
      className="text-orange-600 border-orange-300 hover:bg-orange-50"
    >
      <Flame className="h-3 w-3 mr-1" />
      Fire C{pendingCourses.pendingCourses[0]} ({pendingCourses.pendingCourses.length})
    </Button>
  );
}
