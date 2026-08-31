'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getMerchantMe, updateMerchantSettings, Merchant } from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { RefreshCw, Check, Loader2 } from 'lucide-react';

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

  // Shipping Configuration State
  const [processingDays, setProcessingDays] = useState<number | ''>(1);
  const [standardShippingDays, setStandardShippingDays] = useState<number | ''>(4);
  const [categoryOverridesStr, setCategoryOverridesStr] = useState('');

  useAuthGuard(loadProfile);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await getMerchantMe();
      if (!data || !data.id) {
        router.push('/onboarding');
        return;
      }
      setMerchant(data);
      setName(data.name || '');
      setRazorpayKeyId(data.razorpay_key_id || '');

      const cfg = data.limits_config || {};
      setMaxAmount(cfg.max_transaction_amount ?? '');
      setDailyLimit(cfg.daily_spend_limit ?? '');
      setAllowedCatStr(Array.isArray(cfg.allowed_categories) ? cfg.allowed_categories.join(', ') : '');
      setBlockedCatStr(Array.isArray(cfg.blocked_categories) ? cfg.blocked_categories.join(', ') : '');
      setVelocityLimit(cfg.velocity_limit ?? '');

      const shipCfg = cfg.shipping_config || {};
      setProcessingDays(shipCfg.processing_days ?? 1);
      setStandardShippingDays(shipCfg.standard_shipping_days ?? 4);

      if (shipCfg.per_category_overrides && typeof shipCfg.per_category_overrides === 'object') {
        const strPairs = Object.entries(shipCfg.per_category_overrides).map(([cat, days]) => `${cat}: ${days}`);
        setCategoryOverridesStr(strPairs.join(', '));
      } else {
        setCategoryOverridesStr('');
      }
    } catch (err: any) {
      router.push('/onboarding');
      return;
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

      const catOverrides: Record<string, number> = {};
      if (categoryOverridesStr.trim()) {
        categoryOverridesStr.split(',').forEach(pair => {
          const parts = pair.split(':');
          if (parts.length === 2) {
            const cat = parts[0].trim();
            const days = parseInt(parts[1].trim(), 10);
            if (cat && !isNaN(days)) {
              catOverrides[cat] = days;
            }
          }
        });
      }

      const updated = await updateMerchantSettings({
        name,
        razorpay_key_id: razorpayKeyId || undefined,
        max_amount: maxAmount !== '' ? Number(maxAmount) : undefined,
        daily_limit: dailyLimit !== '' ? Number(dailyLimit) : undefined,
        allowed_categories: allowedArr.length > 0 ? allowedArr : undefined,
        blocked_categories: blockedArr.length > 0 ? blockedArr : undefined,
        velocity_limit: velocityLimit !== '' ? Number(velocityLimit) : undefined,
        processing_days: processingDays !== '' ? Number(processingDays) : undefined,
        standard_shipping_days: standardShippingDays !== '' ? Number(standardShippingDays) : undefined,
        per_category_overrides: Object.keys(catOverrides).length > 0 ? catOverrides : undefined,
      });

      setMerchant(updated);
      setMsg({ type: 'success', text: 'Policy rules and shipping parameters saved successfully.' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save policy settings' });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans";
  const monoInputCls = inputCls + " font-mono";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5";
  const hintCls = "text-[11px] text-neutral-500 mt-1";

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Store Governance</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">Bounded Policy Engine</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Policy & Spend Controls</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Configure transaction caps, category governance, and velocity limits enforced in real-time before agent settlements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {merchant?.name && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{merchant.name}</span>
              </div>
            )}
            <button
              onClick={loadProfile}
              disabled={loading}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reload</span>
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {msg && (
          <div
            className={`mb-6 p-3.5 rounded-md text-xs font-medium flex items-center justify-between ${
              msg.type === 'success'
                ? 'bg-neutral-50 border border-neutral-300 text-neutral-900'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.type === 'success' && <Check className="w-4 h-4 text-neutral-900" />}
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="text-neutral-400 hover:text-neutral-700 ml-2 text-sm font-bold">×</button>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
            <p className="text-xs">Loading store governance profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">

            {/* Section 1: Store & Gateway */}
            <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">1. Store Identity & Gateway Key</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Primary business name and Razorpay API credentials.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  <p className={hintCls}>Leave blank to use platform sandbox credentials.</p>
                </div>
              </div>
            </div>

            {/* Section 2: Transaction Caps */}
            <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">2. Policy Engine Spend Caps</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Hard spend thresholds enforced automatically before any AI order is settled.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  <p className={hintCls}>Orders above this value are rejected by the Bounded Policy Gate.</p>
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
                  <p className={hintCls}>Maximum cumulative order volume permitted per 24-hour rolling window.</p>
                </div>
              </div>
            </div>

            {/* Section 3: Category Governance */}
            <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">3. Category Governance Rules</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Comma-separated category rules evaluated against order SKUs by the decision engine.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className={labelCls}>Allowed Categories</label>
                  <input
                    type="text"
                    value={allowedCatStr}
                    onChange={(e) => setAllowedCatStr(e.target.value)}
                    placeholder="Electronics, Wearables, Audio"
                    className={inputCls}
                  />
                  <p className={hintCls}>Leave blank to allow all merchant categories.</p>
                  {allowedCatStr && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {allowedCatStr.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                        <span key={c} className="px-2 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded text-[10px] font-mono font-medium">{c}</span>
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
                    placeholder="Luxury, Firearms, Adult"
                    className={inputCls}
                  />
                  <p className={hintCls}>Orders matching these categories are unconditionally denied.</p>
                  {blockedCatStr && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {blockedCatStr.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                        <span key={c} className="px-2 py-0.5 bg-neutral-100 text-red-700 border border-neutral-200 rounded text-[10px] font-mono font-medium">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Velocity Limiter */}
            <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">4. Redis Velocity Limiter</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Rate limiting threshold per agent API key to prevent transaction flooding.</p>
              </div>

              <div className="max-w-xs pt-2">
                <label className={labelCls}>Max Requests Per Minute</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={velocityLimit}
                  onChange={(e) => setVelocityLimit(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 10"
                  className={monoInputCls}
                />
                <p className={hintCls}>Standard threshold: 5–20 req/min for production stores.</p>
              </div>
            </div>

            {/* Section 5: Shipping Logistics */}
            <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">5. Shipping & Delivery Logistics</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Parameters used to compute explainable, deterministic delivery dates for autonomous AI orders.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className={labelCls}>Warehouse Processing Lead Time (Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={processingDays}
                    onChange={(e) => setProcessingDays(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 1"
                    className={monoInputCls}
                  />
                  <p className={hintCls}>Order packaging and fulfillment preparation lead time.</p>
                </div>
                <div>
                  <label className={labelCls}>Standard Shipping Transit (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={standardShippingDays}
                    onChange={(e) => setStandardShippingDays(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 4"
                    className={monoInputCls}
                  />
                  <p className={hintCls}>Standard domestic courier transit duration.</p>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100">
                <label className={labelCls}>Per-Category Transit Overrides (Format: Category: Days)</label>
                <input
                  type="text"
                  value={categoryOverridesStr}
                  onChange={(e) => setCategoryOverridesStr(e.target.value)}
                  placeholder="e.g. Electronics: 2, Heavy Appliances: 7"
                  className={inputCls}
                />
                <p className={hintCls}>Custom transit duration overrides for specific product categories.</p>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-400 font-mono">
                Changes take effect immediately across all AI shopping agents.
              </span>
              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 bg-neutral-900 hover:bg-black text-white font-medium text-xs rounded-md shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-neutral-300" /> : <Check className="w-4 h-4" />}
                <span>Save Governance Policy</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
