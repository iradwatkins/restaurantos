'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Badge,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@restaurantos/ui';
import { Plus, Pencil, Trash2, CalendarDays, Star, Clock } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function EventsMgmtContent() {
  const { tenantId } = useTenant();

  const events = useQuery(api.events.queries.getEventsWithPricing, tenantId ? { tenantId } : 'skip');
  const dailySpecials = useQuery(api.dailySpecials.queries.getAll, tenantId ? { tenantId } : 'skip');

  const createEvent = useMutation(api.events.mutations.createEvent);
  const deleteEvent = useMutation(api.events.mutations.deleteEvent);
  const createPricingTier = useMutation(api.events.mutations.createPricingTier);
  const deletePricingTier = useMutation(api.events.mutations.deletePricingTier);
  const upsertSpecial = useMutation(api.dailySpecials.mutations.upsert);
  const deleteSpecial = useMutation(api.dailySpecials.mutations.deleteSpecial);

  const [activeView, setActiveView] = useState<'events' | 'specials'>('events');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showSpecialDialog, setShowSpecialDialog] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [specialItems, setSpecialItems] = useState<{ name: string; description: string; price: string }[]>([{ name: '', description: '', price: '' }]);

  if (!tenantId) return <div className="p-6 text-muted-foreground">Loading...</div>;

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createEvent({
        tenantId: tenantId!,
        name: form.get('name') as string,
        description: (form.get('description') as string) || undefined,
        category: form.get('category') as any,
        recurrence: form.get('recurrence') as any,
        dayOfWeek: form.get('recurrence') === 'weekly' ? parseInt(form.get('dayOfWeek') as string) : undefined,
        startTime: form.get('startTime') as string,
        endTime: form.get('endTime') as string,
      });
      toast.success('Event created');
      setShowEventDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  async function handleSaveSpecial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editingDay === null) return;
    const form = new FormData(e.currentTarget);
    try {
      await upsertSpecial({
        tenantId: tenantId!,
        dayOfWeek: editingDay,
        name: form.get('name') as string,
        description: (form.get('description') as string) || undefined,
        items: specialItems.filter((i) => i.name.trim()).map((i) => ({
          name: i.name,
          description: i.description || undefined,
          price: Math.round(parseFloat(i.price || '0') * 100),
        })),
        startTime: (form.get('startTime') as string) || undefined,
        endTime: (form.get('endTime') as string) || undefined,
      });
      toast.success('Daily special saved');
      setShowSpecialDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events & Specials</h1>
        <p className="text-muted-foreground">Manage recurring events and daily specials</p>
      </div>

      <div className="flex gap-2">
        <Button variant={activeView === 'events' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('events')}>
          <CalendarDays className="mr-1 h-3 w-3" /> Events ({events?.length ?? 0})
        </Button>
        <Button variant={activeView === 'specials' ? 'default' : 'outline'} size="sm" onClick={() => setActiveView('specials')}>
          <Star className="mr-1 h-3 w-3" /> Daily Specials
        </Button>
      </div>

      <Separator />

      {/* ==================== Events ==================== */}
      {activeView === 'events' && (
        <div className="space-y-4">
          <Button size="sm" onClick={() => setShowEventDialog(true)}>
            <Plus className="mr-1 h-3 w-3" /> New Event
          </Button>

          {events?.map((event: any) => (
            <Card key={event._id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{event.name}</CardTitle>
                      <Badge variant="outline" className="capitalize">{event.category}</Badge>
                      <Badge variant="secondary">{event.recurrence === 'weekly' && event.dayOfWeek !== undefined ? `Every ${DAYS[event.dayOfWeek]}` : event.recurrence}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{event.startTime} - {event.endTime}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { if (confirm('Delete?')) { await deleteEvent({ id: event._id }); toast.success('Deleted'); } }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {event.description && <p className="text-sm text-muted-foreground mb-3">{event.description}</p>}
                <h4 className="text-sm font-semibold mb-2">Pricing Tiers</h4>
                <div className="space-y-1">
                  {event.pricingTiers?.map((tier: any) => (
                    <div key={tier._id} className="flex items-center justify-between text-sm">
                      <span>{tier.tierName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">${(tier.price / 100).toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={async () => { await deletePricingTier({ id: tier._id }); toast.success('Tier deleted'); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <AddPricingTierForm eventId={event._id} tenantId={tenantId!} onCreate={createPricingTier} nextOrder={event.pricingTiers?.length ?? 0} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ==================== Daily Specials ==================== */}
      {activeView === 'specials' && (
        <div className="grid gap-3 md:grid-cols-2">
          {DAYS.map((day, idx) => {
            const special = dailySpecials?.find((s: any) => s.dayOfWeek === idx);
            return (
              <Card key={idx} className={special ? '' : 'opacity-60'}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{day}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setEditingDay(idx);
                        if (special) {
                          setSpecialItems(special.items.map((i: any) => ({ name: i.name, description: i.description || '', price: (i.price / 100).toFixed(2) })));
                        } else {
                          setSpecialItems([{ name: '', description: '', price: '' }]);
                        }
                        setShowSpecialDialog(true);
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {special && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { if (confirm('Delete?')) { await deleteSpecial({ id: special._id }); toast.success('Deleted'); } }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {special ? (
                    <div>
                      <p className="font-medium text-sm">{special.name}</p>
                      {special.description && <p className="text-xs text-muted-foreground">{special.description}</p>}
                      <div className="mt-2 space-y-1">
                        {special.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span>{item.name}</span>
                            <span className="font-bold">${(item.price / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No special set</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input name="name" required placeholder="Sunday Buffet" /></div>
            <div className="space-y-2"><Label>Description</Label><Input name="description" placeholder="Event details..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label>
                <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="buffet">Buffet</option><option value="special">Special</option><option value="holiday">Holiday</option><option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Recurrence</Label>
                <select name="recurrence" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="once">One-time</option>
                </select>
              </div>
            </div>
            <div className="space-y-2"><Label>Day of Week</Label>
              <select name="dayOfWeek" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Time</Label><Input name="startTime" type="time" required /></div>
              <div className="space-y-2"><Label>End Time</Label><Input name="endTime" type="time" required /></div>
            </div>
            <DialogFooter><Button type="submit">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Daily Special Dialog */}
      <Dialog open={showSpecialDialog} onOpenChange={setShowSpecialDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingDay !== null ? `${DAYS[editingDay]} Special` : 'Daily Special'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveSpecial} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2"><Label>Name</Label><Input name="name" required placeholder="Tuesday Special" defaultValue={editingDay !== null ? dailySpecials?.find((s: any) => s.dayOfWeek === editingDay)?.name ?? '' : ''} /></div>
            <div className="space-y-2"><Label>Description</Label><Input name="description" placeholder="Details..." defaultValue={editingDay !== null ? dailySpecials?.find((s: any) => s.dayOfWeek === editingDay)?.description ?? '' : ''} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Time</Label><Input name="startTime" type="time" /></div>
              <div className="space-y-2"><Label>End Time</Label><Input name="endTime" type="time" /></div>
            </div>
            <Separator />
            <h3 className="font-semibold text-sm">Special Items</h3>
            {specialItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-end">
                <Input placeholder="Item name" value={item.name} onChange={(e) => { const u = [...specialItems]; u[idx] = { ...u[idx]!, name: e.target.value }; setSpecialItems(u); }} />
                <Input placeholder="Description" value={item.description} onChange={(e) => { const u = [...specialItems]; u[idx] = { ...u[idx]!, description: e.target.value }; setSpecialItems(u); }} />
                <Input placeholder="$0.00" type="number" step="0.01" value={item.price} onChange={(e) => { const u = [...specialItems]; u[idx] = { ...u[idx]!, price: e.target.value }; setSpecialItems(u); }} />
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setSpecialItems(specialItems.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setSpecialItems([...specialItems, { name: '', description: '', price: '' }])}>
              <Plus className="mr-1 h-3 w-3" /> Add Item
            </Button>
            <DialogFooter><Button type="submit">Save Special</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddPricingTierForm({ eventId, tenantId, onCreate, nextOrder }: { eventId: any; tenantId: any; onCreate: any; nextOrder: number }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t">
      <Input placeholder="Tier name" value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
      <Input placeholder="$0.00" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 text-sm w-24" />
      <Button size="sm" variant="outline" className="h-8" onClick={async () => {
        if (!name.trim()) return;
        await onCreate({ tenantId, eventId, tierName: name, price: Math.round(parseFloat(price || '0') * 100), sortOrder: nextOrder });
        setName(''); setPrice('');
        toast.success('Tier added');
      }}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
