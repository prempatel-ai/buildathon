'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Search,
  Check,
  Copy,
  Terminal,
  Play,
  RotateCcw,
  Shield,
  Lock,
  Zap,
  Activity,
  ArrowUpRight,
  ChevronDown,
  Cpu,
  Server,
  Key,
  Globe,
  HelpCircle,
  Code
} from 'lucide-react';
import CommandSearchModal from '@/components/CommandSearchModal';

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    q: "How does the Dual-Gated Protocol prevent unauthorized spending?",
    a: "Agentpay enforces security at two independent layers: first, the Consumer Spend Vault validates that the purchase fits within the buyer's tokenized limit and category rules; second, the Merchant Policy Engine evaluates per-merchant caps, catalog availability, and velocity limits via Groq Llama 3.3 70B before any Razorpay order is initialized."
  },
  {
    q: "How does Razorpay payment capture settlement work?",
    a: "Transactions follow a strict 2-step verification. The Agentpay engine creates a Razorpay Order and verifies payment capture directly against Razorpay's API using signature verification before marking the status as SETTLED."
  },
  {
    q: "What happens if an external agent attempts rapid automated requests?",
    a: "Every agent key is rate-limited via a Redis sliding-window velocity limiter. If an agent exceeds the merchant's configured velocity limit (e.g. >5 requests/min), HTTP 429 Too Many Requests is returned immediately without hitting the LLM."
  },
  {
    q: "How are webhooks secured for merchant backend integrations?",
    a: "Webhooks are signed using HMAC SHA-256 with header `X-Agentpay-Signature: t=timestamp,v1=signature`. Merchant backends can verify payloads using their shared secret. Failed deliveries automatically retry with exponential backoff (3 attempts)."
  }
];

