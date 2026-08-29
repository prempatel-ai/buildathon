'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Command,
  Search,
  ShieldCheck,
  Zap,
  Lock,
  Activity,
  Terminal,
  Code2,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import CommandSearchModal from '@/components/CommandSearchModal';

export function ModernLandingHero() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trace' | 'policy' | 'webhook'>('trace');

  // Global ⌘K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center bg-black font-sans text-white selection:bg-white selection:text-black pb-28 overflow-hidden">
      {/* 
        1. Ambient Spotlight & Grid Backdrop
      */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.18),rgba(0,0,0,0))]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* 
        2. Sleek Dark Header Navbar
      */}
      <header className="fixed top-0 z-40 w-full border-b border-white/[0.08] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white font-mono text-xs font-black text-black transition-transform group-hover:scale-105">
                AP
              </div>
              <span className="text-sm font-black tracking-tight text-white">Agentpay</span>
            </Link>
            <span className="font-mono text-xs text-neutral-700">/</span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Razorpay AI Protocol
            </span>
          </div>

          {/* Action Utilities */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center space-x-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-400 transition-all hover:border-white/30 hover:bg-white/[0.08] hover:text-white select-none shadow-2xs"
            >
              <Search className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Search protocol...</span>
              <kbd className="rounded border border-white/20 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-neutral-300">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/customer/chat"
              className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-black transition-all hover:bg-neutral-200 active:scale-95 shadow-xs"
            >
              Consumer Chat AI
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/[0.15] bg-transparent px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/[0.08] active:scale-95"
            >
              Merchant Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="z-10 flex w-full max-w-[1080px] flex-col items-center px-6 pt-32 text-center md:pt-40">
        
        {/* Glowing Pill Badge */}
        <Link
          href="/health"
          className="group mb-8 inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] p-1.5 pr-4 text-xs font-medium text-neutral-300 backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-black">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            PROTOCOL
          </span>
          <span className="font-mono text-xs">Razorpay AI Protocol v1.0 Active</span>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-500 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Headline */}
        <h1 className="mb-6 max-w-4xl text-balance bg-gradient-to-b from-white via-white/95 to-neutral-500 bg-clip-text text-5xl font-extrabold tracking-tighter text-transparent sm:text-7xl lg:text-8xl leading-[1.05]">
          AI agents shop for you. <br />
          <span className="bg-gradient-to-r from-indigo-300 via-neutral-400 to-neutral-600 bg-clip-text text-transparent">
            Gated. Authorized. Audited.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-[680px] text-balance text-base leading-relaxed text-neutral-400 sm:text-lg font-normal">
          The first dual-gated commerce infrastructure connecting autonomous AI buyer agents with Razorpay payments. Consumer spend bounds &bull; Merchant policy enforcement &bull; Append-only audit trail.
        </p>

        {/* Call to Actions */}
        <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row mb-12">
          <Link
            href="/customer/chat"
            className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-black text-black transition-all hover:bg-neutral-100 active:scale-[0.98] sm:w-auto shadow-[0_0_30px_rgba(255,255,255,0.18)]"
          >
            <span>I'm a Customer</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-7 text-sm font-bold text-white backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/[0.08] active:scale-[0.98] sm:w-auto"
          >
            <span>I'm a Merchant</span>
          </Link>
        </div>

        {/* Micro Metric Trust Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl w-full text-center border-y border-white/[0.08] py-4 mb-16 font-mono text-xs text-neutral-400">
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>&lt;100ms Policy Latency</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Dual-Gated Protocol</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>Razorpay Signature Live</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>3-Actor Audit Ledger</span>
          </div>
        </div>

        {/* Interactive Bento Terminal / Developer Inspector */}
        <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-left backdrop-blur-2xl">
          {/* Window Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className="flex gap-1.5 mr-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                <span>Agentpay Protocol Inspector</span>
              </span>
            </div>

            {/* Interactive View Tabs */}
            <div className="flex items-center space-x-1 bg-black/60 p-1 rounded-lg border border-white/[0.08] text-[11px] font-mono">
              <button
                onClick={() => setActiveTab('trace')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'trace'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                01. Execution Trace
              </button>
              <button
                onClick={() => setActiveTab('policy')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'policy'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                02. Policy Engine
              </button>
              <button
                onClick={() => setActiveTab('webhook')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'webhook'
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                03. HMAC Webhook
              </button>
            </div>
          </div>

          {/* Interactive Code Window Content */}
          <div className="p-6 font-mono text-xs leading-relaxed text-neutral-300 min-h-[220px] bg-[#050505] overflow-x-auto">
            {activeTab === 'trace' && (
              <div className="space-y-2.5 animate-fade-in">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="text-emerald-400">~</span>
                  <span>POST /agent/chat (Autonomous Shopping Workflow)</span>
                </div>
                <div className="space-y-1.5 text-neutral-400 pl-3 border-l border-neutral-800">
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span>Customer Spend Authorization: <span className="text-white font-semibold">ALLOW</span> (Limit: ₹5,000.00 | Remaining: ₹3,800.00)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span>Merchant Policy Engine: <span className="text-white font-semibold">ALLOW</span> (Groq Llama 3.3 70B | Max Order: ₹10,000.00)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span>Redis Velocity Limiter: <span className="text-white font-semibold">PASSED</span> (Rate: 3/5 req/min)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span>Razorpay Order Created: <span className="text-indigo-300">order_P8x9kL2mA0z</span> (Amount: ₹2,499.00)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span>Razorpay Payment Verified: <span className="text-emerald-300">pay_Q9y0nM3nB1x</span> (Captured & Settled)</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span>Append-Only Audit Ledger: Recorded <span className="text-purple-300">event_89f02a</span> (3-Actor Immutable Ledger)</span>
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold">Execution Complete. Status: SETTLED</span>
                </div>
              </div>
            )}

            {activeTab === 'policy' && (
              <div className="space-y-2 animate-fade-in text-neutral-300">
                <p className="text-neutral-500">// Groq Llama 3.3 70B Bounded Policy Check</p>
                <p><span className="text-purple-400">const</span> decision = <span className="text-purple-400">await</span> PolicyEngine.evaluate({`{`}</p>
                <p className="pl-4">merchant_id: <span className="text-emerald-300">"m_boat_store"</span>,</p>
                <p className="pl-4">proposed_item: <span className="text-emerald-300">"boAt Rockerz 450"</span>,</p>
                <p className="pl-4">price: <span className="text-amber-300">1200.00</span>,</p>
                <p className="pl-4">max_allowed_price: <span className="text-amber-300">10000.00</span></p>
                <p>{`}`});</p>
                <p className="text-emerald-400 font-bold">// Response: {`{ decision: "ALLOW", latency_ms: 68, engine: "groq-llama-3.3-70b" }`}</p>
              </div>
            )}

            {activeTab === 'webhook' && (
              <div className="space-y-2 animate-fade-in text-neutral-300">
                <p className="text-neutral-500">// HMAC SHA-256 Signed Event Payload</p>
                <p className="text-indigo-400">POST https://merchant-store.com/api/webhooks/agentpay</p>
                <p className="text-neutral-400">X-Agentpay-Signature: t=1772390123,v1=9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c</p>
                <pre className="text-emerald-300 p-2 bg-black/60 rounded border border-white/10 mt-1">
{`{
  "event": "payment.settled",
  "payment_id": "pay_Q9y0nM3nB1x",
  "order_id": "order_P8x9kL2mA0z",
  "amount": 2499.00,
  "status": "settled"
}`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 4 Governance Pillars Section Cards */}
        <div className="mt-20 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {/* Pillar 1 */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#080808] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 shadow-inner group-hover:scale-105 transition-transform">
              <Lock className="h-5 w-5" />
            </div>
            <div className="font-mono text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-1">
              01 / CONSUMER GOVERNANCE
            </div>
            <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">Consumer Authorization</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              UPI Reserve Pay tokenized e-mandates with strict user-defined spend caps & category restrictions.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#080808] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 shadow-inner group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="font-mono text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-1">
              02 / MERCHANT POLICY GATE
            </div>
            <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">Merchant Policy Engine</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Groq Llama 3.3 70B policy checks & Redis velocity rate-limiting per agent key.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#080808] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 shadow-inner group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5" />
            </div>
            <div className="font-mono text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">
              03 / PAYMENT SETTLEMENT
            </div>
            <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">Razorpay Settlement</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Instant Razorpay Order creation, signature-verified capture & HMAC webhooks.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="group relative rounded-2xl border border-white/10 bg-[#080808] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-950/80 text-purple-400 border border-purple-800/60 shadow-inner group-hover:scale-105 transition-transform">
              <Activity className="h-5 w-5" />
            </div>
            <div className="font-mono text-[10px] font-black uppercase tracking-wider text-purple-400 mb-1">
              04 / AUDIT LEDGER
            </div>
            <h3 className="text-base font-extrabold text-white mb-2 tracking-tight">Append-Only Audit Trail</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Immutable PostgreSQL audit store tracking reasoning across Customer, Agent & Merchant.
            </p>
          </div>
        </div>
      </main>

      {/* Command Search Modal Overlay */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </section>
  );
}
