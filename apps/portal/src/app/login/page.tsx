'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@restaurantos/ui';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, UtensilsCrossed } from 'lucide-react';

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
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12 bg-background">
      {/* Subtle background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[300px] -right-[200px] w-[600px] h-[600px] rounded-full bg-indigo-500/[0.03]" />
        <div className="absolute -bottom-[400px] -left-[150px] w-[700px] h-[700px] rounded-full bg-violet-500/[0.02]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-[fadeIn_0.4s_ease-out]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 mb-4">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome back
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to your restaurant dashboard
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/[0.04] p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-[fadeIn_0.2s_ease-out]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm transition-all placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
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

            <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          Powered by RestaurantOS
        </p>
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
