import type { Metadata } from 'next';
import { Manrope, Fraunces, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { Toaster } from 'sonner';
import { ConvexClientProvider } from '@/components/convex-client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { resolveTenant, extractSubdomain } from '@/lib/tenant';
import { generateThemeCSS } from '@/lib/theme';
import './globals.css';

const sansFont = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const displayFont = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'RestaurantOS',
  description: 'Restaurant Management Portal',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  let themeCSS = '';
  let tenantName = 'RestaurantOS';

  if (subdomain) {
    try {
      const resolved = await resolveTenant(subdomain);
      if (resolved?.theme) {
        themeCSS = generateThemeCSS(resolved.theme);
      }
      if (resolved?.tenant?.name) {
        tenantName = resolved.tenant.name;
      }
    } catch {
      // Convex may not be available during build
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{tenantName}</title>
        {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      </head>
      <body className={`${sansFont.variable} ${displayFont.variable} ${monoFont.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ConvexClientProvider>
            {children}
            <Toaster position="top-right" richColors />
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
