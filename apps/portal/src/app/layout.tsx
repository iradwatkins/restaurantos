import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { Toaster } from 'sonner';
import { ConvexClientProvider } from '@/components/convex-client-provider';
import { resolveTenant, extractSubdomain } from '@/lib/tenant';
import { generateThemeCSS } from '@/lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RestaurantOS',
  description: 'Restaurant Management Portal',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const subdomain = extractSubdomain(host);

  let themeCSS = '';

  if (subdomain) {
    try {
      const resolved = await resolveTenant(subdomain);
      if (resolved?.theme) {
        themeCSS = generateThemeCSS(resolved.theme);
      }
    } catch {
      // Convex may not be available during build
    }
  }

  return (
    <html lang="en">
      <head>{themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}</head>
      <body className={inter.className}>
        <ConvexClientProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
