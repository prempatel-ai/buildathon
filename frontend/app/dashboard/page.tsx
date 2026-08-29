'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMerchantMe,
  fetchCatalogItems,
  createCatalogItem,
  bulkImportCatalogItems,
  updateCatalogItem,
  deleteCatalogItem,
  fetchAgentSchema,
  getAuthToken,
  Merchant,
  CatalogItem,
} from '@/lib/api';

import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit2, Trash2, Code, Package, Store, Upload, FileCode2 } from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [agentSchema, setAgentSchema] = useState<Record<string, any> | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'schema'>('catalog');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Bulk Import Modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkJson, setBulkJson] = useState(`[
  { "name": "boAt Wave Call Smartwatch", "price": 1799, "stock": 40, "category": "Smartwatches" },
  { "name": "boAt Airdopes 141", "price": 1299, "stock": 60, "category": "Earbuds" },
  { "name": "boAt Stone 350 Speaker", "price": 1499, "stock": 25, "category": "Speakers" }
]`);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant?.id) return;
    setBulkLoading(true);
    setBulkError(null);

    try {
      let itemsToImport: any[] = [];
      const trimmed = bulkJson.trim();

      if (trimmed.startsWith('[')) {
        itemsToImport = JSON.parse(trimmed);
      } else {
        const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
        itemsToImport = lines.map((line) => {
          const parts = line.split(',').map((p) => p.trim());
          return {
            name: parts[0] || 'Imported Product',
            price: parseFloat(parts[1]) || 999,
            stock: parseInt(parts[2]) || 50,
            category: parts[3] || 'General',
          };
        });
      }

      if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
        throw new Error('Invalid JSON/CSV payload. Must be a non-empty list of products.');
      }

      const formatted = itemsToImport.map((it) => ({
        merchant_id: merchant.id,
        name: String(it.name || 'Unnamed Product').trim(),
        price: parseFloat(it.price) || 0,
        stock: parseInt(it.stock) || 0,
        category: String(it.category || 'General').trim(),
      }));

      await bulkImportCatalogItems(merchant.id, formatted);
      setShowBulkModal(false);
      await loadDashboardData();
    } catch (err: any) {
      setBulkError(err.message || 'Failed to bulk import products.');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [router]);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const meData = await getMerchantMe();
      setMerchant(meData);

      if (meData?.id) {
        const [catData, schemaData] = await Promise.all([
          fetchCatalogItems(meData.id).catch(() => []),
          fetchAgentSchema(meData.id).catch(() => null),
        ]);
        setItems(catData);
        setAgentSchema(schemaData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load merchant dashboard');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setStock('');
    setCategory('Electronics');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    setStock(item.stock.toString());
    setCategory(item.category || 'Electronics');
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant?.id) return;

    const numPrice = parseFloat(price);
    const numStock = parseInt(stock, 10);

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Price must be a non-negative number.');
      return;
    }
    if (isNaN(numStock) || numStock < 0) {
      setFormError('Stock must be a non-negative integer.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      if (editingItem) {
        await updateCatalogItem(editingItem.id, {
          name: name.trim(),
          price: numPrice,
          stock: numStock,
          category: category.trim(),
        });
      } else {
        await createCatalogItem({
          merchant_id: merchant.id,
          name: name.trim(),
          price: numPrice,
          stock: numStock,
          category: category.trim(),
        });
      }
      setShowModal(false);
      await loadDashboardData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save item');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this product from catalog?')) return;
    try {
      await deleteCatalogItem(itemId);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete catalog item');
    }
  };

  const limitsConfig = merchant?.limits_config || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-200">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* Store Header Banner */}
        {loading ? (
          <div className="mb-6 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-60" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-28 rounded-xl" />
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>
          </div>
        ) : (
          merchant && (
            <div className="mb-6 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                      {merchant.name}
                    </h1>
                    <p className="text-xs text-slate-500 font-mono">
                      ID: {merchant.id} &bull; {merchant.email || 'Merchant Store'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                <Button
                  variant={activeTab === 'catalog' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('catalog')}
                >
                  <Package className="w-3.5 h-3.5 mr-1.5" />
                  Catalog ({items.length})
                </Button>
                <Button
                  variant={activeTab === 'schema' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setActiveTab('schema')}
                >
                  <Code className="w-3.5 h-3.5 mr-1.5" />
                  Agent JSON-LD Schema
                </Button>
              </div>
            </div>
          )
        )}

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Products"
            value={items.length}
            unit="items"
            footerRight="Discoverable by AI"
            loading={loading}
          />
          <MetricCard
            title="Max Order Cap"
            value={`₹${limitsConfig.max_transaction_amount ? Number(limitsConfig.max_transaction_amount).toLocaleString('en-IN') : '10,000'}`}
            footerRight="Policy Engine"
            loading={loading}
          />
          <MetricCard
            title="Daily Spend Cap"
            value={`₹${limitsConfig.daily_spend_limit ? Number(limitsConfig.daily_spend_limit).toLocaleString('en-IN') : '50,000'}`}
            footerRight="24h Window"
            loading={loading}
          />
          <MetricCard
            title="Razorpay Key"
            value={merchant?.razorpay_key_id ? 'Custom Key' : 'Sandbox'}
            footerRight="Razorpay Live API"
            loading={loading}
          />
        </div>

        {/* Tab 1: Catalog Items Table */}
        {activeTab === 'catalog' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Catalog Products</h2>
                <p className="text-xs text-slate-500">Manage products available for autonomous AI agent transactions.</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowBulkModal(true)}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Bulk Import / Sync
                </Button>
                <Button variant="indigo" size="sm" onClick={handleOpenCreateModal}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Product
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-full rounded-xl" />
                <Skeleton className="h-8 w-full rounded-xl" />
                <Skeleton className="h-8 w-full rounded-xl" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-slate-800">No products in catalog</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Add catalog items for AI agents to discover.</p>
                <Button variant="default" size="sm" onClick={handleOpenCreateModal}>
                  + Add First Product
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Product Name</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Price (INR ₹)</th>
                      <th className="px-6 py-3.5">Stock</th>
                      <th className="px-6 py-3.5">AI Discovery Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <Badge variant="secondary">{item.category}</Badge>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">
                          ₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold">
                          {item.stock > 0 ? (
                            <span className="text-slate-800">{item.stock} units</span>
                          ) : (
                            <span className="text-red-600 font-bold">Out of stock</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={item.stock > 0 ? 'Transactable' : 'Out of Stock'} />
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button variant="ghost" size="xs" onClick={() => handleOpenEditModal(item)}>
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="destructive" size="xs" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Agent Schema JSON-LD */}
        {activeTab === 'schema' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Agent-Readable Schema (`schema.org` JSON-LD)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live schema output consumed by Groq LLM buyer agents during product discovery.
                </p>
              </div>
              {merchant?.id && (
                <a
                  href={`http://localhost:8000/catalog/agent-schema?merchant_id=${merchant.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-mono font-bold transition-colors"
                >
                  Open Endpoint &nearr;
                </a>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : agentSchema ? (
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
                {JSON.stringify(agentSchema, null, 2)}
              </pre>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">No schema available.</div>
            )}
          </div>
        )}
      </main>

      {/* Modal for Add / Edit Catalog Item */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingItem ? 'Edit Catalog Product' : 'Add New Catalog Product'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify product pricing and stock for AI agent transactions.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Headphones"
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
                    placeholder="1200.00"
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
                    placeholder="50"
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
                  placeholder="Electronics"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="default" size="sm" loading={formLoading}>
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import / Sync Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bulk Product Catalog Import / Sync</h3>
                  <p className="text-xs text-slate-500">Paste JSON or CSV catalog exported from Shopify, WooCommerce, or custom store.</p>
                </div>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
                ✕
              </button>
            </div>

            {bulkError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-mono">
                {bulkError}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 font-mono">
                    JSON Array or CSV Catalog Data
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">Name, Price, Stock, Category</span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  placeholder={`[
  { "name": "boAt Wave Call Smartwatch", "price": 1799, "stock": 40, "category": "Smartwatches" }
]`}
                  className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setBulkJson(`[
  { "name": "boAt Wave Call Smartwatch", "price": 1799, "stock": 40, "category": "Smartwatches" },
  { "name": "boAt Airdopes 141", "price": 1299, "stock": 60, "category": "Earbuds" },
  { "name": "boAt Stone 350 Speaker", "price": 1499, "stock": 25, "category": "Speakers" },
  { "name": "boAt BassHeads 100", "price": 399, "stock": 100, "category": "Earphones" }
]`)}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                  >
                    Preset: boAt Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkJson(`boAt Rockerz 550, 1999, 30, Headphones
JBL Tune 760NC, 5499, 15, Headphones
Sony WH-1000XM5, 26990, 10, Premium Audio`)}
                    className="px-2.5 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                  >
                    Preset: CSV Format
                  </button>
                </div>

                <div className="flex space-x-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowBulkModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" size="sm" loading={bulkLoading}>
                    Import All Products
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Agentpay &bull; Merchant Control Center &bull; Razorpay AI Protocol
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12 text-slate-400 font-mono text-xs">
        Loading Merchant Dashboard...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
