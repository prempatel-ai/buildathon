'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Command,
  Search,
  Check,
  Copy,
  Terminal,
  ExternalLink,
  Lock,
  Shield,
  Zap,
  FileCode2,
  Database,
  ArrowUpRight
} from 'lucide-react';
import CommandSearchModal from '@/components/CommandSearchModal';

export function ModernLandingHero() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'payload' | 'gates' | 'audit'>('gates');
  const [copiedCode, setCopiedCode] = useState(false);

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

  const handleCopyInstall = () => {
    navigator.clipboard.writeText('npm install @agentpay/sdk');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center bg-[#030303] font-sans text-white selection:bg-white selection:text-black pb-32 overflow-hidden">
      
      {/* 
        1. Subdued Background Grid Mesh & Subtle Top Radial Spotlight 
      */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[1000px] bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,rgba(255,255,255,0.06),rgba(0,0,0,0))]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)]" />

      {/* 
        2. Senior Designer Header Navbar (Monochrome High-Contrast)
      */}
      <header className="fixed top-0 z-40 w-full border-b border-white/[0.08] bg-[#030303]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-white font-mono text-[11px] font-black text-black transition-transform group-hover:scale-105">
                AP
              </div>
              <span className="text-xs font-black tracking-tight text-white">Agentpay</span>
            </Link>
            <span className="font-mono text-xs text-neutral-800">/</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
              Razorpay AI Protocol
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs text-neutral-400 font-medium">
            <Link href="/health" className="hover:text-white transition-colors">
              Health Diagnostic
            </Link>
            <Link href="/audit" className="hover:text-white transition-colors">
              Audit Explorer
            </Link>
            <Link href="/webhooks" className="hover:text-white transition-colors">
              Webhooks
            </Link>
            <Link href="/settings" className="hover:text-white transition-colors">
              Policy Engine
            </Link>
          </nav>

          {/* Action Utilities */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center space-x-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-neutral-400 transition-all hover:border-white/20 hover:text-white select-none"
            >
              <Search className="h-3 w-3 text-neutral-500" />
              <span className="hidden sm:inline text-[11px]">Search...</span>
              <kbd className="rounded border border-white/15 bg-neutral-900 px-1 py-0.2 font-mono text-[9px] font-bold text-neutral-400">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/customer/chat"
              className="rounded-md bg-white px-3 py-1 text-xs font-bold text-black transition-colors hover:bg-neutral-200"
            >
              Consumer Chat
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/15 bg-transparent px-3 py-1 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Merchant Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* 
        3. Hero Typography & Pill Badge
      */}
      <main className="z-10 flex w-full max-w-[1020px] flex-col items-center px-6 pt-28 text-center md:pt-36">
        
        {/* Pill Badge */}
        <Link
          href="/health"
          className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] py-1 pl-1 pr-3 text-xs font-mono text-neutral-400 backdrop-blur-md transition-colors hover:border-white/25 hover:bg-white/[0.05]"
        >
          <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-black">
            v1.0 SPEC
          </span>
          <span className="text-[11px] text-neutral-300">Agent-Readable Commerce Infrastructure</span>
          <ChevronRight className="h-3 w-3 text-neutral-500 transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* Headline */}
        <h1 className="mb-6 max-w-4xl text-balance text-5xl font-extrabold tracking-tighter text-white sm:text-7xl lg:text-8xl leading-[1.04]">
          The Payment Layer <br className="hidden sm:block" />
          <span className="text-neutral-500">for Autonomous AI Agents.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-[620px] text-balance text-sm sm:text-base leading-relaxed text-neutral-400 font-normal">
          Agentpay provides tokenized consumer spend mandates and merchant policy enforcement for AI buyer agents executing live settlements on Razorpay.
        </p>

        {/* Action Buttons */}
        <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row mb-14">
          <Link
            href="/customer/chat"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white px-5 text-xs font-bold text-black transition-all hover:bg-neutral-200 active:scale-[0.98] sm:w-auto"
          >
            Launch Consumer Agent
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-transparent px-5 text-xs font-semibold text-white transition-all hover:bg-white/[0.08] active:scale-[0.98] sm:w-auto"
          >
            Merchant Console
          </Link>
          <button
            onClick={handleCopyInstall}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-neutral-900/80 px-4 font-mono text-xs text-neutral-400 transition-colors hover:text-white sm:w-auto"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>npm install @agentpay/sdk</span>
          </button>
        </div>

        {/* Technical Protocol Spec Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 w-full max-w-3xl border-y border-white/[0.08] py-5 mb-16 font-mono text-left text-xs text-neutral-400">
          <div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">LATENCY GUARANTEE</div>
            <div className="font-bold text-white text-sm">&lt; 80ms Evaluation</div>
            <div className="text-[10px] text-neutral-500">Groq Llama 3.3 70B</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">SECURITY MANDATE</div>
            <div className="font-bold text-white text-sm">Dual-Gated Auth</div>
            <div className="text-[10px] text-neutral-500">Customer + Merchant Bounds</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">SETTLEMENT ENGINE</div>
            <div className="font-bold text-white text-sm">Razorpay Live</div>
            <div className="text-[10px] text-neutral-500">HMAC SHA-256 Verified</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">AUDIT ACCOUNTABILITY</div>
            <div className="font-bold text-white text-sm">3-Actor Ledger</div>
            <div className="text-[10px] text-neutral-500">Append-Only PostgreSQL</div>
          </div>
        </div>

        {/* 
          4. Senior Developer Inspector Window (Interactive Bento)
        */}
        <div className="w-full max-w-4xl rounded-xl border border-white/10 bg-[#080808] text-left shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-4 py-2.5">
            <div className="flex items-center space-x-2">
              <div className="flex gap-1.5 mr-2">
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              </div>
              <span className="font-mono text-xs text-neutral-400 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-neutral-400" />
                <span>Protocol Execution Trace & Audit Log</span>
              </span>
            </div>

            {/* View Tabs */}
            <div className="flex items-center space-x-1 bg-black p-0.5 rounded border border-white/10 font-mono text-[10px]">
              <button
                onClick={() => setActiveTab('gates')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'gates' ? 'bg-white text-black font-bold' : 'text-neutral-500 hover:text-white'
                }`}
              >
                Dual Gate Pipeline
              </button>
              <button
                onClick={() => setActiveTab('payload')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'payload' ? 'bg-white text-black font-bold' : 'text-neutral-500 hover:text-white'
                }`}
              >
                API Request
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeTab === 'audit' ? 'bg-white text-black font-bold' : 'text-neutral-500 hover:text-white'
                }`}
              >
                Immutable Audit
              </button>
            </div>
          </div>

          {/* Window Body */}
          <div className="p-5 font-mono text-xs leading-relaxed bg-[#050505] min-h-[240px]">
            {activeTab === 'gates' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-neutral-400 pb-2 border-b border-white/[0.06]">
                  <span>REQUEST: <span className="text-white font-bold">POST /agent/chat</span></span>
                  <span className="text-[10px] text-neutral-500">LATENCY: 74ms</span>
                </div>

                <div className="space-y-2 text-neutral-300">
                  <div className="flex items-start gap-2">
                    <span className="text-neutral-500 font-bold">[1/4]</span>
                    <div>
                      <span className="text-white font-bold">Customer Spend Authorization:</span> <span className="text-emerald-400 font-bold">ALLOW</span>
                      <p className="text-[11px] text-neutral-500">Spend Limit: ₹5,000.00 &bull; Requested Order: ₹2,499.00 &bull; Remaining Balance: ₹2,501.00</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-neutral-500 font-bold">[2/4]</span>
                    <div>
                      <span className="text-white font-bold">Merchant Policy Engine:</span> <span className="text-emerald-400 font-bold">ALLOW</span>
                      <p className="text-[11px] text-neutral-500">Engine: Groq Llama 3.3 70B &bull; Max Item Cap: ₹10,000.00 &bull; Category: Headphones (Allowed)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-neutral-500 font-bold">[3/4]</span>
                    <div>
                      <span className="text-white font-bold">Redis Sliding Window Velocity:</span> <span className="text-emerald-400 font-bold">PASSED</span>
                      <p className="text-[11px] text-neutral-500">Agent Key: ag_8f29... &bull; Window Rate: 3/5 requests/min</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-neutral-500 font-bold">[4/4]</span>
                    <div>
                      <span className="text-white font-bold">Razorpay Live Settlement:</span> <span className="text-emerald-400 font-bold">SETTLED</span>
                      <p className="text-[11px] text-neutral-500">Razorpay Order: order_P8x9kL2mA0z &bull; Payment Capture: pay_Q9y0nM3nB1x</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payload' && (
              <div className="space-y-2 text-neutral-300">
                <p className="text-neutral-500">// Agent API Request Payload</p>
                <pre className="text-neutral-300 p-3 bg-black rounded border border-white/[0.08]">
{`POST /agent/chat HTTP/1.1
Host: api.agentpay.dev
Authorization: Bearer agent_key_8f29c1d0a7b4
Content-Type: application/json

