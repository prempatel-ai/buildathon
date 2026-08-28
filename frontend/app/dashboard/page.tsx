'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  fetchMerchants,
  fetchCatalogItems,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  fetchAgentSchema,
  Merchant,
  CatalogItem,
} from '@/lib/api';

function DashboardContent() {
  const searchParams = useSearchParams();
  const initialMerchantId = searchParams.get('merchant_id') || '';

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(initialMerchantId);
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

  // Load merchants list on mount
  useEffect(() => {
    loadMerchants();
  }, []);

  // Load items when selected merchant changes
  useEffect(() => {
    if (selectedMerchantId) {
      loadCatalogAndSchema(selectedMerchantId);
    } else {
      setItems([]);
      setAgentSchema(null);
      setLoading(false);
    }
  }, [selectedMerchantId]);

  const loadMerchants = async () => {
    try {
      const data = await fetchMerchants();
      setMerchants(data);
      if (data.length > 0 && !selectedMerchantId) {
        setSelectedMerchantId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load merchants');
    }
  };

  const loadCatalogAndSchema = async (merchantId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [itemsData, schemaData] = await Promise.all([
        fetchCatalogItems(merchantId),
        fetchAgentSchema(merchantId),
      ]);
      setItems(itemsData);
      setAgentSchema(schemaData);
    } catch (err: any) {
      setError(err.message || 'Failed to load merchant data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
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
    setCategory(item.category);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantId) return;

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
          merchant_id: selectedMerchantId,
          name: name.trim(),
          price: numPrice,
          stock: numStock,
          category: category.trim(),
        });
      }
      setShowModal(false);
      await loadCatalogAndSchema(selectedMerchantId);
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
      await loadCatalogAndSchema(selectedMerchantId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete catalog item');
    }
  };

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-semibold text-white text-sm">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Agentpay</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-600">Merchant Dashboard</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Merchant Switcher */}
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {merchants.length === 0 ? (
                <option value="">No merchants found</option>
              ) : (
                merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              )}
            </select>

            <Link
              href="/audit"
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Audit Trail
            </Link>
            <Link
              href="/onboarding"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              + New Merchant
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Store Header Banner */}
        {selectedMerchant && (
          <div className="mb-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                  {selectedMerchant.name}
                </h1>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                  Agent-Readable
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1">Merchant ID: {selectedMerchant.id}</p>
            </div>

            <div className="flex items-center space-x-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'catalog'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Catalog Table ({items.length})
              </button>
              <button
                onClick={() => setActiveTab('schema')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'schema'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Agent JSON-LD Schema
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Catalog Items Table */}
        {activeTab === 'catalog' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Catalog Products</h2>
                <p className="text-xs text-slate-500">Products currently discoverable by AI buyer agents.</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                disabled={!selectedMerchantId}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                + Add Product
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading catalog...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-slate-700">No products in catalog</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">Add catalog items or use quick seed to test.</p>
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium"
                >
                  + Add First Product
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Price (INR)</th>
                      <th className="px-6 py-3">Stock</th>
                      <th className="px-6 py-3">Agent Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                          ₹{Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          {item.stock > 0 ? (
                            <span className="text-slate-700">{item.stock} units</span>
                          ) : (
                            <span className="text-red-600 font-medium">Out of stock</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {item.stock > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Transactable
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Unavailable
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="text-slate-600 hover:text-slate-900 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
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
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Agent-Readable Schema (`schema.org` JSON-LD)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Output generated by <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">GET /catalog/agent-schema</code> for external AI buyer agents.
                </p>
              </div>
              <a
                href={`http://localhost:8000/catalog/agent-schema?merchant_id=${selectedMerchantId}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-medium transition-colors"
              >
                Open Raw Endpoint &nearr;
              </a>
            </div>

            {agentSchema ? (
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {editingItem ? 'Edit Catalog Product' : 'Add New Catalog Product'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter product parameters to update merchant's agent-readable catalog.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium disabled:opacity-50"
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
        Agentpay &bull; Merchant Catalog Management &bull; Razorpay AI Buildathon
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
