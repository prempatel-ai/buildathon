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
  Search,
  RefreshCw,
  Lock,
  LogOut,
  Loader2,
  Code,
  X,
  Check,
  ShieldAlert
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
    <div className="min-h-screen bg-[#fcfcfc] text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-200">
      {/* Minimal Monochrome Top Navbar */}
      <header className="bg-white border-b border-neutral-200/90 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
              AP
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-neutral-900 tracking-tight">Platform Admin</span>
              <span className="text-[11px] text-neutral-500 font-mono bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                Governance
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-neutral-600 bg-neutral-50 px-2.5 py-1 rounded-md border border-neutral-200 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{adminUser}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-neutral-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 flex-1">
        {/* Header Bar with Segmented Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-neutral-200/80">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">System Control & Audit</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Platform merchants directory, dual-gate policies, and immutable audit ledger.
            </p>
          </div>

          {/* Clean Segmented Control */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg text-xs font-medium border border-neutral-200/70 shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('merchants')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'merchants'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Merchants ({merchants.length || overview?.total_merchants || 0})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'audit'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Global Audit Stream ({totalAudit || overview?.total_audit_events || 0})
            </button>
          </div>
        </div>

        {/* Privacy Guard Notice */}
        <div className="mb-5 p-3 rounded-lg bg-white border border-neutral-200 shadow-xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-neutral-700" />
            <span className="font-semibold text-neutral-900">Privacy-First Dynamic Data Masking</span>
            <span className="text-neutral-500 text-[11px] hidden sm:inline">
              — Consumer contact details, residential addresses, and payment card tokens are masked at runtime.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-mono font-semibold border border-neutral-200">
            ENFORCED
          </span>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-neutral-500 hover:text-neutral-900 ml-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3 rounded-lg bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs font-medium flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-neutral-900" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {loadingOverview ? (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
                <p className="text-xs font-medium">Loading platform metrics...</p>
              </div>
            ) : overview ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Metric 1 */}
                  <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Settled Protocol Volume</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                      ₹{overview.total_settled_volume_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-neutral-600 font-medium mt-1 block">
                      {overview.total_settled_transactions} autonomous settlements
                    </span>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Registered Merchants</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 tracking-tight">
                      {overview.total_merchants}
                    </div>
                    <span className="text-[11px] text-neutral-600 font-medium mt-1 block">
                      {overview.verified_merchants} KYC verified stores
                    </span>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Active Catalog SKUs</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                      {overview.total_catalog_items}
                    </div>
                    <span className="text-[11px] text-neutral-600 font-medium mt-1 block">
                      Across merchant catalogs
                    </span>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Immutable Audit Events</span>
                    <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                      {overview.total_audit_events}
                    </div>
                    <span className="text-[11px] text-neutral-600 font-medium mt-1 block">
                      {overview.total_policies_enforced} active guardrails
                    </span>
                  </div>
                </div>

                {/* Governance Detail Panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-neutral-200/90 shadow-xs space-y-3">
                    <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">Dual-Gate Bounded Execution</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Every autonomous transaction undergoes policy checks before Razorpay settlement:
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/70 flex items-center justify-between">
                        <span className="font-medium text-neutral-800">1. Customer Spend Vault Cap</span>
                        <span className="text-neutral-900 font-mono text-[10px] font-bold bg-neutral-200/80 px-2 py-0.5 rounded">
                          ACTIVE
                        </span>
                      </div>
                      <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/70 flex items-center justify-between">
                        <span className="font-medium text-neutral-800">2. Merchant Policy Gate & Velocity Limit</span>
                        <span className="text-neutral-900 font-mono text-[10px] font-bold bg-neutral-200/80 px-2 py-0.5 rounded">
                          ACTIVE
                        </span>
                      </div>
                      <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/70 flex items-center justify-between">
                        <span className="font-semibold text-neutral-800">3. Razorpay Direct e-Mandate Settlement</span>
                        <span className="text-neutral-900 font-mono text-[10px] font-bold bg-neutral-200/80 px-2 py-0.5 rounded">
                          VERIFIED
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-neutral-200/90 shadow-xs space-y-3">
                    <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">Tenant Privacy Isolation Model</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Merchants cannot access competitor transactions. Customer identity is isolated.
                    </p>
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/70 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>Merchant Scope:</span>
                        <strong className="text-neutral-900 font-mono">Store-Isolated Only</strong>
                      </div>
                      <div className="flex items-center justify-between text-neutral-600">
                        <span>Customer Identity:</span>
                        <strong className="text-neutral-900 font-mono">Masked at Gateway</strong>
                      </div>
                      <div className="flex items-center justify-between text-neutral-600">
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
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200/90 shadow-xs">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  placeholder="Search by store name or email..."
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <button
                onClick={loadMerchants}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingMerchants ? (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
                <p className="text-xs font-medium">Loading merchant directory...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Merchant Store</th>
                        <th className="py-3 px-4">Login Email</th>
                        <th className="py-3 px-4">KYC Status</th>
                        <th className="py-3 px-4">SKUs</th>
                        <th className="py-3 px-4">Policies</th>
                        <th className="py-3 px-4 text-right">Moderation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredMerchants.map((m) => (
                        <tr key={m.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-neutral-900">
                            {m.name}
                          </td>
                          <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                            {m.email}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                              m.kyc_status === 'verified'
                                ? 'bg-neutral-900 text-white'
                                : m.kyc_status === 'suspended'
                                ? 'bg-neutral-200 text-neutral-700 line-through'
                                : 'bg-neutral-100 text-neutral-700 border border-neutral-300'
                            }`}>
                              {m.kyc_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-neutral-700">
                            {m.catalog_count}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-neutral-700">
                            {m.policy_count}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {m.kyc_status !== 'verified' && (
                              <button
                                onClick={() => handleKYCUpdate(m.id, 'verified')}
                                disabled={updatingKYC === m.id}
                                className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Verify
                              </button>
                            )}
                            {m.kyc_status !== 'suspended' && (
                              <button
                                onClick={() => handleKYCUpdate(m.id, 'suspended')}
                                disabled={updatingKYC === m.id}
                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[11px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
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
            <div className="bg-white p-3 rounded-xl border border-neutral-200/90 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Actor Filter</label>
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none"
                >
                  <option value="">All Actors</option>
                  <option value="merchant">Merchant Admin</option>
                  <option value="agent">AI Agent Key</option>
                  <option value="system">Policy Engine / System</option>
                  <option value="customer">Consumer Gating</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Action Filter</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none"
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
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800 focus:outline-none"
                >
                  <option value="desc">Newest First (DESC)</option>
                  <option value="asc">Oldest First (ASC)</option>
                </select>
              </div>
            </div>

            {loadingAudit ? (
              <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
                <p className="text-xs font-medium">Loading global audit stream...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4 w-36 whitespace-nowrap">Timestamp</th>
                        <th className="py-3 px-4 w-36">Store</th>
                        <th className="py-3 px-4 w-24">Actor</th>
                        <th className="py-3 px-4 w-44">Action</th>
                        <th className="py-3 px-4 w-28">Decision</th>
                        <th className="py-3 px-4">Reasoning</th>
                        <th className="py-3 px-4 w-28 text-right whitespace-nowrap">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs">
                      {auditEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 text-neutral-500 whitespace-nowrap font-mono text-[11px]">
                            {ev.created_at ? new Date(ev.created_at).toLocaleString('en-IN', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            }) : 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-medium text-neutral-900 truncate max-w-[130px]">
                            {ev.merchant_name || 'Platform'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-mono uppercase">
                              {ev.actor_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-neutral-900 text-[11px]">
                            {ev.action}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              ev.decision === 'ALLOW' || ev.decision === 'ACTIVE' || ev.decision === 'REGISTERED' || ev.decision === 'SETTLED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : ev.decision === 'EXECUTING' || ev.decision === 'APPROVED'
                                ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {ev.decision}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-600 leading-relaxed max-w-sm truncate" title={ev.reasoning}>
                            {ev.reasoning}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedJsonEvent(ev)}
                              className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-medium text-[11px] transition-colors cursor-pointer border border-neutral-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-neutral-700" />
                <h3 className="text-sm font-semibold text-neutral-900 font-mono">
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

            <div className="bg-neutral-950 text-neutral-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96">
              <pre>{JSON.stringify(selectedJsonEvent.input, null, 2)}</pre>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span>Privacy Masking: <strong className="text-neutral-900">Enforced</strong></span>
              <button
                onClick={() => setSelectedJsonEvent(null)}
                className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
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
