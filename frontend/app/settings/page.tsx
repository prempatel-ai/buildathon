'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMerchantMe, updateMerchantSettings, getAuthToken, removeAuthToken, Merchant } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [maxAmount, setMaxAmount] = useState<number | ''>('');
  const [dailyLimit, setDailyLimit] = useState<number | ''>('');
  const [allowedCatStr, setAllowedCatStr] = useState('');
  const [blockedCatStr, setBlockedCatStr] = useState('');
  const [velocityLimit, setVelocityLimit] = useState<number | ''>('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await getMerchantMe();
      setMerchant(data);
      setName(data.name || '');
      setRazorpayKeyId(data.razorpay_key_id || '');

      const cfg = data.limits_config || {};
      setMaxAmount(cfg.max_transaction_amount ?? '');
      setDailyLimit(cfg.daily_spend_limit ?? '');
      setAllowedCatStr(Array.isArray(cfg.allowed_categories) ? cfg.allowed_categories.join(', ') : '');
      setBlockedCatStr(Array.isArray(cfg.blocked_categories) ? cfg.blocked_categories.join(', ') : '');
      setVelocityLimit(cfg.velocity_limit ?? '');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const allowedArr = allowedCatStr.split(',').map(s => s.trim()).filter(Boolean);
      const blockedArr = blockedCatStr.split(',').map(s => s.trim()).filter(Boolean);

      const updated = await updateMerchantSettings({
        name,
        razorpay_key_id: razorpayKeyId || undefined,
        max_amount: maxAmount !== '' ? Number(maxAmount) : undefined,
        daily_limit: dailyLimit !== '' ? Number(dailyLimit) : undefined,
        allowed_categories: allowedArr.length > 0 ? allowedArr : undefined,
        blocked_categories: blockedArr.length > 0 ? blockedArr : undefined,
        velocity_limit: velocityLimit !== '' ? Number(velocityLimit) : undefined,
      });

      setMerchant(updated);
      setMsg({ type: 'success', text: 'Merchant settings & policy rules updated successfully!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    removeAuthToken();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500 text-sm">
        Loading merchant settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-sm">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-lg">Agentpay</span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
              Merchant Settings
            </span>
          </div>

          <nav className="flex items-center space-x-2 text-xs font-medium">
            <Link href="/" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/agents-list" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              AI Agents
            </Link>
            <Link href="/usage" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              Usage & Billing
            </Link>
            <Link href="/settings" className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded font-semibold transition-colors">
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

      {/* Main Form Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
          <h1 className="text-xl font-bold text-slate-900">Merchant Settings & Spend Limits</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure self-service policy caps, category allow/block rules, and velocity limits evaluated live by Bounded Policy Engine.
          </p>

          {msg && (
            <div
              className={`mt-4 p-3 rounded-lg text-xs font-medium ${
                msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="mt-6 space-y-6">
            {/* Store Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Business Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Razorpay Key ID (Test / Live)</label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_test_..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Spend Limits & Safety Net */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Policy Engine Spend Caps</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Amount Per Order (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 1000.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Orders exceeding this single transaction limit will be DENIED by policy.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Total Spend Cap (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 50000.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Maximum cumulative amount permitted per 24-hour window.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Category Allow / Block Rules */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Category Governance Rules</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Allowed Categories (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={allowedCatStr}
                    onChange={(e) => setAllowedCatStr(e.target.value)}
                    placeholder="Electronics, Gadgets, Accessories"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Blocked Categories (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={blockedCatStr}
                    onChange={(e) => setBlockedCatStr(e.target.value)}
                    placeholder="Luxury, Firearms, Gambling"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Velocity Limits */}
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Redis Velocity Limiter Settings</h2>
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Requests Per Minute (Velocity)
                </label>
                <input
                  type="number"
                  value={velocityLimit}
                  onChange={(e) => setVelocityLimit(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Rejects excessive rapid requests with HTTP 429 Too Many Requests.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving Settings...' : 'Save Merchant Settings'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
