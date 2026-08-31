'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchAdminOverview,
  fetchAdminMerchants,
  fetchAdminAuditEvents,
  updateMerchantKYC,
  getAdminToken,
  AdminOverview,
  AdminMerchant,
  AdminAuditItem
} from '@/lib/api';
import {
  Shield,
  ShieldCheck,
  Users,
  Store,
  CreditCard,
  Lock,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Sliders,
  ChevronRight,
  Code,
  X,
  Loader2,
  LogOut,
  Layers,
  Database
} from 'lucide-react';

export default function PlatformAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'audit'>('overview');
  const [adminUser, setAdminUser] = useState<string>('admin');

  // Overview State
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Merchants State
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [updatingKYC, setUpdatingKYC] = useState<string | null>(null);

  // Audit Stream State
  const [auditEvents, setAuditEvents] = useState<AdminAuditItem[]>([]);
  const [totalAudit, setTotalAudit] = useState(0);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedJsonEvent, setSelectedJsonEvent] = useState<AdminAuditItem | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }
    const user = (typeof window !== 'undefined' && localStorage.getItem('admin_user')) || 'admin';
    setAdminUser(user);
    loadOverview();
  }, [router]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    if (activeTab === 'merchants') {
      loadMerchants();
    } else if (activeTab === 'audit') {
      loadAudit();
    }
  }, [activeTab, actorFilter, actionFilter, sortOrder]);

  const loadOverview = async () => {
    try {
      setLoadingOverview(true);
      setError(null);
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('authentication required')) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }
      setError(err.message || 'Failed to load platform metrics.');
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadMerchants = async () => {
    try {
      setLoadingMerchants(true);
      setError(null);
      const data = await fetchAdminMerchants();
      setMerchants(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load merchant directory.');
    } finally {
      setLoadingMerchants(false);
    }
  };

  const loadAudit = async () => {
    try {
      setLoadingAudit(true);
      setError(null);
      const data = await fetchAdminAuditEvents({
        actor_type: actorFilter || undefined,
        action: actionFilter || undefined,
        sort_order: sortOrder,
        limit: 100
      });
      setAuditEvents(data.items);
      setTotalAudit(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load global audit stream.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleKYCUpdate = async (merchantId: string, status: string) => {
    try {
      setUpdatingKYC(merchantId);
      await updateMerchantKYC(merchantId, status);
      setSuccessMsg(`Merchant status set to ${status}.`);
      await loadMerchants();
      await loadOverview();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update merchant status.');
    } finally {
      setUpdatingKYC(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  const filteredMerchants = merchants.filter((m) =>
    m.name.toLowerCase().includes(merchantSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(merchantSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans selection:bg-slate-200">
      {/* Clean Enterprise Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
              AP
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 tracking-tight">Agentpay Governance</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{adminUser}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-200/80"
              title="Sign Out Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1">
        {/* Title Bar & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Master Governance</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Privacy Isolated Control</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform Command Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-tenant merchant governance, store policies, and privacy-sanitized global audit inspection.
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('merchants')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'merchants'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Merchants ({merchants.length || overview?.total_merchants || 0})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Global Audit Stream
            </button>
          </div>
        </div>

        {/* Privacy Guard Notice */}
        <div className="mb-5 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-900">Zero-Leakage Privacy Engine Enforced</span>
              <span className="text-slate-500 text-[11px] ml-2 hidden md:inline">
                Consumer phone numbers, residential addresses, and payment tokens are dynamically masked at the gateway.
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
            Active
          </span>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {loadingOverview ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                <p className="text-xs font-medium">Loading platform metrics...</p>
              </div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Metric 1 */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settled Protocol Volume</span>
                    <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                      ₹{overview.total_settled_volume_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                      {overview.total_settled_transactions} autonomous settlements
                    </span>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Merchants</span>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {overview.total_merchants} Stores
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                      {overview.verified_merchants} KYC verified
                    </span>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Catalog SKUs</span>
                    <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                      {overview.total_catalog_items}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                      Across all verified catalogs
                    </span>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Immutable Audit Events</span>
                    <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                      {overview.total_audit_events}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                      {overview.total_policies_enforced} active guardrails
                    </span>
                  </div>
                </div>

                {/* Platform Governance Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">Platform Guardrails & Bounded Execution</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Every autonomous transaction undergoes dual-gate verification before payment capture:
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">1. Customer Spend Vault Cap</span>
                        <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">2. Merchant Category & Velocity Limit</span>
                        <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">3. Razorpay Direct e-Mandate Settlement</span>
                        <span className="text-emerald-700 font-mono font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">Tenant Privacy Isolation Model</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Merchants cannot access competitor transactions. Customer contact details and card hashes are securely isolated.
                    </p>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Merchant Scope:</span>
                        <strong className="text-slate-900">Store-Isolated Only</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Customer Identity:</span>
                        <strong className="text-slate-900">Masked at Gateway</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Audit Record:</span>
                        <strong className="text-slate-900">Immutable Append-Only</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: MERCHANTS MODERATION */}
        {activeTab === 'merchants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  placeholder="Search store name or email..."
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-slate-400"
                />
              </div>

              <button
                onClick={loadMerchants}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingMerchants ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                <p className="text-xs font-medium">Loading merchant directory...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Merchant Store</th>
                        <th className="py-3 px-4">Login Email</th>
                        <th className="py-3 px-4">KYC Status</th>
                        <th className="py-3 px-4">Catalog SKUs</th>
                        <th className="py-3 px-4">Policies</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMerchants.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {m.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {m.email}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              m.kyc_status === 'verified'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.kyc_status === 'suspended'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {m.kyc_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {m.catalog_count}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {m.policy_count}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5">
                            {m.kyc_status !== 'verified' && (
                              <button
                                onClick={() => handleKYCUpdate(m.id, 'verified')}
                                disabled={updatingKYC === m.id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                Verify
                              </button>
                            )}
                            {m.kyc_status !== 'suspended' && (
                              <button
                                onClick={() => handleKYCUpdate(m.id, 'suspended')}
                                disabled={updatingKYC === m.id}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GLOBAL AUDIT STREAM */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Actor Filter</label>
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                >
                  <option value="">All Actors</option>
                  <option value="merchant">Merchant Admin</option>
                  <option value="agent">AI Agent Key</option>
                  <option value="system">Policy Engine / System</option>
                  <option value="customer">Consumer Gating</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Action Filter</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                >
                  <option value="">All Actions</option>
                  <option value="payment_settled">payment_settled</option>
                  <option value="payment_executing">payment_executing</option>
                  <option value="payment_approved">payment_approved</option>
                  <option value="policy_evaluated">policy_evaluated</option>
                  <option value="spend_authorization_created">spend_authorization_created</option>
                  <option value="catalog_item_created">catalog_item_created</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                >
                  <option value="desc">Newest First (DESC)</option>
                  <option value="asc">Oldest First (ASC)</option>
                </select>
              </div>
            </div>

            {loadingAudit ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                <p className="text-xs font-medium">Loading global audit stream...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 w-36 whitespace-nowrap">Timestamp</th>
                        <th className="py-3 px-4 w-32">Store</th>
                        <th className="py-3 px-4 w-24">Actor</th>
                        <th className="py-3 px-4 w-44">Action</th>
                        <th className="py-3 px-4 w-28">Decision</th>
                        <th className="py-3 px-4">Reasoning</th>
                        <th className="py-3 px-4 w-28 text-right whitespace-nowrap">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {auditEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {ev.created_at ? new Date(ev.created_at).toLocaleString('en-IN', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            }) : 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 truncate max-w-[120px]">
                            {ev.merchant_name || 'Platform'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold uppercase text-[10px]">
                              {ev.actor_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800 text-[11px]">
                            {ev.action}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ev.decision === 'ALLOW' || ev.decision === 'ACTIVE' || ev.decision === 'REGISTERED' || ev.decision === 'SETTLED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ev.decision === 'EXECUTING' || ev.decision === 'APPROVED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {ev.decision}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 leading-relaxed max-w-sm truncate" title={ev.reasoning}>
                            {ev.reasoning}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedJsonEvent(ev)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[10px] transition-colors cursor-pointer"
                            >
                              Inspect JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* JSON Payload Inspector Modal */}
      {selectedJsonEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {selectedJsonEvent.action} • {selectedJsonEvent.id.slice(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJsonEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-96">
              <pre>{JSON.stringify(selectedJsonEvent.input, null, 2)}</pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Privacy Masking: <strong className="text-emerald-700">Enforced</strong></span>
              <button
                onClick={() => setSelectedJsonEvent(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
