'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { Button, Badge } from '@restaurantos/ui';
import { Check, RotateCcw, Clock, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_COLORS: Record<string, string> = {
  'Dine-In': 'bg-blue-500',
  Online: 'bg-green-500',
  DoorDash: 'bg-red-500',
  'Uber Eats': 'bg-green-600',
  Grubhub: 'bg-orange-500',
};

function getTimerColor(elapsedMs: number): string {
  const minutes = elapsedMs / 60000;
  if (minutes < 5) return 'text-green-600';
  if (minutes < 10) return 'text-yellow-600';
  return 'text-red-600';
}

function formatTimer(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function TicketTimer({ receivedAt }: { receivedAt: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - receivedAt);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - receivedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [receivedAt]);

  return (
    <span className={`font-mono text-lg font-bold ${getTimerColor(elapsed)}`}>
      {formatTimer(elapsed)}
    </span>
  );
}

export default function KDSPage() {
  const tenants = useQuery(api.tenants.queries.list, {});
  const tenantId = tenants?.[0]?._id;

  const tickets = useQuery(
    api.kds.queries.getActiveTickets,
    tenantId ? { tenantId } : 'skip'
  );
  const recallQueue = useQuery(
    api.kds.queries.getRecallQueue,
    tenantId ? { tenantId } : 'skip'
  );

  const bumpTicket = useMutation(api.kds.mutations.bumpTicket);
  const bumpItem = useMutation(api.kds.mutations.bumpItem);
  const recallTicket = useMutation(api.kds.mutations.recallTicket);

  const [showRecall, setShowRecall] = useState(false);

  if (!tenantId) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  async function handleBumpTicket(ticketId: any) {
    try {
      const result = await bumpTicket({ ticketId });
      toast.success(`Order #${result.orderNumber} bumped`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleBumpItem(ticketId: any, itemIndex: number) {
    try {
      await bumpItem({ ticketId, itemIndex });
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleRecall(ticketId: any) {
    try {
      await recallTicket({ ticketId });
      toast.success('Ticket recalled');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      {/* KDS Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Kitchen Display</h1>
          <Badge variant="outline">{tickets?.length ?? 0} active</Badge>
        </div>
        <Button
          variant={showRecall ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowRecall(!showRecall)}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Recall ({recallQueue?.length ?? 0})
        </Button>
      </div>

      {/* Recall Queue */}
      {showRecall && recallQueue && recallQueue.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3">Recently Bumped (tap to recall)</h3>
          <div className="flex gap-2 flex-wrap">
            {recallQueue.map((item) => (
              <button
                key={item._id}
                onClick={() => handleRecall(item.ticketId)}
                className="px-3 py-2 border rounded-md text-sm hover:bg-accent transition-colors"
              >
                <span className="font-mono font-bold">#{item.orderNumber}</span>
                <span className="text-muted-foreground ml-2">{item.source}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tickets?.map((ticket) => (
          <div
            key={ticket._id}
            className={`border-2 rounded-lg overflow-hidden ${
              ticket.status === 'in_progress' ? 'border-yellow-400' : 'border-border'
            }`}
          >
            {/* Ticket Header */}
            <div className="flex items-center justify-between p-3 bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-bold">#{ticket.orderNumber}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                    SOURCE_COLORS[ticket.sourceBadge] ?? 'bg-gray-500'
                  }`}
                >
                  {ticket.sourceBadge}
                </span>
              </div>
              <TicketTimer receivedAt={ticket.receivedAt} />
            </div>

            {/* Table / Customer */}
            {(ticket.tableName || ticket.customerName) && (
              <div className="px-3 py-1.5 bg-muted/20 text-sm border-b">
                {ticket.tableName && (
                  <span className="font-medium">{ticket.tableName}</span>
                )}
                {ticket.tableName && ticket.customerName && ' — '}
                {ticket.customerName && (
                  <span className="text-muted-foreground">{ticket.customerName}</span>
                )}
              </div>
            )}

            {/* Estimated pickup for delivery */}
            {ticket.estimatedPickupTime && (
              <div className="px-3 py-1 bg-yellow-50 text-xs flex items-center gap-1 border-b">
                <Clock className="h-3 w-3" />
                Pickup: {new Date(ticket.estimatedPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            {/* Items */}
            <div className="p-3 space-y-2">
              {ticket.items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleBumpItem(ticket._id, idx)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    item.isBumped
                      ? 'bg-green-50 line-through text-muted-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{item.quantity}x</span>
                    <span className="font-medium">{item.name}</span>
                    {item.isBumped && <Check className="h-4 w-4 text-green-600 ml-auto" />}
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="ml-8 text-sm text-muted-foreground">
                      {item.modifiers.join(', ')}
                    </div>
                  )}
                  {item.specialInstructions && (
                    <div className="ml-8 text-sm text-red-600 font-medium">
                      !! {item.specialInstructions}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Bump Button */}
            <div className="p-3 pt-0">
              <Button
                className="w-full h-12 text-base"
                onClick={() => handleBumpTicket(ticket._id)}
              >
                <Check className="mr-2 h-5 w-5" />
                BUMP
              </Button>
            </div>
          </div>
        ))}

        {tickets?.length === 0 && (
          <div className="col-span-full text-center py-20 text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No active tickets</p>
            <p className="text-sm">Orders will appear here in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
