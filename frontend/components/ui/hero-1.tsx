'use client';

import React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ShieldCheck,
  User,
  Store,
  Sparkles,
  Lock,
  Cpu,
  Zap,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  customerCtaLabel?: string;
  customerCtaHref?: string;
  merchantCtaLabel?: string;
  merchantCtaHref?: string;
}

export function Hero({
  eyebrow = "AGENTPAY PROTOCOL ACTIVE • RAZORPAY AI BUILDATHON",
  title = "AI agents shop for you — every purchase gated, authorized & audited.",
  subtitle = "The first dual-gated commerce infrastructure connecting autonomous AI buyer agents with Razorpay payments. Consumer spend bounds • Merchant policy enforcement • Append-only audit trail.",
  customerCtaLabel = "I'm a Customer",
  customerCtaHref = "/customer/chat",
  merchantCtaLabel = "I'm a Merchant",
  merchantCtaHref = "/login",
}: HeroProps) {
  return (
    <section
      id="hero"
      className="relative mx-auto w-full pt-16 pb-20 px-6 text-center md:px-8 
      min-h-[calc(100vh-56px)] overflow-hidden flex flex-col items-center justify-between
      bg-[linear-gradient(to_bottom,#ffffff,#f8fafc_50%,#f1f5f9_100%)]"
    >
      {/* 1. Grid Background Overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-70 h-[750px] w-full 
        bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] 
        bg-[size:4rem_4rem] 
        [mask-image:radial-gradient(ellipse_75%_50%_at_50%_0%,#000_65%,transparent_100%)]"
      />

      {/* 2. Radial Accent Glow */}
      <div
        className="absolute left-1/2 top-[-100px] -z-10
        h-[550px] w-[800px] md:h-[650px] md:w-[1100px] lg:h-[750px] lg:w-[1300px] 
        -translate-x-1/2 rounded-[100%] 
        bg-[radial-gradient(closest-side,rgba(99,102,241,0.14)_0%,rgba(168,85,247,0.08)_50%,transparent_100%)] 
        animate-pulse-glow pointer-events-none"
      />

      {/* 3. Main Hero Content Container */}
      <div className="max-w-5xl mx-auto flex flex-col items-center z-10 w-full">
        {/* Eyebrow Badge */}
        {eyebrow && (
          <div className="animate-fade-in mb-8">
            <span
              className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full 
              bg-white/80 border border-indigo-200/80 text-indigo-900 
              text-xs font-mono font-bold uppercase tracking-wider shadow-2xs 
              backdrop-blur-md transition-all hover:border-indigo-300 hover:shadow-xs cursor-default select-none"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{eyebrow}</span>
            </span>
          </div>
        )}

        {/* Title */}
        <h1
          className="animate-fade-in text-balance text-4xl sm:text-5xl md:text-6xl lg:text-7xl 
          font-extrabold tracking-tight text-slate-900 leading-[1.1] max-w-4xl mb-6"
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-in text-balance text-base sm:text-lg md:text-xl 
          text-slate-600 max-w-3xl leading-relaxed font-normal mb-12"
        >
          {subtitle}
        </p>

        {/* Primary Dual Action Cards */}
        <div className="animate-fade-up grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl w-full mb-16">
          {/* Customer Action Card */}
          <Link
            href={customerCtaHref}
            className="group relative flex flex-col items-start p-6 bg-slate-900 hover:bg-slate-800 
            text-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-800 text-left overflow-hidden active:scale-[0.99]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
            <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 font-bold mb-4 group-hover:scale-110 group-hover:border-emerald-500/50 transition-all shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight">{customerCtaLabel}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
              Shop via AI Buyer Agent with live spend limits & tokenized UPI mandates.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-emerald-400 font-mono font-semibold">
              <span>Consumer Portal</span>
              <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-800/80 rounded-md text-[10px]">
                Spend Vault &bull; Auto Buy
              </span>
            </div>
          </Link>

          {/* Merchant Action Card */}
          <Link
            href={merchantCtaHref}
            className="group relative flex flex-col items-start p-6 bg-white hover:bg-slate-50/90 
            text-slate-900 border border-slate-200/90 rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 text-left overflow-hidden active:scale-[0.99]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all pointer-events-none" />
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight">{merchantCtaLabel}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
              Configure products, spend policy caps, agent keys & HMAC webhooks.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between text-[11px] text-indigo-600 font-mono font-semibold">
              <span>Merchant Console</span>
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200/80 rounded-md text-[10px]">
                Policy Engine &bull; Analytics
              </span>
            </div>
          </Link>
        </div>

        {/* 4 Governance Pillars Cards Section */}
        <div className="animate-fade-up w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {/* Pillar 1 */}
          <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold mb-3.5 group-hover:scale-105 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold font-mono text-emerald-600 uppercase tracking-wider mb-1">
              CONSUMER GOVERNANCE
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-1.5 tracking-tight">
              Consumer Authorization
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              UPI Reserve Pay tokenized e-mandates with strict user-defined spend caps & category restrictions.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold mb-3.5 group-hover:scale-105 transition-transform">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-wider mb-1">
              MERCHANT POLICY GATE
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-1.5 tracking-tight">
              Merchant Policy Engine
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Groq Llama 3.3 70B policy evaluation, inventory validation & Redis velocity rate-limiting per agent key.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold mb-3.5 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold font-mono text-amber-600 uppercase tracking-wider mb-1">
              PAYMENT SETTLEMENT
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-1.5 tracking-tight">
              Razorpay Settlement
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Instant Order creation, live signature-verified payment capture & HMAC SHA-256 webhooks.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white/90 backdrop-blur-xs p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold mb-3.5 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold font-mono text-purple-600 uppercase tracking-wider mb-1">
              AUDIT LEDGER
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mb-1.5 tracking-tight">
              Append-Only Audit Trail
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Immutable PostgreSQL audit store tracking decision reasoning across Customer, Agent, and Merchant actors.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Ambient Glow Line */}
      <div className="w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mt-16" />
    </section>
  );
}