{
  "merchant_id": "fe9038dc-5d00-4171-a9d6-b292e5dae054",
  "customer_id": "cust_99a80b7c",
  "prompt": "Buy boAt Rockerz 450 Wireless Headphones under ₹2,500"
}`}
                </pre>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-2 text-neutral-300">
                <p className="text-neutral-500">// Append-Only PostgreSQL Audit Ledger Record</p>
                <pre className="text-neutral-300 p-3 bg-black rounded border border-white/[0.08]">
{`{
  "audit_event_id": "evt_7f8a9b0c-1d2e-3f4a",
  "merchant_id": "fe9038dc-5d00-4171-a9d6-b292e5dae054",
  "actor_type": "agent",
  "actor_id": "ag_8f29c1d0a7b4",
  "action": "payment_order_settled",
  "decision": "ALLOW",
  "reasoning": "Dual-gated check passed: Customer spend limit valid (₹2499 <= ₹5000), Merchant max_amount valid (₹2499 <= ₹10000). Payment captured via Razorpay ID pay_Q9y0nM3nB1x.",
  "created_at": "2026-08-30T00:35:12Z"
}`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 
          5. Deep Architecture Specifications (The 4 Pillars - Monochrome Senior Layout)
        */}
        <div className="mt-24 w-full">
          <div className="text-left mb-10 border-b border-white/[0.08] pb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
              PROTOCOL ARCHITECTURE
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Dual-Gated Infrastructure Specifications
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              Four fundamental architectural pillars ensuring total control, zero fraud, and complete financial auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Pillar 01 */}
            <div className="rounded-xl border border-white/[0.08] bg-[#060606] p-6 transition-colors hover:border-white/20">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-neutral-500">01 / CONSUMER SPEND VAULT</span>
                <span className="px-2 py-0.5 rounded border border-white/10 font-mono text-[9px] text-neutral-400 uppercase">
                  UPI Mandate Gated
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Consumer Spend Authorization</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                Tokenized UPI e-mandates with strict user-defined spend caps, rolling period limits, and allowed item category rules. Buyers set their exact authorization bounds before delegating purchases to any AI agent.
              </p>
            </div>

            {/* Pillar 02 */}
            <div className="rounded-xl border border-white/[0.08] bg-[#060606] p-6 transition-colors hover:border-white/20">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-neutral-500">02 / MERCHANT POLICY ENGINE</span>
                <span className="px-2 py-0.5 rounded border border-white/10 font-mono text-[9px] text-neutral-400 uppercase">
                  Groq Llama 3.3 70B
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Bounded Policy Engine</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                High-throughput policy enforcement powered by Groq Llama 3.3 70B LLM checks. Evaluates per-merchant max transaction limits, blocked categories, real-time catalog stock, and Redis sliding-window velocity rate limits per agent key.
              </p>
            </div>

            {/* Pillar 03 */}
            <div className="rounded-xl border border-white/[0.08] bg-[#060606] p-6 transition-colors hover:border-white/20">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-neutral-500">03 / SETTLEMENT ENGINE</span>
                <span className="px-2 py-0.5 rounded border border-white/10 font-mono text-[9px] text-neutral-400 uppercase">
                  Razorpay Live Capture
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Razorpay Settlement & Webhooks</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                Instant Razorpay Order creation and independent 2-step payment capture verification. Fires real-time HMAC SHA-256 signed HTTP POST webhooks to merchant endpoints with automatic 3-attempt retry exponential backoff.
              </p>
            </div>

            {/* Pillar 04 */}
            <div className="rounded-xl border border-white/[0.08] bg-[#060606] p-6 transition-colors hover:border-white/20">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-neutral-500">04 / ACCOUNTABILITY</span>
                <span className="px-2 py-0.5 rounded border border-white/10 font-mono text-[9px] text-neutral-400 uppercase">
                  PostgreSQL Ledger
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Append-Only Audit Trail</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-normal">
                Immutable, append-only ledger recording full intent, decision reasoning, and transaction parameters across Customer, Agent, and Merchant actor types. Complete regulatory compliance and debugging visibility.
              </p>
            </div>
          </div>
        </div>

        {/* 
          6. Developer Integration Callout
        */}
        <div className="mt-20 w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#0a0a0a] to-[#040404] p-8 text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              READY FOR INTEGRATION
            </div>
            <h3 className="text-xl font-bold text-white">Integrate Agentpay in under 5 minutes.</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-lg">
              Explore the complete OpenAPI documentation, test agent key generation, and start accepting autonomous AI payments.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-neutral-200"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/health"
              className="flex items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span>System Health</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
            </Link>
          </div>
        </div>
      </main>

      {/* Command Search Modal Overlay */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </section>
  );
}
