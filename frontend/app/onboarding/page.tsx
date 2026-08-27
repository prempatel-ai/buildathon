'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMerchant, createCatalogItem, seedDemoMerchant, Merchant } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merchant state
  const [merchantName, setMerchantName] = useState('');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [createdMerchant, setCreatedMerchant] = useState<Merchant | null>(null);

  // Catalog item state
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [addedItemsCount, setAddedItemsCount] = useState(0);

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
          allowed_categories: [category],
        },
      });
      setCreatedMerchant(merchant);
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
      setError('Item name is required.');
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
      setAddedItemsCount((prev) => prev + 1);
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
      router.push(`/dashboard?merchant_id=${merchant.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to seed demo data');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (createdMerchant) {
      router.push(`/dashboard?merchant_id=${createdMerchant.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-semibold text-white text-sm">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Agentpay</span>
          </div>
          <span className="text-xs font-mono text-slate-500">Merchant Onboarding Flow</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl w-full mx-auto px-6 py-12 flex-1">
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          {/* Top Banner for Quick Seed */}
          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900">Need instant demo setup?</p>
              <p className="text-xs text-slate-500">Seed sample merchant & catalog in 1 click.</p>
            </div>
            <button
              onClick={handleQuickSeed}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Seeding...' : '1-Click Quick Seed'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Step 1: Merchant Details */}
          {step === 1 && (
            <form onSubmit={handleCreateMerchant} className="space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step 1 of 2</span>
                <h1 className="text-lg font-semibold text-slate-900 mt-1">Create Merchant Account</h1>
                <p className="text-xs text-slate-500 mt-0.5">Setup store metadata for AI agent discoverability.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Store / Merchant Name *</label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Apex Electronics & Gear"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Razorpay Key ID (Test Mode)</label>
                  <input
                    type="text"
                    value={razorpayKey}
                    onChange={(e) => setRazorpayKey(e.target.value)}
                    placeholder="rzp_test_..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating Merchant...' : 'Continue to Add Catalog Items'}
              </button>
            </form>
          )}

          {/* Step 2: Add Catalog Items */}
          {step === 2 && createdMerchant && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Step 2 of 2</span>
                  <h1 className="text-lg font-semibold text-slate-900 mt-1">Add Catalog Products</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Merchant: <span className="font-semibold text-slate-800">{createdMerchant.name}</span></p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                  {addedItemsCount} Items Added
                </span>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Ergonomic Wireless Mouse"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Price (INR ₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1499.00"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : '+ Add Item'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Go to Dashboard &rarr;
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Agentpay &bull; Merchant Catalog Onboarding
      </footer>
    </div>
  );
}
