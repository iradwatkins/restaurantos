'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Clock, MapPin, Phone, ArrowRight, Star, Truck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Darken a hex color by a factor (0-1). Used to ensure WCAG AA contrast for text. */
function darkenColor(hex: string, factor: number): string {
  const c = hex.replace('#', '');
  const r = Math.round(parseInt(c.substring(0, 2), 16) * (1 - factor));
  const g = Math.round(parseInt(c.substring(2, 4), 16) * (1 - factor));
  const b = Math.round(parseInt(c.substring(4, 6), 16) * (1 - factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface HomeContentProps {
  initialData: {
    tenant: any;
    menu: any;
    todaySpecial: any;
    publicEvents: any;
    websiteData: any;
  } | null;
}

export default function HomeContent({ initialData }: HomeContentProps) {
  const { tenant: clientTenant, tenantId } = useTenant();

  // Use SSR data first, fall back to client-side queries
  const tenant = initialData?.tenant ?? clientTenant;

  const clientMenu = useQuery(
    api.public.queries.getFullMenu,
    !initialData && tenantId ? { tenantId } : 'skip'
  );

  const clientTodaySpecial = useQuery(
    api.public.queries.getTodaySpecial,
    !initialData && tenantId ? { tenantId } : 'skip'
  );

  const clientPublicEvents = useQuery(
    api.public.queries.getPublicEvents,
    !initialData && tenantId ? { tenantId } : 'skip'
  );

  const clientWebsiteData = useQuery(
    api.public.queries.getTenantWebsite,
    !initialData && tenant?.subdomain ? { subdomain: tenant.subdomain } : 'skip'
  );

  const menu = initialData?.menu ?? clientMenu;
  const todaySpecial = initialData?.todaySpecial ?? clientTodaySpecial;
  const publicEvents = initialData?.publicEvents ?? clientPublicEvents;
  const websiteData = initialData?.websiteData ?? clientWebsiteData;

  if (!tenant) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#1a1a1a]">
        <div role="status" aria-live="polite" className="animate-pulse motion-reduce:animate-none text-white/70 text-lg">Loading...</div>
      </div>
    );
  }

  // Tenant-configurable colors with fallbacks
  const primaryColor = tenant.primaryColor || '#d32f2f';
  const accentColor = tenant.accentColor || '#f9c80e';
  // Darkened variant of primary for text on light backgrounds (WCAG AA contrast)
  const primaryTextColor = darkenColor(primaryColor, 0.25);

  // Tenant-configurable content with fallbacks
  const heroHeading = websiteData?.heroHeading || 'Soul Food.';
  const heroSubheading = websiteData?.heroSubheading || 'Made Fresh Daily.';
  const deliveryMessage = websiteData?.deliveryMessage || 'Yes We Deliver';
  const deliveryPartners = websiteData?.deliveryPartners || [
    { name: 'DoorDash', color: '#C12508', logo: '/doordash-logo.avif' },
    { name: 'Uber Eats', color: '#047A3E', logo: '/ubereats-logo.avif' },
    { name: 'Grubhub', color: '#F63440', logo: '/grubhub-logo.avif' },
  ];

  const today = new Date().getDay();
  const todayHours = tenant.businessHours?.find((h: any) => h.day === today);
  const allItems = menu?.flatMap((cat: any) => cat.items) ?? [];
  const itemsWithImages = allItems.filter((i: any) => i.imageUrl);

  // Pick hero image — each image used ONCE across all sections
  const heroItem = (() => {
    const friedChicken = itemsWithImages.find((i: any) => i.name.toLowerCase().includes('fried chicken'));
    if (friedChicken) return friedChicken;
    const anyChicken = itemsWithImages.find((i: any) => i.name.toLowerCase().includes('chicken') || i.name.toLowerCase().includes('chop'));
    if (anyChicken) return anyChicken;
    if (itemsWithImages.length > 0) return itemsWithImages[0];
    return null;
  })();
  const heroImage = heroItem?.imageUrl || 'https://iheartrecipes.com/wp-content/uploads/2018/03/friedchicken6-1-scaled.jpg';
  const heroItemId = heroItem?._id;

  // Featured dishes — exclude the hero item so no image repeats
  const featuredDishes = allItems.filter((i: any) => i._id !== heroItemId).slice(0, 6);

  // Food gallery — exclude hero + featured items so every image is unique
  const featuredIds = new Set(featuredDishes.map((i: any) => i._id));
  const galleryItems = itemsWithImages.filter((i: any) => i._id !== heroItemId && !featuredIds.has(i._id)).slice(0, 8);

  return (
    <div>

      {/* ════════════════════════════════════════════════
          HERO — Full-screen food image with bold tagline
          ════════════════════════════════════════════════ */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#1a1a1a]">
        <Image
          src={heroImage}
          alt={`${tenant.name} — fresh soul food dishes`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          unoptimized={!heroImage.includes('convex') && !heroImage.includes('72.60.28.175')}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a]/70 via-[#1a1a1a]/30 to-transparent" />

        <div className="relative w-full max-w-6xl mx-auto px-6 py-16 text-left">
          {tenant.logoUrl && (
            <Image src={tenant.logoUrl} alt={`${tenant.name} logo`} width={112} height={112} className="h-20 lg:h-28 w-auto mb-6 drop-shadow-2xl" unoptimized={!tenant.logoUrl.includes('convex') && !tenant.logoUrl.includes('72.60.28.175')} />
          )}

          <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white tracking-tight leading-none mb-4" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            {heroHeading}
          </h1>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-wide mb-8" style={{ fontFamily: '"Playfair Display", Georgia, serif', color: accentColor }}>
            {heroSubheading}
          </p>

          {tenant.tagline && (
            <p className="text-white/70 text-lg max-w-lg mb-10">
              {tenant.tagline}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/order"
              className="w-full sm:w-auto text-white font-bold text-lg px-10 py-4 rounded-full tracking-wide transition-colors shadow-lg inline-block text-center"
              style={{ backgroundColor: primaryColor }}
            >
              ORDER NOW
            </Link>
            <Link
              href="/our-menu"
              className="w-full sm:w-auto bg-transparent hover:bg-white/10 text-white font-semibold text-lg px-10 py-4 rounded-full border-2 border-white/30 transition-colors inline-block text-center"
            >
              VIEW MENU
            </Link>
          </div>

          {/* Quick info pills */}
          <div className="flex items-center gap-4 flex-wrap text-white/70 text-sm">
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
              {deliveryMessage}
            </span>
          </div>
        </div>

        {/* Scalloped divider at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 40" className="w-full" preserveAspectRatio="none">
            <path d="M0,40 C100,0 200,0 300,40 C400,0 500,0 600,40 C700,0 800,0 900,40 C1000,0 1100,0 1200,40 L1200,40 L0,40 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          DELIVERY BAR — configurable delivery partner badges
          ════════════════════════════════════════════════ */}
      <section className="bg-white py-5 border-b">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-8 flex-wrap">
          <span className="font-bold text-sm uppercase tracking-widest flex items-center gap-2" style={{ color: primaryTextColor }}>
            <Truck className="h-4 w-4" />
            {deliveryMessage}
          </span>
          <div className="flex items-center gap-4">
            {deliveryPartners.map((partner: { name: string; color: string; logo?: string }) => (
              partner.logo ? (
                <Image
                  key={partner.name}
                  src={partner.logo}
                  alt={partner.name}
                  width={100}
                  height={32}
                  className="h-7 w-auto object-contain"
                />
              ) : (
                <span
                  key={partner.name}
                  className="text-white text-xs font-bold px-3 py-1.5 rounded"
                  style={{ backgroundColor: partner.color }}
                >
                  {partner.name}
                </span>
              )
            ))}
          </div>
          {tenant.address && (
            <span className="text-gray-600 text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
            </span>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FEATURED DISHES — Large food photography grid
          ════════════════════════════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="font-bold text-sm uppercase tracking-widest mb-2" style={{ color: primaryTextColor }}>From Our Kitchen</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#1a1a1a]" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              Home Cooked Favorites
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredDishes.map((item: any, idx: number) => (
              <FoodCard key={item._id || idx} item={item} large={idx === 0} accentColor={accentColor} />
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/our-menu"
              className="bg-[#1a1a1a] hover:bg-[#333] text-white font-semibold px-8 py-3.5 rounded-full transition-colors inline-block"
            >
              View Full Menu <ArrowRight aria-hidden="true" className="inline h-4 w-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SUNDAY BUFFET — Prominent event section
          ════════════════════════════════════════════════ */}
      {publicEvents && publicEvents.length > 0 && publicEvents[0] && (
        <section className="py-16" style={{ backgroundColor: accentColor }}>
          <div className="max-w-6xl mx-auto px-6">
            <Link href="/events" className="block group">
              <div className="text-center">
                <p className="text-[#1a1a1a] font-bold text-sm uppercase tracking-widest mb-2">
                  Every {publicEvents[0]!.dayOfWeek !== undefined ? DAYS[publicEvents[0]!.dayOfWeek!] : 'Week'}
                  {' · '}{publicEvents[0]!.startTime} – {publicEvents[0]!.endTime}
                </p>
                <h2 className="text-4xl lg:text-6xl font-black text-[#1a1a1a] mb-2" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  {publicEvents[0]!.name}
                </h2>

                {publicEvents[0]!.pricingTiers && (
                  <div className="flex gap-6 lg:gap-10 justify-center mt-8 flex-wrap">
                    {publicEvents[0]!.pricingTiers!.map((tier: any) => {
                      const tierImg: Record<string, string> = {
                        'Adults': 'https://images.pexels.com/photos/6579011/pexels-photo-6579011.jpeg?auto=compress&cs=tinysrgb&w=400',
                        'Seniors': 'https://images.pexels.com/photos/4261996/pexels-photo-4261996.jpeg?auto=compress&cs=tinysrgb&w=400',
                        'Kids 2-12': 'https://images.nappy.co/photo/03qeoT4iedlmbDo67TcCO.jpg?w=400',
                      };
                      const img = tierImg[tier.tierName];
                      return (
                        <div key={tier._id} className="bg-[#1a1a1a] rounded-2xl overflow-hidden text-center min-w-[160px] shadow-xl group-hover:scale-105 transition-transform">
                          {img && (
                            <div className="relative w-full h-32">
                              <Image src={img} alt={tier.tierName} fill className="object-cover" sizes="160px" unoptimized />
                            </div>
                          )}
                          <div className="px-6 py-4">
                            <p className="text-white/60 text-sm font-medium mb-1">{tier.tierName}</p>
                            <p className="text-3xl font-black text-white">${(tier.price / 100).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-[#1a1a1a] text-sm mt-6 group-hover:underline transition-colors">
                  View Details →
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          TODAY'S SPECIAL (or fallback CTA)
          ════════════════════════════════════════════════ */}
      {todaySpecial ? (
        <section className="py-16 bg-[#1a1a1a]">
          <div className="max-w-4xl mx-auto px-6">
            <Link href="/events" className="block group">
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Star className="h-3 w-3" /> Today&apos;s Special · {DAYS[today]}
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                  {todaySpecial.name}
                </h2>
                {todaySpecial.description && (
                  <p className="text-white/70 mt-2 max-w-md mx-auto">{todaySpecial.description}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {todaySpecial.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 group-hover:bg-white/10 transition-colors">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      {item.description && <p className="text-white/70 text-sm">{item.description}</p>}
                    </div>
                    <span className="text-2xl font-black ml-4" style={{ color: accentColor }}>${(item.price / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <p className="text-center text-white/70 text-sm mt-6 group-hover:text-white/70 transition-colors">
                View all specials →
              </p>
            </Link>
          </div>
        </section>
      ) : (
        <section className="py-12 bg-[#1a1a1a]">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-white/70 text-lg mb-3">Check our daily specials throughout the week</p>
            <Link href="/events" className="font-semibold hover:underline" style={{ color: accentColor }}>
              View All Specials →
            </Link>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          FOOD GALLERY — Instagram-style grid
          ════════════════════════════════════════════════ */}
      {galleryItems.length > 0 && (
        <section className="py-0 bg-white">
          <div className="grid grid-cols-4 md:grid-cols-8">
            {galleryItems.map((item: any, idx: number) => (
              <div key={idx} tabIndex={0} className="aspect-square overflow-hidden relative group">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-110 group-focus-within:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 25vw, 12.5vw"
                  unoptimized={!item.imageUrl.includes('convex') && !item.imageUrl.includes('72.60.28.175')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 group-focus-within:bg-black/50 transition-colors flex items-end">
                  <p className="text-white text-xs font-medium p-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity truncate w-full">
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
          ════════════════════════════════════════════════ */}
      <section className="py-16 bg-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12">
          {/* About */}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest mb-3" style={{ color: primaryTextColor }}>About Us</p>
            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              {tenant.name}
            </h2>
            {tenant.aboutText && (
              <p className="text-[#4a4a4a] leading-relaxed mb-6">{tenant.aboutText}</p>
            )}
            <Link href="/about">
              <span className="font-semibold text-sm hover:underline" style={{ color: primaryTextColor }}>Read Our Story →</span>
            </Link>
          </div>

          {/* Hours */}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest mb-3" style={{ color: primaryTextColor }}>Hours</p>
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
                        ? 'text-white font-bold'
                        : 'bg-white text-[#4a4a4a] border-b border-[#eee5d5]'
                    }`}
                    style={h.day === today ? { backgroundColor: primaryColor } : undefined}
                  >
                    <span>{DAYS[h.day]}</span>
                    <span>{h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 space-y-2">
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-[#1a1a1a] font-semibold transition-colors" style={{ '--hover-color': primaryColor } as any}>
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
          BOTTOM CTA — uses tenant primary color
          ════════════════════════════════════════════════ */}
      <section className="py-20" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-3" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Ready to Eat?
          </h2>
          <p className="text-white text-lg mb-8 max-w-md mx-auto">
            Order online for faster pickup. We&apos;ll have it ready when you arrive.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/order"
              className="bg-white font-bold text-lg px-10 py-4 rounded-full hover:bg-white/90 transition-colors shadow-lg inline-block text-center"
              style={{ color: primaryTextColor }}
            >
              Order Now
            </Link>
            <Link
              href="/our-menu"
              className="bg-transparent text-white font-semibold text-lg px-10 py-4 rounded-full border-2 border-white/40 hover:bg-white/10 transition-colors inline-block text-center"
            >
              View Menu
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
function FoodCard({ item, large, accentColor }: { item: any; large?: boolean; accentColor: string }) {
  const imgSrc = item.imageUrl;

  return (
    <div className={`relative rounded-2xl overflow-hidden group ${large ? 'row-span-2 col-span-2 lg:col-span-1 lg:row-span-2' : ''}`}>
      <div className={`${large ? 'aspect-[3/4]' : 'aspect-square'} bg-gray-100 relative`}>
        {imgSrc && (
          <Image
            src={imgSrc}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes={large ? '(max-width: 1024px) 50vw, 33vw' : '(max-width: 768px) 50vw, 33vw'}
            unoptimized={!imgSrc.includes('convex') && !imgSrc.includes('72.60.28.175')}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-bold text-sm lg:text-base">{item.name}</p>
        <p className="font-bold" style={{ color: accentColor }}>${(item.price / 100).toFixed(2)}</p>
      </div>
    </div>
  );
}
