"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@restaurantos/backend";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@restaurantos/ui";
import { Button } from "@restaurantos/ui";
import { Input } from "@restaurantos/ui";
import { Label } from "@restaurantos/ui";
import { Badge } from "@restaurantos/ui";
import type { Id, Doc } from "@restaurantos/backend/dataModel";

type SplitMode = "equal" | "by_amount" | "by_item";

interface SplitRow {
  amount: number; // cents
  method: "card" | "cash";
}

interface ItemAssignment {
  splitIndex: number;
}

interface OrderForSplit {
  _id: Id<"orders">;
  total: number;
  items: Array<{ name: string; quantity: number; lineTotal: number }>;
}

export interface SplitBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderForSplit;
  tenantId: Id<"tenants">;
  onComplete: () => void;
}

export function SplitBillDialog({
  open,
  onOpenChange,
  order,
  tenantId,
  onComplete,
}: SplitBillDialogProps) {
  const [mode, setMode] = useState<SplitMode>("equal");
  const [numberOfSplits, setNumberOfSplits] = useState(2);
  const [equalMethod, setEqualMethod] = useState<"card" | "cash">("card");
  const [amountRows, setAmountRows] = useState<SplitRow[]>([
    { amount: 0, method: "card" },
    { amount: 0, method: "card" },
  ]);
  const [itemAssignments, setItemAssignments] = useState<
    Record<number, ItemAssignment>
  >({});
  const [itemSplitCount, setItemSplitCount] = useState(2);
  const [itemMethods, setItemMethods] = useState<Record<number, "card" | "cash">>({});
  const [processing, setProcessing] = useState(false);

  const splitPayment = useMutation(api.orders.split.splitPayment);

  const orderTotal = order?.total ?? 0;

  // Equal split calculations
  const equalAmount = useMemo(() => {
    if (numberOfSplits <= 0) return 0;
    return Math.floor(orderTotal / numberOfSplits);
  }, [orderTotal, numberOfSplits]);

  const equalRemainder = useMemo(() => {
    if (numberOfSplits <= 0) return 0;
    return orderTotal - equalAmount * numberOfSplits;
  }, [orderTotal, equalAmount, numberOfSplits]);

  // By Amount calculations
  const amountTotal = useMemo(() => {
    return amountRows.reduce((sum, row) => sum + row.amount, 0);
  }, [amountRows]);

  const amountRemaining = orderTotal - amountTotal;

  // By Item calculations
  const itemSplitTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let i = 0; i < itemSplitCount; i++) {
      totals[i] = 0;
    }
    if (order?.items) {
      order.items.forEach((item: any, idx: number) => {
        const assignment = itemAssignments[idx];
        if (assignment !== undefined) {
          totals[assignment.splitIndex] =
            (totals[assignment.splitIndex] || 0) + item.lineTotal;
        }
      });
    }
    return totals;
  }, [order?.items, itemAssignments, itemSplitCount]);

  const allItemsAssigned = useMemo(() => {
    if (!order?.items) return false;
    return order.items.every(
      (_: any, idx: number) => itemAssignments[idx] !== undefined
    );
  }, [order?.items, itemAssignments]);

  const itemTotal = useMemo(() => {
    return Object.values(itemSplitTotals).reduce((a, b) => a + b, 0);
  }, [itemSplitTotals]);

  const isValid = useMemo(() => {
    if (mode === "equal") {
      return numberOfSplits >= 2;
    }
    if (mode === "by_amount") {
      return amountRemaining === 0 && amountRows.length >= 2;
    }
    if (mode === "by_item") {
      return allItemsAssigned && itemTotal === orderTotal;
    }
    return false;
  }, [
    mode,
    numberOfSplits,
    amountRemaining,
    amountRows.length,
    allItemsAssigned,
    itemTotal,
    orderTotal,
  ]);

  function buildSplits(): { amount: number; method: "card" | "cash" }[] {
    if (mode === "equal") {
      return Array.from({ length: numberOfSplits }, (_, i) => ({
        amount: equalAmount + (i === 0 ? equalRemainder : 0),
        method: equalMethod,
      }));
    }
    if (mode === "by_amount") {
      return amountRows.map((row) => ({
        amount: row.amount,
        method: row.method,
      }));
    }
    if (mode === "by_item") {
      const splits: { amount: number; method: "card" | "cash" }[] = [];
      for (let i = 0; i < itemSplitCount; i++) {
        const total = itemSplitTotals[i] || 0;
        if (total > 0) {
          splits.push({ amount: total, method: itemMethods[i] || "card" });
        }
      }
      return splits;
    }
    return [];
  }

  async function handleProcessSplit() {
    if (!isValid) return;
    setProcessing(true);
    try {
      const splits = buildSplits();
      await splitPayment({
        tenantId,
        orderId: order._id,
        splits,
      });
      toast.success("Bill split successfully");
      onComplete();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to split bill");
    } finally {
      setProcessing(false);
    }
  }

  function addAmountRow() {
    setAmountRows([...amountRows, { amount: 0, method: "card" }]);
  }

  function removeAmountRow(index: number) {
    if (amountRows.length <= 2) return;
    setAmountRows(amountRows.filter((_, i) => i !== index));
  }

  function updateAmountRow(
    index: number,
    field: "amount" | "method",
    value: any
  ) {
    const updated = [...amountRows];
    if (field === "amount") {
      updated[index] = { ...updated[index]!, amount: Math.round(value * 100) };
    } else {
      updated[index] = { ...updated[index]!, method: value };
    }
    setAmountRows(updated);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Bill</DialogTitle>
          <DialogDescription className="sr-only">Split the bill between multiple payments</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Total */}
          <div className="flex items-center justify-between rounded-md bg-muted p-3">
            <span className="text-sm font-medium">Order Total</span>
            <span className="text-lg font-bold">
              ${(orderTotal / 100).toFixed(2)}
            </span>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-2">
            {(
              [
                { key: "equal", label: "Equal" },
                { key: "by_amount", label: "By Amount" },
                { key: "by_item", label: "By Item" },
              ] as const
            ).map(({ key, label }) => (
              <Button
                key={key}
                variant={mode === key ? "default" : "outline"}
                size="sm"
                onClick={() => setMode(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Equal Split */}
          {mode === "equal" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label>Split into</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={numberOfSplits}
                  onChange={(e) =>
                    setNumberOfSplits(Math.max(2, parseInt(e.target.value) || 2))
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">ways</span>
              </div>
              <div className="flex items-center gap-3">
                <Label>Payment Method</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={equalMethod === "card" ? "default" : "outline"}
                    onClick={() => setEqualMethod("card")}
                  >
                    Card
                  </Button>
                  <Button
                    size="sm"
                    variant={equalMethod === "cash" ? "default" : "outline"}
                    onClick={() => setEqualMethod("cash")}
                  >
                    Cash
                  </Button>
                </div>
              </div>
              <div className="rounded-md border p-3 space-y-1">
                {Array.from({ length: numberOfSplits }, (_, i) => {
                  const amt = equalAmount + (i === 0 ? equalRemainder : 0);
                  return (
                    <div
                      key={i}
                      className="flex justify-between text-sm"
                    >
                      <span>Person {i + 1}</span>
                      <span>${(amt / 100).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By Amount */}
          {mode === "by_amount" && (
            <div className="space-y-3">
              {amountRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Label className="w-16 shrink-0">Split {i + 1}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={row.amount > 0 ? (row.amount / 100).toFixed(2) : ""}
                    onChange={(e) =>
                      updateAmountRow(
                        i,
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-28"
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={row.method === "card" ? "default" : "outline"}
                      onClick={() => updateAmountRow(i, "method", "card")}
                    >
                      Card
                    </Button>
                    <Button
                      size="sm"
                      variant={row.method === "cash" ? "default" : "outline"}
                      onClick={() => updateAmountRow(i, "method", "cash")}
                    >
                      Cash
                    </Button>
                  </div>
                  {amountRows.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAmountRow(i)}
                    >
                      X
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addAmountRow}>
                + Add Split
              </Button>
              <div className="flex justify-between text-sm rounded-md bg-muted p-2">
                <span>Remaining</span>
                <span
                  className={
                    amountRemaining === 0
                      ? "text-green-600"
                      : "text-destructive"
                  }
                >
                  ${(amountRemaining / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* By Item */}
          {mode === "by_item" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label>Number of splits</Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={itemSplitCount}
                  onChange={(e) =>
                    setItemSplitCount(
                      Math.max(2, parseInt(e.target.value) || 2)
                    )
                  }
                  className="w-20"
                />
              </div>

              {/* Item list with assignment */}
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-2">
                {order?.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="truncate">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        ${(item.lineTotal / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: itemSplitCount }, (_, si) => (
                        <Button
                          key={si}
                          size="sm"
                          variant={
                            itemAssignments[idx]?.splitIndex === si
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setItemAssignments({
                              ...itemAssignments,
                              [idx]: { splitIndex: si },
                            })
                          }
                          className="w-8 h-8 p-0"
                        >
                          {si + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Split totals with method selectors */}
              <div className="space-y-2">
                {Array.from({ length: itemSplitCount }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Split {i + 1}</Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={
                            (itemMethods[i] || "card") === "card"
                              ? "default"
                              : "outline"
                          }
                          onClick={() =>
                            setItemMethods({ ...itemMethods, [i]: "card" })
                          }
                          className="h-6 text-xs px-2"
                        >
                          Card
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            itemMethods[i] === "cash" ? "default" : "outline"
                          }
                          onClick={() =>
                            setItemMethods({ ...itemMethods, [i]: "cash" })
                          }
                          className="h-6 text-xs px-2"
                        >
                          Cash
                        </Button>
                      </div>
                    </div>
                    <span>
                      ${((itemSplitTotals[i] || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {!allItemsAssigned && (
                <p className="text-xs text-destructive">
                  Assign all items to a split to continue.
                </p>
              )}
            </div>
          )}

          {/* Validation message */}
          {!isValid && mode === "by_amount" && amountRows.length >= 2 && (
            <p className="text-xs text-destructive">
              Split amounts must equal the order total.
            </p>
          )}

          {/* Process Button */}
          <Button
            className="w-full"
            disabled={!isValid || processing}
            onClick={handleProcessSplit}
          >
            {processing ? "Processing..." : "Process Split"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
