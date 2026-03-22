'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@restaurantos/ui';
import { CalendarDays, Clock, Utensils, Star } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Buffet pricing tier images
const TIER_IMAGES: Record<string, string> = {
  'Adults': 'https://images.pexels.com/photos/6579011/pexels-photo-6579011.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Seniors': 'https://images.pexels.com/photos/4261996/pexels-photo-4261996.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Kids 2-12': 'https://images.nappy.co/photo/03qeoT4iedlmbDo67TcCO.jpg?w=800',
  'default': 'https://images.pexels.com/photos/6579011/pexels-photo-6579011.jpeg?auto=compress&cs=tinysrgb&w=800',
};

interface EventsContentProps {
  initialData: {
    tenantId: any;
    events: any;
    dailySpecials: any;
  } | null;
}

export default function EventsContent({ initialData }: EventsContentProps) {
  const { tenantId: clientTenantId } = useTenant();

  const tenantId = initialData?.tenantId ?? clientTenantId;

  const clientEvents = useQuery(
    api.public.queries.getPublicEvents,
    !initialData && tenantId ? { tenantId } : 'skip'
  );
  const clientDailySpecials = useQuery(
    api.public.queries.getDailySpecials,
    !initialData && tenantId ? { tenantId } : 'skip'
  );

  const events = initialData?.events ?? clientEvents;
  const dailySpecials = initialData?.dailySpecials ?? clientDailySpecials;

  const today = new Date().getDay();

  if (!tenantId) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Events & Specials</h1>
        <p className="text-muted-foreground">
          Weekly events and daily specials
        </p>
      </div>

      {/* Featured Events */}
      {events && events.length > 0 && (
        <section className="mb-12">
          {events.map((event: any) => (
            <Card key={event._id} className="overflow-hidden border-2 border-primary/20">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="mb-2 capitalize">{event.category}</Badge>
                    <CardTitle className="text-2xl">{event.name}</CardTitle>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {event.recurrence === 'weekly' && event.dayOfWeek !== undefined
                        ? `Every ${DAYS[event.dayOfWeek]}`
                        : event.recurrence === 'monthly'
                          ? 'Monthly'
                          : 'Special Event'}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4" />
                      {event.startTime} - {event.endTime}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {event.description && (
                  <p className="text-muted-foreground mb-6">{event.description}</p>
                )}

                {/* Pricing Tiers — soul food images with overlay pricing */}
                {event.pricingTiers && event.pricingTiers.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {event.pricingTiers.map((tier: any) => {
                      const tierImage = TIER_IMAGES[tier.tierName] || TIER_IMAGES['default'];
                      return (
                        <div
                          key={tier._id}
                          className="relative rounded-xl overflow-hidden h-56 group"
                        >
                          <img
                            src={tierImage}
                            alt={tier.tierName}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-5 text-center text-white">
                            <p className="font-bold text-lg">{tier.tierName}</p>
                            <p className="text-4xl font-black mt-1" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                              ${(tier.price / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Daily Specials */}
      {dailySpecials && dailySpecials.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Utensils className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Daily Specials</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {dailySpecials.map((special: any) => {
              const isToday = special.dayOfWeek === today;
              return (
                <Card
                  key={special._id}
                  className={`overflow-hidden transition-all ${
                    isToday ? 'ring-2 ring-primary shadow-lg' : ''
                  }`}
                >
                  <CardHeader className={`pb-2 ${isToday ? 'bg-primary/10' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{special.name}</CardTitle>
                        {isToday && (
                          <Badge className="bg-primary">
                            <Star className="h-3 w-3 mr-0.5" /> Today
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline">{DAYS[special.dayOfWeek]}</Badge>
                    </div>
                    {special.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {special.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="space-y-2">
                      {special.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <span className="font-bold ml-3">
                            ${(item.price / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {special.startTime && special.endTime && (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {special.startTime} - {special.endTime}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {(!events || events.length === 0) && (!dailySpecials || dailySpecials.length === 0) && (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-4" />
          <p>No events or specials at this time. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
