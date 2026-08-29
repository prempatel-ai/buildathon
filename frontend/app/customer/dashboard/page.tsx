'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface SpendAuth {
  id: string;
  razorpay_customer_id: string;
  razorpay_token_id?: string;
  spend_limit: number;
  remaining_limit: number;
  period: string;
  status: string;
  created_at: string;
}

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [authorization, setAuthorization] = useState<SpendAuth | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const [spendLimit, setSpendLimit] = useState('5000');
  const [savingLimit, setSavingLimit] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) {
      router.push('/customer/login');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/customer/authorizations/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('customer_token');
        router.push('/customer/login');
        return;
      }

      const data = await res.json();
      setCustomer(data.customer);
      setAuthorization(data.active_authorization);
      setRecentTransactions(data.recent_transactions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLimit(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('customer_token');
    try {
      const res = await fetch('http://localhost:8000/customer/authorizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          spend_limit: parseFloat(spendLimit),
          period: 'per_transaction',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to set authorization limit');
      }

      setMessage(`Spend authorization of ₹${data.spend_limit} activated cleanly!`);
      setAuthorization(data);
      fetchDashboard();
    } catch (err: any) {
      setError(err.message || 'Error updating limit');
    } finally {
      setSavingLimit(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_id');
    router.push('/customer/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navigation />
        <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-500">
          Loading Consumer Portal...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navigation />
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Consumer Spend Authorization Portal</h1>
            <p className="text-sm text-slate-500 mt-1">
              Signed in as <span className="font-semibold text-slate-900">{customer?.name}</span> ({customer?.email})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Spend Limit Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Authorized Spend Limit</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">
              ₹{authorization ? Number(authorization.spend_limit).toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-xs text-slate-500 mt-2">Per-Transaction Reserve Cap</div>
          </div>

          {/* Remaining Balance Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Balance</span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-2">
              ₹{authorization ? Number(authorization.remaining_limit).toLocaleString('en-IN') : '0'}
            </div>
            <div className="text-xs text-slate-500 mt-2">Available for AI Agent Purchases</div>
          </div>

          {/* Razorpay Token Identity */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Razorpay Saved Token</span>
            <div className="text-xs font-mono font-semibold text-slate-800 mt-3 truncate">
              {authorization?.razorpay_customer_id || 'No Customer ID'}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              Token: {authorization?.razorpay_token_id || 'None'}
            </div>
            <div className="mt-3">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                authorization?.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {authorization?.status || 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Set / Update Authorization Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-2">Connect Saved Payment & Set Spend Limit</h2>
          <p className="text-xs text-slate-500 mb-6">
            Tokenize payment authorization via Razorpay and establish a bounded spend limit for AI Buyer Agents.
          </p>

          <form onSubmit={handleCreateAuthorization} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Spend Limit Cap (INR)
              </label>
              <input
                type="number"
                required
                min="1"
                step="100"
                value={spendLimit}
                onChange={(e) => setSpendLimit(e.target.value)}
                placeholder="5000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={savingLimit}
              className="py-2.5 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {savingLimit ? 'Authorizing...' : 'Authorize Payment Method & Limit'}
            </button>
          </form>
        </div>

        {/* Audit / Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Consumer Activity & Audit Log</h2>
          {recentTransactions.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No consumer authorization events recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-slate-900">{tx.action}</span>
                    <p className="text-slate-600 mt-0.5">{tx.reasoning}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tx.decision === 'ALLOW' || tx.decision === 'ACTIVE' || tx.decision === 'REGISTERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tx.decision}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">{tx.created_at ? new Date(tx.created_at).toLocaleTimeString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
