/**
 * Generate schema.org structured data for a restaurant.
 */
export function generateRestaurantJsonLd(tenant: {
  name: string;
  phone?: string;
  email?: string;
  address?: { street: string; city: string; state: string; zip: string; country: string };
  tagline?: string;
}) {
  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: tenant.name,
  };

  if (tenant.tagline) {
    jsonLd.description = tenant.tagline;
  }
  if (tenant.phone) {
    jsonLd.telephone = tenant.phone;
  }
  if (tenant.email) {
    jsonLd.email = tenant.email;
  }
  if (tenant.address) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      streetAddress: tenant.address.street,
      addressLocality: tenant.address.city,
      addressRegion: tenant.address.state,
      postalCode: tenant.address.zip,
      addressCountry: tenant.address.country,
    };
  }

  return jsonLd;
}
