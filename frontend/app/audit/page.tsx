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
import { useAuthGuard } from '@/lib/useAuthGuard';

import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Code, Shield } from 'lucide-react';

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

  const loadMerchants = async () => {
    try {
      const data = await fetchMerchants();
      setMerchants(data);
    } catch (err: any) {
      console.error('Failed to load merchants', err);
    }
  };

  useAuthGuard(loadMerchants);

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

  useEffect(() => {
    loadEvents();
  }, [selectedMerchantId, actorTypeFilter, actionFilter, sortOrder]);

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-200">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1">
        <PageHeader
          category="Governance & Security"
          title="Immutable Audit Trail"
          subtitle="Every catalog change, policy decision, and payment state transition logged in real time."
          badge="Append-Only Log"
          actions={
            <Button variant="outline" size="sm" onClick={loadEvents} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
              Refresh Trail
            </Button>
          }
        />

        {/* Filter Controls Bar */}
        <div className="mb-6 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">Filter Merchant</label>
            <select
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
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
            <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">Actor Type</label>
            <select
              value={actorTypeFilter}
              onChange={(e) => setActorTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
            >
              <option value="">All Actors</option>
              <option value="merchant">merchant</option>
              <option value="agent">agent</option>
              <option value="system">system</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400"
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
            <label className="block text-[11px] font-mono font-bold uppercase text-slate-400 mb-1">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-slate-400 font-mono"
            >
              <option value="asc">Oldest First (ASC)</option>
              <option value="desc">Newest First (DESC)</option>
            </select>
          </div>
        </div>

        {/* Audit Events Table */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900">
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
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">
              No audit events found for selected filters. Perform actions in dashboard to generate logs!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5">Actor</th>
                    <th className="px-4 py-3.5">Action</th>
                    <th className="px-4 py-3.5">Decision</th>
                    <th className="px-6 py-3.5">Human-Readable Reasoning</th>
                    <th className="px-4 py-3.5 text-right">Payload</th>
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
                            <Badge variant="secondary">{ev.actor_type}</Badge>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-900 font-bold">
                            {ev.action}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <StatusBadge status={ev.decision || 'EVALUATED'} />
                          </td>
                          <td className="px-6 py-3.5 text-slate-600 max-w-md leading-relaxed">
                            {ev.reasoning}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                            >
                              <Code className="w-3 h-3 mr-1" />
                              {isExpanded ? 'Hide JSON' : 'View JSON'}
                            </Button>
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
        Agentpay &bull; Immutable Audit Store &bull; Razorpay AI Protocol
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
