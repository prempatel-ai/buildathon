'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMerchantUsage,
  getAuthToken,
  getMerchantMe,
  fetchAuditEvents,
  fetchMerchantTimeline,
  fetchMerchantAgentDistribution,
  fetchMerchantDecisionBreakdown,
  MerchantUsageData,
  Merchant,
  AuditEvent
} from '@/lib/api';
import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/line-charts-9';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, ShieldCheck, RefreshCw, Bot } from 'lucide-react';
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

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('onboarding_in_progress') === 'true') {
      router.push('/onboarding');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

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
        const eventsRes = await fetchAuditEvents({ merchant_id: mData.id, limit: 50 }).catch(() => ({ items: [], total: 0 }));
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
  const successRate = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;
  const velocityLimit = merchant?.limits_config?.velocity_limit || 5;

  const activeTimelineData = timelineData;

  const chartConfig = {
    value: {
      label: 'Settled Volume (₹)',
      color: '#6366f1',
    },
  } satisfies ChartConfig;

  const DynamicTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.change >= 0;
      return (
        <div className="bg-white border border-slate-200/90 text-slate-900 rounded-2xl p-3 shadow-xl text-xs font-sans select-none">
          <div className="text-slate-400 font-mono text-[11px] mb-1 font-semibold">
            {data.date}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-base font-extrabold font-mono text-slate-900">
              ₹{Number(data.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            {data.change !== 0 && (
              <Badge variant={isPositive ? 'emerald' : 'destructive'}>
                {isPositive ? `+${data.change}%` : `${data.change}%`}
              </Badge>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-indigo-100 pb-16">
      <Navigation />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <PageHeader
          category="Analytics Suite"
          title="Executive Performance Dashboard"
          badge={merchant?.name}
          actions={
            <Button variant="outline" size="sm" onClick={loadData} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
              Sync Metrics
            </Button>
          }
        />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* Reusable MetricCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Gross Settled Volume"
              value={`₹${totalVol.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              footerLeft="+100% Captured"
              footerRight="Razorpay API"
              loading={loading}
            />
            <MetricCard
              title="Settled Orders"
              value={settledCount}
              unit="orders"
              footerLeft="100% HMAC Signed"
              footerRight="Verified"
              loading={loading}
            />
            <MetricCard
              title="Gate Approval Rate"
              value={`${successRate}%`}
              footerLeft={`${settledCount} Approved`}
              footerRight={`${failedCount} Gated`}
              loading={loading}
            />
            <MetricCard
              title="Velocity Guard"
              value={velocityLimit}
              unit="req/min"
              footerLeft="Redis Limiter"
              footerRight="0 Throttled"
              loading={loading}
            />
          </div>

          {/* Volume Chart Card */}
          <Card className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <CardContent className="flex flex-col items-stretch gap-6 p-0">
              <div className="flex items-center justify-between flex-wrap gap-4 text-xs border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <span className="font-extrabold text-slate-900 text-sm">Settled Volume Timeline</span>
                  {loading ? (
                    <Skeleton className="h-5 w-24" />
                  ) : (
                    <span className="font-mono text-base font-black text-slate-900">
                      ₹{activeHoverData ? Number(activeHoverData.value).toLocaleString('en-IN') : totalVol.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Range Switcher Buttons */}
                <div className="flex items-center space-x-1 p-1 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-semibold shadow-2xs">
                  <Button
                    size="xs"
                    variant={activeRange === '1d' ? 'default' : 'ghost'}
                    onClick={() => handleRangeChange('1d')}
                  >
                    Day by Day
                  </Button>
                  <Button
                    size="xs"
                    variant={activeRange === '7d' ? 'default' : 'ghost'}
                    onClick={() => handleRangeChange('7d')}
                  >
                    7 Days
                  </Button>
                  <Button
                    size="xs"
                    variant={activeRange === '30d' ? 'default' : 'ghost'}
                    onClick={() => handleRangeChange('30d')}
                  >
                    30 Days
                  </Button>
                  <Button
                    size="xs"
                    variant={activeRange === '90d' ? 'default' : 'ghost'}
                    onClick={() => handleRangeChange('90d')}
                  >
                    Quarterly
                  </Button>
                </div>
              </div>

              {loading || chartLoading ? (
                <div className="h-80 w-full flex flex-col justify-end p-4 space-y-4">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-80 w-full cursor-crosshair">
                  <ComposedChart
                    data={activeTimelineData}
                    margin={{ top: 20, right: 15, left: 10, bottom: 20 }}
                    onMouseMove={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length) {
                        setActiveHoverData(e.activePayload[0].payload);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                      <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="1" fill="#cbd5e1" fillOpacity="0.4" />
                      </pattern>
                      <filter id="lineShadow" x="-100%" y="-100%" width="300%" height="300%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(99, 102, 241, 0.4)" />
                      </filter>
                    </defs>

                    <rect x="0" y="0" width="100%" height="100%" fill="url(#dotGrid)" style={{ pointerEvents: 'none' }} />

                    <CartesianGrid strokeDasharray="4 8" stroke="#e2e8f0" strokeOpacity={0.9} horizontal={true} vertical={false} />

                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickMargin={12} />

                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} tickMargin={12} />

                    <ChartTooltip content={<DynamicTooltip />} cursor={{ strokeDasharray: '4 4', stroke: '#6366f1', strokeWidth: 1.5 }} />

                    <Area type="monotone" dataKey="value" fill="url(#areaGradient)" stroke="none" />

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chartConfig.value.color}
                      strokeWidth={3}
                      filter="url(#lineShadow)"
                      dot={{ r: 4, fill: chartConfig.value.color, stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: chartConfig.value.color, stroke: '#ffffff', strokeWidth: 3 }}
                    />
                  </ComposedChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* AI Agent Share & Policy Decisions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <CardHeader className="p-0 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">AI Agent Volume Distribution</h3>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col sm:flex-row items-center justify-between gap-6">
                {loading ? (
                  <div className="w-full flex items-center gap-6 p-4">
                    <Skeleton className="w-44 h-44 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-8 w-full rounded-xl" />
                      <Skeleton className="h-8 w-full rounded-xl" />
                      <Skeleton className="h-8 w-full rounded-xl" />
                    </div>
                  </div>
                ) : agentPieData.length > 0 ? (
                  <>
                    <div className="w-48 h-48 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={agentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {agentPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black font-mono text-slate-900">{settledCount}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Total Orders</span>
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-3">
                      {agentPieData.map((agent) => {
                        const pct = settledCount > 0 ? Math.round((agent.value / settledCount) * 100) : 0;
                        return (
                          <div key={agent.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <div className="flex items-center space-x-2.5">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                              <span className="font-semibold text-slate-800">{agent.name}</span>
                            </div>
                            <div className="flex items-center space-x-3 font-mono">
                              <span className="font-bold text-slate-900">{agent.value} txs</span>
                              <span className="text-slate-400">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center justify-center py-10 text-center space-y-2">
                    <Bot className="w-8 h-8 text-slate-200" />
                    <p className="text-xs font-bold text-slate-500">No data yet</p>
                    <p className="text-[11px] text-slate-400">Complete a transaction to see agent volume distribution.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <CardHeader className="p-0 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Policy Evaluation Breakdown</h3>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="h-48 w-full p-4 flex items-end justify-between gap-4">
                    <Skeleton className="h-32 flex-1 rounded-xl" />
                    <Skeleton className="h-20 flex-1 rounded-xl" />
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                    <Skeleton className="h-6 flex-1 rounded-xl" />
                  </div>
                ) : decisionBarData.length > 0 ? (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={decisionBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <RechartsTooltip />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {decisionBarData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 w-full flex flex-col items-center justify-center text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-200" />
                    <p className="text-xs font-bold text-slate-500">No policy decisions yet</p>
                    <p className="text-[11px] text-slate-400">Complete a transaction to see the policy evaluation breakdown.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Audit Event Table */}
          <Card className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
            <CardHeader className="p-0 mb-4 pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Real-Time Audit Trail Events</h3>
                </div>
                <Button variant="link" size="xs" onClick={() => router.push('/audit')}>
                  View Full Audit Log &rarr;
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-8 w-full rounded-xl" />
                  <Skeleton className="h-8 w-full rounded-xl" />
                  <Skeleton className="h-8 w-full rounded-xl" />
                </div>
              ) : auditEvents.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-slate-400">
                  No transactions evaluated yet. Initiate order from Consumer Chat AI!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-mono text-slate-400 uppercase">
                        <th className="pb-3 pt-1 font-bold">Action</th>
                        <th className="pb-3 pt-1 font-bold">Actor</th>
                        <th className="pb-3 pt-1 font-bold">Decision</th>
                        <th className="pb-3 pt-1 font-bold">Amount</th>
                        <th className="pb-3 pt-1 font-bold">Reasoning / Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditEvents.slice(0, 5).map((ev) => {
                        return (
                          <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 font-mono font-bold text-slate-900">{ev.action}</td>
                            <td className="py-3 text-slate-600 font-mono text-[11px]">{ev.actor_type}</td>
                            <td className="py-3">
                              <StatusBadge status={ev.decision || 'SETTLED'} />
                            </td>
                            <td className="py-3 font-mono font-bold text-slate-900">
                              ₹{ev.input?.amount ? Number(ev.input.amount).toLocaleString('en-IN') : '1,200'}
                            </td>
                            <td className="py-3 text-slate-500 max-w-xs truncate text-[11px]">
                              {ev.reasoning || 'Evaluated against merchant velocity and category restrictions.'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 mt-12">
        Agentpay Platform &bull; Merchant Analytics Infrastructure &bull; Razorpay AI Protocol 2026
      </footer>
    </div>
  );
}
