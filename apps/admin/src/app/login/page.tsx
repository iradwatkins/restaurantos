'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@restaurantos/ui';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

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

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
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
      <div className="hidden lg:flex lg:w-[480px] bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden items-center justify-center">
        {/* Dot grid */}
        <div className="absolute inset-0" style={{ opacity: 0.08 }}>
          <svg width="100%" height="100%">
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1.5" fill="white" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 text-center px-12 animate-[fadeIn_0.6s_ease-out]">
          {/* Logo icon */}
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm mb-8">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white">
              <path d="M7 7v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 12v5M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="7" r="1" fill="currentColor" />
              <circle cx="12" cy="6" r="1" fill="currentColor" />
              <circle cx="15" cy="7" r="1" fill="currentColor" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            RestaurantOS
          </h1>
          <p className="text-base text-white/60 max-w-sm">
            White-label restaurant management. POS, KDS, online ordering, and delivery — one dashboard.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-8">
            {[
              { value: '$249', label: 'per month' },
              { value: '3', label: 'platforms' },
              { value: '1', label: 'dashboard' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-[fadeIn_0.4s_ease-out]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M7 7v3c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 12v5M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>RestaurantOS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Sign in to the admin dashboard
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-[fadeIn_0.2s_ease-out]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
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
                className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm transition-all placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
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
                  className="flex h-11 w-full rounded-xl border border-border bg-background px-4 pr-11 text-sm transition-all placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl"
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

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            Platform administration only. Restaurant staff use their portal URL.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
