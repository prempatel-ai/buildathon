'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SpendAuth {
  id: string;
  razorpay_customer_id: string;
  razorpay_token_id?: string;
  card_brand?: string;
  card_last4?: string;
  cardholder_name?: string;
  vpa?: string;
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

  // Card & Limit Form State
  const [spendLimit, setSpendLimit] = useState('5000');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('4242');
  const [cardholderName, setCardholderName] = useState('');
  const [vpa, setVpa] = useState('');
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
      const res = await fetch(`${API_BASE_URL}/customer/authorizations/me`, {
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

      if (data.customer?.name && !cardholderName) {
        setCardholderName(data.customer.name);
      }
      if (data.active_authorization) {
        setSpendLimit(String(data.active_authorization.spend_limit));
        setCardBrand(data.active_authorization.card_brand || 'Visa');
        setCardLast4(data.active_authorization.card_last4 || '4242');
        if (data.active_authorization.cardholder_name) setCardholderName(data.active_authorization.cardholder_name);
        if (data.active_authorization.vpa) setVpa(data.active_authorization.vpa);
      }
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
      const res = await fetch(`${API_BASE_URL}/customer/authorizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          spend_limit: parseFloat(spendLimit),
          period: 'per_transaction',
          card_brand: cardBrand,
          card_last4: cardLast4,
          cardholder_name: cardholderName,
          vpa: vpa || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to set authorization limit');
      }

      setMessage(`Spend authorization of ₹${data.spend_limit} and Payment Method tokenized cleanly!`);
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Consumer Identity & Payment Authorization Portal</h1>
            <p className="text-sm text-slate-500 mt-1">
              Signed in as <span className="font-semibold text-slate-900">{customer?.name}</span> ({customer?.email})
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/customer/chat')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-indigo-600 rounded-xl transition-all shadow-xs border border-slate-800 active:scale-95 group"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition-transform" />
              <span>Launch AI Shopping Chat</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
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

        {/* Saved Tokenized Payment Card & Metrics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Card Preview Widget */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between h-48 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wider uppercase">
                Razorpay Tokenized Vault
              </span>
              <span className="text-xs font-extrabold font-mono tracking-widest text-slate-300 uppercase">
                {authorization?.card_brand || 'VISA'}
              </span>
            </div>

            <div>
              <div className="text-lg font-mono tracking-widest text-slate-200 mb-1">
                •••• •••• •••• {authorization?.card_last4 || '4242'}
              </div>
              <div className="text-xs text-slate-400 font-mono truncate">
                Customer ID: {authorization?.razorpay_customer_id || 'cust_pending'}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Cardholder</div>
                <div className="font-semibold text-slate-100">{authorization?.cardholder_name || customer?.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Status</div>
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {authorization?.status === 'active' ? 'ACTIVE TOKEN' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Spend Limit Metric */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-48">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Authorized Spend Limit</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                ₹{authorization ? Number(authorization.spend_limit).toLocaleString('en-IN') : '0'}
              </div>
              <div className="text-xs text-slate-500 mt-2">Per-Transaction Spend Cap</div>
            </div>
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 font-mono">
              Token ID: {authorization?.razorpay_token_id || 'None'}
            </div>
          </div>

          {/* Remaining Balance Metric */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-48">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Balance</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-2">
                ₹{authorization ? Number(authorization.remaining_limit).toLocaleString('en-IN') : '0'}
              </div>
              <div className="text-xs text-slate-500 mt-2">Available for Autonomous AI Purchases</div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">UPI VPA:</span>
              <span className="font-mono text-slate-700 font-semibold">{authorization?.vpa || 'Not configured'}</span>
            </div>
          </div>
        </div>

        {/* Set / Update Authorization & Card Details Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-1">Configure Saved Payment Method & Spend Limit</h2>
          <p className="text-xs text-slate-500 mb-6">
            Add or update your payment card/UPI details and establish the maximum spend authorization limit for your AI Shopping Assistant.
          </p>

          <form onSubmit={handleCreateAuthorization} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Prem Patel"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Method Type
                </label>
                <select
                  value={cardBrand}
                  onChange={(e) => setCardBrand(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="Visa">Visa Credit/Debit Card</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="RuPay">RuPay Card</option>
                  <option value="UPI AutoPay">UPI AutoPay / e-Mandate</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Last 4 Digits of Card
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value)}
                  placeholder="4242"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  UPI VPA (Optional)
                </label>
                <input
                  type="text"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  placeholder="prem@upi"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Max Spend Limit (INR)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={spendLimit}
                  onChange={(e) => setSpendLimit(e.target.value)}
                  placeholder="5000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingLimit}
                className="py-2.5 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {savingLimit ? 'Saving & Tokenizing...' : 'Save Payment Method & Authorize Limit'}
              </button>
            </div>
          </form>
        </div>

        {/* Audit & Settlement Log Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">AI Agent Purchases & Multi-Actor Audit Trail</h2>
          <p className="text-xs text-slate-500 mb-4">
            Live chronological ledger of all customer authorization evaluations, merchant policy evaluations, and Razorpay payment captures.
          </p>

          {recentTransactions.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No AI agent transaction events recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900">{tx.action}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.decision === 'ALLOW' || tx.decision === 'ACTIVE' || tx.decision === 'REGISTERED' || tx.decision === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.decision}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{tx.reasoning}</p>
                  </div>

                  <div className="text-left sm:text-right text-[10px] font-mono text-slate-400 shrink-0">
                    <div>{tx.created_at ? new Date(tx.created_at).toLocaleString() : ''}</div>
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
