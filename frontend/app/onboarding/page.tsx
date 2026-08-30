'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { createMerchant, createCatalogItem, seedDemoMerchant, getMerchantMe, fetchCatalogItems, Merchant, CatalogItem } from '@/lib/api';
import { Store, Package, Code, Upload, Plus, Edit2, Trash2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Merchant in background context
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null);
  const [activeItems, setActiveItems] = useState<CatalogItem[]>([]);

  // Onboarding Merchant form state
  const [merchantName, setMerchantName] = useState('');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [createdMerchant, setCreatedMerchant] = useState<Merchant | null>(null);

  // Catalog item form state
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [addedItemsCount, setAddedItemsCount] = useState(0);

  useEffect(() => {
    // Attempt to load existing logged-in merchant store details for crisp background preview
    getMerchantMe()
      .then(async (m) => {
        if (m?.id) {
          setActiveMerchant(m);
          try {
            const items = await fetchCatalogItems(m.id);
            setActiveItems(items);
          } catch {
            // fallback to empty
          }
        }
      })
      .catch(() => {});
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

  const bgStoreName = createdMerchant?.name || activeMerchant?.name || merchantName.trim() || 'New Merchant Store Setup';
  const bgStoreId = createdMerchant?.id || activeMerchant?.id || 'Pending Account Creation';
  const displayItems = activeItems.length > 0 ? activeItems : [
    { id: '1', name: 'boAt Wave Call Smartwatch', category: 'Smartwatches', price: 1799, stock: 40 },
    { id: '2', name: 'boAt Airdopes 141', category: 'Earbuds', price: 1299, stock: 60 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative selection:bg-slate-200 overflow-x-hidden">
      <Navigation />

      {/* Crisp Background App / Dashboard Structure (NO Blur) */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        {/* Store Header Banner */}
        <div className="mb-6 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {bgStoreName}
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                Store ID: {bgStoreId} &bull; Merchant Store
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="default" size="sm">
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Catalog ({activeItems.length || addedItemsCount})
            </Button>
            <Button variant="secondary" size="sm">
              <Code className="w-3.5 h-3.5 mr-1.5" />
              Agent JSON-LD Schema
            </Button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Products"
            value={activeItems.length || addedItemsCount}
            unit="items"
            footerRight="Discoverable by AI"
          />
          <MetricCard
            title="Max Order Cap"
            value="₹10,000"
            footerRight="Policy Engine Active"
          />
          <MetricCard
            title="Daily Spend Cap"
            value="₹50,000"
            footerRight="24h Rolling Window"
          />
          <MetricCard
            title="Razorpay Key"
            value={razorpayKey ? 'Custom Key' : 'Sandbox API'}
            footerRight="Razorpay Live API"
          />
        </div>

        {/* Catalog Table Preview */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Catalog Products</h2>
              <p className="text-xs text-slate-500">Manage products available for autonomous AI agent transactions.</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Bulk Import / Sync
              </Button>
              <Button variant="indigo" size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Product
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Stock</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-slate-600"><Badge variant="secondary">{item.category}</Badge></td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">{item.stock} units</td>
                    <td className="px-6 py-4"><StatusBadge status="Transactable" /></td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button variant="ghost" size="xs"><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                      <Button variant="destructive" size="xs"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Foreground Onboarding Card Modal Overlay (Crisp Background - NO Blur) */}
      <div className="fixed inset-0 top-[73px] bg-slate-900/10 flex items-center justify-center p-6 z-40 overflow-y-auto">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl my-auto">
          {/* Top Banner for Quick Seed */}
          <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900">Need instant demo setup?</p>
              <p className="text-xs text-slate-500">Seed sample merchant & catalog in 1 click.</p>
            </div>
            <button
              onClick={handleQuickSeed}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Seeding...' : '1-Click Quick Seed'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* Step 1: Merchant Details */}
          {step === 1 && (
            <form onSubmit={handleCreateMerchant} className="space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Step 1 of 2</span>
                <h1 className="text-lg font-bold text-slate-900 mt-1">Create Merchant Account</h1>
                <p className="text-xs text-slate-500 mt-0.5">Setup store metadata for AI agent discoverability.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Store / Merchant Name *</label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Apex Electronics & Gear"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Razorpay Key ID (Test Mode)</label>
                  <input
                    type="text"
                    value={razorpayKey}
                    onChange={(e) => setRazorpayKey(e.target.value)}
                    placeholder="rzp_test_..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
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
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 font-mono">Step 2 of 2</span>
                  <h1 className="text-lg font-bold text-slate-900 mt-1">Add Catalog Products</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Merchant: <span className="font-bold text-slate-800">{createdMerchant.name}</span></p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono">
                  {addedItemsCount} Items Added
                </span>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Ergonomic Wireless Mouse"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price (INR ₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1499.00"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="20"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {loading ? 'Adding...' : '+ Add Item'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Go to Dashboard &rarr;
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 relative z-10">
        Agentpay &bull; Merchant Catalog Onboarding
      </footer>
    </div>
  );
}
