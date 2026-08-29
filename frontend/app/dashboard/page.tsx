'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMerchantMe,
  fetchCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  fetchAgentSchema,
  getAuthToken,
  Merchant,
  CatalogItem,
} from '@/lib/api';

import Navigation from '@/components/Navigation';

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
        {merchant && (
          <div className="mb-6 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  🏪
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
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'catalog'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                Catalog Table ({items.length})
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'schema'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                Agent JSON-LD Schema
              </button>
            </div>
          </div>
        )}

        {/* Overview Metric Cards */}
        {merchant && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Products</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{items.length}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Discoverable by AI agents</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Max Order Cap</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                ₹{limitsConfig.max_transaction_amount ? Number(limitsConfig.max_transaction_amount).toLocaleString('en-IN') : '10,000'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Policy Engine limit</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Daily Spend Cap</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                ₹{limitsConfig.daily_spend_limit ? Number(limitsConfig.daily_spend_limit).toLocaleString('en-IN') : '50,000'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">24h velocity window</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Razorpay Key ID</p>
              <p className="text-xs font-mono font-bold text-emerald-700 mt-2 truncate">
                {merchant.razorpay_key_id ? merchant.razorpay_key_id : 'Default Sandbox Key'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Razorpay Live API Connected</p>
            </div>
          </div>
        )}

        {/* Tab 1: Catalog Items Table */}
        {activeTab === 'catalog' && (
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Catalog Products</h2>
                <p className="text-xs text-slate-500">Manage products available for autonomous AI agent transactions.</p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                + Add Product
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading catalog products...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-slate-800">No products in catalog</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Add catalog items for AI agents to discover.</p>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  + Add First Product
                </button>
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
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold">
                            {item.category}
                          </span>
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
                          {item.stock > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Transactable
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="text-slate-700 hover:text-slate-900 font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
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

            {agentSchema ? (
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
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Product'}
                </button>
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
