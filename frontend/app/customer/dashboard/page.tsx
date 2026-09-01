'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, getCustomerToken } from '@/lib/api';
import Navigation from '@/components/Navigation';
import {
  CreditCard,
  MapPin,
  MessageSquare,
  Loader2,
  RefreshCw,
  Check,
  X
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
  const [resettingBalance, setResettingBalance] = useState(false);
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

  const handleResetBalance = async () => {
    const token = getCustomerToken();
    if (!token) return;
    setResettingBalance(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/customer/authorizations/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to recharge balance');
      setMessage(`Available quota successfully recharged to full authorized limit of ₹${Number(data.spend_limit).toLocaleString('en-IN')}.`);
      setAuthorization(data);
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to recharge balance');
    } finally {
      setResettingBalance(false);
    }
  };

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
          reset_balance: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to set authorization limit');
      }

      setMessage(`Spend cap of ₹${Number(data.spend_limit).toLocaleString('en-IN')} updated. Available balance preserved at ₹${Number(data.remaining_limit).toLocaleString('en-IN')}.`);
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
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Consumer Account</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-mono font-medium">
                {customer?.email || 'customer@example.com'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Spend Vault & Payment Methods</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl">
              Manage tokenized payment instruments and establish per-transaction spend caps enforced on autonomous AI shopping agents.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => router.push('/customer/addresses')}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
              <span>Delivery Addresses</span>
            </button>
            <button
              onClick={() => router.push('/customer/chat')}
              className="h-8 px-3.5 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Shopping Chat</span>
            </button>
          </div>
        </div>

        {/* Banner Alert Messages */}
        {error && (
          <div className="mb-6 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-neutral-400 hover:text-neutral-700 font-bold ml-2 cursor-pointer">×</button>
          </div>
        )}

        {message && (
          <div className="mb-6 p-3.5 rounded-md bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-neutral-900" />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
            <p className="text-xs">Loading spend vault profile...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Row: Tokenized Card & Spend Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tokenized Card Preview */}
              <div className="bg-neutral-950 p-6 rounded-lg text-white shadow-xs flex flex-col justify-between h-48 border border-neutral-800 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="text-[10.5px] font-mono font-medium text-neutral-400 uppercase tracking-wider">
                      Tokenized Vault
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold tracking-widest text-neutral-300 uppercase">
                    {authorization?.card_brand || 'VISA'}
                  </span>
                </div>

                <div>
                  <div className="text-lg font-mono tracking-widest text-neutral-100 mb-1">
                    •••• •••• •••• {authorization?.card_last4 || '4242'}
                  </div>
                  <div className="text-[10.5px] text-neutral-400 font-mono truncate">
                    ID: {authorization?.razorpay_customer_id || 'cust_token_active'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 text-xs">
                  <div>
                    <div className="text-[9.5px] text-neutral-400 uppercase font-mono tracking-wider">Cardholder</div>
                    <div className="font-medium text-neutral-200 text-xs">{authorization?.cardholder_name || customer?.name || 'Rahul Sharma'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9.5px] text-neutral-400 uppercase font-mono tracking-wider">Status</div>
                    <span className="text-[10px] font-mono font-semibold text-emerald-400">
                      {authorization?.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authorized Spend Limit Metric */}
              <div className="bg-white p-6 rounded-lg border border-neutral-200 flex flex-col justify-between h-48">
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Authorized Limit</span>
                  <div className="text-2xl font-bold font-mono text-neutral-900 mt-1 tracking-tight">
                    ₹{authorization ? Number(authorization.spend_limit).toLocaleString('en-IN') : '0'}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Maximum cap permitted per autonomous transaction.</p>
                </div>
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                  <span>Enforcement:</span>
                  <span className="font-medium text-neutral-900">Per Transaction</span>
                </div>
              </div>

              {/* Remaining Balance Metric */}
              <div className="bg-white p-6 rounded-lg border border-neutral-200 flex flex-col justify-between h-48">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Available Balance</span>
                    {authorization && Number(authorization.remaining_limit) < Number(authorization.spend_limit) && (
                      <button
                        onClick={handleResetBalance}
                        disabled={resettingBalance}
                        className="text-[10.5px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-2 py-0.5 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Recharge balance to full authorized cap"
                      >
                        <RefreshCw className={`w-3 h-3 ${resettingBalance ? 'animate-spin' : ''}`} />
                        <span>Recharge Full Cap</span>
                      </button>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-mono text-neutral-900 mt-1 tracking-tight">
                    ₹{authorization ? Number(authorization.remaining_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Available quota for instant AI agent settlements.</p>
                </div>
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                  <span>Quota Utilized:</span>
                  <span className="font-mono font-medium text-neutral-900">
                    ₹{authorization ? Math.max(0, Number(authorization.spend_limit) - Number(authorization.remaining_limit)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Set / Update Authorization & Card Details Form */}
            <div className="bg-white p-6 rounded-lg border border-neutral-200">
              <div className="pb-3 mb-5 border-b border-neutral-100">
                <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">Configure Payment Token & Spend Limit</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Update saved payment instruments and establish the transaction cap enforced by the Bounded Policy Engine.
                </p>
              </div>

              <form onSubmit={handleCreateAuthorization} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                      Cardholder Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="Rahul Sharma"
                      className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                      Payment Method Network
                    </label>
                    <select
                      value={cardBrand}
                      onChange={(e) => setCardBrand(e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
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
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                      Last 4 Digits of Card *
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="4242"
                      className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs font-mono text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                      UPI VPA (Optional)
                    </label>
                    <input
                      type="text"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      placeholder="rahul@upi"
                      className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs font-mono text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
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
                      className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs font-bold text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-mono transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingLimit}
                    className="h-9 px-4 rounded-md bg-neutral-900 hover:bg-black text-white font-medium text-xs transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingLimit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save & Tokenize Spend Cap</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Audit Trail & Settlement Activity Log */}
            <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
              <div className="px-6 py-3.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Autonomous Agent Activity Ledger</h2>
                </div>
                <button
                  onClick={fetchDashboard}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                  title="Refresh activity"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="text-xs text-neutral-400 py-12 text-center font-mono">
                  No autonomous agent transaction events recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:bg-neutral-50/50 transition-colors">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 font-mono text-[11px]">{tx.action}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                            tx.decision === 'ALLOW' || tx.decision === 'ACTIVE' || tx.decision === 'REGISTERED' || tx.decision === 'SETTLED'
                              ? 'text-emerald-700'
                              : 'text-red-700'
                          }`}>
                            {tx.decision}
                          </span>
                        </div>
                        <p className="text-neutral-600 text-xs leading-relaxed">{tx.reasoning}</p>
                      </div>

                      <div className="text-left sm:text-right text-[11px] font-mono text-neutral-400 shrink-0">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
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
