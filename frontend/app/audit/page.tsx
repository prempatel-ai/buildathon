'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  fetchAuditEvents,
  getMerchantMe,
  Merchant,
  AuditEvent,
} from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';

import Navigation from '@/components/Navigation';
import { RefreshCw, Lock, Store, Code, X, Loader2 } from 'lucide-react';

function AuditViewerContent() {
  const searchParams = useSearchParams();
  const initialMerchantId = searchParams.get('merchant_id') || '';

  const [currentMerchant, setCurrentMerchant] = useState<Merchant | null>(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(initialMerchantId);
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedJsonEvent, setSelectedJsonEvent] = useState<AuditEvent | null>(null);

  const loadMerchantIdentity = async () => {
    try {
      const me = await getMerchantMe();
      if (me && me.id) {
        setCurrentMerchant(me);
        setSelectedMerchantId(me.id);
      }
    } catch (err: any) {
      console.error('Failed to load merchant identity', err);
    }
  };

  useAuthGuard(loadMerchantIdentity);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditEvents({
        merchant_id: selectedMerchantId || (currentMerchant ? currentMerchant.id : undefined),
        actor_type: actorTypeFilter || undefined,
        action: actionFilter || undefined,
        sort_order: sortOrder,
        limit: 100,
      });
      setEvents(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMerchantId || currentMerchant) {
      loadEvents();
    }
  }, [selectedMerchantId, currentMerchant, actorTypeFilter, actionFilter, sortOrder]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Governance & Security</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">Append-Only Cryptographic Log</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Immutable Audit Trail</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Real-time chronological ledger of policy decisions, agent settlements, and catalog operations for your store.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentMerchant?.name && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{currentMerchant.name}</span>
              </div>
            )}
            <button
              onClick={loadEvents}
              disabled={loading}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Trail</span>
            </button>
          </div>
        </div>

        {/* Tenant Scope & Privacy Notice Banner */}
        <div className="mb-5 p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Store className="w-4 h-4 text-neutral-700 shrink-0" />
            <div>
              <span className="font-semibold text-neutral-900">{currentMerchant?.name || 'Verified Merchant Store'}</span>
              <span className="text-neutral-500 text-[11px] ml-2 hidden md:inline">
                — Tenant-isolated audit scope. Competitor transactions and raw customer PII are isolated.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-600 bg-white px-2.5 py-1 rounded border border-neutral-200 shrink-0">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>PII Masked & Redacted</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <select
            value={actorTypeFilter}
            onChange={(e) => setActorTypeFilter(e.target.value)}
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
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-8 px-2.5 bg-white border border-neutral-200 rounded text-xs font-medium text-neutral-800 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="policy_evaluated">policy_evaluated</option>
            <option value="payment_settled">payment_settled</option>
            <option value="payment_order_created">payment_order_created</option>
            <option value="catalog_item_created">catalog_item_created</option>
            <option value="catalog_item_updated">catalog_item_updated</option>
            <option value="agent_key_created">agent_key_created</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="h-8 px-2.5 bg-white border border-neutral-200 rounded text-xs font-medium text-neutral-800 focus:outline-none"
          >
            <option value="desc">Newest First (DESC)</option>
            <option value="asc">Oldest First (ASC)</option>
          </select>
        </div>

        {/* Audit Events Table */}
        <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Audit Stream ({total} events logged)
            </h2>
            <span className="text-[11px] font-mono text-neutral-400">
              Order: {sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs border-b border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
              <p className="text-xs">Loading immutable audit trail...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 font-mono">
              No audit events found for selected filters. Perform actions in dashboard to generate logs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-6 w-48 whitespace-nowrap">Timestamp</th>
                    <th className="py-3 px-4 w-28 whitespace-nowrap">Actor</th>
                    <th className="py-3 px-4 w-48 whitespace-nowrap">Action</th>
                    <th className="py-3 px-4 w-28 whitespace-nowrap">Decision</th>
                    <th className="py-3 px-4 min-w-[280px]">Human-Readable Reasoning</th>
                    <th className="py-3 pr-6 pl-4 w-28 text-right whitespace-nowrap">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {events.map((ev) => (
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-mono uppercase">
                          {ev.actor_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-medium text-neutral-900 text-[11px]">
                        {ev.action}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
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
          )}
        </div>
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

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-12 text-neutral-400 font-mono text-xs">
        Loading Audit Trail...
      </div>
    }>
      <AuditViewerContent />
    </Suspense>
  );
}
