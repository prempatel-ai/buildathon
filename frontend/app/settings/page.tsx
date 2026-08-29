'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMerchantMe, updateMerchantSettings, getAuthToken, Merchant } from '@/lib/api';
import { ShieldCheck, RefreshCw } from 'lucide-react';

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
      setMsg({ type: 'success', text: 'Policy rules & spend limits saved successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400 transition font-sans";
  const monoInputCls = inputCls + " font-mono";
  const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5";
  const hintCls = "text-[10px] text-slate-400 mt-1";

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-indigo-100 pb-16">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          category="Store Configuration"
          title="Policy & Spend Controls"
          subtitle="Configure transaction caps, category governance, and velocity limits enforced live by the Bounded Policy Engine."
          badge={merchant?.name}
          actions={
            <Button variant="outline" size="sm" onClick={loadProfile} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
              Reload
            </Button>
          }
        />

        {msg && (
          <div
            className={`mb-6 p-3.5 rounded-2xl text-xs font-medium ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">

            {/* Section: Store Info */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Store Identity
              </h2>
              <p className="text-xs text-slate-500 mb-5">Business name and payment gateway credentials.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Store / Business Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    required
                    placeholder="e.g. boAt Official Store"
                  />
                </div>
                <div>
                  <label className={labelCls}>Razorpay Key ID (Test / Live)</label>
                  <input
                    type="text"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    placeholder="rzp_test_..."
                    className={monoInputCls}
                  />
                  <p className={hintCls}>Leave blank to use the platform sandbox key.</p>
                </div>
              </div>
            </div>

            {/* Section: Spend Caps */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900 mb-1">Policy Engine Spend Caps</h2>
              <p className="text-xs text-slate-500 mb-5">Absolute limits enforced before any agent order is accepted.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Max Amount Per Order (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 10000.00"
                    className={monoInputCls}
                  />
                  <p className={hintCls}>Orders above this amount are denied — enforced per transaction.</p>
                </div>
                <div>
                  <label className={labelCls}>Daily Total Spend Cap (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 50000.00"
                    className={monoInputCls}
                  />
                  <p className={hintCls}>Maximum cumulative volume permitted per 24-hour rolling window.</p>
                </div>
              </div>
            </div>

            {/* Section: Category Rules */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900 mb-1">Category Governance Rules</h2>
              <p className="text-xs text-slate-500 mb-5">Comma-separated category names. Groq LLM evaluates orders against these rules.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Allowed Categories</label>
                  <input
                    type="text"
                    value={allowedCatStr}
                    onChange={(e) => setAllowedCatStr(e.target.value)}
                    placeholder="Electronics, Gadgets, Accessories"
                    className={inputCls}
                  />
                  <p className={hintCls}>Only these categories can be purchased. Leave blank to allow all.</p>
                  {allowedCatStr && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {allowedCatStr.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                        <span key={c} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-semibold font-mono">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Blocked Categories</label>
                  <input
                    type="text"
                    value={blockedCatStr}
                    onChange={(e) => setBlockedCatStr(e.target.value)}
                    placeholder="Luxury, Firearms, Gambling"
                    className={inputCls}
                  />
                  <p className={hintCls}>Orders in these categories are always denied.</p>
                  {blockedCatStr && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {blockedCatStr.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                        <span key={c} className="px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 rounded-full text-[10px] font-semibold font-mono">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section: Velocity */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900 mb-1">Redis Velocity Limiter</h2>
              <p className="text-xs text-slate-500 mb-5">Rate-limiting per agent key. Excessive rapid requests return HTTP 429.</p>
              <div className="max-w-xs">
                <label className={labelCls}>Max Requests Per Minute</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={velocityLimit}
                  onChange={(e) => setVelocityLimit(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 5"
                  className={monoInputCls}
                />
                <p className={hintCls}>Recommended: 5–20 for production, up to 100 for sandbox testing.</p>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
              <Button type="submit" variant="indigo" size="sm" loading={saving}>
                Save Policy Settings
              </Button>
            </div>
          </form>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 mt-12">
        Agentpay · Policy & Governance · Razorpay AI Protocol
      </footer>
    </div>
  );
}
