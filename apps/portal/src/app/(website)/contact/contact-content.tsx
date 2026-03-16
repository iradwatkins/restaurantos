'use client';

import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@restaurantos/ui';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ContactPage() {
  const { tenant } = useTenant();

  if (!tenant) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  const today = new Date().getDay();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground">
          We&apos;d love to hear from you
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Get in Touch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.address.street}<br />
                    {tenant.address.city}, {tenant.address.state} {tenant.address.zip}
                  </p>
                </div>
              </div>
            )}

            {tenant.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Phone</p>
                  <a
                    href={`tel:${tenant.phone}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {tenant.phone}
                  </a>
                </div>
              </div>
            )}

            {tenant.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <a
                    href={`mailto:${tenant.email}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {tenant.email}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.businessHours && tenant.businessHours.length > 0 ? (
              <div className="space-y-2">
                {tenant.businessHours.map((h: any) => (
                  <div
                    key={h.day}
                    className={`flex justify-between text-sm py-1 px-2 rounded ${
                      h.day === today
                        ? 'bg-primary/10 font-semibold text-primary'
                        : ''
                    }`}
                  >
                    <span>{DAYS[h.day]}</span>
                    <span>
                      {h.isClosed ? 'Closed' : `${h.open} - ${h.close}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Hours not yet configured. Please call for hours.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Google Maps Embed */}
      {tenant.googleMapsEmbedUrl && (
        <div className="mt-8 rounded-lg overflow-hidden border">
          <iframe
            src={tenant.googleMapsEmbedUrl}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Restaurant location"
          />
        </div>
      )}
    </div>
  );
}
