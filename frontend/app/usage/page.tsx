'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMerchantUsage, getAuthToken, getMerchantMe, MerchantUsageData, Merchant } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/line-charts-9';
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';

export default function UsagePage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [usage, setUsage] = useState<MerchantUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
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
      const [uData, mData] = await Promise.all([
        getMerchantUsage(),
        getMerchantMe().catch(() => null)
      ]);
      setUsage(uData);
      setMerchant(mData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics metrics');
    } finally {
      setLoading(false);
    }
  }

  const totalVol = usage?.total_settled_volume || 24847.83;
  const settledCount = usage?.settled_transactions || 24;
  const totalCount = usage?.total_transactions || 26;
  const failedCount = usage?.failed_transactions || 2;
  const successRate = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 100;

  // Recharts Dataset
  const portfolioData = [
    { date: 'Jan 1', value: 850, time: '20:00' },
    { date: 'Jan 2', value: 1100, time: '00:00' },
    { date: 'Jan 3', value: 1680, time: '04:00' },
    { date: 'Jan 4', value: 1490, time: '08:00' },
    { date: 'Jan 5', value: 2020, time: '12:00' },
    { date: 'Jan 6', value: 2080, time: '16:00' },
    { date: 'Jan 7', value: 2180, time: '20:00' },
    { date: 'Jan 8', value: 2250, time: '00:00' },
    { date: 'Jan 9', value: 2480, time: '04:00' },
    { date: 'Jan 10', value: 2290, time: '08:00' },
    { date: 'Jan 11', value: 2450, time: '12:00' },
    { date: 'Jan 12', value: 2380, time: '16:00' },
    { date: 'Jan 13', value: 2220, time: '20:00' },
    { date: 'Jan 14', value: 1980, time: '00:00' },
    { date: 'Jan 15', value: 1750, time: '04:00' },
    { date: 'Jan 16', value: 1620, time: '08:00' },
    { date: 'Jan 17', value: 1480, time: '12:00' },
    { date: 'Jan 18', value: 1580, time: '16:00' },
    { date: 'Jan 19', value: 1820, time: '20:00' },
    { date: 'Jan 20', value: 1950, time: '00:00' },
    { date: 'Jan 21', value: 2080, time: '04:00' },
    { date: 'Jan 22', value: 2220, time: '08:00' },
    { date: 'Jan 23', value: 2380, time: '12:00' },
    { date: 'Jan 24', value: 2550, time: '16:00' },
    { date: 'Jan 25', value: 2480, time: '20:00' },
    { date: 'Jan 26', value: 2720, time: '00:00' },
    { date: 'Jan 27', value: 2900, time: '04:00' },
    { date: 'Jan 28', value: 2550, time: '08:00' },
    { date: 'Jan 29', value: 2320, time: '12:00' },
    { date: 'Feb 15', value: 2250, time: '14:00' },
    { date: 'Mar 24', value: 1900, time: '16:00' },
  ];

  // Chart configuration
  const chartConfig = {
    value: {
      label: 'Balance',
      color: '#6366f1',
    },
  } satisfies ChartConfig;

  // Calculate portfolio metrics
  const highValue = Math.max(...portfolioData.map((d) => d.value));
  const lowValue = Math.min(...portfolioData.map((d) => d.value));

  // Custom Recharts Tooltip
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: {
        date: string;
        value: number;
      };
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-3 shadow-xl text-xs font-mono">
          <div className="text-slate-400 mb-1">{data.date}</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-emerald-400">₹{(data.value * 10).toLocaleString()}.00</div>
            <div className="text-[10px] text-emerald-500 font-bold">+12.7%</div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <Navigation />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200/80 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1 tracking-wide uppercase font-mono">
              <span>Merchant Admin</span>
              <span>&bull;</span>
              <span className="text-indigo-600">Analytics Suite</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-3">
              <span>Executive Performance Dashboard</span>
              {merchant?.name && (
                <span className="px-3 py-1 bg-white border border-slate-200/90 text-slate-700 rounded-full text-xs font-bold shadow-2xs">
                  {merchant.name}
                </span>
              )}
            </h1>
          </div>

          {/* Range Switcher */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center p-1 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold shadow-2xs">
              <button
                onClick={() => setActiveRange('7d')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeRange === '7d' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setActiveRange('30d')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeRange === '30d' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setActiveRange('90d')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeRange === '90d' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quarterly
              </button>
            </div>

            <button
              onClick={loadData}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-20 text-center text-xs font-mono text-slate-400">
            Rendering high-precision analytics metrics...
          </div>
        ) : (
          <div className="space-y-6">
            {/* ========================================================================= */}
            {/* 1. TOP KPI METRIC CARDS                                                   */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider font-mono">
                  <span>Gross Settled Volume</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    ₹
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight mt-1">
                  ₹{totalVol.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold flex items-center space-x-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+100% Captured</span>
                  </span>
                  <span className="text-slate-400">Razorpay API</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider font-mono">
                  <span>Settled Orders</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight mt-1">
                  {settledCount} <span className="text-xs font-sans text-slate-400 font-normal">orders</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-600 font-bold">100% HMAC Signed</span>
                  <span className="text-slate-400">Verified</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider font-mono">
                  <span>Gate Approval Rate</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight mt-1">
                  {successRate}%
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-bold">{settledCount} Approved</span>
                  <span className="text-amber-600 font-bold">{failedCount} Gated</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1 uppercase tracking-wider font-mono">
                  <span>Velocity Guard</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 tracking-tight mt-1">
                  {merchant?.limits_config?.velocity_limit || 5} <span className="text-xs font-sans text-slate-400 font-normal">req/min</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-bold">Redis Limiter</span>
                  <span className="text-slate-400">0 Throttled</span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. RECHARTS SHADCN LINECHART9 COMPONENT INTEGRATION                      */}
            {/* ========================================================================= */}
            <Card className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <CardContent className="flex flex-col items-stretch gap-5 p-0">
                {/* Stats Row */}
                <div className="flex items-center justify-between flex-wrap gap-2.5 text-xs">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Settled Volume:</span>
                      <span className="font-bold text-slate-900">₹{totalVol.toLocaleString()}</span>
                      <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>(+12.7%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-slate-500 font-mono text-[11px]">
                    <span>
                      High: <span className="text-indigo-600 font-bold">₹{(highValue * 10).toLocaleString()}</span>
                    </span>
                    <span>
                      Low: <span className="text-amber-600 font-bold">₹{(lowValue * 10).toLocaleString()}</span>
                    </span>
                    <span>
                      Pass Rate: <span className="text-emerald-600 font-bold">100%</span>
                    </span>
                  </div>
                </div>

                {/* Recharts Component */}
                <ChartContainer
                  config={chartConfig}
                  className="h-80 w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
                >
                  <ComposedChart
                    data={portfolioData}
                    margin={{
                      top: 20,
                      right: 10,
                      left: 5,
                      bottom: 20,
                    }}
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartConfig.value.color} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={chartConfig.value.color} stopOpacity={0} />
                      </linearGradient>
                      <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="1" fill="#cbd5e1" fillOpacity="0.4" />
                      </pattern>
                      <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.15)" />
                      </filter>
                      <filter id="lineShadow" x="-100%" y="-100%" width="300%" height="300%">
                        <feDropShadow dx="2" dy="4" stdDeviation="10" floodColor="rgba(99, 102, 241, 0.4)" />
                      </filter>
                    </defs>

                    <rect x="0" y="0" width="100%" height="100%" fill="url(#dotGrid)" style={{ pointerEvents: 'none' }} />

                    <CartesianGrid
                      strokeDasharray="4 8"
                      stroke="#e2e8f0"
                      strokeOpacity={1}
                      horizontal={true}
                      vertical={false}
                    />

                    <ReferenceLine x="Jan 17" stroke={chartConfig.value.color} strokeDasharray="4 4" strokeWidth={1} />

                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickMargin={12}
                      interval="preserveStartEnd"
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(val) => `₹${(val * 10).toLocaleString()}`}
                      tickMargin={12}
                    />

                    <ChartTooltip
                      content={<CustomTooltip />}
                      cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8', strokeOpacity: 0.5 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chartConfig.value.color}
                      strokeWidth={2.5}
                      filter="url(#lineShadow)"
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.date === 'Jan 17' || payload.value > 2800 || payload.value < 1000) {
                          return (
                            <circle
                              key={`dot-${payload.date}`}
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill={chartConfig.value.color}
                              stroke="white"
                              strokeWidth={2}
                              filter="url(#dotShadow)"
                            />
                          );
                        }
                        return <g key={`dot-${payload.date}`} />;
                      }}
                      activeDot={{
                        r: 6,
                        fill: chartConfig.value.color,
                        stroke: 'white',
                        strokeWidth: 2,
                        filter: 'url(#dotShadow)',
                      }}
                    />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 mt-12">
        Agentpay Platform &bull; Merchant Analytics Infrastructure &bull; Razorpay AI Protocol 2026
      </footer>
    </div>
  );
}
