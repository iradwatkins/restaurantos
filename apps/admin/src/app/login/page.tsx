'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@restaurantos/ui';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

function RestaurantLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <rect width="48" height="48" rx="12" fill="currentColor" className="text-primary" />
      <path
        d="M14 14v6c0 2.2 1.8 4 4 4h12c2.2 0 4-1.8 4-4v-6"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 24v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 34h12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="14" r="1.5" fill="white" />
      <circle cx="24" cy="12" r="1.5" fill="white" />
      <circle cx="30" cy="14" r="1.5" fill="white" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" className="text-white">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="currentColor" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10 text-center px-12"
        >
          <RestaurantLogo className="w-20 h-20 mx-auto mb-8 text-white/20" />
          <h1 className="text-4xl font-bold text-white mb-4" data-display="true">
            RestaurantOS
          </h1>
          <p className="text-lg text-white/70 max-w-md">
            White-label restaurant management platform. POS, KDS, online ordering,
            and delivery aggregation — all in one dashboard.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-white/50 text-sm">
            <div>
              <div className="text-2xl font-bold text-white/80">$249</div>
              <div>per month</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white/80">3</div>
              <div>platforms</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white/80">1</div>
              <div>dashboard</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <RestaurantLogo className="w-10 h-10" />
            <span className="text-xl font-bold" data-display="true">RestaurantOS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight" data-display="true">
              Welcome back
            </h2>
            <p className="text-muted-foreground mt-1">
              Sign in to the admin dashboard
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="admin@restaurantos.com"
                required
                autoComplete="email"
                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-4 pr-11 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Platform administration only. Restaurant staff should use their portal URL.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
