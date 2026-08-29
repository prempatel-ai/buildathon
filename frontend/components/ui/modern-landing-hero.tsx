'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Command, Search, ShieldCheck, Zap, Lock, Activity } from 'lucide-react';
import CommandSearchModal from '@/components/CommandSearchModal';

export function ModernLandingHero() {
  const [searchOpen, setSearchOpen] = useState(false);

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
    <section className="relative flex min-h-screen w-full flex-col items-center bg-black font-sans text-white selection:bg-white selection:text-black pb-24">
      {/* 
        Ultra-minimal Dark Navigation Header
      */}
      <header className="fixed top-0 z-40 w-full border-b border-white/[0.08] bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white font-mono text-xs font-black text-black transition-colors group-hover:bg-neutral-200">
                AP
              </div>
              <span className="text-sm font-black tracking-tight text-white">Agentpay</span>
            </Link>
            <span className="font-mono text-xs text-neutral-600">/</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400">
              Razorpay AI Protocol
            </span>
          </div>

          {/* Action Utilities */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center space-x-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white select-none"
            >
              <Search className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Search app...</span>
              <kbd className="rounded border border-white/20 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-neutral-300">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/customer/chat"
              className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-extrabold text-black transition-colors hover:bg-neutral-200"
            >
              Consumer Chat AI
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/[0.15] bg-transparent px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/[0.08]"
            >
              Merchant Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="z-10 flex w-full max-w-[1050px] flex-col items-center px-6 pt-32 text-center md:pt-40">
        {/* Pill Badge */}
        <Link
          href="/health"
          className="group mb-8 flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-xs font-medium text-neutral-400 backdrop-blur-md transition-colors hover:bg-white/[0.06]"
        >
          <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-black">
            PROTOCOL
          </span>
          <span className="font-mono">Razorpay AI Protocol v1.0</span>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-500 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Headline */}
        <h1 className="mb-6 max-w-4xl text-balance text-5xl font-medium tracking-tighter text-white sm:text-7xl lg:text-8xl">
          AI agents shop for you. <br />
          <span className="text-neutral-500">Gated. Authorized. Audited.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-[660px] text-balance text-base leading-relaxed text-neutral-400 sm:text-lg">
          The first dual-gated commerce infrastructure connecting autonomous AI buyer agents with Razorpay payments. Consumer spend bounds &bull; Merchant policy enforcement &bull; Append-only audit trail.
        </p>

        {/* Call to Actions */}
        <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/customer/chat"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-black transition-all hover:bg-neutral-200 active:scale-[0.98] sm:w-auto"
          >
            I'm a Customer
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center rounded-md border border-white/[0.15] bg-transparent px-6 text-sm font-semibold text-white transition-all hover:bg-white/[0.08] active:scale-[0.98] sm:w-auto"
          >
            I'm a Merchant
          </Link>
        </div>

        {/* Mock UI Component / Bento Terminal Window */}
        <div className="mt-16 w-full max-w-4xl rounded-t-2xl border border-white/[0.12] bg-[#050505] shadow-2xl overflow-hidden text-left">
          {/* Mock Window Titlebar */}
          <div className="flex items-center gap-4 border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* Mock Command Palette */}
            <button
              onClick={() => setSearchOpen(true)}
              className="mx-auto flex h-7 w-full max-w-md items-center gap-2 rounded-md border border-white/[0.08] bg-black/60 px-2.5 text-xs text-neutral-400 hover:border-white/20 transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-neutral-500" />
              <span>Search agent keys, spend limits, audit events...</span>
              <div className="ml-auto flex items-center gap-0.5 opacity-60 font-mono text-[10px]">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            </button>
          </div>

          {/* Terminal / Live Execution Log Mock */}
          <div className="p-6 font-mono text-xs leading-relaxed text-neutral-300 space-y-2.5 bg-[#050505] overflow-x-auto">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="text-emerald-400">~</span>
              <span>POST /agent/chat (Autonomous AI Buyer Workflow)</span>
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
        </div>

        {/* 4 Governance Pillars Cards Section */}
        <div className="mt-20 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="rounded-2xl border border-white/[0.08] bg-[#080808] p-5 transition-all hover:border-white/[0.2]">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <Lock className="h-4 w-4" />
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
              01 / CONSUMER GOVERNANCE
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Consumer Authorization</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              UPI Reserve Pay tokenized e-mandates with strict user spend caps & category bounds.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#080808] p-5 transition-all hover:border-white/[0.2]">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">
              02 / MERCHANT POLICY GATE
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Merchant Policy Engine</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Groq Llama 3.3 70B policy checks & Redis velocity rate-limiting per agent key.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#080808] p-5 transition-all hover:border-white/[0.2]">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/60">
              <Zap className="h-4 w-4" />
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              03 / PAYMENT SETTLEMENT
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Razorpay Settlement</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Instant Razorpay Order creation, signature-verified capture & HMAC webhooks.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#080808] p-5 transition-all hover:border-white/[0.2]">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/60">
              <Activity className="h-4 w-4" />
            </div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">
              04 / AUDIT LEDGER
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Append-Only Audit Trail</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
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
