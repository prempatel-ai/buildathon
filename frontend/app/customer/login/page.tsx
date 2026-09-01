'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { AgentpayLogo } from '@/components/Logo';
import { API_BASE_URL } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillDemo = () => {
    setIsRegister(false);
    setEmail('rahul@example.com');
    setPassword('Demo@1234');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/customer/auth/register' : '/customer/auth/login';
    const payload = isRegister ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('customer_token', data.access_token);
      localStorage.setItem('customer_id', data.customer_id);
      localStorage.setItem('customer_email', data.email);
      localStorage.setItem('customer_name', data.name);

      router.push('/customer/dashboard');
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 flex flex-col">
      <Navigation />
      <main className="flex-1 flex items-center justify-center p-6 bg-neutral-50/50">
        <div className="max-w-sm w-full bg-white rounded-lg border border-neutral-200 p-7 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <AgentpayLogo size={32} />
            </div>
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
              {isRegister ? 'Create Consumer Account' : 'Consumer Portal Sign In'}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Manage saved virtual card limits, spend vaults & delivery addresses.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Full Name"
                  className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 px-4 rounded-md bg-neutral-900 hover:bg-black text-white font-medium text-xs transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Fill Demo Helper */}
          {!isRegister && (
            <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-400 text-[11px]">Testing demo?</span>
              <button
                type="button"
                onClick={fillDemo}
                className="text-xs font-medium text-neutral-800 hover:text-black underline cursor-pointer"
              >
                Quick Fill Demo Key
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs text-neutral-600 hover:text-neutral-900 font-medium transition cursor-pointer"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have a consumer account? Register"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
