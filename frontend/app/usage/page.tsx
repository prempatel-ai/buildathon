'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMerchantUsage,
  getMerchantMe,
  fetchAuditEvents,
  fetchMerchantTimeline,
  fetchMerchantAgentDistribution,
  fetchMerchantDecisionBreakdown,
  MerchantUsageData,
  Merchant,
  AuditEvent
} from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';
import Navigation from '@/components/Navigation';
import { StatusBadge } from '@/components/ui/status-badge';
import { RefreshCw, Loader2, ArrowRight, Bot, ShieldCheck } from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

export default function UsagePage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [usage, setUsage] = useState<MerchantUsageData | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [timelineData, setTimelineData] = useState<{ date: string; value: number; change: number }[]>([]);
  const [agentPieData, setAgentPieData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [decisionBarData, setDecisionBarData] = useState<{ name: string; count: number; fill: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive Range Switcher
  const [activeRange, setActiveRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const [activeHoverData, setActiveHoverData] = useState<{ date: string; value: number; change: number } | null>(null);

  useAuthGuard(loadData);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [uData, mData, tData, aData, dData] = await Promise.all([
        getMerchantUsage(),
        getMerchantMe(),
        fetchMerchantTimeline(activeRange).catch(() => []),
        fetchMerchantAgentDistribution().catch(() => []),
        fetchMerchantDecisionBreakdown().catch(() => [])
      ]);
      if (!mData || !mData.id) {
        router.push('/onboarding');
        return;
      }
      setUsage(uData);
      setMerchant(mData);
      setTimelineData(tData);
      setAgentPieData(aData);
      setDecisionBarData(dData);

      if (mData?.id) {
        const eventsRes = await fetchAuditEvents({ merchant_id: mData.id, limit: 10 }).catch(() => ({ items: [], total: 0 }));
        setAuditEvents(eventsRes.items || []);
      }
    } catch (err: any) {
      router.push('/onboarding');
      return;
    } finally {
      setLoading(false);
    }
  }

  const handleRangeChange = async (newRange: '1d' | '7d' | '30d' | '90d') => {
    setActiveRange(newRange);
    setChartLoading(true);
    try {
      const tData = await fetchMerchantTimeline(newRange);
      setTimelineData(tData);
    } catch (err) {
      console.error('Failed to switch range timeline:', err);
    } finally {
      setChartLoading(false);
    }
  };

  const totalVol = usage ? Number(usage.total_settled_volume) : 0;
  const settledCount = usage ? usage.settled_transactions : 0;
  const totalCount = usage ? usage.total_transactions : 0;
  const failedCount = usage ? usage.failed_transactions : 0;
  const successRate = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 100;
  const velocityLimit = merchant?.limits_config?.velocity_limit ?? 'Uncapped';

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-neutral-200 text-neutral-900 rounded-lg p-2.5 shadow-md text-xs font-sans">
          <div className="text-neutral-500 font-mono text-[10px] mb-0.5">
            {data.date}
          </div>
          <div className="text-sm font-bold font-mono text-neutral-900">
            ₹{Number(data.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Analytics Suite</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">Real-Time Ledger</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Executive Performance Analytics</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Real-time telemetry on autonomous protocol volume, AI agent distribution, and policy gating decisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {merchant?.name && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{merchant.name}</span>
              </div>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Metrics</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded border border-neutral-300 bg-neutral-50 text-neutral-900 text-xs font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border border-neutral-200 rounded-lg bg-white overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 sm:p-4 space-y-2">
                  <div className="h-3 w-28 bg-neutral-200/70 rounded"></div>
                  <div className="h-7 w-32 bg-neutral-300/80 rounded"></div>
                  <div className="h-3 w-24 bg-neutral-200/60 rounded"></div>
                </div>
              ))}
            </div>
            <div className="border border-neutral-200 rounded-lg p-4 sm:p-6 bg-white space-y-4">
              <div className="h-4 w-40 bg-neutral-200 rounded"></div>
              <div className="h-48 w-full bg-neutral-100/70 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unified 4-Metric Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border border-neutral-200 rounded-lg bg-white overflow-hidden">
            <div className="p-3 sm:p-4">
              <span className="text-[10.5px] sm:text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Gross Settled Volume</span>
              <div className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                ₹{totalVol.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] sm:text-[11px] text-neutral-600 mt-1 block font-mono">
                100% Captured via Razorpay
              </span>
            </div>

            <div className="p-4">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Settled Orders</span>
              <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                {settledCount}
              </div>
              <span className="text-[11px] text-neutral-600 mt-1 block font-mono">
                HMAC Signed Transactions
              </span>
            </div>

            <div className="p-4">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Gate Approval Rate</span>
              <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                {successRate}%
              </div>
              <span className="text-[11px] text-neutral-600 mt-1 block">
                {settledCount} Approved · {failedCount} Gated
              </span>
            </div>

            <div className="p-4">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Velocity Guard</span>
              <div className="text-2xl font-bold text-neutral-900 mt-1 font-mono tracking-tight">
                {typeof velocityLimit === 'number' ? `${velocityLimit} ` : velocityLimit}
                {typeof velocityLimit === 'number' && <span className="text-xs font-normal text-neutral-500 font-sans">req/min</span>}
              </div>
              <span className="text-[11px] text-neutral-600 mt-1 block">
                Redis Rate Limiter Active
              </span>
            </div>
          </div>

          {/* Volume Timeline Chart */}
          <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Settled Volume Timeline
                </h3>
                <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
                  ₹{activeHoverData ? Number(activeHoverData.value).toLocaleString('en-IN') : totalVol.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Segmented Range Switcher */}
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-md text-xs font-medium border border-neutral-200/80 self-start sm:self-auto">
                <button
                  onClick={() => handleRangeChange('1d')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeRange === '1d' ? 'bg-white text-neutral-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Day by Day
                </button>
                <button
                  onClick={() => handleRangeChange('7d')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeRange === '7d' ? 'bg-white text-neutral-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => handleRangeChange('30d')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeRange === '30d' ? 'bg-white text-neutral-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => handleRangeChange('90d')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeRange === '90d' ? 'bg-white text-neutral-900 font-semibold shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Quarterly
                </button>
              </div>
            </div>

            {loading || chartLoading ? (
              <div className="h-72 w-full flex items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
                <p className="text-xs">Updating timeline series...</p>
              </div>
            ) : (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    onMouseMove={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length) {
                        setActiveHoverData(e.activePayload[0].payload);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#737373' }}
                      tickMargin={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#737373' }}
                      tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                      tickMargin={8}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#171717"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#171717', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 5, fill: '#171717', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Agent Share & Policy Decisions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel 1: Agent Share */}
            <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-neutral-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  AI Agent Volume Distribution
                </h3>
              </div>

              {loading ? (
                <div className="py-12 flex items-center justify-center text-neutral-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <p className="text-xs">Loading agent distribution...</p>
                </div>
              ) : agentPieData.length > 0 ? (
                (() => {
                  const totalAgentOps = agentPieData.reduce((acc, a) => acc + (a.value || 0), 0);
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                      <div className="w-44 h-44 relative flex items-center justify-center shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={agentPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={72}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {agentPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#262626'} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0];
                                  const pct = totalAgentOps > 0 ? Math.round(((Number(data.value) || 0) / totalAgentOps) * 100) : 0;
                                  return (
                                    <div className="bg-neutral-900 text-white text-[11px] font-mono px-3 py-1.5 rounded-md shadow-xl border border-neutral-800 z-50">
                                      <div className="font-semibold text-neutral-200">{data.name}</div>
                                      <div className="text-neutral-400 mt-0.5">{data.value} events ({pct}%)</div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-lg font-bold font-mono text-neutral-900">{totalAgentOps}</span>
                          <span className="text-[9px] text-neutral-400 uppercase font-mono tracking-wider">Events</span>
                        </div>
                      </div>

                      <div className="flex-1 w-full space-y-2 min-w-0">
                        {agentPieData.map((agent) => {
                          const pct = totalAgentOps > 0 ? Math.round((agent.value / totalAgentOps) * 100) : 0;
                          return (
                            <div key={agent.name} className="flex items-center justify-between p-2 rounded-md bg-neutral-50/80 border border-neutral-100 text-xs gap-3">
                              <div className="flex items-center space-x-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: agent.color || '#262626' }} />
                                <span className="font-medium text-neutral-800 truncate" title={agent.name}>{agent.name}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 font-mono text-neutral-700 shrink-0">
                                <span className="font-semibold">{agent.value} txs</span>
                                <span className="text-neutral-400 text-[11px]">({pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-10 text-center text-xs text-neutral-400">
                  No agent transactions recorded yet.
                </div>
              )}
            </div>

            {/* Panel 2: Decision Breakdown */}
            <div className="border border-neutral-200 rounded-lg p-5 bg-white space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-neutral-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Policy Evaluation Breakdown
                </h3>
              </div>

              {loading ? (
                <div className="py-12 flex items-center justify-center text-neutral-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <p className="text-xs">Loading policy breakdown...</p>
                </div>
              ) : decisionBarData.length > 0 ? (
                <div className="h-44 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={decisionBarData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#737373' }} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-neutral-900 text-white text-[11px] font-mono px-3 py-1.5 rounded-md shadow-xl border border-neutral-800 z-50">
                                <div className="font-semibold text-neutral-200">{data.name}</div>
                                <div className="text-neutral-400 mt-0.5">{data.count} decisions</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {decisionBarData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill || '#171717'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-neutral-400">
                  No policy evaluation records yet.
                </div>
              )}
            </div>
          </div>

          {/* Audit Event Table */}
          <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
            <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Real-Time Audit Trail Events
              </h2>
              <Link
                href="/audit"
                className="text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors inline-flex items-center gap-1"
              >
                <span>View Full Audit Log</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center text-neutral-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
                <p className="text-xs">Loading recent audit events...</p>
              </div>
            ) : auditEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 font-mono">
                No store transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Decision</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Reasoning / Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {auditEvents.slice(0, 5).map((ev) => (
                      <tr key={ev.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-neutral-900 text-[11px]">{ev.action}</td>
                        <td className="py-3 px-4">
                          <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-mono uppercase">
                            {ev.actor_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 font-mono text-neutral-900">
                          ₹{ev.input?.amount ? Number(ev.input.amount).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 max-w-sm truncate" title={ev.reasoning}>
                          {ev.reasoning || 'Evaluated against merchant velocity and category restrictions.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
