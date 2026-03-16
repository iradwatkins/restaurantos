import Link from 'next/link';

export function WebsiteFooter({
  tenantName,
  phone,
  email,
  address,
}: {
  tenantName: string;
  phone?: string;
  email?: string;
  address?: { street: string; city: string; state: string; zip: string } | null;
}) {
  return (
    <footer className="border-t bg-card mt-12">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="font-bold text-lg text-primary mb-2">{tenantName}</h3>
            <p className="text-sm text-muted-foreground">
              Fresh food, great service.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Quick Links</h4>
            <div className="space-y-2">
              {[
                { href: '/our-menu', label: 'Menu' },
                { href: '/order', label: 'Order Online' },
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Contact</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {address && (
                <p>
                  {address.street}<br />
                  {address.city}, {address.state} {address.zip}
                </p>
              )}
              {phone && <p>{phone}</p>}
              {email && <p>{email}</p>}
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-xs text-muted-foreground">
          Powered by RestaurantOS
        </div>
      </div>
    </footer>
  );
}
