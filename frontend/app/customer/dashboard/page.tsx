'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, getCustomerToken } from '@/lib/api';
import Navigation from '@/components/Navigation';
import {
  CreditCard,
  Lock,
  ArrowRight,
  ShieldCheck,
  MapPin,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

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
    const token = getCustomerToken();
    if (!token) {
      router.push('/customer/login');
      return;
    }

    try {
      setLoading(true);
      setError('');
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
      setError(err.message || 'Failed to load spend vault data');
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

    const token = getCustomerToken();
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

      setMessage(`Spend authorization of ₹${Number(data.spend_limit).toLocaleString('en-IN')} updated and card tokenized.`);
      setAuthorization(data);
      await fetchDashboard();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error updating spend authorization');
    } finally {
      setSavingLimit(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 flex flex-col font-sans selection:bg-slate-200">
      <Navigation />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Consumer Account</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {customer?.email || 'customer@example.com'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Spend Vault & Payment Methods</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Manage tokenized payment instruments and set per-transaction spend caps enforced on autonomous AI shopping agents.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => router.push('/customer/addresses')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Delivery Addresses
            </button>
            <button
              onClick={() => router.push('/customer/chat')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Shopping Chat
            </button>
          </div>
        </div>

        {/* Banner Alert Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center justify-between shadow-2xs">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
            <p className="text-xs font-medium">Loading spend vault...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Row: Tokenized Card & Spend Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tokenized Card Preview */}
              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between h-52 border border-slate-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-[11px] font-mono font-semibold text-slate-300 uppercase tracking-wider">
                      Tokenized Vault
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold tracking-widest text-slate-200 uppercase">
                    {authorization?.card_brand || 'VISA'}
                  </span>
                </div>

                <div>
                  <div className="text-xl font-mono tracking-widest text-white mb-1.5">
                    •••• •••• •••• {authorization?.card_last4 || '4242'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    ID: {authorization?.razorpay_customer_id || 'cust_token_active'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Cardholder</div>
                    <div className="font-semibold text-slate-100 text-xs">{authorization?.cardholder_name || customer?.name || 'Prem Patel'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Status</div>
                    <span className="text-[10px] font-semibold text-emerald-400">
                      {authorization?.status === 'active' ? 'Active Token' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorized Spend Limit Metric */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-52">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Authorized Limit</span>
                  <div className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">
                    ₹{authorization ? Number(authorization.spend_limit).toLocaleString('en-IN') : '0'}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Maximum cap permitted per autonomous transaction.</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Enforcement:</span>
                  <span className="font-medium text-slate-800">Per Transaction</span>
                </div>
              </div>

              {/* Remaining Balance Metric */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-52">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Balance</span>
                  <div className="text-3xl font-bold text-emerald-600 mt-2 tracking-tight">
                    ₹{authorization ? Number(authorization.remaining_limit).toLocaleString('en-IN') : '0'}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Available quota for instant AI agent settlements.</p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>UPI VPA:</span>
                  <span className="font-mono font-medium text-slate-800">{authorization?.vpa || 'Default'}</span>
                </div>
              </div>
            </div>

            {/* Set / Update Authorization & Card Details Form */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="pb-4 mb-6 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Configure Payment Token & Spend Limit</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Update your saved payment instrument and establish the transaction cap enforced by the Bounded Policy Engine.
                </p>
              </div>

              <form onSubmit={handleCreateAuthorization} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Cardholder Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Prem Patel"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Payment Method Network
                    </label>
                    <select
                      value={cardBrand}
                      onChange={(e) => setCardBrand(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                    >
                      <option value="Visa">Visa Debit / Credit Card</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="RuPay">RuPay Card</option>
                      <option value="UPI AutoPay">UPI AutoPay / e-Mandate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Last 4 Digits of Card *
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="4242"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      UPI VPA (Optional)
                    </label>
                    <input
                      type="text"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      placeholder="prem@upi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Per-Transaction Spend Cap (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={spendLimit}
                      onChange={(e) => setSpendLimit(e.target.value)}
                      placeholder="5000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono transition"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingLimit}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingLimit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save & Tokenize Spend Cap
                  </button>
                </div>
              </form>
            </div>

            {/* Audit Trail & Settlement Activity Log */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Autonomous Agent Activity Ledger</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live chronological audit trail of spend authorization checks and payment settlements.
                  </p>
                </div>
                <button
                  onClick={fetchDashboard}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                  title="Refresh activity"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="text-xs text-slate-400 py-12 text-center font-medium">
                  No autonomous agent transaction events recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono">{tx.action}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            tx.decision === 'ALLOW' || tx.decision === 'ACTIVE' || tx.decision === 'REGISTERED' || tx.decision === 'SETTLED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-red-50 text-red-700 border border-red-200/80'
                          }`}>
                            {tx.decision}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">{tx.reasoning}</p>
                      </div>

                      <div className="text-left sm:text-right text-[11px] font-mono text-slate-400 shrink-0">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
