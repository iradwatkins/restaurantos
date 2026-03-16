'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Button, Badge, Card, CardContent } from '@restaurantos/ui';
import { Clock, MapPin, Phone, ArrowRight, Star, CalendarDays, Truck, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-8 w-48 bg-muted rounded mx-auto" />
          <div className="h-4 w-64 bg-muted rounded mx-auto" />
        </div>
      </div>
    );
  }

  const today = new Date().getDay();
  const todayHours = tenant.businessHours?.find((h: any) => h.day === today);

  // Collect food images from menu items for the gallery
  const allItems = menu?.flatMap((cat: any) => cat.items) ?? [];
  const itemsWithImages = allItems.filter((i: any) => i.imageUrl);
  const galleryImages = [...new Set(itemsWithImages.map((i: any) => i.imageUrl) as string[])].slice(0, 8);

  // Pick a hero background from food images
  const heroImage = galleryImages[0] || null;

  return (
    <div className="bg-white">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-[520px] lg:min-h-[600px] flex items-center overflow-hidden">
        {heroImage && (
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#191A19]/90 via-[#191A19]/75 to-[#191A19]/50" />

        <div className="relative w-full max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-xl">
            {tenant.logoUrl && (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-20 lg:h-24 mb-6 drop-shadow-lg"
              />
            )}

            {tenant.tagline && (
              <p className="text-lg lg:text-xl text-[#f9c80e] font-medium tracking-wide mb-4">
                {tenant.tagline}
              </p>
            )}

            <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Home Cooked Meals,<br />
              <span className="text-[#f9c80e]">Made Fresh Daily</span>
            </h1>

            <p className="text-white/70 text-base lg:text-lg mb-8 max-w-md">
              Soul Food, Salads, Wraps, Sweets & More.
              {todayHours && !todayHours.isClosed && (
                <span className="block mt-2 text-white/50 text-sm">
                  Open today {todayHours.open} – {todayHours.close}
                </span>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/order">
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#348726] hover:bg-[#2d7520] text-white font-semibold text-base px-8 py-3.5 rounded-md transition-colors">
                  Order Online
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/our-menu">
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium text-base px-8 py-3.5 rounded-md border border-white/20 transition-colors">
                  View Full Menu
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ INFO BAR ═══════════════ */}
      <section className="bg-[#191A19] text-white py-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-6 lg:gap-10 flex-wrap text-sm">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#348726]" />
            <span className="font-medium">Pickup & Delivery</span>
          </span>
          <span className="text-white/50">|</span>
          <span className="text-white/60">DoorDash</span>
          <span className="text-white/60">Uber Eats</span>
          {tenant.address && (
            <>
              <span className="text-white/50 hidden lg:inline">|</span>
              <span className="flex items-center gap-1.5 text-white/60">
                <MapPin className="h-3.5 w-3.5" />
                {tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
              </span>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════ TODAY'S SPECIAL ═══════════════ */}
      {todaySpecial && (
        <section className="py-12 bg-[#faf6ef]">
          <div className="max-w-6xl mx-auto px-4">
            <Link href="/events" className="block group">
              <div className="bg-white rounded-xl shadow-sm border border-[#e8e0d0] p-6 md:p-8 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-5">
                  <div className="h-12 w-12 rounded-full bg-[#348726] flex items-center justify-center flex-shrink-0">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#348726] mb-1">
                      Today&apos;s Special — {DAYS[today]}
                    </p>
                    <h2 className="text-2xl font-bold text-[#191A19]" style={{ fontFamily: 'Georgia, serif' }}>
                      {todaySpecial.name}
                    </h2>
                    {todaySpecial.description && (
                      <p className="text-[#4D4D4D] mt-1">{todaySpecial.description}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {todaySpecial.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#faf6ef] border border-[#e8e0d0]">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-[#191A19] truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-[#4D4D4D] truncate">{item.description}</p>
                        )}
                      </div>
                      <span className="text-lg font-bold text-[#348726] ml-3 flex-shrink-0">
                        ${(item.price / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#348726] font-medium mt-4 group-hover:underline flex items-center gap-1">
                  View all specials <ChevronRight className="h-3 w-3" />
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════ SUNDAY BUFFET / EVENT PROMO ═══════════════ */}
      {publicEvents && publicEvents.length > 0 && (
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4">
            <Link href="/events" className="block group">
              <div className="relative rounded-xl overflow-hidden min-h-[320px] flex items-end">
                {galleryImages[1] && (
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
                    style={{ backgroundImage: `url(${galleryImages[1]})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#191A19] via-[#191A19]/60 to-transparent" />

                <div className="relative w-full p-8 lg:p-10">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#f9c80e] mb-2">
                    Every {publicEvents[0].dayOfWeek !== undefined ? DAYS[publicEvents[0].dayOfWeek] : 'Week'}
                    {' · '}{publicEvents[0].startTime} – {publicEvents[0].endTime}
                  </p>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                    {publicEvents[0].name}
                  </h2>

                  {publicEvents[0].pricingTiers && (
                    <div className="flex gap-4 lg:gap-6 flex-wrap mt-4">
                      {publicEvents[0].pricingTiers.map((tier: any) => (
                        <div key={tier._id} className="bg-white/10 backdrop-blur-sm rounded-lg px-5 py-3 text-center border border-white/15">
                          <p className="text-white/70 text-xs font-medium">{tier.tierName}</p>
                          <p className="text-xl font-bold text-white mt-0.5">${(tier.price / 100).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════ FOOD GALLERY ═══════════════ */}
      {galleryImages.length > 0 && (
        <section className="py-14 bg-[#191A19]">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#f9c80e] mb-2">
                From Our Kitchen
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                Soul Food Done Right
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {galleryImages.slice(0, 8).map((img, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                  <img
                    src={img}
                    alt="Soul food dish"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/our-menu">
                <button className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 text-white font-medium text-sm px-6 py-2.5 rounded-md border border-white/20 transition-colors">
                  View Full Menu <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ ABOUT ═══════════════ */}
      {tenant.aboutText && (
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#348726] mb-3">
              Our Story
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#191A19] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
              {tenant.name}
            </h2>
            <p className="text-[#4D4D4D] leading-relaxed text-lg">
              {tenant.aboutText}
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════ HOURS & LOCATION ═══════════════ */}
      {tenant.businessHours && tenant.businessHours.length > 0 && (
        <section className="py-16 bg-[#faf6ef]">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#348726] mb-3">
                  Visit Us
                </p>
                <h2 className="text-2xl font-bold text-[#191A19] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                  Hours & Location
                </h2>
                <div className="space-y-1 bg-white rounded-lg border border-[#e8e0d0] overflow-hidden">
                  {tenant.businessHours.map((h: any) => (
                    <div
                      key={h.day}
                      className={`flex justify-between text-sm px-4 py-2.5 ${
                        h.day === today
                          ? 'bg-[#348726] text-white font-semibold'
                          : 'text-[#4D4D4D]'
                      }`}
                    >
                      <span>{DAYS[h.day]}</span>
                      <span>{h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2">
                  {tenant.phone && (
                    <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-[#191A19] hover:text-[#348726] transition-colors font-medium">
                      <Phone className="h-4 w-4" />
                      {tenant.phone}
                    </a>
                  )}
                  {tenant.address && (
                    <p className="flex items-center gap-2 text-[#4D4D4D] text-sm">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
                    </p>
                  )}
                </div>
              </div>

              {/* Side image or map placeholder */}
              <div className="rounded-xl overflow-hidden">
                {galleryImages[2] ? (
                  <img src={galleryImages[2]} alt={tenant.name} className="w-full h-72 object-cover" />
                ) : (
                  <div className="w-full h-72 bg-muted flex items-center justify-center text-muted-foreground">
                    <MapPin className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ ORDER CTA ═══════════════ */}
      <section className="py-16 bg-[#348726]">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            Ready to Eat?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
            Skip the line. Order online for faster pickup.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/order">
              <button className="inline-flex items-center gap-2 bg-white text-[#348726] font-bold text-base px-8 py-3.5 rounded-md hover:bg-white/90 transition-colors">
                Order Now
              </button>
            </Link>
            <Link href="/events">
              <button className="inline-flex items-center gap-2 bg-transparent text-white font-medium text-base px-8 py-3.5 rounded-md border border-white/30 hover:bg-white/10 transition-colors">
                View Specials
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
