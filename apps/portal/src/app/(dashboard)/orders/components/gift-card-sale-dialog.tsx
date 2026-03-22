'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import type { Id } from '@restaurantos/backend/dataModel';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Separator,
} from '@restaurantos/ui';
import { Gift, CreditCard, Smartphone, Copy, Printer, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCents } from '@/lib/format';

const PRESET_AMOUNTS = [2500, 5000, 10000] as const;
const MIN_AMOUNT_CENTS = 1000;
const MAX_AMOUNT_CENTS = 50000;

interface GiftCardSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: Id<'tenants'>;
}

type DialogPhase = 'configure' | 'selling' | 'success';

export function GiftCardSaleDialog({
  open,
  onOpenChange,
  tenantId,
}: GiftCardSaleDialogProps) {
  const purchaseGiftCard = useMutation(api.giftCards.mutations.purchaseGiftCard);

  const [phase, setPhase] = useState<DialogPhase>('configure');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isDigital, setIsDigital] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [purchaserName, setPurchaserName] = useState('');

  // Success state
  const [resultCode, setResultCode] = useState('');
  const [resultAmount, setResultAmount] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);

  function resetState() {
    setPhase('configure');
    setSelectedAmount(null);
    setCustomAmountInput('');
    setIsCustom(false);
    setIsDigital(false);
    setRecipientName('');
    setRecipientEmail('');
    setPurchaserName('');
    setResultCode('');
    setResultAmount(0);
    setCodeCopied(false);
  }

  function getAmountCents(): number {
    if (isCustom) {
      const dollars = parseFloat(customAmountInput);
      if (isNaN(dollars)) return 0;
      return Math.round(dollars * 100);
    }
    return selectedAmount ?? 0;
  }

  function handleCustomAmountInput(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let formatted = parts[0] || '';
    if (parts.length > 1) {
      formatted += '.' + (parts[1] || '').slice(0, 2);
    }
    setCustomAmountInput(formatted);
  }

  function isAmountValid(): boolean {
    const cents = getAmountCents();
    return cents >= MIN_AMOUNT_CENTS && cents <= MAX_AMOUNT_CENTS;
  }

  function isFormValid(): boolean {
    if (!isAmountValid()) return false;
    if (isDigital && !recipientEmail.trim()) return false;
    return true;
  }

  async function handleSell() {
    const amountCents = getAmountCents();
    if (!isFormValid()) return;

    setPhase('selling');

    try {
      const result = await purchaseGiftCard({
        tenantId,
        amountCents,
        purchaserName: purchaserName.trim() || undefined,
        recipientName: isDigital && recipientName.trim() ? recipientName.trim() : undefined,
        recipientEmail: isDigital && recipientEmail.trim() ? recipientEmail.trim() : undefined,
        isDigital,
      });

      setResultCode(result.code);
      setResultAmount(amountCents);
      setPhase('success');
      toast.success('Gift card created successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create gift card';
      toast.error(message);
      setPhase('configure');
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(resultCode).then(() => {
      setCodeCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy code');
    });
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gift Card</title>
        <style>
          body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
          .code { font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 24px 0; }
          .amount { font-size: 24px; color: #16a34a; font-weight: bold; margin-bottom: 16px; }
          .label { color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <p class="label">Gift Card</p>
        <p class="amount">$${formatCents(resultAmount)}</p>
        <p class="code">${resultCode}</p>
        <p class="label">Present this code at checkout to redeem.</p>
        <script>window.print(); window.close();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Sell Gift Card
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create and sell a new gift card
          </DialogDescription>
        </DialogHeader>

        {phase === 'configure' && (
          <div className="space-y-5">
            {/* Amount Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((amount) => {
                  const isActive = !isCustom && selectedAmount === amount;
                  return (
                    <Button
                      key={amount}
                      variant={isActive ? 'default' : 'outline'}
                      className="h-12 text-lg font-bold"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setIsCustom(false);
                        setCustomAmountInput('');
                      }}
                    >
                      ${formatCents(amount)}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant={isCustom ? 'default' : 'outline'}
                className="w-full"
                onClick={() => {
                  setIsCustom(true);
                  setSelectedAmount(null);
                }}
              >
                Custom Amount
              </Button>
              {isCustom && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={customAmountInput}
                    onChange={(e) => handleCustomAmountInput(e.target.value)}
                    className="pl-7 text-lg font-bold h-12 text-right"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Min ${formatCents(MIN_AMOUNT_CENTS)} — Max ${formatCents(MAX_AMOUNT_CENTS)}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Digital / Physical Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Card Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={!isDigital ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setIsDigital(false)}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Physical
                </Button>
                <Button
                  variant={isDigital ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setIsDigital(true)}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Digital
                </Button>
              </div>
            </div>

            {/* Purchaser Name */}
            <div className="space-y-2">
              <Label htmlFor="gc-purchaser">Purchaser Name (optional)</Label>
              <Input
                id="gc-purchaser"
                value={purchaserName}
                onChange={(e) => setPurchaserName(e.target.value)}
                placeholder="Customer name"
              />
            </div>

            {/* Digital-only fields */}
            {isDigital && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="gc-recipient">Recipient Name</Label>
                  <Input
                    id="gc-recipient"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient's name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gc-email">
                    Recipient Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="gc-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="recipient@email.com"
                    required
                  />
                </div>
              </>
            )}

            {/* Summary + Sell Button */}
            {isAmountValid() && (
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm text-muted-foreground">Gift Card Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  ${formatCents(getAmountCents())}
                </p>
              </div>
            )}

            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={!isFormValid()}
              onClick={handleSell}
            >
              <Gift className="mr-2 h-5 w-5" />
              Sell Gift Card
            </Button>
          </div>
        )}

        {phase === 'selling' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Creating gift card...</p>
          </div>
        )}

        {phase === 'success' && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-600">Gift Card Created</p>
              <p className="text-3xl font-bold">${formatCents(resultAmount)}</p>
            </div>

            {/* Prominent code display */}
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-muted/30 p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Gift Card Code
              </p>
              <p className="text-3xl font-mono font-bold tracking-widest select-all">
                {resultCode}
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleCopyCode}>
                {codeCopied ? (
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {codeCopied ? 'Copied' : 'Copy Code'}
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
