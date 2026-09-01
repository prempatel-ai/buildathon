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
import { AgentpayLogo } from '@/components/Logo';
import {
  Search,
  RefreshCw,
  Lock,
  LogOut,
  Loader2,
  Code,
  X,
  Check,
  Building2,
  ShieldCheck,
  ShoppingBag,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

/* ─── Skeleton Loading Components ─────────────────────────────────────────── */

function SkeletonOverview() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 4 Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border border-neutral-200 rounded-lg bg-white overflow-hidden shadow-2xs">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 space-y-2.5">
            <div className="h-3 w-28 bg-neutral-200/70 rounded"></div>
            <div className="h-7 w-36 bg-neutral-300/80 rounded"></div>
            <div className="h-3 w-24 bg-neutral-200/60 rounded"></div>
          </div>
        ))}
      </div>

      {/* Governance Detail Panels Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
            <div className="h-3.5 w-44 bg-neutral-200 rounded"></div>
            <div className="h-3 w-64 bg-neutral-100 rounded"></div>
            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100 py-1 space-y-3">
              <div className="pt-2 h-4 w-full bg-neutral-100/70 rounded"></div>
              <div className="pt-2 h-4 w-full bg-neutral-100/70 rounded"></div>
              <div className="pt-2 h-4 w-full bg-neutral-100/70 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white animate-pulse">
      <div className="bg-neutral-50 border-b border-neutral-200 h-10 px-4 flex items-center gap-4">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="h-3 bg-neutral-200 rounded flex-1"></div>
        ))}
      </div>
      <div className="divide-y divide-neutral-100">
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="p-3.5 px-4 flex items-center gap-4">
            {[...Array(cols)].map((_, c) => (
              <div key={c} className="h-3.5 bg-neutral-200/60 rounded flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Admin Governance Component ─────────────────────────────────────── */

export default function PlatformAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'audit'>(() => {
    if (typeof window !== 'undefined') {
      const urlTab = new URLSearchParams(window.location.search).get('tab');
      const hashTab = window.location.hash.replace('#', '');
      const storedTab = localStorage.getItem('admin_active_tab');
      const cand = (urlTab || hashTab || storedTab) as any;
      if (['overview', 'merchants', 'audit'].includes(cand)) {
        return cand;
      }
    }
    return 'overview';
  });
  const [adminUser, setAdminUser] = useState<string>('admin');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const switchTab = (tab: 'overview' | 'merchants' | 'audit') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_active_tab', tab);
      const url = new URL(window.location.href);
      if (tab === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Overview State
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Merchants State & Pagination
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantPage, setMerchantPage] = useState<number>(1);
  const [merchantLimit, setMerchantLimit] = useState<number>(10);
  const [updatingKYC, setUpdatingKYC] = useState<string | null>(null);

  // Audit Stream State & Pagination
  const [auditEvents, setAuditEvents] = useState<AdminAuditItem[]>([]);
  const [totalAudit, setTotalAudit] = useState(0);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditLimit, setAuditLimit] = useState<number>(10);
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
  }, [activeTab, actorFilter, actionFilter, sortOrder, auditPage, auditLimit]);

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
      const skip = (auditPage - 1) * auditLimit;
      const data = await fetchAdminAuditEvents({
        actor_type: actorFilter || undefined,
        action: actionFilter || undefined,
        sort_order: sortOrder,
        skip,
        limit: auditLimit
      });
      setAuditEvents(data.items);
      setTotalAudit(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load global audit stream.');
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleRefreshCurrent = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'overview') {
        await loadOverview();
      } else if (activeTab === 'merchants') {
        await loadMerchants();
      } else if (activeTab === 'audit') {
        await loadAudit();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleKYCUpdate = async (merchantId: string, status: string) => {
    try {
      setUpdatingKYC(merchantId);
      await updateMerchantKYC(merchantId, status);
      setSuccessMsg(`Merchant status updated to ${status}.`);
      await loadMerchants();
      await loadOverview();
      setTimeout(() => setSuccessMsg(null), 2500);
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
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-200">
      {/* Top Minimalist Header */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AgentpayLogo size={24} />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-neutral-900">Agentpay Admin</span>
              <span className="text-[11px] text-neutral-500 font-mono">/ Governance</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 text-xs text-neutral-600 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{adminUser}</span>
            </div>
            <div className="h-4 w-px bg-neutral-200"></div>
            <button
              onClick={handleLogout}
              className="text-xs text-neutral-500 hover:text-neutral-900 font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl w-full mx-auto px-6 py-6 flex-1">
        {/* Tab Switcher & Reloader Tool */}
        <div className="flex items-center justify-between border-b border-neutral-200 mb-6">
          <div className="flex space-x-6">
            <button
              onClick={() => switchTab('overview')}
              className={`pb-3 text-xs font-semibold transition-all relative cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => switchTab('merchants')}
              className={`pb-3 text-xs font-semibold transition-all relative cursor-pointer ${
                activeTab === 'merchants'
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Merchants ({merchants.length || overview?.total_merchants || 0})
              {activeTab === 'merchants' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => switchTab('audit')}
              className={`pb-3 text-xs font-semibold transition-all relative cursor-pointer ${
                activeTab === 'audit'
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Audit Stream ({totalAudit || overview?.total_audit_events || 0})
              {activeTab === 'audit' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 rounded-full"></span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 pb-3">
            <div className="hidden sm:flex items-center gap-1.5 text-neutral-500 text-[11px]">
              <Lock className="w-3.5 h-3.5 text-neutral-700" />
              <span>Zero-Leakage Privacy Guard Active</span>
            </div>
            <button
              onClick={handleRefreshCurrent}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md text-neutral-700 text-xs font-medium transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Refresh Platform Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-neutral-600 ${isRefreshing ? 'animate-spin text-neutral-900' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-5 p-3 rounded border border-neutral-300 bg-neutral-50 text-neutral-900 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-neutral-500 hover:text-neutral-900 ml-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3 rounded border border-neutral-300 bg-neutral-50 text-neutral-900 text-xs font-medium flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-neutral-900" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loadingOverview ? (
              <SkeletonOverview />
            ) : overview ? (
              <>
                {/* Unified Metrics Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border border-neutral-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                  <div className="p-4">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Settled Protocol Volume</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                      ₹{(overview.total_settled_volume_inr ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-neutral-600 mt-1 block">
                      {overview.total_settled_transactions ?? 0} autonomous settlements
                    </span>
                  </div>

                  <div className="p-4">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Registered Merchants</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 tracking-tight">
                      {overview.total_merchants ?? 0}
                    </div>
                    <span className="text-[11px] text-neutral-600 mt-1 block">
                      {overview.verified_merchants ?? 0} KYC verified stores
                    </span>
                  </div>

                  <div className="p-4">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Active Catalog SKUs</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                      {overview.total_catalog_items ?? 0}
                    </div>
                    <span className="text-[11px] text-neutral-600 mt-1 block">
                      Across merchant catalogs
                    </span>
                  </div>

                  <div className="p-4">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Audit Events</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                      {overview.total_audit_events ?? 0}
                    </div>
                    <span className="text-[11px] text-neutral-600 mt-1 block">
                      {overview.total_policies_enforced ?? 0} active guardrails
                    </span>
                  </div>
                </div>

                {/* Governance Detail Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Panel 1 */}
                  <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-3 shadow-2xs">
                    <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">Dual-Gate Bounded Execution</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Every autonomous transaction undergoes policy checks before Razorpay settlement:
                    </p>
                    <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100 py-1 text-xs">
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="font-medium text-neutral-800">1. Customer Spend Vault Cap</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>ACTIVE</span>
                        </div>
                      </div>
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="font-medium text-neutral-800">2. Merchant Policy Gate & Velocity Limit</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>ACTIVE</span>
                        </div>
                      </div>
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="font-semibold text-neutral-800">3. Razorpay Direct e-Mandate Settlement</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>VERIFIED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel 2 */}
                  <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-3 shadow-2xs">
                    <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">Tenant Privacy Isolation Model</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Merchants cannot access competitor transactions. Customer identity is isolated.
                    </p>
                    <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100 py-1 text-xs">
                      <div className="py-2.5 flex items-center justify-between text-neutral-600">
                        <span>Merchant Scope:</span>
                        <strong className="text-neutral-900 font-mono">Store-Isolated Only</strong>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-neutral-600">
                        <span>Customer Identity:</span>
                        <strong className="text-neutral-900 font-mono">Masked at Gateway</strong>
                      </div>
                      <div className="py-2.5 flex items-center justify-between text-neutral-600">
                        <span>Audit Log:</span>
                        <strong className="text-neutral-900 font-mono">Append-Only Ledger</strong>
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
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  placeholder="Search store name or email..."
                  className="w-full h-9 pl-9 pr-3 text-xs rounded border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <button
                onClick={loadMerchants}
                disabled={loadingMerchants}
                className="h-9 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border border-neutral-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMerchants ? 'animate-spin' : ''}`} />
                <span>Refresh Directory</span>
              </button>
            </div>

            {loadingMerchants ? (
              <SkeletonTable rows={8} cols={6} />
            ) : (
              <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-4">Merchant Store</th>
                        <th className="py-2.5 px-4">Login Email</th>
                        <th className="py-2.5 px-4">KYC Status</th>
                        <th className="py-2.5 px-4">SKUs</th>
                        <th className="py-2.5 px-4">Policies</th>
                        <th className="py-2.5 px-4 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredMerchants.slice((merchantPage - 1) * merchantLimit, merchantPage * merchantLimit).map((m) => (
                        <tr key={m.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-neutral-900">
                            {m.name}
                          </td>
                          <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                            {m.email}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium ${
                              m.kyc_status === 'verified'
                                ? 'text-emerald-700 font-semibold'
                                : m.kyc_status === 'suspended'
                                ? 'text-neutral-400 line-through'
                                : 'text-amber-700'
                            }`}>
                              {m.kyc_status === 'verified' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                              {m.kyc_status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-neutral-700">
                            {m.catalog_count}
                          </td>
                          <td className="py-3 px-4 font-mono text-neutral-700">
                            {m.policy_count}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            {m.kyc_status !== 'verified' && (
                              <button
                                onClick={() => handleKYCUpdate(m.id, 'verified')}
                                disabled={updatingKYC === m.id}
                                className="h-7 px-2.5 bg-neutral-900 hover:bg-black text-white rounded text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Verify
                              </button>
                            )}
                            {m.kyc_status !== 'suspended' && (
                              <button
                                onClick={() => handleKYCUpdate(m.id, 'suspended')}
                                disabled={updatingKYC === m.id}
                                className="h-7 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer border border-neutral-200"
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

                {/* Merchants Pagination Bar */}
                {filteredMerchants.length > 0 && (
                  <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="text-neutral-600 font-medium">
                      Showing <span className="font-semibold text-neutral-900 font-mono">{(merchantPage - 1) * merchantLimit + 1}</span>–<span className="font-semibold text-neutral-900 font-mono">{Math.min(merchantPage * merchantLimit, filteredMerchants.length)}</span> of <span className="font-semibold text-neutral-900 font-mono">{filteredMerchants.length}</span> stores
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 text-[11px]">Rows per page:</span>
                        <select
                          value={merchantLimit}
                          onChange={(e) => {
                            setMerchantLimit(Number(e.target.value));
                            setMerchantPage(1);
                          }}
                          className="h-7 px-2 bg-white border border-neutral-200 rounded text-xs font-mono font-medium text-neutral-800 focus:outline-none cursor-pointer"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setMerchantPage(1)}
                          disabled={merchantPage === 1}
                          title="First Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setMerchantPage((p) => Math.max(1, p - 1))}
                          disabled={merchantPage === 1}
                          title="Previous Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="px-2 text-xs font-mono text-neutral-700">
                          Page {merchantPage} of {Math.ceil(filteredMerchants.length / merchantLimit) || 1}
                        </span>

                        <button
                          onClick={() => setMerchantPage((p) => Math.min(Math.ceil(filteredMerchants.length / merchantLimit) || 1, p + 1))}
                          disabled={merchantPage >= Math.ceil(filteredMerchants.length / merchantLimit)}
                          title="Next Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setMerchantPage(Math.ceil(filteredMerchants.length / merchantLimit) || 1)}
                          disabled={merchantPage >= Math.ceil(filteredMerchants.length / merchantLimit)}
                          title="Last Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GLOBAL AUDIT STREAM */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={actorFilter}
                onChange={(e) => {
                  setActorFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="h-8 px-2.5 bg-white border border-neutral-200 rounded text-xs font-medium text-neutral-800 focus:outline-none"
              >
                <option value="">All Actors</option>
                <option value="merchant">Merchant Admin</option>
                <option value="agent">AI Agent Key</option>
                <option value="system">Policy Engine / System</option>
                <option value="customer">Consumer Gating</option>
              </select>

              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="h-8 px-2.5 bg-white border border-neutral-200 rounded text-xs font-medium text-neutral-800 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="payment_settled">payment_settled</option>
                <option value="payment_executing">payment_executing</option>
                <option value="payment_approved">payment_approved</option>
                <option value="payment_proposed">payment_proposed</option>
                <option value="policy_evaluated">policy_evaluated</option>
                <option value="spend_authorization_created">spend_authorization_created</option>
                <option value="catalog_item_created">catalog_item_created</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setAuditPage(1);
                }}
                className="h-8 px-2.5 bg-white border border-neutral-200 rounded text-xs font-medium text-neutral-800 focus:outline-none"
              >
                <option value="desc">Newest First (DESC)</option>
                <option value="asc">Oldest First (ASC)</option>
              </select>
            </div>

            {loadingAudit ? (
              <SkeletonTable rows={10} cols={7} />
            ) : (
              <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-6 w-48 whitespace-nowrap">Timestamp</th>
                        <th className="py-3 px-4 w-36">Store</th>
                        <th className="py-3 px-4 w-28">Actor</th>
                        <th className="py-3 px-4 w-48">Action</th>
                        <th className="py-3 px-4 w-28">Decision</th>
                        <th className="py-3 px-4 min-w-[280px]">Reasoning</th>
                        <th className="py-3 pr-6 pl-4 w-28 text-right whitespace-nowrap">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {auditEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-6 text-neutral-600 whitespace-nowrap font-mono text-[11px]">
                            {ev.created_at ? new Date(ev.created_at).toLocaleString('en-IN', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            }) : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-neutral-900 truncate max-w-[130px]">
                            {ev.merchant_name || 'Platform'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-mono uppercase">
                              {ev.actor_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 text-[11px]">
                            {ev.action}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold ${
                              ev.decision === 'ALLOW' || ev.decision === 'ACTIVE' || ev.decision === 'REGISTERED' || ev.decision === 'SETTLED'
                                ? 'text-emerald-700'
                                : ev.decision === 'EXECUTING' || ev.decision === 'APPROVED'
                                ? 'text-neutral-900'
                                : 'text-red-700'
                            }`}>
                              {ev.decision}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-neutral-600 leading-relaxed" title={ev.reasoning}>
                            {ev.reasoning}
                          </td>
                          <td className="py-3.5 pr-6 pl-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedJsonEvent(ev)}
                              className="h-6 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-[11px] transition-colors cursor-pointer border border-neutral-200 inline-flex items-center gap-1"
                            >
                              <Code className="w-3 h-3 text-neutral-600" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Audit Stream Pagination Bar */}
                {!loadingAudit && totalAudit > 0 && (
                  <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="text-neutral-600 font-medium">
                      Showing <span className="font-semibold text-neutral-900 font-mono">{(auditPage - 1) * auditLimit + 1}</span>–<span className="font-semibold text-neutral-900 font-mono">{Math.min(auditPage * auditLimit, totalAudit)}</span> of <span className="font-semibold text-neutral-900 font-mono">{totalAudit}</span> events
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Rows per page selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 text-[11px]">Rows per page:</span>
                        <select
                          value={auditLimit}
                          onChange={(e) => {
                            setAuditLimit(Number(e.target.value));
                            setAuditPage(1);
                          }}
                          className="h-7 px-2 bg-white border border-neutral-200 rounded text-xs font-mono font-medium text-neutral-800 focus:outline-none cursor-pointer"
                        >
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>

                      {/* Page controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAuditPage(1)}
                          disabled={auditPage === 1}
                          title="First Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                          disabled={auditPage === 1}
                          title="Previous Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <span className="px-2 text-xs font-mono text-neutral-700">
                          Page {auditPage} of {Math.ceil(totalAudit / auditLimit) || 1}
                        </span>

                        <button
                          onClick={() => setAuditPage((p) => Math.min(Math.ceil(totalAudit / auditLimit) || 1, p + 1))}
                          disabled={auditPage >= Math.ceil(totalAudit / auditLimit)}
                          title="Next Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setAuditPage(Math.ceil(totalAudit / auditLimit) || 1)}
                          disabled={auditPage >= Math.ceil(totalAudit / auditLimit)}
                          title="Last Page"
                          className="h-7 w-7 flex items-center justify-center rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* JSON Payload Inspector Modal */}
      {selectedJsonEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-xl w-full p-5 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-neutral-700" />
                <h3 className="text-xs font-semibold text-neutral-900 font-mono">
                  {selectedJsonEvent.action} • {selectedJsonEvent.id.slice(0, 8)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedJsonEvent(null)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-neutral-950 text-neutral-100 p-3.5 rounded font-mono text-xs overflow-x-auto max-h-96">
              <pre>{JSON.stringify(selectedJsonEvent.input, null, 2)}</pre>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span>Privacy Masking: <strong className="text-neutral-900">Enforced</strong></span>
              <button
                onClick={() => setSelectedJsonEvent(null)}
                className="h-7 px-3 bg-neutral-900 hover:bg-black text-white font-medium text-xs rounded transition-colors cursor-pointer"
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