export function ModernLandingHero() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gates' | 'payload' | 'audit'>('gates');
  const [copiedCode, setCopiedCode] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Live Interactive Simulation State inside Inspector Terminal
  const [simStep, setSimStep] = useState<number>(4);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

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

  const runLiveSimulation = () => {
    if (isSimulating) return;
    setActiveTab('gates');
    setIsSimulating(true);
    setSimStep(0);

    const stepTimeouts = [
      setTimeout(() => setSimStep(1), 350),
      setTimeout(() => setSimStep(2), 750),
      setTimeout(() => setSimStep(3), 1150),
      setTimeout(() => {
        setSimStep(4);
        setIsSimulating(false);
      }, 1550),
    ];

    return () => stepTimeouts.forEach(clearTimeout);
  };

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center bg-[#090d16] font-sans text-slate-100 selection:bg-white selection:text-black pb-32">
      
      {/* 
        1. Clean Header Navbar
      */}
      <header className="fixed top-0 z-40 w-full border-b border-slate-800/90 bg-[#090d16]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white font-mono text-xs font-black text-slate-900 shadow-sm transition-transform group-hover:scale-105">
                AP
              </div>
              <span className="text-sm font-black tracking-tight text-white">Agentpay</span>
            </Link>
            <span className="font-mono text-xs text-slate-600">/</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              Razorpay AI Protocol
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs text-slate-300 font-semibold font-sans">
            <a href="#inspector" className="hover:text-white transition-colors">
              Protocol Inspector
            </a>
            <a href="#workflow" className="hover:text-white transition-colors">
              Workflow
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#api-ref" className="hover:text-white transition-colors">
              API Specs
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action Utilities */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-slate-500 hover:text-white select-none"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline font-mono">Search...</span>
              <kbd className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/customer/chat"
              className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-black text-slate-900 transition-all hover:bg-slate-200 active:scale-95 shadow-sm"
            >
              Consumer Chat AI
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-1.5 text-xs font-bold text-slate-200 transition-all hover:border-slate-500 hover:bg-slate-800 hover:text-white active:scale-95"
            >
              Merchant Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* 
        2. Main Hero Section (High Contrast, Ultra-Readable)
      */}
      <main className="z-10 flex w-full max-w-[1040px] flex-col items-center px-6 pt-32 text-center md:pt-40">
        
        {/* Pill Badge */}
        <Link
          href="/health"
          className="group mb-8 inline-flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-900/90 py-1.5 pl-1.5 pr-4 text-xs font-medium text-slate-200 backdrop-blur-md transition-all hover:border-slate-500 hover:bg-slate-800"
        >
          <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-slate-900">
            PROTOCOL v1.0
          </span>
          <span className="font-semibold text-slate-200 font-sans">Agent-Readable Commerce Infrastructure</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Headline */}
        <h1 className="mb-6 max-w-4xl text-balance text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          AI agents shop for you. <br />
          <span className="text-slate-300">Gated. Authorized. Audited.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-[680px] text-balance text-base sm:text-lg leading-relaxed text-slate-300 font-normal">
          The first dual-gated commerce infrastructure connecting autonomous AI buyer agents with Razorpay payments. Consumer spend bounds &bull; Merchant policy enforcement &bull; Append-only audit trail.
        </p>

        {/* Action Buttons */}
        <div className="flex w-full flex-col items-center justify-center gap-3.5 sm:flex-row mb-14">
          <Link
            href="/customer/chat"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-black text-slate-900 transition-all hover:bg-slate-200 active:scale-[0.98] sm:w-auto shadow-md"
          >
            <span>Launch Consumer Agent</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-6 text-sm font-bold text-slate-100 transition-all hover:border-slate-500 hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
          >
            <span>Merchant Console</span>
          </Link>
          <button
            onClick={handleCopyInstall}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 font-mono text-xs text-slate-300 transition-all hover:border-slate-500 hover:text-white sm:w-auto"
          >
            {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
            <span>npm install @agentpay/sdk</span>
          </button>
        </div>

        {/* Technical Protocol Spec Bar */}
        <div id="specs" className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 w-full max-w-3xl border-y border-slate-800 py-6 mb-16 font-mono text-left">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">EVALUATION LATENCY</div>
            <div className="font-extrabold text-white text-base">&lt; 80ms Latency</div>
            <div className="text-xs text-slate-300 mt-0.5">Groq Llama 3.3 70B</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">SECURITY GUARANTEE</div>
            <div className="font-extrabold text-white text-base">Dual-Gated Check</div>
            <div className="text-xs text-slate-300 mt-0.5">Customer + Merchant</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">SETTLEMENT ENGINE</div>
            <div className="font-extrabold text-white text-base">Razorpay Live</div>
            <div className="text-xs text-slate-300 mt-0.5">HMAC SHA-256 Verified</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">AUDIT STORE</div>
            <div className="font-extrabold text-white text-base">3-Actor Ledger</div>
            <div className="text-xs text-slate-300 mt-0.5">Append-Only Postgres</div>
          </div>
        </div>

        {/* 
          3. Protocol Inspector Window (Interactive Bento & Simulation)
        */}
        <div id="inspector" className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0d121f] text-left shadow-xl overflow-hidden scroll-mt-24">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-3">
            <div className="flex items-center space-x-2">
              <div className="flex gap-1.5 mr-2">
                <div className="h-3 w-3 rounded-full bg-slate-700" />
                <div className="h-3 w-3 rounded-full bg-slate-700" />
                <div className="h-3 w-3 rounded-full bg-slate-700" />
              </div>
              <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-slate-400" />
                <span>Agentpay Protocol Inspector</span>
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Interactive Simulation Trigger */}
              <button
                onClick={runLiveSimulation}
                disabled={isSimulating}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    <span>Simulating Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                    <span>Run Live Simulation</span>
                  </>
                )}
              </button>

              {/* View Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('gates')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'gates' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  01. Dual Gate Pipeline
                </button>
                <button
                  onClick={() => setActiveTab('payload')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'payload' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  02. API Payload
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeTab === 'audit' ? 'bg-white text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  03. Audit Ledger
                </button>
              </div>
            </div>
          </div>

          {/* Window Body */}
          <div className="p-6 font-mono text-xs sm:text-sm leading-relaxed bg-[#0a0e19] min-h-[260px] text-slate-200">
            {activeTab === 'gates' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-xs">
                  <span>ENDPOINT: <span className="text-white font-bold">POST /agent/chat</span></span>
                  <span className="text-slate-400 font-bold">TOTAL LATENCY: 74ms</span>
                </div>

                <div className="space-y-3">
                  {simStep >= 1 && (
                    <div className="flex items-start gap-2.5 animate-fade-in">
                      <span className="text-slate-500 font-bold">[1/4]</span>
                      <div>
                        <span className="text-white font-bold">Customer Spend Authorization:</span> <span className="text-emerald-400 font-bold">ALLOW</span>
                        <p className="text-xs text-slate-300 mt-0.5">Spend Limit: ₹5,000.00 &bull; Order Amount: ₹2,499.00 &bull; Remaining: ₹2,501.00</p>
                      </div>
                    </div>
                  )}

                  {simStep >= 2 && (
                    <div className="flex items-start gap-2.5 animate-fade-in">
                      <span className="text-slate-500 font-bold">[2/4]</span>
                      <div>
                        <span className="text-white font-bold">Merchant Policy Engine:</span> <span className="text-emerald-400 font-bold">ALLOW</span>
                        <p className="text-xs text-slate-300 mt-0.5">Engine: Groq Llama 3.3 70B &bull; Max Item Cap: ₹10,000.00 &bull; Category: Headphones (Allowed)</p>
                      </div>
                    </div>
                  )}

                  {simStep >= 3 && (
                    <div className="flex items-start gap-2.5 animate-fade-in">
                      <span className="text-slate-500 font-bold">[3/4]</span>
                      <div>
                        <span className="text-white font-bold">Redis Sliding Window Velocity:</span> <span className="text-emerald-400 font-bold">PASSED</span>
                        <p className="text-xs text-slate-300 mt-0.5">Agent Key: ag_8f29c1d0 &bull; Window Rate: 3/5 requests/min</p>
                      </div>
                    </div>
                  )}

                  {simStep >= 4 && (
                    <div className="flex items-start gap-2.5 animate-fade-in">
                      <span className="text-slate-500 font-bold">[4/4]</span>
                      <div>
                        <span className="text-white font-bold">Razorpay Live Settlement:</span> <span className="text-emerald-400 font-bold">SETTLED</span>
                        <p className="text-xs text-slate-300 mt-0.5">Razorpay Order: order_P8x9kL2mA0z &bull; Payment Capture: pay_Q9y0nM3nB1x</p>
                      </div>
                    </div>
                  )}
                </div>

                {simStep === 4 && (
                  <div className="pt-3 flex items-center gap-2 animate-fade-in border-t border-slate-800/80">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 font-bold text-xs">Pipeline Execution Complete. Status: SETTLED</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payload' && (
              <div className="space-y-2 text-slate-200 animate-fade-in">
                <p className="text-slate-400">// Agent API Request Payload</p>
                <pre className="text-slate-200 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs sm:text-sm">
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
              <div className="space-y-2 text-slate-200 animate-fade-in">
                <p className="text-slate-400">// Append-Only PostgreSQL Audit Ledger Record</p>
                <pre className="text-slate-200 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs sm:text-sm">
{`{
  "audit_event_id": "evt_7f8a9b0c-1d2e-3f4a",
  "merchant_id": "fe9038dc-5d00-4171-a9d6-b292e5dae054",
  "actor_type": "agent",
  "actor_id": "ag_8f29c1d0a7b4",
  "action": "payment_order_settled",
  "decision": "ALLOW",
  "reasoning": "Dual-gated check passed: Customer spend limit valid (₹2499 <= ₹5000), Merchant max_amount valid (₹2499 <= ₹10000). Payment captured via Razorpay ID pay_Q9y0nM3nB1x.",
  "created_at": "2026-08-30T00:40:12Z"
}`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 
          4. End-to-End Autonomous Workflow Diagram Section (NEW)
        */}
        <div id="workflow" className="mt-24 w-full scroll-mt-24">
          <div className="text-left mb-10 border-b border-slate-800 pb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-1 font-bold">
              EXECUTION PIPELINE
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              End-to-End Autonomous Purchase Workflow
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              How Agentpay coordinates real-time authorization between buyer AI agents and Razorpay merchants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
            <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">STEP 01</div>
              <h3 className="text-sm font-bold text-white mb-1">Intent & Spend Mandate</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Customer sets tokenized UPI spend caps in their vault. Buyer AI agent receives prompt request.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">STEP 02</div>
              <h3 className="text-sm font-bold text-white mb-1">Dual-Gate Evaluation</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Engine evaluates customer balance & Groq Llama 3.3 70B merchant policy in &lt;80ms.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">STEP 03</div>
              <h3 className="text-sm font-bold text-white mb-1">Razorpay Settlement</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Order created and payment captured via Razorpay APIs. Signature verified live.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">STEP 04</div>
              <h3 className="text-sm font-bold text-white mb-1">Audit & Webhook</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Immutable event recorded in Postgres. HMAC SHA-256 webhook fired to merchant endpoint.
              </p>
            </div>
          </div>
        </div>

        {/* 
          5. Architectural Pillars (High-Contrast Monochrome Cards)
        */}
        <div id="architecture" className="mt-24 w-full scroll-mt-24">
          <div className="text-left mb-10 border-b border-slate-800 pb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-1 font-bold">
              PROTOCOL ARCHITECTURE
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Dual-Gated Infrastructure Specifications
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl font-normal">
              Four fundamental architectural pillars ensuring total control, zero fraud, and complete financial auditability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Pillar 01 */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-7 transition-all duration-300 hover:border-slate-600 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-slate-400">01 / CONSUMER SPEND VAULT</span>
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] font-bold text-slate-200 uppercase">
                  UPI Mandate Gated
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2 tracking-tight">Consumer Spend Authorization</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                Tokenized UPI e-mandates with strict user-defined spend caps, rolling period limits, and allowed item category rules. Buyers set their exact authorization bounds before delegating purchases to any AI agent.
              </p>
            </div>

            {/* Pillar 02 */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-7 transition-all duration-300 hover:border-slate-600 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-slate-400">02 / MERCHANT POLICY ENGINE</span>
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] font-bold text-slate-200 uppercase">
                  Groq Llama 3.3 70B
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2 tracking-tight">Bounded Policy Engine</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                High-throughput policy enforcement powered by Groq Llama 3.3 70B LLM checks. Evaluates per-merchant max transaction limits, blocked categories, real-time catalog stock, and Redis sliding-window velocity rate limits per agent key.
              </p>
            </div>

            {/* Pillar 03 */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-7 transition-all duration-300 hover:border-slate-600 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-slate-400">03 / SETTLEMENT ENGINE</span>
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] font-bold text-slate-200 uppercase">
                  Razorpay Live Capture
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2 tracking-tight">Razorpay Settlement & Webhooks</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                Instant Razorpay Order creation and independent 2-step payment capture verification. Fires real-time HMAC SHA-256 signed HTTP POST webhooks to merchant endpoints with automatic 3-attempt retry exponential backoff.
              </p>
            </div>

            {/* Pillar 04 */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d121f] p-7 transition-all duration-300 hover:border-slate-600 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-slate-400">04 / ACCOUNTABILITY</span>
                <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] font-bold text-slate-200 uppercase">
                  PostgreSQL Ledger
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2 tracking-tight">Append-Only Audit Trail</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                Immutable, append-only ledger recording full intent, decision reasoning, and transaction parameters across Customer, Agent, and Merchant actor types. Complete regulatory compliance and debugging visibility.
              </p>
            </div>
          </div>
        </div>

        {/* 
          6. API Specs Reference (NEW)
        */}
        <div id="api-ref" className="mt-24 w-full scroll-mt-24">
          <div className="text-left mb-10 border-b border-slate-800 pb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-1 font-bold">
              DEVELOPER INTERFACES
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Public Agent API Endpoint Specifications
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              OpenAPI schemas designed for zero-friction integration by third-party AI agents.
            </p>
          </div>

          <div className="space-y-4 text-left">
            <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">POST</span>
                <span className="text-white font-bold text-sm">/agent/chat</span>
              </div>
              <span className="text-slate-300 font-sans text-xs">Autonomous AI shopping & dual-gate settlement execution</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-400 font-bold">POST</span>
                <span className="text-white font-bold text-sm">/merchants/agents</span>
              </div>
              <span className="text-slate-300 font-sans text-xs">Issue API key & custom permission scopes for external agents</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0d121f] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
              <div className="flex items-center space-x-3">
                <span className="px-2.5 py-1 rounded bg-amber-950 border border-amber-800 text-amber-400 font-bold">POST</span>
                <span className="text-white font-bold text-sm">/webhooks/test</span>
              </div>
              <span className="text-slate-300 font-sans text-xs">Fire HMAC SHA-256 signed test notification event</span>
            </div>
          </div>
        </div>

        {/* 
          7. Interactive FAQ Accordion Section (NEW)
        */}
        <div id="faq" className="mt-24 w-full text-left scroll-mt-24">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-400 mb-1 font-bold">
              COMMON QUESTIONS
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Everything you need to know about Agentpay protocol security, Razorpay integration, and policy rules.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_DATA.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-[#0d121f] overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-white text-sm sm:text-base hover:bg-slate-900/60 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                      openFaqIndex === idx ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed font-normal border-t border-slate-800/80 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 
          8. Developer Integration Quick-Start
        */}
        <div className="mt-24 w-full rounded-2xl border border-slate-800 bg-slate-950 p-8 text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              READY FOR INTEGRATION
            </div>
            <h3 className="text-xl font-extrabold text-white">Integrate Agentpay in under 5 minutes.</h3>
            <p className="text-sm text-slate-300 mt-1 max-w-lg font-normal">
              Explore the complete OpenAPI documentation, test agent key generation, and start accepting autonomous AI payments.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-slate-900 transition-all hover:bg-slate-200 shadow-sm"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/health"
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-200 transition-all hover:border-slate-500 hover:text-white"
            >
              <span>System Health</span>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </main>

      {/* Command Search Modal Overlay */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </section>
  );
}
