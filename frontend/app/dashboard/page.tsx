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
  Merchant,
  CatalogItem,
} from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';

import Navigation from '@/components/Navigation';
import { Plus, Edit2, Trash2, Code, Package, Upload, X, Loader2, Check, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('agentpay_merchant_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const [items, setItems] = useState<CatalogItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('agentpay_catalog_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });

  const [agentSchema, setAgentSchema] = useState<Record<string, any> | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('agentpay_schema_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'catalog' | 'schema'>('catalog');

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('agentpay_catalog_cache');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch (e) {}
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  // Pagination for catalog
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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

  useAuthGuard(loadDashboardData);

  async function loadDashboardData() {
    setError(null);
    try {
      const meData = await getMerchantMe();
      if (!meData || !meData.id) {
        router.push('/onboarding');
        return;
      }
      setMerchant(meData);
      try {
        localStorage.setItem('agentpay_merchant_cache', JSON.stringify(meData));
      } catch (e) {}

      const [catData, schemaData] = await Promise.all([
        fetchCatalogItems(meData.id).catch(() => []),
        fetchAgentSchema(meData.id).catch(() => null),
      ]);
      setItems(catData);
      setAgentSchema(schemaData);
      try {
        localStorage.setItem('agentpay_catalog_cache', JSON.stringify(catData));
        if (schemaData) localStorage.setItem('agentpay_schema_cache', JSON.stringify(schemaData));
      } catch (e) {}
    } catch (err: any) {
      router.push('/onboarding');
      return;
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
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, items.length);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-medium">
            {error}
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Store Overview</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-mono font-medium">{merchant?.id}</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              {merchant?.name || 'Merchant Dashboard'}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Manage live product catalog and verify machine-readable schema for AI buyer agents.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowBulkModal(true)}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-600" />
              <span>Bulk Import</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="h-8 px-3.5 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Unified 4-Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border border-neutral-200 rounded-lg bg-white overflow-hidden mb-6">
          <div className="p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Total Products</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
              {items.length}
            </div>
            <span className="text-[11px] text-neutral-600 mt-1 block font-mono">
              Discoverable by AI
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Max Order Cap</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
              ₹{limitsConfig.max_transaction_amount ? Number(limitsConfig.max_transaction_amount).toLocaleString('en-IN') : '10,000'}
            </div>
            <span className="text-[11px] text-neutral-600 mt-1 block">
              Policy Engine Gated
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Daily Spend Cap</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
              ₹{limitsConfig.daily_spend_limit ? Number(limitsConfig.daily_spend_limit).toLocaleString('en-IN') : '50,000'}
            </div>
            <span className="text-[11px] text-neutral-600 mt-1 block">
              24-Hour Rolling Window
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Gateway Protocol</span>
            <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
              {merchant?.razorpay_key_id ? 'Custom Key' : 'Sandbox'}
            </div>
            <span className="text-[11px] text-neutral-600 mt-1 block font-mono">
              Razorpay Live API
            </span>
          </div>
        </div>

        {/* Navigation Underline Tabs for Catalog vs Schema */}
        <div className="flex items-center gap-6 border-b border-neutral-200 mb-6">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Catalog Inventory ({items.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'schema'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Agent JSON-LD Schema</span>
          </button>
        </div>

        {/* Tab 1: Catalog Items Table */}
        {activeTab === 'catalog' && (
          <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
            <div className="px-6 py-3.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Live Catalog Items
                </h2>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                {items.length} SKUs in Store
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
                <p className="text-xs">Loading store catalog...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-14 text-center">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-600 font-mono text-xs font-bold">
                  SKU
                </div>
                <p className="text-xs font-semibold text-neutral-800">No products in catalog</p>
                <p className="text-[11px] text-neutral-400 mt-0.5 mb-4">Add products for autonomous AI buyer agents to discover and settle.</p>
                <button
                  onClick={handleOpenCreateModal}
                  className="h-8 px-3.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Product</span>
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-6 whitespace-nowrap">Product Name</th>
                        <th className="py-3 px-4 whitespace-nowrap">Category</th>
                        <th className="py-3 px-4 whitespace-nowrap">Price (INR)</th>
                        <th className="py-3 px-4 whitespace-nowrap">Stock Level</th>
                        <th className="py-3 px-4 whitespace-nowrap">AI Discovery</th>
                        <th className="py-3 pr-6 pl-4 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {paginatedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-neutral-900 whitespace-nowrap">
                            {item.name}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded text-[10px] font-medium">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 text-[11px] whitespace-nowrap">
                            ₹{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                            {item.stock > 0 ? (
                              <span className="text-neutral-800">{item.stock} units</span>
                            ) : (
                              <span className="text-red-700 font-medium">Out of stock</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              TRANSACTABLE
                            </span>
                          </td>
                          <td className="py-3.5 pr-6 pl-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="h-6 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-[11px] transition-colors cursor-pointer border border-neutral-200 inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3 text-neutral-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-6 px-2.5 bg-neutral-50 hover:bg-red-50 text-neutral-600 hover:text-red-700 rounded font-medium text-[11px] transition-colors cursor-pointer border border-neutral-200 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {items.length > pageSize && (
                  <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50/40 flex items-center justify-between text-xs">
                    <div className="text-neutral-600">
                      Showing <span className="font-semibold text-neutral-900 font-mono">{startIdx}</span>–<span className="font-semibold text-neutral-900 font-mono">{endIdx}</span> of <span className="font-semibold text-neutral-900 font-mono">{items.length}</span> SKUs
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-7 px-2.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        <span>Previous</span>
                      </button>
                      <span className="px-2 font-mono text-neutral-600">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-7 px-2.5 rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Live Agent Schema JSON-LD */}
        {activeTab === 'schema' && (
          <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Agent-Readable Schema (`schema.org` JSON-LD)
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Live machine-readable catalog payload queried autonomously by LLM buyer agents.
                </p>
              </div>
              {merchant?.id && (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/catalog/agent-schema?merchant_id=${merchant.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-mono font-medium transition-colors inline-flex items-center gap-1.5 border border-neutral-200"
                >
                  <span>Raw Schema Endpoint</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
                <p className="text-xs">Generating agent schema...</p>
              </div>
            ) : agentSchema ? (
              <div className="p-4 bg-neutral-950 text-neutral-100 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed">
                <pre>{JSON.stringify(agentSchema, null, 2)}</pre>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400 font-mono">No schema available.</div>
            )}
          </div>
        )}
      </main>

      {/* Modal for Add / Edit Catalog Item */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutral-200 rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">
                {editingItem ? 'Edit Catalog Product' : 'Add New Catalog Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Specify product pricing and stock inventory for autonomous agent settlement.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Price (INR ₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1299.00"
                    className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="50"
                    className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Electronics"
                  className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-8 px-3 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="h-8 px-4 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Bulk Import */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutral-200 rounded-lg max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Bulk Import Products</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Paste JSON or CSV (Name, Price, Stock, Category) to seed multiple items in one request.
            </p>

            {bulkError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-medium">
                {bulkError}
              </div>
            )}

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <textarea
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs font-mono text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="h-8 px-3 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="h-8 px-4 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Import SKUs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-12 text-neutral-400 font-mono text-xs">
        Loading Overview Dashboard...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
