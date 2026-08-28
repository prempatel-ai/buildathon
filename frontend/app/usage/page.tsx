'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMerchantUsage, getAuthToken, removeAuthToken, MerchantUsageData } from '@/lib/api';

export default function UsagePage() {
  const router = useRouter();
  const [usage, setUsage] = useState<MerchantUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadUsage();
  }, []);

  async function loadUsage() {
    setLoading(true);
    try {
      const data = await getMerchantUsage();
      setUsage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    removeAuthToken();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-sm">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-lg">Agentpay</span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
              Usage & Billing Infrastructure
            </span>
          </div>

          <nav className="flex items-center space-x-2 text-xs font-medium">
            <Link href="/" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/agents-list" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              AI Agents
            </Link>
            <Link href="/usage" className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded font-semibold transition-colors">
              Usage & Billing
            </Link>
            <Link href="/settings" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded text-slate-600 transition-colors"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {/* Main Usage Dashboard Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Usage Accounting & Billing Metrics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Usage-based metrics and settled transaction accounting calculated live for your merchant store.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-sans">
            Loading usage accounting metrics...
          </div>
        ) : usage ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <span className="block text-[11px] font-mono uppercase text-slate-400 font-semibold mb-1">
                  Settled Volume (This Month)
                </span>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  ₹{usage.total_settled_volume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="block text-[10px] text-emerald-600 font-mono mt-1 font-semibold">
                  Confirmed Captured Payments
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <span className="block text-[11px] font-mono uppercase text-slate-400 font-semibold mb-1">
                  Total Agent Requests
                </span>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  {usage.total_transactions}
                </p>
                <span className="block text-[10px] text-slate-500 font-mono mt-1">
                  Evaluated Orders
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <span className="block text-[11px] font-mono uppercase text-slate-400 font-semibold mb-1">
                  Settled Payments
                </span>
                <p className="text-2xl font-bold text-emerald-600 font-mono">
                  {usage.settled_transactions}
                </p>
                <span className="block text-[10px] text-emerald-600 font-mono mt-1 font-semibold">
                  100% Signature Verified
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <span className="block text-[11px] font-mono uppercase text-slate-400 font-semibold mb-1">
                  Failed / Denied
                </span>
                <p className="text-2xl font-bold text-amber-600 font-mono">
                  {usage.failed_transactions}
                </p>
                <span className="block text-[10px] text-amber-600 font-mono mt-1">
                  Policy Gated / Failed
                </span>
              </div>
            </div>

            {/* Infrastructure Note */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 mb-2">Usage Accounting Infrastructure</h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Usage metrics are computed live from PostgreSQL immutable transaction logs. This infrastructure provides the foundation for merchant usage-based billing tiers and volume accounting.
              </p>
              <div className="flex items-center space-x-3">
                <Link
                  href="/audit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  View Immutable Audit Logs &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
