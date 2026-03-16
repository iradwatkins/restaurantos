'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Button, Badge } from '@restaurantos/ui';
import { Clock, MapPin, Phone, ArrowRight, Star, CalendarDays, Truck, Users, ChevronRight, UtensilsCrossed } from 'lucide-react';
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
      <div className="min-h-[60vh] flex items-center justify-center bg-[#1a1a1a]">
        <div className="animate-pulse text-white/40 text-lg">Loading...</div>
      </div>
    );
  }

  const today = new Date().getDay();
  const todayHours = tenant.businessHours?.find((h: any) => h.day === today);
  const allItems = menu?.flatMap((cat: any) => cat.items) ?? [];
  const itemsWithImages = allItems.filter((i: any) => i.imageUrl);
  const featuredDishes = allItems.slice(0, 6);

  // Find the best hero image — look for fried chicken first, then any dinner item
  const heroImage = (() => {
    const friedChicken = allItems.find((i: any) => i.imageUrl && i.name.toLowerCase().includes('fried chicken'));
    if (friedChicken) return friedChicken.imageUrl;
    const anyDinner = allItems.find((i: any) => i.imageUrl && (i.name.toLowerCase().includes('chicken') || i.name.toLowerCase().includes('chop')));
    if (anyDinner) return anyDinner.imageUrl;
    if (itemsWithImages.length > 0) return itemsWithImages[0].imageUrl;
    // Fallback: a great soul food plate photo
    return 'https://iheartrecipes.com/wp-content/uploads/2018/03/friedchicken6-1-scaled.jpg';
  })();

  return (
    <div>

      {/* ════════════════════════════════════════════════
          HERO — Full-screen food image with bold tagline
          Inspired by His Place "Simply. Good. Food."
          ════════════════════════════════════════════════ */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#1a1a1a]">
        {/* Big soul food hero background — clearly visible */}
        <img
          src={heroImage}
          alt="Soul food"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a]/70 via-[#1a1a1a]/30 to-transparent" />

        <div className="relative w-full max-w-6xl mx-auto px-6 py-16 text-left">
          {/* Logo */}
          {tenant.logoUrl && (
            <img src={tenant.logoUrl} alt={tenant.name} className="h-20 lg:h-28 mb-6 drop-shadow-2xl" />
          )}

          {/* Tagline — big, bold, inspired by His Place "Simply. Good. Food." */}
          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white tracking-tight leading-none mb-4" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Soul Food.
          </h1>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#f9c80e] tracking-wide mb-8" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Made Fresh Daily.
          </h2>

          {tenant.tagline && (
            <p className="text-white/70 text-lg max-w-lg mb-10">
              {tenant.tagline}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link href="/order">
              <button className="w-full sm:w-auto bg-[#d32f2f] hover:bg-[#b71c1c] text-white font-bold text-lg px-10 py-4 rounded-full tracking-wide transition-colors shadow-lg shadow-red-900/30">
                ORDER NOW
              </button>
            </Link>
            <Link href="/our-menu">
              <button className="w-full sm:w-auto bg-transparent hover:bg-white/10 text-white font-semibold text-lg px-10 py-4 rounded-full border-2 border-white/30 transition-colors">
                VIEW MENU
              </button>
            </Link>
          </div>

          {/* Quick info pills */}
          <div className="flex items-center gap-4 flex-wrap text-white/50 text-sm">
            {todayHours && !todayHours.isClosed && (
              <span className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-full">
                <Clock className="h-3.5 w-3.5" />
                Open Today {todayHours.open} – {todayHours.close}
              </span>
            )}
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                <Phone className="h-3.5 w-3.5" />
                {tenant.phone}
              </a>
            )}
            <span className="flex items-center gap-1.5 bg-white/5 px-4 py-2 rounded-full">
              <Truck className="h-3.5 w-3.5" />
              Delivery Available
            </span>
          </div>
        </div>

        {/* Scalloped divider at bottom — inspired by His Place */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 40" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C100,0 200,0 300,40 C400,0 500,0 600,40 C700,0 800,0 900,40 C1000,0 1100,0 1200,40 L1200,40 L0,40 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          DELIVERY BAR — DoorDash / Uber Eats badges
          From D&K flyer: "Yes We Deliver"
          ════════════════════════════════════════════════ */}
      <section className="bg-white py-5 border-b">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-8 flex-wrap">
          <span className="text-[#d32f2f] font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Yes We Deliver
          </span>
          <div className="flex items-center gap-4">
            <span className="bg-[#FF3008] text-white text-xs font-bold px-3 py-1.5 rounded">DoorDash</span>
            <span className="bg-[#06C167] text-white text-xs font-bold px-3 py-1.5 rounded">Uber Eats</span>
          </div>
          {tenant.address && (
            <span className="text-gray-500 text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
            </span>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FEATURED DISHES — Large food photography grid
          Inspired by His Place hero carousel + Soulé card layout
          ════════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#d32f2f] font-bold text-sm uppercase tracking-widest mb-2">From Our Kitchen</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#1a1a1a]" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              Home Cooked Favorites
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredDishes.map((item: any, idx: number) => (
              <FoodCard key={item._id || idx} item={item} large={idx === 0} />
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/our-menu">
              <button className="bg-[#1a1a1a] hover:bg-[#333] text-white font-semibold px-8 py-3.5 rounded-full transition-colors">
                View Full Menu <ArrowRight className="inline h-4 w-4 ml-2" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SUNDAY BUFFET — Prominent event section
          From D&K flyer: yellow background, bold pricing
          ════════════════════════════════════════════════ */}
      {publicEvents && publicEvents.length > 0 && (
        <section className="py-16 bg-[#f9c80e]">
          <div className="max-w-6xl mx-auto px-6">
            <Link href="/events" className="block group">
              <div className="text-center">
                <p className="text-[#1a1a1a]/60 font-bold text-sm uppercase tracking-widest mb-2">
                  Every {publicEvents[0].dayOfWeek !== undefined ? DAYS[publicEvents[0].dayOfWeek] : 'Week'}
                  {' · '}{publicEvents[0].startTime} – {publicEvents[0].endTime}
                </p>
                <h2 className="text-4xl lg:text-6xl font-black text-[#1a1a1a] mb-2" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  {publicEvents[0].name}
                </h2>

                {publicEvents[0].pricingTiers && (
                  <div className="flex gap-6 lg:gap-10 justify-center mt-8 flex-wrap">
                    {publicEvents[0].pricingTiers.map((tier: any) => (
                      <div key={tier._id} className="bg-[#1a1a1a] rounded-2xl px-8 py-6 text-center min-w-[140px] shadow-xl group-hover:scale-105 transition-transform">
                        <p className="text-white/60 text-sm font-medium mb-1">{tier.tierName}</p>
                        <p className="text-4xl font-black text-white">${(tier.price / 100).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[#1a1a1a]/50 text-sm mt-6 group-hover:text-[#1a1a1a]/70 transition-colors">
                  Last Seating 5pm · View Details →
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          TODAY'S SPECIAL
          ════════════════════════════════════════════════ */}
      {todaySpecial && (
        <section className="py-16 bg-[#1a1a1a]">
          <div className="max-w-4xl mx-auto px-6">
            <Link href="/events" className="block group">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-[#d32f2f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
                  <Star className="h-3 w-3" /> Today&apos;s Special · {DAYS[today]}
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  {todaySpecial.name}
                </h2>
                {todaySpecial.description && (
                  <p className="text-white/50 mt-2 max-w-md mx-auto">{todaySpecial.description}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {todaySpecial.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 group-hover:bg-white/10 transition-colors">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      {item.description && <p className="text-white/40 text-sm">{item.description}</p>}
                    </div>
                    <span className="text-2xl font-black text-[#f9c80e] ml-4">${(item.price / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <p className="text-center text-white/30 text-sm mt-6 group-hover:text-white/50 transition-colors">
                View all specials →
              </p>
            </Link>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          FOOD GALLERY — Instagram-style grid
          Inspired by His Place social feed
          ════════════════════════════════════════════════ */}
      {itemsWithImages.length > 0 && (
        <section className="py-0 bg-white">
          <div className="grid grid-cols-4 md:grid-cols-8">
            {itemsWithImages.slice(0, 8).map((item: any, idx: number) => (
              <div key={idx} className="aspect-square overflow-hidden relative group">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end">
                  <p className="text-white text-xs font-medium p-2 opacity-0 group-hover:opacity-100 transition-opacity truncate w-full">
                    {item.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          ABOUT & HOURS — Split layout
          Warm background, community feel from Soulé/Lo-Lo's
          ════════════════════════════════════════════════ */}
      <section className="py-16 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          {/* About */}
          <div>
            <p className="text-[#d32f2f] font-bold text-sm uppercase tracking-widest mb-3">About Us</p>
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              {tenant.name}
            </h2>
            {tenant.aboutText && (
              <p className="text-[#4a4a4a] leading-relaxed mb-6">{tenant.aboutText}</p>
            )}
            <Link href="/about">
              <span className="text-[#d32f2f] font-semibold text-sm hover:underline">Read Our Story →</span>
            </Link>
          </div>

          {/* Hours */}
          <div>
            <p className="text-[#d32f2f] font-bold text-sm uppercase tracking-widest mb-3">Hours</p>
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              Visit Us
            </h2>
            {tenant.businessHours && (
              <div className="space-y-0 rounded-xl overflow-hidden border border-[#ddd5c5]">
                {tenant.businessHours.map((h: any) => (
                  <div
                    key={h.day}
                    className={`flex justify-between px-5 py-3 text-sm ${
                      h.day === today
                        ? 'bg-[#d32f2f] text-white font-bold'
                        : 'bg-white text-[#4a4a4a] border-b border-[#eee5d5]'
                    }`}
                  >
                    <span>{DAYS[h.day]}</span>
                    <span>{h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 space-y-2">
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-[#1a1a1a] font-semibold hover:text-[#d32f2f] transition-colors">
                  <Phone className="h-4 w-4" /> {tenant.phone}
                </a>
              )}
              {tenant.address && (
                <p className="flex items-center gap-2 text-[#4a4a4a] text-sm">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          BOTTOM CTA — Bold red
          ════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#d32f2f]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-3" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Ready to Eat?
          </h2>
          <p className="text-white/70 text-lg mb-8 max-w-md mx-auto">
            Order online for faster pickup. We&apos;ll have it ready when you arrive.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/order">
              <button className="bg-white text-[#d32f2f] font-bold text-lg px-10 py-4 rounded-full hover:bg-white/90 transition-colors shadow-lg">
                Order Now
              </button>
            </Link>
            <Link href="/our-menu">
              <button className="bg-transparent text-white font-semibold text-lg px-10 py-4 rounded-full border-2 border-white/40 hover:bg-white/10 transition-colors">
                View Menu
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════════
   Food Card Component — large image with overlay text
   ════════════════════════════════════════════════ */
function FoodCard({ item, large }: { item: any; large?: boolean }) {
  const imgSrc = item.imageUrl;

  return (
    <div className={`relative rounded-2xl overflow-hidden group cursor-pointer ${large ? 'row-span-2 col-span-2 lg:col-span-1 lg:row-span-2' : ''}`}>
      <div className={`${large ? 'aspect-[3/4]' : 'aspect-square'} bg-gray-100`}>
        {imgSrc && (
          <img
            src={imgSrc}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-bold text-sm lg:text-base">{item.name}</p>
        <p className="text-[#f9c80e] font-bold">${(item.price / 100).toFixed(2)}</p>
      </div>
    </div>
  );
}
