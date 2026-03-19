import { describe, it, expect } from 'vitest';
import { generateThemeCSS } from './theme';

describe('generateThemeCSS', () => {
  it('generates CSS with a few properties', () => {
    const result = generateThemeCSS({
      background: '#ffffff',
      foreground: '#000000',
    });

    expect(result).toBe(':root { --background: #ffffff; --foreground: #000000; }');
  });

  it('generates CSS with all properties', () => {
    const theme = {
      background: '#fff',
      foreground: '#000',
      primaryColor: '#3b82f6',
      primaryForeground: '#fff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      accent: '#f1f5f9',
      accentForeground: '#0f172a',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      card: '#fff',
      cardForeground: '#000',
      popover: '#fff',
      popoverForeground: '#000',
      border: '#e2e8f0',
      input: '#e2e8f0',
      ring: '#3b82f6',
      destructive: '#ef4444',
      destructiveForeground: '#fff',
      chart1: '#3b82f6',
      chart2: '#10b981',
      chart3: '#f59e0b',
      chart4: '#ef4444',
      chart5: '#8b5cf6',
      sidebar: '#f8fafc',
      sidebarForeground: '#0f172a',
      sidebarPrimary: '#3b82f6',
      sidebarPrimaryForeground: '#fff',
      sidebarAccent: '#f1f5f9',
      sidebarAccentForeground: '#0f172a',
      sidebarBorder: '#e2e8f0',
      sidebarRing: '#3b82f6',
      radius: '0.5rem',
    };

    const result = generateThemeCSS(theme);

    expect(result).toContain('--background: #fff;');
    expect(result).toContain('--primary: #3b82f6;');
    expect(result).toContain('--radius: 0.5rem;');
    expect(result).toContain('--sidebar-ring: #3b82f6;');
    expect(result).toMatch(/^:root \{.*\}$/);
  });

  it('skips empty and falsy values', () => {
    const result = generateThemeCSS({
      background: '#ffffff',
      foreground: '',
      primaryColor: null,
      secondary: undefined,
      accent: 0,
    });

    expect(result).toBe(':root { --background: #ffffff; }');
    expect(result).not.toContain('--foreground');
    expect(result).not.toContain('--primary');
    expect(result).not.toContain('--secondary');
    expect(result).not.toContain('--accent');
  });
});
