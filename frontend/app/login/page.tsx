'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { loginMerchant, registerMerchant } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fillDemoMerchant = (demoEmail: string, demoName: string) => {
    setIsRegister(false);
    setEmail(demoEmail);
    setPassword('DemoStore123!');
    setName(demoName);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await registerMerchant(name, email, password, razorpayKeyId || undefined);
      } else {
        await loginMerchant(email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-200">
      <Navigation />

      <main className="flex-1 flex flex-col items-center justify-center p-6 my-8">
        {/* Quick Demo Merchant Pill Box */}
        <div className="mb-6 max-w-md w-full bg-white border border-slate-200/90 rounded-2xl p-4 text-center shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            ⚡ 1-Click Quick Demo Store Sign In
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillDemoMerchant('boat@demo.com', 'boAt Official Store')}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              🎧 boAt Store
            </button>
            <button
              onClick={() => fillDemoMerchant('jbl@demo.com', 'JBL Audio India')}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              🎵 JBL Store
            </button>
            <button
              onClick={() => fillDemoMerchant('sony@demo.com', 'Sony Store Official')}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200/70 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
            >
              🔊 Sony Store
            </button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/40">
          {/* Segmented Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                !isRegister ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In to Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                isRegister ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register New Store
            </button>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {isRegister ? 'Register Merchant Account' : 'Merchant Portal Sign In'}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {isRegister
                ? 'Create a secure merchant account to sell products via AI buyer agents.'
                : 'Access your product catalog, policy rules, agent keys, and audit logs.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Store / Merchant Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Apex Electronics & Gear"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-slate-400 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Merchant Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@store.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-slate-400 transition"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Razorpay Key ID (Optional Test Key)
                </label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_test_..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-slate-400 transition font-mono"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 font-bold rounded-xl text-white text-xs shadow-md transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isRegister ? 'Create Merchant Store' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
