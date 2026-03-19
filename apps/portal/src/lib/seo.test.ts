import { describe, it, expect } from 'vitest';
import { generateRestaurantJsonLd } from './seo';

describe('generateRestaurantJsonLd', () => {
  it('generates full structured data with all fields', () => {
    const result = generateRestaurantJsonLd({
      name: 'Test Bistro',
      phone: '555-1234',
      email: 'info@testbistro.com',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
      },
      tagline: 'The best bistro in town',
    });

    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Test Bistro',
      description: 'The best bistro in town',
      telephone: '555-1234',
      email: 'info@testbistro.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
        addressLocality: 'Springfield',
        addressRegion: 'IL',
        postalCode: '62701',
        addressCountry: 'US',
      },
    });
  });

  it('generates minimal data with name only', () => {
    const result = generateRestaurantJsonLd({ name: 'Minimal Place' });

    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Minimal Place',
    });
    expect(result).not.toHaveProperty('description');
    expect(result).not.toHaveProperty('telephone');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('address');
  });

  it('omits address when not provided', () => {
    const result = generateRestaurantJsonLd({
      name: 'No Address Cafe',
      phone: '555-0000',
      email: 'cafe@example.com',
    });

    expect(result.name).toBe('No Address Cafe');
    expect(result.telephone).toBe('555-0000');
    expect(result.email).toBe('cafe@example.com');
    expect(result).not.toHaveProperty('address');
  });

  it('maps tagline to description', () => {
    const result = generateRestaurantJsonLd({
      name: 'Tagline Test',
      tagline: 'Fresh food daily',
    });

    expect(result.description).toBe('Fresh food daily');
  });
});
