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
import { Plus, Edit2, Trash2, Code, Package, Store, Upload, ShieldCheck, Zap, Layers, Wallet } from 'lucide-react';

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
    <div className="min-h-screen bg-[#090d16] text-[#f8fafc] flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navigation />

      {/* Main Content (HeroUI Finances Theme Hue 255°) */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        {error && (
          <div className="mb-6 p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-2xl text-xs font-mono">
            {error}
          </div>
        )}

        {/* Store Header FinTech Banner */}
        {loading ? (
          <div className="mb-6 bg-[#0e1322] border border-[#1e293b] rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-2xl bg-slate-800" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 bg-slate-800" />
                <Skeleton className="h-3 w-60 bg-slate-800" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-28 rounded-xl bg-slate-800" />
              <Skeleton className="h-9 w-36 rounded-xl bg-slate-800" />
            </div>
          </div>
        ) : (
          merchant && (
            <div className="mb-6 bg-[#0e1322] border border-[#1e293b] rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-xl font-bold text-[#f8fafc] font-mono">
                        {merchant.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-800/60 text-indigo-400 font-mono text-[10px] font-bold">
                        FINANCES THEME 255°
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
                      ID: {merchant.id} &bull; {merchant.email || 'Merchant Store Protocol'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 border-t md:border-t-0 pt-4 md:pt-0 border-[#1e293b]">
                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center ${
                    activeTab === 'catalog'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#13192e] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 mr-1.5" />
                  Catalog ({items.length})
                </button>
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center ${
                    activeTab === 'schema'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#13192e] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                  }`}
                >
                  <Code className="w-3.5 h-3.5 mr-1.5" />
                  Agent JSON-LD
                </button>
              </div>
            </div>
          )
        )}

        {/* FinTech Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0e1322] border border-[#1e293b] rounded-2xl p-5 shadow-lg font-mono">
            <div className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider mb-1">TOTAL PRODUCTS</div>
            <div className="text-2xl font-extrabold text-[#f8fafc]">{items.length}</div>
            <div className="text-[11px] text-indigo-400 mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Discoverable by AI
            </div>
          </div>

          <div className="bg-[#0e1322] border border-[#1e293b] rounded-2xl p-5 shadow-lg font-mono">
            <div className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider mb-1">MAX ORDER CAP</div>
            <div className="text-2xl font-extrabold text-[#f8fafc]">
              ₹{limitsConfig.max_transaction_amount ? Number(limitsConfig.max_transaction_amount).toLocaleString('en-IN') : '10,000'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Policy Engine Active
            </div>
          </div>

          <div className="bg-[#0e1322] border border-[#1e293b] rounded-2xl p-5 shadow-lg font-mono">
            <div className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider mb-1">DAILY SPEND CAP</div>
            <div className="text-2xl font-extrabold text-[#f8fafc]">
              ₹{limitsConfig.daily_spend_limit ? Number(limitsConfig.daily_spend_limit).toLocaleString('en-IN') : '50,000'}
            </div>
            <div className="text-[11px] text-[#94a3b8] mt-1">24h Rolling Window</div>
          </div>

          <div className="bg-[#0e1322] border border-[#1e293b] rounded-2xl p-5 shadow-lg font-mono">
            <div className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider mb-1">RAZORPAY KEY</div>
            <div className="text-2xl font-extrabold text-[#f8fafc]">
              {merchant?.razorpay_key_id ? 'Custom Key' : 'Sandbox'}
            </div>
            <div className="text-[11px] text-indigo-400 mt-1">Razorpay Live API</div>
          </div>
        </div>

        {/* Tab 1: Catalog Items FinTech Table */}
        {activeTab === 'catalog' && (
          <div className="bg-[#0e1322] border border-[#1e293b] rounded-3xl shadow-xl overflow-hidden font-mono">
            <div className="p-5 border-b border-[#1e293b] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#f8fafc]">Catalog Products</h2>
                <p className="text-xs text-[#94a3b8] font-sans">Manage products available for autonomous AI agent transactions.</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#1e293b] bg-[#13192e] text-[#f8fafc] text-xs font-bold transition-all hover:border-slate-500 flex items-center"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                  Bulk Import / Sync
                </button>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Product
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-full rounded-xl bg-slate-800" />
                <Skeleton className="h-8 w-full rounded-xl bg-slate-800" />
                <Skeleton className="h-8 w-full rounded-xl bg-slate-800" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-[#f8fafc]">No products in catalog</p>
                <p className="text-xs text-[#94a3b8] mt-1 mb-4 font-sans">Add catalog items for AI agents to discover.</p>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  + Add First Product
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#050811] border-b border-[#1e293b] text-[#94a3b8] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Product Name</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Price (INR ₹)</th>
                      <th className="px-6 py-3.5">Stock</th>
                      <th className="px-6 py-3.5">AI Discovery Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#13192e]/60 transition-colors">
                        <td className="px-6 py-4 font-bold text-[#f8fafc]">{item.name}</td>
                        <td className="px-6 py-4 text-[#94a3b8]">
                          <span className="px-2.5 py-1 rounded-lg bg-[#13192e] border border-[#1e293b] text-indigo-300 font-bold text-[11px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#f8fafc] text-sm">
                          ₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          {item.stock > 0 ? (
                            <span className="text-[#f8fafc]">{item.stock} units</span>
                          ) : (
                            <span className="text-red-400 font-bold">Out of stock</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.stock > 0
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                              : 'bg-red-950/80 text-red-400 border-red-800'
                          }`}>
                            {item.stock > 0 ? 'Transactable' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#13192e] hover:bg-[#1c2440] border border-[#1e293b] text-[#f8fafc] text-xs font-semibold inline-flex items-center"
                          >
                            <Edit2 className="w-3 h-3 mr-1 text-indigo-400" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-900/60 text-red-400 text-xs font-semibold inline-flex items-center"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </button>
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
          <div className="bg-[#0e1322] border border-[#1e293b] rounded-3xl shadow-xl p-6 font-mono">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e293b]">
              <div>
                <h2 className="text-base font-bold text-[#f8fafc]">Agent-Readable Schema (`schema.org` JSON-LD)</h2>
                <p className="text-xs text-[#94a3b8] mt-0.5 font-sans">
                  Live schema output consumed by Groq LLM buyer agents during product discovery.
                </p>
              </div>
              {merchant?.id && (
                <a
                  href={`http://localhost:8000/catalog/agent-schema?merchant_id=${merchant.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-[#13192e] border border-[#1e293b] hover:border-slate-500 text-indigo-300 rounded-xl text-xs font-mono font-bold transition-all"
                >
                  Open Endpoint &nearr;
                </a>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-64 w-full rounded-2xl bg-slate-800" />
            ) : agentSchema ? (
              <pre className="p-4 bg-[#050811] text-[#f8fafc] rounded-2xl text-xs overflow-x-auto max-h-[500px] leading-relaxed border border-[#1e293b]">
                {JSON.stringify(agentSchema, null, 2)}
              </pre>
            ) : (
              <div className="p-8 text-center text-xs text-[#94a3b8]">No schema available.</div>
            )}
          </div>
        )}
      </main>

      {/* Modal for Add / Edit Catalog Item */}
      {showModal && (
        <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0e1322] border border-[#1e293b] rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[#f8fafc] mb-1">
              {editingItem ? 'Edit Catalog Product' : 'Add New Catalog Product'}
            </h3>
            <p className="text-xs text-[#94a3b8] mb-4 font-sans">
              Specify product pricing and stock for AI agent transactions.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Headphones"
                  className="w-full px-3.5 py-2.5 bg-[#050811] border border-[#1e293b] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1">Price (INR ₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1200.00"
                    className="w-full px-3.5 py-2.5 bg-[#050811] border border-[#1e293b] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 bg-[#050811] border border-[#1e293b] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1">Category *</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Electronics"
                  className="w-full px-3.5 py-2.5 bg-[#050811] border border-[#1e293b] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#1e293b] bg-[#13192e] text-[#94a3b8] text-xs font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Bulk Product Import */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0e1322] border border-[#1e293b] rounded-3xl p-6 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#1e293b] mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f8fafc]">Bulk Product Catalog Import</h3>
                  <p className="text-xs text-[#94a3b8] font-sans">Paste JSON or CSV catalog data.</p>
                </div>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-[#94a3b8] hover:text-[#f8fafc] font-bold text-sm">
                ✕
              </button>
            </div>

            {bulkError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
                {bulkError}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#94a3b8]">
                    JSON Array or CSV Catalog Data
                  </label>
                  <span className="text-[10px] text-[#94a3b8]">Name, Price, Stock, Category</span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  placeholder={`[`}
                  className="w-full p-3 text-xs bg-[#050811] text-emerald-400 rounded-xl border border-[#1e293b] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setBulkJson(`[
  { "name": "boAt Wave Call Smartwatch", "price": 1799, "stock": 40, "category": "Smartwatches" },
  { "name": "boAt Airdopes 141", "price": 1299, "stock": 60, "category": "Earbuds" },
  { "name": "boAt Stone 350 Speaker", "price": 1499, "stock": 25, "category": "Speakers" }
]`)}
                    className="px-2.5 py-1 text-[11px] bg-[#13192e] border border-[#1e293b] hover:border-slate-500 text-indigo-300 rounded-lg font-bold"
                  >
                    Preset: JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkJson(`boAt Rockerz 550, 1999, 30, Headphones
JBL Tune 760NC, 5499, 15, Headphones`)}
                    className="px-2.5 py-1 text-[11px] bg-[#13192e] border border-[#1e293b] hover:border-slate-500 text-indigo-300 rounded-lg font-bold"
                  >
                    Preset: CSV
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#1e293b] bg-[#13192e] text-[#94a3b8] text-xs font-bold hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                  >
                    Import All Products
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MerchantDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090d16] p-8 text-xs text-[#94a3b8] font-mono">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
