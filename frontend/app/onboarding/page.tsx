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
  Layers,
  Zap,
  ShoppingBag,
  Code2,
  CreditCard,
  Bot,
  ArrowUpRight
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
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 flex flex-col">
      <Navigation />

      {/* Main Studio Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 gap-8 lg:gap-12 items-start justify-center">
        {/* LEFT COLUMN: Architecture & Value Overview */}
        <div className="w-full lg:w-5/12 space-y-6 lg:sticky lg:top-20">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-md text-[11px] font-mono text-neutral-700">
              <AgentpayLogo size={14} />
              <span>MERCHANT ONBOARDING PROTOCOL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 leading-tight">
              Connect your store to autonomous AI shopping agents.
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
              Expose your products via structured JSON-LD schema, enforce bounded transaction rules, and accept instant settlements directly on Razorpay.
            </p>
          </div>

          {/* Core Architecture Capabilities */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-start space-x-3 p-3 bg-neutral-50/70 border border-neutral-200/80 rounded-lg">
              <div className="w-7 h-7 rounded bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Code2 className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-900">Machine-Readable Schema</h4>
                <p className="text-[11px] text-neutral-500 leading-snug">
                  AI buyer agents discover your inventory and prices automatically via OpenAPI and JSON-LD.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-neutral-50/70 border border-neutral-200/80 rounded-lg">
              <div className="w-7 h-7 rounded bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-900">Deterministic Policy Governance</h4>
                <p className="text-[11px] text-neutral-500 leading-snug">
                  Per-transaction maximum caps and daily rolling budgets strictly enforce risk boundaries.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-neutral-50/70 border border-neutral-200/80 rounded-lg">
              <div className="w-7 h-7 rounded bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-neutral-900">Razorpay Autonomous Settlement</h4>
                <p className="text-[11px] text-neutral-500 leading-snug">
                  Execute programmatic payouts and order creation directly via Razorpay APIs.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Setup Workflow */}
        <div className="w-full lg:w-7/12 space-y-6">
          {/* Quick-Launch Demo Card (Prominent 1-Click Option) */}
          <div className="p-5 bg-neutral-950 text-white rounded-xl border border-neutral-800 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono text-neutral-300">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>FAST TRACK</span>
                </div>
                <h3 className="text-sm font-bold text-white">Instant boAt Lifestyle Demo Store</h3>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Populate 8 electronics products, verified policy rules, and schema in 1 click.
                </p>
              </div>
              <button
                onClick={handleQuickSeed}
                disabled={loading}
                className="h-8 px-3.5 bg-white hover:bg-neutral-100 text-neutral-950 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-neutral-900" />}
                <span>Launch Demo</span>
              </button>
            </div>
          </div>

          {/* Main Setup Card Container */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-6">
            {/* Stepper Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                      step === 1 ? 'bg-neutral-900 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {step === 2 ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  <span className={`text-xs font-medium ${step === 1 ? 'text-neutral-900 font-semibold' : 'text-neutral-500'}`}>
                    Store Identity
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
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-medium">
                {error}
              </div>
            )}

            {/* STEP 1: STORE IDENTITY & CONFIGURATION */}
            {step === 1 && (
              <form onSubmit={handleCreateMerchant} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
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
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Primary Store Category *
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

                {/* Policy Governance Summary */}
                <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-md text-[11.5px] text-neutral-600 space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-neutral-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                    <span>Auto-Configured Bounded Policies:</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-normal pl-5 font-mono">
                    Max Order Cap: ₹10,000 &bull; Daily Limit: ₹50,000 &bull; Gateway Protocol: Razorpay Sandbox
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-9 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{loading ? 'Creating Store Account...' : 'Continue to Catalog Setup'}</span>
                    {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: CATALOG PRODUCTS CREATION */}
            {step === 2 && createdMerchant && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      Seed Store Catalog
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Store: <strong className="text-neutral-900">{createdMerchant.name}</strong>
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded text-xs font-mono font-medium">
                    {addedItems.length} Products Added
                  </span>
                </div>

                <form onSubmit={handleAddItem} className="space-y-3 p-4 bg-neutral-50/60 border border-neutral-200 rounded-lg">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Ergonomic Wireless Mouse"
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
                        placeholder="1499"
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
                        placeholder="Accessories"
                        className="w-full h-8.5 px-3 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-8 px-3.5 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Add SKU</span>
                    </button>
                  </div>
                </form>

                {/* Added Products Table */}
                {addedItems.length > 0 && (
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                      <span>Live Catalog Preview</span>
                      <span className="font-mono text-neutral-500 font-normal">{addedItems.length} SKUs added</span>
                    </div>
                    <div className="divide-y divide-neutral-100 max-h-44 overflow-y-auto text-xs">
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
                    <span>Enter Merchant Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Clean Monochrome Footer */}
      <footer className="border-t border-neutral-200 bg-white py-3 text-center text-xs text-neutral-400 font-mono">
        Agentpay &bull; Merchant Catalog & AI Agent Protocol
      </footer>
    </div>
  );
}
