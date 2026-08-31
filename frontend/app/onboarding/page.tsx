'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
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
  Layers,
  Zap,
  ShoppingBag
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merchant state
  const [merchantName, setMerchantName] = useState('');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('Electronics');
  const [createdMerchant, setCreatedMerchant] = useState<Merchant | null>(null);

  // Catalog item state
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [addedItems, setAddedItems] = useState<{ name: string; price: number; stock: number; category: string }[]>([]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_in_progress', 'true');
    }
  }, []);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantName.trim()) {
      setError('Merchant store name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const merchant = await createMerchant({
        name: merchantName.trim(),
        razorpay_key_id: razorpayKey.trim() || undefined,
        limits_config: {
          max_transaction_amount: 10000,
          daily_spend_limit: 50000,
          allowed_categories: [primaryCategory],
        },
      });
      setCreatedMerchant(merchant);
      setCategory(primaryCategory);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to create merchant');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdMerchant) return;

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock, 10);

    if (!itemName.trim()) {
      setError('Product name is required.');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    if (isNaN(numStock) || numStock < 0) {
      setError('Stock must be a non-negative integer.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createCatalogItem({
        merchant_id: createdMerchant.id,
        name: itemName.trim(),
        price: numPrice,
        stock: numStock,
        category: category.trim() || 'General',
      });
      setAddedItems((prev) => [
        {
          name: itemName.trim(),
          price: numPrice,
          stock: numStock,
          category: category.trim() || 'General',
        },
        ...prev,
      ]);
      setItemName('');
      setPrice('');
      setStock('');
    } catch (err: any) {
      setError(err.message || 'Failed to add catalog item');
    } finally {
      setLoading(false);
    }
  };

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
      setError(err.message || 'Failed to seed demo data');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (createdMerchant) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_in_progress');
        localStorage.setItem('agentpay_merchant_cache', JSON.stringify(createdMerchant));
      }
      router.push(`/dashboard?merchant_id=${createdMerchant.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col font-sans text-neutral-900 justify-between selection:bg-neutral-200">
      <Navigation />

      {/* Main Clean Onboarding Container */}
      <main className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center">
        {/* Fast-Track 1-Click Demo Seed Banner */}
        <div className="mb-6 p-4 bg-white border border-neutral-200 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900">Need instant demo setup?</p>
              <p className="text-[11px] text-neutral-500">Seed sample boAt catalog & policies in 1 click.</p>
            </div>
          </div>
          <button
            onClick={handleQuickSeed}
            disabled={loading}
            className="px-3.5 h-8 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-neutral-200" />}
            <span>1-Click Quick Seed</span>
          </button>
        </div>

        {/* Main Card Container */}
        <div className="w-full bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 shadow-xs">
          {/* Stepper Header */}
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-neutral-100">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                    step === 1 ? 'bg-neutral-900 text-white' : 'bg-emerald-500 text-white'
                  }`}
                >
                  {step === 2 ? <Check className="w-3.5 h-3.5" /> : '1'}
                </span>
                <span className={`text-xs font-medium ${step === 1 ? 'text-neutral-900 font-semibold' : 'text-neutral-500'}`}>
                  Store Profile
                </span>
              </div>

              <div className="w-8 h-px bg-neutral-200" />

              <div className="flex items-center space-x-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                    step === 2 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  2
                </span>
                <span className={`text-xs font-medium ${step === 2 ? 'text-neutral-900 font-semibold' : 'text-neutral-400'}`}>
                  Catalog SKUs
                </span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-neutral-400">
              STEP {step} OF 2
            </span>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: MERCHANT STORE SETUP */}
          {step === 1 && (
            <form onSubmit={handleCreateMerchant} className="space-y-5">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                  Configure Merchant Account
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                  Establish your store identity and AI-agent discoverable metadata.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Store / Merchant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Boat Lifestyle Electronics"
                    className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
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
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Razorpay Key ID (Sandbox / Test)
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

                <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-md text-[11.5px] text-neutral-600 space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-neutral-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                    <span>Default Bounded Spend Caps Applied:</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal pl-5 font-mono">
                    Max Order Cap: ₹10,000 &bull; Daily Limit: ₹50,000 &bull; Gateway Protocol: Razorpay Sandbox
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{loading ? 'Creating Merchant...' : 'Continue to Add Catalog Products'}</span>
                  {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CATALOG PRODUCTS SETUP */}
          {step === 2 && createdMerchant && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                    Add Catalog Products
                  </h1>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Store: <span className="font-semibold text-neutral-900">{createdMerchant.name}</span>
                  </p>
                </div>
                <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded text-xs font-mono font-medium">
                  {addedItems.length} SKUs Added
                </span>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4 p-4 bg-neutral-50/60 border border-neutral-200 rounded-lg">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. boAt Wave Call Smartwatch"
                    className="w-full h-8.5 px-3 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Price (INR ₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1799"
                      className="w-full h-8.5 px-3 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Stock Level *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="50"
                      className="w-full h-8.5 px-3 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Smartwatches"
                      className="w-full h-8.5 px-3 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-8 px-4 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Add to Catalog</span>
                  </button>
                </div>
              </form>

              {/* Added Items List */}
              {addedItems.length > 0 && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                    <span>Added Products in This Session</span>
                    <span className="font-mono text-neutral-500 font-normal">{addedItems.length} SKUs</span>
                  </div>
                  <div className="divide-y divide-neutral-100 max-h-48 overflow-y-auto text-xs">
                    {addedItems.map((it, idx) => (
                      <div key={idx} className="p-2.5 px-3 flex items-center justify-between hover:bg-neutral-50/50">
                        <div>
                          <p className="font-medium text-neutral-900">{it.name}</p>
                          <span className="text-[10px] text-neutral-400 font-mono">{it.category}</span>
                        </div>
                        <div className="text-right font-mono">
                          <p className="font-semibold text-neutral-900">₹{it.price.toLocaleString('en-IN')}</p>
                          <span className="text-[10px] text-neutral-500">{it.stock} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 h-8 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <span>Go to Merchant Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-3 text-center text-xs text-neutral-400 font-mono">
        Agentpay &bull; Merchant Catalog Onboarding
      </footer>
    </div>
  );
}
