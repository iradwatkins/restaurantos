'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { useKdsAudio } from '@/hooks/use-kds-audio';
import { Button, Badge } from '@restaurantos/ui';
import type { Id } from '@restaurantos/backend/dataModel';
import { Check, RotateCcw, Clock, ChefHat, Volume2, VolumeX } from 'lucide-react';
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

function getTimerUrgencyLabel(elapsedMs: number): string {
  const minutes = elapsedMs / 60000;
  if (minutes < 5) return '';
  if (minutes < 10) return 'SLOW';
  return 'LATE';
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

  const urgencyLabel = getTimerUrgencyLabel(elapsed);

  return (
    <span className={`font-mono text-lg font-bold ${getTimerColor(elapsed)}`}>
      {formatTimer(elapsed)}
      {urgencyLabel && (
        <span className="ml-1 text-xs font-bold align-middle">{urgencyLabel}</span>
      )}
    </span>
  );
}

export default function KDSPage() {
  const { tenant, tenantId } = useTenant();

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
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  // Audio alerts
  const kdsSettings = tenant?.kdsSettings;
  const warningThreshold = kdsSettings?.warningThresholdMinutes ?? 5;
  const overdueThreshold = kdsSettings?.overdueThresholdMinutes ?? 10;

  const { muted, setMuted, playNewTicketTone, playWarningTone, playOverdueTone } = useKdsAudio({
    enabled: kdsSettings?.audioEnabled ?? true,
    volume: kdsSettings?.audioVolume ?? 70,
  });

  // Track previous ticket count for new ticket detection
  const prevTicketCountRef = useRef<number>(0);
  // Track warned/overdue tickets to only fire once per ticket
  const warnedTicketsRef = useRef<Set<string>>(new Set());
  const overdueTicketsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tickets) return;

    // New ticket detection
    if (tickets.length > prevTicketCountRef.current && prevTicketCountRef.current > 0) {
      playNewTicketTone();
    }
    prevTicketCountRef.current = tickets.length;

    // Warning / overdue detection
    const now = Date.now();
    for (const ticket of tickets) {
      const elapsedMinutes = (now - ticket.receivedAt) / 60000;
      const ticketId = ticket._id;

      if (
        elapsedMinutes >= overdueThreshold &&
        !overdueTicketsRef.current.has(ticketId)
      ) {
        overdueTicketsRef.current.add(ticketId);
        playOverdueTone();
      } else if (
        elapsedMinutes >= warningThreshold &&
        !warnedTicketsRef.current.has(ticketId)
      ) {
        warnedTicketsRef.current.add(ticketId);
        playWarningTone();
      }
    }
  }, [tickets, warningThreshold, overdueThreshold, playNewTicketTone, playWarningTone, playOverdueTone]);

  // Station filtering
  const stations = kdsSettings?.stations ?? [];

  const filteredTickets = selectedStation
    ? tickets
        ?.map((t) => ({
          ...t,
          items: t.items.filter(
            (i: { station?: string }) => i.station === selectedStation
          ),
        }))
        .filter((t) => t.items.length > 0)
    : tickets;

  if (!tenantId) {
    return <div role="status" aria-live="polite" className="p-6 text-muted-foreground">Loading...</div>;
  }

  async function handleBumpTicket(ticketId: Id<"kdsTickets">) {
    try {
      const result = await bumpTicket({ ticketId });
      toast.success(`Order #${result.orderNumber} bumped`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bump ticket';
      toast.error(message);
    }
  }

  async function handleBumpItem(ticketId: Id<"kdsTickets">, itemIndex: number) {
    try {
      await bumpItem({ ticketId, itemIndex });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to bump item';
      toast.error(message);
    }
  }

  async function handleRecall(ticketId: Id<"kdsTickets">) {
    try {
      await recallTicket({ ticketId });
      toast.success('Ticket recalled');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to recall ticket';
      toast.error(message);
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
        <div className="flex items-center gap-2">
          {/* Audio mute toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Unmute audio alerts' : 'Mute audio alerts'}
            title={muted ? 'Unmute audio alerts' : 'Mute audio alerts'}
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant={showRecall ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowRecall(!showRecall)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Recall ({recallQueue?.length ?? 0})
          </Button>
        </div>
      </div>

      {/* Station Selector */}
      {stations.length > 0 && (
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by station">
          <Button
            variant={selectedStation === null ? 'default' : 'outline'}
            size="sm"
            className="h-10 px-4 min-w-[80px]"
            onClick={() => setSelectedStation(null)}
          >
            All
          </Button>
          {stations.map((station) => (
            <Button
              key={station}
              variant={selectedStation === station ? 'default' : 'outline'}
              size="sm"
              className="h-10 px-4 min-w-[80px]"
              onClick={() => setSelectedStation(station)}
            >
              {station}
            </Button>
          ))}
        </div>
      )}

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
      <div aria-live="polite" aria-relevant="additions" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTickets?.map((ticket) => (
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
                {(ticket as { courseNumber?: number }).courseNumber !== undefined &&
                  (ticket as { courseNumber?: number }).courseNumber! > 1 && (
                    <Badge className="bg-purple-600 text-white text-xs">
                      Course {(ticket as { courseNumber?: number }).courseNumber}
                    </Badge>
                  )}
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
              {ticket.items.map((item: { name: string; quantity: number; isBumped?: boolean; modifiers?: string[]; specialInstructions?: string; station?: string; course?: number }, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleBumpItem(ticket._id, idx)}
                  aria-label={`Mark ${item.name} as prepared`}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    item.isBumped
                      ? 'bg-green-50 line-through text-muted-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{item.quantity}x</span>
                    <span className="font-medium">{item.name}</span>
                    {item.station && (
                      <Badge variant="secondary" className="text-xs">
                        {item.station}
                      </Badge>
                    )}
                    {item.course !== undefined && item.course > 1 && (
                      <Badge variant="outline" className="text-xs">
                        C{item.course}
                      </Badge>
                    )}
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

        {filteredTickets?.length === 0 && (
          <div className="col-span-full text-center py-20 text-muted-foreground">
            <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">
              {selectedStation ? `No tickets for ${selectedStation}` : 'No active tickets'}
            </p>
            <p className="text-sm">Orders will appear here in real-time</p>
          </div>
        )}
      </div>
    </div>
  );
}
