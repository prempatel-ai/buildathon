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
  fetchMerchantRecommendationRevenue,
  fetchMerchantCampaignPerformance,
  triggerMerchantCampaignScan,
  Merchant,
  CatalogItem,
  MerchantRevenueAttribution,
  MerchantCampaignPerformance,
} from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';

import Navigation from '@/components/Navigation';
import * as XLSX from 'xlsx';
import {
  Plus,
  Edit2,
  Trash2,
  Code,
  Package,
  Upload,
  X,
  Loader2,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Coins,
  RefreshCw,
  ArrowRight,
  Gift,
  Tag
} from 'lucide-react';

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

  const [recRevenue, setRecRevenue] = useState<MerchantRevenueAttribution | null>(null);
  const [campaignPerf, setCampaignPerf] = useState<MerchantCampaignPerformance | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'schema' | 'attribution' | 'campaigns'>('catalog');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

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
  const [description, setDescription] = useState('');
  const [specificationsJson, setSpecificationsJson] = useState('{\n  "brand": "boAt",\n  "battery_life": "20 Hours",\n  "warranty": "1 Year",\n  "connectivity": "Bluetooth 5.2"\n}');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Bulk Import Modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'manual'>('file');
  const [extractedItems, setExtractedItems] = useState<{ name: string; price: number; stock: number; category: string }[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkJson, setBulkJson] = useState(`[
  { "name": "boAt Wave Call Smartwatch", "price": 1799, "stock": 40, "category": "Smartwatches" },
  { "name": "boAt Airdopes 141", "price": 1299, "stock": 60, "category": "Earbuds" },
  { "name": "boAt Stone 350 Speaker", "price": 1499, "stock": 25, "category": "Speakers" }
]`);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsExtracting(true);
    setBulkError(null);
    try {
      const isJson = file.name.endsWith('.json');
      if (isJson) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error('JSON file must contain an array of product objects.');
        }
        const products = parsed.map((it: any) => ({
          name: String(it.name || it.product_name || it.title || 'Unnamed Product').trim(),
          price: parseFloat(it.price || it.cost || it.amount || 0) || 0,
          stock: parseInt(it.stock || it.quantity || it.qty || 0, 10) || 0,
          category: String(it.category || it.type || 'General').trim()
        }));
        setExtractedItems(products);
        setUploadedFileName(file.name);
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('Spreadsheet has no sheets.');
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('The uploaded file contains no data rows.');
        }

        const findKey = (row: any, candidates: string[]) => {
          const keys = Object.keys(row);
          for (const cand of candidates) {
            const match = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cand);
            if (match && row[match] !== undefined && row[match] !== '') return row[match];
          }
          return undefined;
        };

        const products = rawRows
          .map((row) => {
            const nameVal = findKey(row, ['name', 'productname', 'product', 'itemname', 'item', 'title', 'sku', 'productdescription']);
            const priceVal = findKey(row, ['price', 'mrp', 'cost', 'amount', 'rate', 'inr', 'unitprice']);
            const stockVal = findKey(row, ['stock', 'quantity', 'qty', 'units', 'count', 'inventory', 'stocklevel']);
            const catVal = findKey(row, ['category', 'type', 'department', 'dept', 'tag', 'cat', 'categoryname']);

            if (!nameVal && !priceVal) return null;

            return {
              name: String(nameVal || 'Imported Product').trim(),
              price: parseFloat(priceVal) || 0,
              stock: parseInt(stockVal, 10) || 0,
              category: String(catVal || 'General').trim()
            };
          })
          .filter((p): p is { name: string; price: number; stock: number; category: string } => p !== null && p.name.length > 0);

        if (products.length === 0) {
          throw new Error('No valid product rows recognized. Ensure columns contain Name, Price, Stock, Category.');
        }

        setExtractedItems(products);
        setUploadedFileName(file.name);
      }
    } catch (err: any) {
      setBulkError(err.message || 'Failed to parse file.');
      setExtractedItems([]);
      setUploadedFileName(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Product Name,Price,Stock,Category\n" +
      "boAt Wave Call Smartwatch,1799,40,Smartwatches\n" +
      "boAt Airdopes 141,1299,60,Earbuds\n" +
      "boAt Stone 350 Speaker,1499,25,Speakers\n" +
      "boAt Bassheads 242,349,100,Audio Accessories\n" +
      "boAt Rockerz 255 Pro+,1499,35,Headphones\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "agentpay_catalog_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant?.id) return;
    setBulkLoading(true);
    setBulkError(null);

    try {
      let itemsToImport: any[] = [];

      if (importMode === 'file') {
        if (extractedItems.length === 0) {
          throw new Error('Please upload an Excel or CSV file first.');
        }
        itemsToImport = extractedItems;
      } else {
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
      }

      if (!Array.isArray(itemsToImport) || itemsToImport.length === 0) {
        throw new Error('No items to import.');
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
      setExtractedItems([]);
      setUploadedFileName(null);
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

      const [catData, schemaData, recRevData, campData] = await Promise.all([
        fetchCatalogItems(meData.id).catch(() => []),
        fetchAgentSchema(meData.id).catch(() => null),
        fetchMerchantRecommendationRevenue().catch(() => null),
        fetchMerchantCampaignPerformance().catch(() => null),
      ]);
      setItems(catData);
      setAgentSchema(schemaData);
      if (recRevData) setRecRevenue(recRevData);
      if (campData) setCampaignPerf(campData);
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

  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanMsg(null);
    try {
      const res = await triggerMerchantCampaignScan(0);
      setScanMsg(res.message);
      await loadDashboardData();
    } catch (e: any) {
      setScanMsg(e.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setStock('');
    setCategory('Electronics');
    setDescription('');
    setSpecificationsJson('{\n  "brand": "boAt",\n  "battery_life": "20 Hours",\n  "warranty": "1 Year",\n  "connectivity": "Bluetooth 5.2"\n}');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    setStock(item.stock.toString());
    setCategory(item.category || 'Electronics');
    setDescription(item.description || '');
    setSpecificationsJson(
      item.specifications && Object.keys(item.specifications).length > 0
        ? JSON.stringify(item.specifications, null, 2)
        : '{\n  "brand": "BrandName",\n  "warranty": "1 Year"\n}'
    );
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

    let parsedSpecs: Record<string, any> = {};
    if (specificationsJson.trim()) {
      try {
        parsedSpecs = JSON.parse(specificationsJson);
      } catch (e) {
        setFormError('Specifications must be valid JSON format (e.g. {"brand": "Sony", "battery_life": "40 Hours"})');
        return;
      }
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
          description: description.trim() || undefined,
          specifications: parsedSpecs,
        });
      } else {
        await createCatalogItem({
          merchant_id: merchant.id,
          name: name.trim(),
          price: numPrice,
          stock: numStock,
          category: category.trim(),
          description: description.trim() || undefined,
          specifications: parsedSpecs,
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

        {/* Navigation Underline Tabs for Catalog vs Schema vs Attribution */}
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
          <button
            onClick={() => setActiveTab('attribution')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'attribution'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Recommendation Revenue ({recRevenue ? `₹${recRevenue.total_attributed_revenue.toLocaleString('en-IN')}` : '₹0'})</span>
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'campaigns'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-600" />
            <span>Abandonment Campaigns ({campaignPerf ? campaignPerf.offers_generated : 0})</span>
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
              <div className="divide-y divide-neutral-100 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="py-3.5 px-6 flex items-center justify-between gap-4">
                    <div className="h-4 w-48 bg-neutral-200/70 rounded"></div>
                    <div className="h-4 w-24 bg-neutral-100 rounded"></div>
                    <div className="h-4 w-20 bg-neutral-200/60 rounded"></div>
                    <div className="h-4 w-16 bg-neutral-100 rounded"></div>
                    <div className="h-4 w-24 bg-neutral-200/50 rounded"></div>
                    <div className="h-6 w-20 bg-neutral-100 rounded"></div>
                  </div>
                ))}
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
                          <td className="py-3.5 px-6 font-medium text-neutral-900">
                            <div className="font-semibold text-neutral-900">{item.name}</div>
                            {item.description && (
                              <p className="text-[10.5px] text-neutral-500 line-clamp-1 max-w-xs mt-0.5">
                                {item.description}
                              </p>
                            )}
                            {item.specifications && Object.keys(item.specifications).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(item.specifications).slice(0, 3).map(([k, v]) => (
                                  <span key={k} className="px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded text-[9.5px] font-mono border border-neutral-200">
                                    {k.replace('_', ' ')}: {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}
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

        {/* Tab 3: Recommendation Revenue Attribution */}
        {activeTab === 'attribution' && (
          <div className="space-y-6">
            {/* Section Header with Quick Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Revenue Attribution Engine
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    CRYPTOGRAPHICALLY VERIFIED
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Track exact revenue generated when AI buyer agents recommend your catalog items to shoppers across merchants.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadDashboardData()}
                  className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Refresh revenue attribution stats"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-neutral-600 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Stats</span>
                </button>
              </div>
            </div>

            {/* 4 Attribution Metric Cards Strip */}
            {/* 4 Performance Metric Cards with Skeleton Loading */}
            <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border border-neutral-200 rounded-lg bg-white overflow-hidden shadow-2xs">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Attributed Revenue</span>
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                {loading ? (
                  <div className="mt-2 space-y-1.5 animate-pulse">
                    <div className="h-7 w-28 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-20 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-neutral-900 mt-1.5 font-mono tracking-tight">
                      ₹{recRevenue ? recRevenue.total_attributed_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
                      Verified Settled GMV
                    </span>
                  </>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Converted Orders</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                {loading ? (
                  <div className="mt-2 space-y-1.5 animate-pulse">
                    <div className="h-7 w-16 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-24 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-neutral-900 mt-1.5 font-mono tracking-tight">
                      {recRevenue ? recRevenue.converted_recommendations_count : 0}
                    </div>
                    <span className="text-[11px] text-neutral-600 mt-1 block font-mono">
                      Autonomous Chat Buys
                    </span>
                  </>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Impressions Shown</span>
                  <Package className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                {loading ? (
                  <div className="mt-2 space-y-1.5 animate-pulse">
                    <div className="h-7 w-16 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-24 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-neutral-900 mt-1.5 font-mono tracking-tight">
                      {recRevenue ? recRevenue.shown_recommendations_count : 0}
                    </div>
                    <span className="text-[11px] text-neutral-600 mt-1 block font-mono">
                      Post-Purchase Displays
                    </span>
                  </>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Conversion Rate</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                {loading ? (
                  <div className="mt-2 space-y-1.5 animate-pulse">
                    <div className="h-7 w-20 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-24 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-neutral-900 mt-1.5 font-mono tracking-tight">
                      {recRevenue ? `${recRevenue.conversion_rate}%` : '0%'}
                    </div>
                    <span className="text-[11px] text-neutral-600 mt-1 block font-mono">
                      Converted / Shown
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Attributed Transactions Breakdown Table */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <div className="px-6 py-3.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                    Attributed Settled Purchases
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Orders carrying an explicit <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800 font-mono text-[10px]">source_recommendation_id</code> linked directly to chat AI suggestions.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-neutral-500 font-medium">
                  {loading ? 'Loading...' : `${recRevenue?.attributed_transactions?.length || 0} Attributed Orders`}
                </span>
              </div>

              {loading ? (
                <div className="divide-y divide-neutral-100 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="py-4 px-6 flex items-center justify-between gap-4">
                      <div className="h-4 w-32 bg-neutral-200/80 rounded"></div>
                      <div className="h-4 w-24 bg-neutral-200/60 rounded"></div>
                      <div className="h-4 w-36 bg-neutral-200/70 rounded"></div>
                      <div className="h-4 w-20 bg-neutral-200/80 rounded"></div>
                      <div className="h-5 w-16 bg-emerald-100/60 rounded"></div>
                      <div className="h-4 w-28 bg-neutral-100 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : recRevenue && recRevenue.attributed_transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        <th className="py-2.5 px-6">Transaction Hash</th>
                        <th className="py-2.5 px-6">Recommendation Ref</th>
                        <th className="py-2.5 px-6">Product Purchased</th>
                        <th className="py-2.5 px-6">Attributed Amount</th>
                        <th className="py-2.5 px-6">Settlement</th>
                        <th className="py-2.5 px-6 text-right">Settled At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {recRevenue.attributed_transactions.map((tx) => (
                        <tr key={tx.transaction_id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-mono text-neutral-900 font-medium">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-800 text-[11px]">
                              {tx.transaction_id.substring(0, 8)}...{tx.transaction_id.substring(tx.transaction_id.length - 4)}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px]">
                              rec_{tx.recommendation_id.substring(0, 8)}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-medium text-neutral-900">
                            {tx.item_name || 'Catalog Item'}
                          </td>
                          <td className="py-3.5 px-6 font-mono font-bold text-neutral-900">
                            ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              SETTLED
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono text-neutral-500 text-right text-[11px]">
                            {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 px-6 text-center space-y-3 bg-neutral-50/30">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500 shadow-2xs">
                    <Sparkles className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                      Awaiting Recommendation Purchases
                    </h4>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      When customers complete orders from cross-merchant post-purchase suggestions in the AI consumer chat, real verified GMV will appear here.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/customer/chat"
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-all shadow-2xs"
                    >
                      <span>Test in AI Consumer Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Abandonment Re-Engagement Campaigns */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Top Overview & Action Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-neutral-50/50 to-white border border-amber-200/80 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider font-mono">
                    Abandoned Cart Campaign Orchestrator
                  </span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                  Rule-Based Consumer Re-Engagement & Bounded Discounts
                </h3>
                <p className="text-xs text-neutral-600 max-w-xl leading-relaxed">
                  Automatically detects unconverted shopper queries from audit logs and delivers bounded, merchant-capped discount offers when customers revisit the store.
                </p>
                {scanMsg && (
                  <p className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 inline-block mt-2">
                    ✓ {scanMsg}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTriggerScan}
                  disabled={isScanning}
                  className="h-8 px-4 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                >
                  {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{isScanning ? 'Scanning Logs...' : 'Run Abandonment Scan'}</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Metric Cards with Skeleton Loading */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Offers Generated</span>
                {loading ? (
                  <div className="mt-1 space-y-1.5 animate-pulse">
                    <div className="h-7 w-16 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-28 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-bold font-mono text-neutral-900">
                      {campaignPerf ? campaignPerf.offers_generated : 0}
                    </p>
                    <span className="text-[10px] text-neutral-500 block">From stale unconverted interest</span>
                  </>
                )}
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Delivered in Chat</span>
                {loading ? (
                  <div className="mt-1 space-y-1.5 animate-pulse">
                    <div className="h-7 w-16 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-28 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-bold font-mono text-neutral-900">
                      {campaignPerf ? campaignPerf.offers_shown : 0}
                    </p>
                    <span className="text-[10px] text-neutral-500 block">Delivered via consumer chat</span>
                  </>
                )}
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Converted Orders</span>
                {loading ? (
                  <div className="mt-1 space-y-1.5 animate-pulse">
                    <div className="h-7 w-16 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-28 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-bold font-mono text-emerald-700">
                      {campaignPerf ? campaignPerf.offers_converted : 0}
                    </p>
                    <span className="text-[10px] font-mono font-semibold text-emerald-600 block">
                      {campaignPerf ? campaignPerf.conversion_rate : 0}% Conversion Rate
                    </span>
                  </>
                )}
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-1">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Attributed GMV</span>
                {loading ? (
                  <div className="mt-1 space-y-1.5 animate-pulse">
                    <div className="h-7 w-24 bg-neutral-200/80 rounded"></div>
                    <div className="h-3 w-32 bg-neutral-100 rounded"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xl font-bold font-mono text-neutral-900">
                      ₹{campaignPerf ? campaignPerf.total_attributed_revenue.toLocaleString('en-IN') : '0'}
                    </p>
                    <span className="text-[10px] text-neutral-500 block">
                      Total Discount: ₹{campaignPerf ? campaignPerf.total_discount_given.toLocaleString('en-IN') : '0'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Campaign Offers Table with Skeleton Loading */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
              <div className="px-6 py-3.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                    Generated Re-Engagement Offers Ledger
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  {loading ? 'Loading...' : `${campaignPerf?.offers.length || 0} Total Offers`}
                </span>
              </div>

              {loading ? (
                <div className="divide-y divide-neutral-100 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="py-4 px-6 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="h-4 w-44 bg-neutral-200/80 rounded"></div>
                        <div className="h-3 w-20 bg-neutral-100 rounded"></div>
                      </div>
                      <div className="h-5 w-20 bg-amber-100/60 rounded"></div>
                      <div className="h-4 w-28 bg-neutral-200/70 rounded"></div>
                      <div className="h-5 w-20 bg-neutral-200/60 rounded"></div>
                      <div className="h-4 w-20 bg-neutral-100 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : campaignPerf && campaignPerf.offers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-6">Product / SKU</th>
                        <th className="py-3 px-6">Discount Value</th>
                        <th className="py-3 px-6">Price Comparison</th>
                        <th className="py-3 px-6">Offer Status</th>
                        <th className="py-3 px-6 text-right">Created Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {campaignPerf.offers.map((off) => (
                        <tr key={off.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-medium text-neutral-900">
                            <div className="font-semibold text-neutral-900">{off.item_name}</div>
                            <span className="text-[10px] font-mono text-neutral-400">{off.category}</span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono font-bold text-[10.5px]">
                              {off.discount_value}% OFF
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono text-xs">
                            <span className="line-through text-neutral-400 mr-2">₹{off.original_price.toLocaleString('en-IN')}</span>
                            <span className="font-bold text-neutral-900">₹{off.discounted_price.toLocaleString('en-IN')}</span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                off.status === 'converted'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : off.status === 'shown'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                              }`}
                            >
                              {off.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-mono text-neutral-500 text-right text-[11px]">
                            {off.created_at ? new Date(off.created_at).toLocaleDateString('en-IN', { dateStyle: 'short' }) : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 px-6 text-center space-y-3 bg-neutral-50/30">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-500 shadow-2xs">
                    <Gift className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                      No Abandonment Offers Generated Yet
                    </h4>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Click &quot;Run Abandonment Scan&quot; above to detect unconverted shopper interest across audit logs and generate personalized bounded discount offers.
                    </p>
                  </div>
                </div>
              )}
            </div>
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

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Product Overview & Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed product overview, benefits, and key selling points (e.g. Amazon / Flipkart format)..."
                  className="w-full p-2.5 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                    Product Specifications & Key Attributes
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">JSON format</span>
                </div>
                <textarea
                  rows={3}
                  value={specificationsJson}
                  onChange={(e) => setSpecificationsJson(e.target.value)}
                  placeholder='{"brand": "boAt", "battery_life": "20 Hours", "warranty": "1 Year"}'
                  className="w-full p-2.5 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                />
                <span className="text-[10px] text-neutral-400 mt-0.5 block">
                  Used by AI agents for precision product comparison and upsell evaluation.
                </span>
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

      {/* Modal for Bulk Import (Excel / CSV / JSON File Extraction) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutral-200 rounded-lg max-w-xl w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100 shrink-0">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-semibold text-neutral-900">Bulk Import Products</h3>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setExtractedItems([]);
                  setUploadedFileName(null);
                  setBulkError(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2 shrink-0">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setImportMode('file')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    importMode === 'file' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Upload Excel / CSV File
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('manual')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    importMode === 'manual' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Direct Paste (JSON/CSV)
                </button>
              </div>

              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex items-center space-x-1 text-xs text-neutral-500 hover:text-neutral-900 font-medium transition-colors cursor-pointer"
                title="Download formatted sample CSV file"
              >
                <Download className="w-3 h-3" />
                <span>Sample CSV</span>
              </button>
            </div>

            {bulkError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-medium flex items-center space-x-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <form onSubmit={handleBulkImport} className="flex-1 flex flex-col overflow-hidden">
              {importMode === 'file' ? (
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  {/* Drag & Drop File Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                      isDragging
                        ? 'border-neutral-900 bg-neutral-50'
                        : uploadedFileName
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-neutral-200 hover:border-neutral-400 bg-neutral-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      id="catalogFileInput"
                      accept=".xlsx, .xls, .csv, .tsv, .json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {isExtracting ? (
                      <div className="flex flex-col items-center justify-center space-y-2 py-4">
                        <Loader2 className="w-6 h-6 text-neutral-900 animate-spin" />
                        <p className="text-xs font-medium text-neutral-800">Extracting rows & normalizing columns...</p>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex flex-col items-center justify-center space-y-2 py-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900">{uploadedFileName}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-semibold text-[10px] rounded">
                            {extractedItems.length} Products Successfully Extracted
                          </span>
                        </div>
                        <label
                          htmlFor="catalogFileInput"
                          className="mt-2 text-[11px] text-neutral-500 hover:text-neutral-900 underline cursor-pointer"
                        >
                          Choose another file
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="catalogFileInput" className="flex flex-col items-center justify-center space-y-2 cursor-pointer py-4">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-900">
                            Click to upload or drag & drop Excel / CSV
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Supports .xlsx, .xls, .csv, and .json
                          </p>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Extracted Items Mini Preview Table */}
                  {extractedItems.length > 0 && (
                    <div className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                        <span>Extracted Preview</span>
                        <span className="font-mono text-neutral-500 font-normal">
                          Showing top {Math.min(extractedItems.length, 5)} of {extractedItems.length} items
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto text-[11px]">
                        <table className="w-full text-left">
                          <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 text-[10px] uppercase font-mono">
                            <tr>
                              <th className="px-3 py-1.5">Product Name</th>
                              <th className="px-2 py-1.5">Category</th>
                              <th className="px-2 py-1.5 text-right">Price</th>
                              <th className="px-3 py-1.5 text-right">Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {extractedItems.slice(0, 5).map((it, idx) => (
                              <tr key={idx} className="hover:bg-neutral-50/50">
                                <td className="px-3 py-1.5 font-medium text-neutral-900 truncate max-w-[160px]">{it.name}</td>
                                <td className="px-2 py-1.5 text-neutral-500">{it.category}</td>
                                <td className="px-2 py-1.5 text-right font-mono font-semibold text-neutral-900">₹{it.price.toLocaleString('en-IN')}</td>
                                <td className="px-3 py-1.5 text-right font-mono text-neutral-600">{it.stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 flex-1 flex flex-col">
                  <p className="text-xs text-neutral-500">
                    Paste raw JSON or CSV text. Column order: <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">Name, Price, Stock, Category</code>.
                  </p>
                  <textarea
                    value={bulkJson}
                    onChange={(e) => setBulkJson(e.target.value)}
                    rows={8}
                    className="w-full flex-1 p-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs font-mono text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all leading-relaxed"
                    required
                  />
                </div>
              )}

              <div className="pt-4 mt-2 border-t border-neutral-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setExtractedItems([]);
                    setUploadedFileName(null);
                    setBulkError(null);
                  }}
                  className="h-8 px-3 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading || isExtracting || (importMode === 'file' && extractedItems.length === 0)}
                  className="h-8 px-4 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {importMode === 'file' && extractedItems.length > 0
                      ? `Import ${extractedItems.length} SKUs`
                      : 'Import SKUs'}
                  </span>
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
