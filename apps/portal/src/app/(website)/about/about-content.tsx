'use client';

import { useQuery } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@restaurantos/ui';
import Link from 'next/link';
import { ArrowRight, MapPin, Phone, Mail, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AboutPageProps {
  initialData: {
    tenant: any;
    websiteData: any;
  } | null;
}

export default function AboutPage({ initialData }: AboutPageProps) {
  const { tenant: clientTenant } = useTenant();

  const tenant = initialData?.tenant ?? clientTenant;

  const clientWebsiteData = useQuery(
    api.public.queries.getTenantWebsite,
    !initialData && tenant?.subdomain ? { subdomain: tenant.subdomain } : 'skip'
  );

  const websiteData = initialData?.websiteData ?? clientWebsiteData;

  if (!tenant) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Unable to load this page. Please try again later.</p>
      </div>
    );
  }

  const primaryColor = tenant.primaryColor || '#d32f2f';
  // Darken primary for text on light backgrounds (WCAG AA contrast)
  const c = primaryColor.replace('#', '');
  const primaryTextColor = `#${Math.round(parseInt(c.substring(0, 2), 16) * 0.75).toString(16).padStart(2, '0')}${Math.round(parseInt(c.substring(2, 4), 16) * 0.75).toString(16).padStart(2, '0')}${Math.round(parseInt(c.substring(4, 6), 16) * 0.75).toString(16).padStart(2, '0')}`;
  const heroImage = websiteData?.heroImageUrl;

  return (
    <div>
      {/* Hero section */}
      {heroImage && (
        <section className="relative h-64 md:h-80 overflow-hidden">
          <Image
            src={heroImage}
            alt={`About ${tenant.name}`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized={!heroImage.includes('convex') && !heroImage.includes('72.60.28.175')}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              Our Story
            </h1>
          </div>
        </section>
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        {!heroImage && (
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">About {tenant.name}</h1>
          </div>
        )}

        {tenant.tagline && (
          <p className="text-xl text-center mb-10" style={{ color: primaryTextColor, fontFamily: '"Playfair Display", Georgia, serif' }}>
            {tenant.tagline}
          </p>
        )}

        {/* About text */}
        <section className="bg-[#f5f0e8] rounded-2xl p-8 md:p-12 mb-12">
          {tenant.aboutText ? (
            <div className="prose prose-lg max-w-none">
              {tenant.aboutText.split('\n').map((paragraph: string, i: number) => (
                <p key={i} className="text-[#4a4a4a] leading-relaxed mb-4 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-[#4a4a4a]">
              <p className="text-lg">We&apos;re passionate about great food and excellent service.</p>
              <p className="mt-2">Visit us to experience the difference.</p>
            </div>
          )}
        </section>

        {/* Info grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Location & Contact */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              Visit Us
            </h2>
            <div className="space-y-3 text-sm">
              {tenant.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: primaryColor }} />
                  <span>{tenant.address.street}, {tenant.address.city}, {tenant.address.state} {tenant.address.zip}</span>
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <a href={`tel:${tenant.phone}`} className="hover:underline">{tenant.phone}</a>
                </div>
              )}
              {tenant.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <a href={`mailto:${tenant.email}`} className="hover:underline">{tenant.email}</a>
                </div>
              )}
            </div>
          </div>

          {/* Hours */}
          {tenant.businessHours && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                Hours
              </h2>
              <div className="space-y-0 rounded-xl overflow-hidden border">
                {tenant.businessHours.map((h: any) => {
                  const isToday = h.day === new Date().getDay();
                  return (
                    <div
                      key={h.day}
                      className={`flex justify-between px-4 py-2.5 text-sm ${
                        isToday ? 'text-white font-bold' : 'border-b last:border-b-0'
                      }`}
                      style={isToday ? { backgroundColor: primaryColor } : undefined}
                    >
                      <span>{DAYS[h.day]}</span>
                      <span>{h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/order">
            <Button size="lg" style={{ backgroundColor: primaryColor }}>
              Order Online
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
