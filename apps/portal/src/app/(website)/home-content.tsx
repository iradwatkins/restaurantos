'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Button, Badge, Card, CardContent } from '@restaurantos/ui';
import { Clock, MapPin, Phone, ArrowRight, Star, CalendarDays, Truck, Users } from 'lucide-react';
import Link from 'next/link';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// D&K Soul Food images from their website
const FOOD_IMAGES = [
  'https://www.fbgcdn.com/pictures/96d25bb5-7d71-4c4a-ba9f-a4cf06c52cc2.jpg',
  'https://www.fbgcdn.com/pictures/606ad169-7758-4c2b-b896-ae74ad8cd18d.jpg',
  'https://www.fbgcdn.com/pictures/41228b43-cd38-45fa-80c8-de6f0c7a0a7e.jpg',
  'https://www.fbgcdn.com/pictures/63ddfcb6-1267-4368-89d7-bf450f50f7fe.jpg',
  'https://www.fbgcdn.com/pictures/605eed25-8f9c-4176-a3fc-76cc0dcfecc0.jpg',
  'https://www.fbgcdn.com/pictures/f7d1f1c5-4459-41e6-b711-4147b30bd819.jpg',
];

export default function HomeContent() {
  const { tenant, tenantId } = useTenant();

  const menu = useQuery(
    api.public.queries.getFullMenu,
    tenantId ? { tenantId } : 'skip'
  );

  const todaySpecial = useQuery(
    api.public.queries.getTodaySpecial,
    tenantId ? { tenantId } : 'skip'
  );

  const publicEvents = useQuery(
    api.public.queries.getPublicEvents,
    tenantId ? { tenantId } : 'skip'
  );

  if (!tenant) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  const today = new Date().getDay();
  const todayHours = tenant.businessHours?.find((h: any) => h.day === today);
  const hasLogo = tenant.logoUrl;

  // Get some menu items for the food gallery
  const allItems = menu?.flatMap((cat: any) => cat.items) ?? [];
  const itemsWithImages = allItems.filter((i: any) => i.imageUrl);

  return (
    <div>
      {/* Hero Section with food image background */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${FOOD_IMAGES[1]})`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />

        <div className="relative max-w-6xl mx-auto px-4 py-24 lg:py-36">
          <div className="max-w-2xl">
            {hasLogo && (
              <img src={tenant.logoUrl!} alt={tenant.name} className="h-16 mb-6" />
            )}
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-white mb-4">
              {tenant.name}
            </h1>
            {tenant.tagline && (
              <p className="text-xl text-white/80 mb-8">
                {tenant.tagline}
              </p>
            )}
            <div className="flex gap-4 flex-wrap">
              <Link href="/order">
                <Button size="lg" className="text-base px-8 bg-primary hover:bg-primary/90">
                  Order Online
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/our-menu">
                <Button size="lg" variant="outline" className="text-base px-8 border-white/40 text-white hover:bg-white/10">
                  View Menu
                </Button>
              </Link>
            </div>

            {/* Quick info */}
            <div className="flex gap-6 mt-8 flex-wrap text-white/70 text-sm">
              {todayHours && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {todayHours.isClosed ? 'Closed Today' : `Today ${todayHours.open} - ${todayHours.close}`}
                </span>
              )}
              {tenant.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {tenant.phone}
                </span>
              )}
              {tenant.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {tenant.address.city}, {tenant.address.state}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Delivery badges */}
      <section className="border-b bg-card py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-8 flex-wrap text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Truck className="h-4 w-4 text-primary" />
            Pickup & Delivery Available
          </span>
          <span className="text-muted-foreground">DoorDash</span>
          <span className="text-muted-foreground">Uber Eats</span>
          {tenant.address && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
            </span>
          )}
        </div>
      </section>

      {/* Today's Special */}
      {todaySpecial && (
        <section className="py-10 bg-primary/5">
          <div className="max-w-6xl mx-auto px-4">
            <Link href="/events">
              <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 md:p-8 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <Star className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Today&apos;s Special</h2>
                    <p className="text-muted-foreground">{todaySpecial.name}</p>
                  </div>
                </div>
                {todaySpecial.description && (
                  <p className="text-muted-foreground mb-4">{todaySpecial.description}</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {todaySpecial.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <span className="text-lg font-bold text-primary ml-3">
                        ${(item.price / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Sunday Buffet / Event Promo */}
      {publicEvents && publicEvents.length > 0 && (
        <section className="py-10">
          <div className="max-w-6xl mx-auto px-4">
            <Link href="/events">
              <div className="relative rounded-2xl overflow-hidden cursor-pointer group">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${FOOD_IMAGES[0]})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 to-black/50 group-hover:from-black/80 group-hover:to-black/45 transition-all" />
                <div className="relative p-8 md:p-12">
                  <Badge className="mb-3 bg-primary/90 capitalize">{publicEvents[0].category}</Badge>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    {publicEvents[0].name}
                  </h2>
                  <p className="text-white/70 mb-6 max-w-xl">
                    {publicEvents[0].description?.slice(0, 150)}...
                  </p>
                  {publicEvents[0].pricingTiers && (
                    <div className="flex gap-6 flex-wrap">
                      {publicEvents[0].pricingTiers.map((tier: any) => (
                        <div key={tier._id} className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center border border-white/20">
                          <Users className="h-5 w-5 mx-auto mb-1 text-white/70" />
                          <p className="text-white/80 text-sm">{tier.tierName}</p>
                          <p className="text-2xl font-bold text-white">${(tier.price / 100).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-white/50 text-sm mt-4 group-hover:text-white/70 transition-colors">
                    View details &rarr;
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Food Gallery - use actual menu item images */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Home Cooked Meals</h2>
          <p className="text-center text-muted-foreground mb-8">Made Fresh Daily</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(() => {
              const images = itemsWithImages.length > 0
                ? [...new Set(itemsWithImages.map((i: any) => i.imageUrl))].slice(0, 6)
                : FOOD_IMAGES;
              return images.map((img: string, idx: number) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden">
                  <img
                    src={img}
                    alt="Food dish"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ));
            })()}
          </div>
          <div className="text-center mt-8">
            <Link href="/our-menu">
              <Button variant="outline" size="lg">
                View Full Menu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Blurb */}
      {tenant.aboutText && (
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {tenant.aboutText}
            </p>
            <Link href="/about">
              <Button variant="link" className="mt-4 text-primary">
                Read More <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Hours Section */}
      {tenant.businessHours && tenant.businessHours.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-6">Hours & Location</h2>
                <div className="space-y-2">
                  {tenant.businessHours.map((h: any) => (
                    <div
                      key={h.day}
                      className={`flex justify-between text-sm py-2 px-3 rounded-lg ${
                        h.day === today ? 'bg-primary/10 font-bold text-primary' : ''
                      }`}
                    >
                      <span>{DAYS[h.day]}</span>
                      <span>{h.isClosed ? 'Closed' : `${h.open} - ${h.close}`}</span>
                    </div>
                  ))}
                </div>
                {tenant.phone && (
                  <p className="mt-6 text-lg">
                    <Phone className="inline h-4 w-4 mr-2 text-primary" />
                    <a href={`tel:${tenant.phone}`} className="font-semibold hover:text-primary">
                      {tenant.phone}
                    </a>
                  </p>
                )}
                {tenant.address && (
                  <p className="mt-2 text-muted-foreground">
                    <MapPin className="inline h-4 w-4 mr-2" />
                    {tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
                  </p>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden">
                <img
                  src={FOOD_IMAGES[4]}
                  alt="D&K Soul Food"
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${FOOD_IMAGES[2]})` }}
        />
        <div className="absolute inset-0 bg-primary/90" />
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Order?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Skip the line — order online for faster pickup
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/order">
              <Button size="lg" variant="secondary" className="text-base px-8">
                Order Now
              </Button>
            </Link>
            <Link href="/events">
              <Button size="lg" variant="outline" className="text-base px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                View Specials
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
