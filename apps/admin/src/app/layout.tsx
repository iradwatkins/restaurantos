import type { Metadata } from 'next';
import { Manrope, Fraunces, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { ConvexClientProvider } from '@/components/convex-client-provider';
import { ThemeProvider } from '@/components/theme-provider';
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
  title: 'RestaurantOS Admin',
  description: 'Super-admin dashboard for RestaurantOS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
