'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  fetchMerchants,
  fetchAuditEvents,
  Merchant,
  AuditEvent,
} from '@/lib/api';

function AuditViewerContent() {
  const searchParams = useSearchParams();
  const initialMerchantId = searchParams.get('merchant_id') || '';

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(initialMerchantId);
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('asc');

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [selectedMerchantId, actorTypeFilter, actionFilter, sortOrder]);

  const loadMerchants = async () => {
    try {
      const data = await fetchMerchants();
      setMerchants(data);
    } catch (err: any) {
      console.error('Failed to load merchants', err);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditEvents({
        merchant_id: selectedMerchantId || undefined,
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

  const getDecisionBadge = (decision: string) => {
    const d = decision.toUpperCase();
    if (d === 'ALLOW' || d === 'SETTLED' || d === 'APPROVED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {d}
        </span>
      );
    }
    if (d === 'DENY' || d === 'FAILED' || d === 'REJECTED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
          {d}
        </span>
      );
    }
    if (d === 'NEEDS_APPROVAL' || d === 'PROPOSED' || d === 'EXECUTING') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {d}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        {d}
      </span>
    );
  };

  const getActorBadge = (actorType: string) => {
    const a = actorType.toLowerCase();
    if (a === 'agent') {
      return (
        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono text-[11px]">
          agent
        </span>
      );
    }
    if (a === 'merchant') {
      return (
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono text-[11px]">
          merchant
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono text-[11px]">
        {actorType}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-semibold text-white text-sm">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Agentpay</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-600">Audit Trail Viewer</span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              &larr; Catalog Dashboard
            </Link>
            <Link
              href="/onboarding"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Onboarding
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        {/* Banner */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                Immutable Audit Trail
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold font-mono">
                Append-Only Log
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Every catalog change, policy decision, and payment state transition logged in real time.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadEvents}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5"
            >
              <span>Refresh Trail</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">Filter Merchant</label>
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Merchants</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">Actor Type</label>
            <select
              value={actorTypeFilter}
              onChange={(e) => setActorTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Actors</option>
              <option value="merchant">merchant</option>
              <option value="agent">agent</option>
              <option value="system">system</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Actions</option>
              <option value="catalog_item_created">catalog_item_created</option>
              <option value="catalog_item_updated">catalog_item_updated</option>
              <option value="catalog_item_deleted">catalog_item_deleted</option>
              <option value="policy_created">policy_created</option>
              <option value="policy_evaluated">policy_evaluated</option>
              <option value="payment_proposed">payment_proposed</option>
              <option value="payment_approved">payment_approved</option>
              <option value="payment_executing">payment_executing</option>
              <option value="payment_settled">payment_settled</option>
              <option value="payment_failed">payment_failed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">Chronological Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            >
              <option value="asc">Oldest First (ASC)</option>
              <option value="desc">Newest First (DESC)</option>
            </select>
          </div>
        </div>

        {/* Audit Events Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-900">
              Audit Stream ({total} events logged)
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Order: {sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}
            </span>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-xs border-b border-red-200">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              Loading audit events stream...
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No audit events found for selected filters. Perform actions in dashboard to generate logs!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-6 py-3">Human-Readable Reasoning</th>
                    <th className="px-4 py-3 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((ev) => {
                    const isExpanded = expandedEventId === ev.id;
                    return (
                      <React.Fragment key={ev.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                            {formatDate(ev.created_at)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {getActorBadge(ev.actor_type)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-800 font-medium">
                            {ev.action}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {getDecisionBadge(ev.decision)}
                          </td>
                          <td className="px-6 py-3.5 text-slate-700 max-w-md leading-relaxed">
                            {ev.reasoning}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-mono transition-colors"
                            >
                              {isExpanded ? 'Hide JSON' : 'View JSON'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-900 text-slate-100 font-mono text-xs">
                            <td colSpan={6} className="p-4 border-y border-slate-800">
                              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800 text-slate-400">
                                <span>Event ID: {ev.id}</span>
                                <span>Merchant ID: {ev.merchant_id || 'N/A'}</span>
                              </div>
                              <pre className="overflow-x-auto text-[11px] leading-relaxed">
                                {JSON.stringify(ev.input, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Agentpay &bull; Immutable Audit Store &bull; Razorpay AI Buildathon
      </footer>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12 text-slate-400 font-mono text-xs">
        Loading Audit Trail...
      </div>
    }>
      <AuditViewerContent />
    </Suspense>
  );
}
