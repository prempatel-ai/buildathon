'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { AgentpayLogo } from '@/components/Logo';
import { createMerchant, createCatalogItem, seedDemoMerchant, Merchant } from '@/lib/api';
import {
  Building2,
  Sparkles,
  ArrowRight,
  Check,
  Package,
  ShieldCheck,
  Plus,
  Loader2,
  CheckCircle2,
  Zap,
  ShoppingBag,
  Sliders,
  ChevronRight,
  Store,
  CreditCard,
  Layers
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [setupMode, setSetupMode] = useState<'demo' | 'custom'>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Store Form State
  const [merchantName, setMerchantName] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('Electronics');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [maxOrderCap, setMaxOrderCap] = useState('10000');
  const [dailySpendCap, setDailySpendCap] = useState('50000');

  // Initial Product State
  const [initialProductName, setInitialProductName] = useState('');
  const [initialProductPrice, setInitialProductPrice] = useState('');
  const [initialProductStock, setInitialProductStock] = useState('50');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_in_progress', 'true');
    }
  }, []);

  const handleQuickSeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const merchant = await seedDemoMerchant();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_in_progress');
        localStorage.setItem('agentpay_merchant_cache', JSON.stringify(merchant));
      }
      router.push(`/dashboard?merchant_id=${merchant.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to seed demo merchant');
      setLoading(false);
    }
  };

  const handleCreateCustomMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantName.trim()) {
      setError('Store / Merchant name is required.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const merchant = await createMerchant({
        name: merchantName.trim(),
        razorpay_key_id: razorpayKey.trim() || undefined,
        limits_config: {
          max_transaction_amount: parseFloat(maxOrderCap) || 10000,
          daily_spend_limit: parseFloat(dailySpendCap) || 50000,
          allowed_categories: [primaryCategory],
        },
      });

      // Optionally add the initial product if provided
      if (initialProductName.trim() && initialProductPrice) {
        try {
          await createCatalogItem({
            merchant_id: merchant.id,
            name: initialProductName.trim(),
            price: parseFloat(initialProductPrice) || 999,
            stock: parseInt(initialProductStock, 10) || 50,
            category: primaryCategory,
          });
        } catch (itemErr) {
          console.log('Error creating initial product:', itemErr);
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_in_progress');
        localStorage.setItem('agentpay_merchant_cache', JSON.stringify(merchant));
      }
      router.push(`/dashboard?merchant_id=${merchant.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create merchant store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 flex flex-col justify-between">
      <Navigation />

      <main className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Page Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[11px] font-mono text-neutral-700">
            <Store className="w-3 h-3 text-neutral-800" />
            <span>MERCHANT STORE SETUP</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Deploy your store for AI commerce
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
            Expose your product catalog to autonomous buyer agents with bounded risk policies and Razorpay settlements.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        {/* Path Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* Option 1: Demo Store */}
          <div
            onClick={() => setSetupMode('demo')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
              setupMode === 'demo'
                ? 'border-neutral-900 bg-neutral-50/80 shadow-xs ring-1 ring-neutral-900'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-neutral-900 text-white rounded text-[10px] font-mono font-medium flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-amber-300" />
                  Recommended
                </span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  setupMode === 'demo' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'
                }`}>
                  {setupMode === 'demo' && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>
              <h3 className="text-xs font-bold text-neutral-900">boAt Lifestyle (Demo)</h3>
              <p className="text-[11px] text-neutral-500 mt-1 leading-normal">
                Instant setup with 8 pre-seeded audio & smartwatch products, verified policies, and schema.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-[10.5px] font-mono text-neutral-400">
              1-Click Setup &bull; Ready to Transact
            </div>
          </div>

          {/* Option 2: Custom Store */}
          <div
            onClick={() => setSetupMode('custom')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
              setupMode === 'custom'
                ? 'border-neutral-900 bg-neutral-50/80 shadow-xs ring-1 ring-neutral-900'
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-mono font-medium">
                  Custom
                </span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  setupMode === 'custom' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'
                }`}>
                  {setupMode === 'custom' && <Check className="w-2.5 h-2.5" />}
                </div>
              </div>
              <h3 className="text-xs font-bold text-neutral-900">Create Custom Store</h3>
              <p className="text-[11px] text-neutral-500 mt-1 leading-normal">
                Configure your own brand name, categories, custom spending limits, and product inventory.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-[10.5px] font-mono text-neutral-400">
              Excel / CSV Upload &bull; Custom Policies
            </div>
          </div>
        </div>

        {/* Dynamic Action Container */}
        {setupMode === 'demo' ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-neutral-900">Launch Pre-Configured Demo Store</h3>
              <p className="text-xs text-neutral-500">
                You will enter the merchant dashboard with boAt Lifestyle Electronics, complete with product catalog, test keys, and agent schema.
              </p>
            </div>

            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-700">
                <span>Pre-Seeded Catalog:</span>
                <strong className="font-mono text-neutral-900">8 Products (Airdopes, Smartwatches, Speakers)</strong>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span>Autonomous Policy:</span>
                <strong className="font-mono text-neutral-900">₹10k Max Order &bull; ₹50k Daily Cap</strong>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span>Settlement Gateway:</span>
                <strong className="font-mono text-neutral-900">Razorpay Sandbox Live API</strong>
              </div>
            </div>

            <button
              onClick={handleQuickSeed}
              disabled={loading}
              className="w-full h-10 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-neutral-200" />
              )}
              <span>{loading ? 'Initializing Demo Store...' : 'Launch boAt Demo Store & Open Dashboard'}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateCustomMerchant} className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-xs font-bold text-neutral-900">Store Details</h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">Configure your brand name and primary product domain.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Store / Merchant Name *
                </label>
                <input
                  type="text"
                  required
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. Apex Electronics & Gear"
                  className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Primary Category *
                  </label>
                  <select
                    value={primaryCategory}
                    onChange={(e) => setPrimaryCategory(e.target.value)}
                    className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  >
                    <option value="Electronics">Electronics & Audio</option>
                    <option value="Health & Fitness">Health & Fitness</option>
                    <option value="Fashion">Fashion & Apparel</option>
                    <option value="Home & Kitchen">Home & Kitchen</option>
                    <option value="General">General Merchandise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Razorpay Key ID (Optional Test Key)
                  </label>
                  <input
                    type="text"
                    value={razorpayKey}
                    onChange={(e) => setRazorpayKey(e.target.value)}
                    placeholder="rzp_test_..."
                    className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bounded Risk Caps */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900">Spending & Risk Governance</span>
                <span className="text-[10px] font-mono text-neutral-400">Autonomous Gating</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">Max Order Limit (₹)</label>
                  <input
                    type="number"
                    value={maxOrderCap}
                    onChange={(e) => setMaxOrderCap(e.target.value)}
                    placeholder="10000"
                    className="w-full h-8.5 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">Daily Rolling Budget (₹)</label>
                  <input
                    type="number"
                    value={dailySpendCap}
                    onChange={(e) => setDailySpendCap(e.target.value)}
                    placeholder="50000"
                    className="w-full h-8.5 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Optional Initial SKU */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900">First Catalog Product (Optional)</span>
                <span className="text-[10px] text-neutral-400">Can also import Excel/CSV later</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={initialProductName}
                    onChange={(e) => setInitialProductName(e.target.value)}
                    placeholder="Product Name (e.g. Wireless Mouse)"
                    className="w-full h-8.5 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={initialProductPrice}
                    onChange={(e) => setInitialProductPrice(e.target.value)}
                    placeholder="Price (₹)"
                    className="w-full h-8.5 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Creating Store & Setting Policies...' : 'Create Store & Open Dashboard'}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        )}

        {/* Consumer Portal Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/customer/chat')}
            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors inline-flex items-center space-x-1 cursor-pointer"
          >
            <span>Looking for AI consumer shopping?</span>
            <strong className="font-semibold text-neutral-900 underline ml-1">Open Consumer Chat Assistant &rarr;</strong>
          </button>
        </div>
      </main>

      {/* Clean Monochrome Footer */}
      <footer className="border-t border-neutral-200 bg-white py-3 text-center text-xs text-neutral-400 font-mono">
        Agentpay &bull; Merchant Catalog & AI Agent Protocol
      </footer>
    </div>
  );
}
