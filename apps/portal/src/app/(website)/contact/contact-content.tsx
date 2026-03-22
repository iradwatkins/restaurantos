'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@restaurantos/backend';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@restaurantos/ui';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, AlertTriangle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ContactPageProps {
  initialTenant: any | null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ContactPage({ initialTenant }: ContactPageProps) {
  const { tenant: clientTenant, tenantId } = useTenant();

  const tenant = initialTenant ?? clientTenant;

  const submitContactForm = useMutation(api.public.mutations.submitContactForm);

  const [formState, setFormState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  if (!tenant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Unable to load this page. Please try again later.</p>
      </div>
    );
  }

  const today = new Date().getDay();
  const resolvedTenantId = initialTenant?._id ?? tenantId;

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.message.trim()) errors.message = 'Message is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    if (!resolvedTenantId) {
      setFormState('error');
      setErrorMessage('Restaurant not found. Please try again later.');
      return;
    }

    setFormState('submitting');
    setErrorMessage('');

    try {
      await submitContactForm({
        tenantId: resolvedTenantId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
      });
      setFormState('success');
      setFormData({ name: '', email: '', message: '' });
      setValidationErrors({});
    } catch (err: any) {
      setFormState('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    }
  }

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

      {/* Contact Form */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Us a Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formState === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Thank you!</h3>
              <p className="text-muted-foreground mb-4">
                We&apos;ll get back to you soon.
              </p>
              <Button
                variant="outline"
                onClick={() => setFormState('idle')}
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contact-name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (validationErrors.name) {
                        setValidationErrors((prev) => ({ ...prev, name: '' }));
                      }
                    }}
                    placeholder="Your name"
                    aria-invalid={!!validationErrors.name}
                    aria-describedby={validationErrors.name ? 'contact-name-error' : undefined}
                  />
                  {validationErrors.name && (
                    <p id="contact-name-error" className="text-sm text-destructive">
                      {validationErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      if (validationErrors.email) {
                        setValidationErrors((prev) => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder="your@email.com"
                    aria-invalid={!!validationErrors.email}
                    aria-describedby={validationErrors.email ? 'contact-email-error' : undefined}
                  />
                  {validationErrors.email && (
                    <p id="contact-email-error" className="text-sm text-destructive">
                      {validationErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <textarea
                  id="contact-message"
                  value={formData.message}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, message: e.target.value }));
                    if (validationErrors.message) {
                      setValidationErrors((prev) => ({ ...prev, message: '' }));
                    }
                  }}
                  placeholder="How can we help you?"
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-invalid={!!validationErrors.message}
                  aria-describedby={validationErrors.message ? 'contact-message-error' : undefined}
                />
                {validationErrors.message && (
                  <p id="contact-message-error" className="text-sm text-destructive">
                    {validationErrors.message}
                  </p>
                )}
              </div>

              {formState === 'error' && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3" role="alert">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <p>{errorMessage || 'Something went wrong. Please try again.'}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={formState === 'submitting'}
              >
                {formState === 'submitting' ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

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
