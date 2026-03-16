'use client';

import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@restaurantos/ui';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function AboutPage() {
  const { tenant } = useTenant();

  if (!tenant) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">About {tenant.name}</h1>
        {tenant.tagline && (
          <p className="text-xl text-muted-foreground">{tenant.tagline}</p>
        )}
      </div>

      {tenant.aboutText ? (
        <div className="prose prose-lg max-w-none">
          {tenant.aboutText.split('\n').map((paragraph: string, i: number) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>We&apos;re passionate about great food and excellent service.</p>
          <p className="mt-2">More details coming soon.</p>
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 text-center">
        <Link href="/order">
          <Button size="lg">
            Order Online
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
