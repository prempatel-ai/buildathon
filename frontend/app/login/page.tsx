'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { AgentpayLogo } from '@/components/Logo';
import { loginMerchant, registerMerchant } from '@/lib/api';
import {
  Store,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  Building2,
  Key,
  ShoppingBag,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fillDemoMerchant = () => {
    setIsRegister(false);
    setEmail('demo@agentpay.dev');
    setPassword('DemoStore123!');
    setName('Boat Lifestyle Electronics');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await registerMerchant(name, email, password, razorpayKeyId || undefined);
        router.push('/onboarding');
      } else {
        await loginMerchant(email, password);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-200 justify-between">
      <Navigation />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-xs">
          {/* Header */}
          <div className="text-center mb-6 space-y-2">
            <div className="inline-flex items-center justify-center mb-1">
              <AgentpayLogo size={32} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              {isRegister ? 'Register Merchant Account' : 'Merchant Portal Sign In'}
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
              {isRegister
                ? 'Deploy a machine-readable store for autonomous AI shopping agents.'
                : 'Access catalog inventory, spending policies, agent keys, and audit logs.'}
            </p>
          </div>

          {/* 1-Click Demo Filler Banner */}
          {!isRegister && (
            <div className="mb-5 p-3 bg-neutral-50 border border-neutral-200/80 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-neutral-900">Testing the live demo?</p>
                <p className="text-[11px] text-neutral-500">Auto-fill verified demo store credentials.</p>
              </div>
              <button
                type="button"
                onClick={fillDemoMerchant}
                className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 rounded-md text-xs font-medium transition-all shadow-2xs cursor-pointer shrink-0"
              >
                Auto-Fill Demo
              </button>
            </div>
          )}

          {/* Segmented Mode Switcher */}
          <div className="flex p-1 bg-neutral-100 rounded-lg mb-5 border border-neutral-200/60">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                !isRegister ? 'bg-white text-neutral-900 shadow-2xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                isRegister ? 'bg-white text-neutral-900 shadow-2xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Register Store
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Store / Merchant Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Apex Electronics & Gear"
                  className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Merchant Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@store.com"
                className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Razorpay Key ID (Optional Sandbox Key)
                </label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_test_..."
                  className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Authenticating...' : (isRegister ? 'Register & Setup Store' : 'Sign In to Dashboard')}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        {/* Consumer Portal Link */}
        <div className="text-center mt-6">
          <Link
            href="/customer/chat"
            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors inline-flex items-center space-x-1 cursor-pointer"
          >
            <span>Looking for consumer shopping?</span>
            <strong className="font-semibold text-neutral-900 underline ml-1">Open Consumer Chat Assistant &rarr;</strong>
          </Link>
        </div>
      </main>

      {/* Clean Monochrome Footer */}
      <footer className="border-t border-neutral-200 bg-white py-3 text-center text-xs text-neutral-400 font-mono">
        Agentpay &bull; Merchant Authentication & Console
      </footer>
    </div>
  );
}
