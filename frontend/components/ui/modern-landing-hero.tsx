'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Code,
  FileCode2,
  Server,
  Globe,
  ExternalLink,
  Code2
} from 'lucide-react';
import CommandSearchModal from '@/components/CommandSearchModal';

interface PipelineSimulationState {
  simMode: 'valid' | 'violation';
  step: number;
}

export function ModernLandingHero() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [heroTab, setHeroTab] = useState<'request' | 'schema'>('request');
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Interactive Pipeline Simulation State
  const [simState, setSimState] = useState<PipelineSimulationState>({ simMode: 'valid', step: 3 });
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
    navigator.clipboard.writeText('git clone https://github.com/prempatel-ai/buildathon.git');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const runPipelineSim = (mode: 'valid' | 'violation') => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimState({ simMode: mode, step: 0 });

    const stepTimeouts = [
      setTimeout(() => setSimState({ simMode: mode, step: 1 }), 350),
      setTimeout(() => setSimState({ simMode: mode, step: 2 }), 750),
      setTimeout(() => {
        setSimState({ simMode: mode, step: 3 });
        setIsSimulating(false);
      }, 1150),
    ];

    return () => stepTimeouts.forEach(clearTimeout);
  };

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center bg-[#0a0e1a] font-sans text-[#f8fafc] selection:bg-[#f8fafc] selection:text-[#0a0e1a] pb-24">
      
      {/* 
        1. Infrastructure Navbar (Swiss Minimalist Header)
      */}
      <header className="fixed top-0 z-40 w-full border-b border-[#1e293b] bg-[#0a0e1a]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f8fafc] font-mono text-xs font-bold text-[#0a0e1a]">
                AP
              </div>
              <span className="text-sm font-bold tracking-tight text-[#f8fafc] font-mono">Agentpay</span>
            </Link>
            <span className="font-mono text-xs text-[#94a3b8]">/</span>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
              Razorpay AI Protocol
            </span>
          </div>

          {/* Technical Nav Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs text-[#94a3b8] font-mono font-medium">
            <a href="#pipeline" className="hover:text-[#f8fafc] transition-colors">
              01. Pipeline
            </a>
            <a href="#matrix" className="hover:text-[#f8fafc] transition-colors">
              02. Comparison Matrix
            </a>
            <a href="#credibility" className="hover:text-[#f8fafc] transition-colors">
              03. Specs
            </a>
            <a href="#audit-ledger" className="hover:text-[#f8fafc] transition-colors">
              04. Audit Ledger
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center space-x-2 rounded-lg border border-[#1e293b] bg-[#0e1223] px-3 py-1.5 text-xs font-mono text-[#94a3b8] transition-all hover:border-slate-600 hover:text-[#f8fafc] select-none"
            >
              <Search className="h-3.5 w-3.5 text-[#94a3b8]" />
              <span className="hidden sm:inline font-mono">Search API...</span>
              <kbd className="rounded border border-[#1e293b] bg-[#0a0e1a] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#94a3b8]">
                ⌘K
              </kbd>
            </button>

            <Link
              href="/customer/chat"
              className="rounded-lg bg-[#f8fafc] px-3.5 py-1.5 text-xs font-mono font-bold text-[#0a0e1a] transition-all hover:bg-slate-200 active:scale-95 shadow-sm"
            >
              Consumer Chat AI
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-[#1e293b] bg-[#0e1223] px-3.5 py-1.5 text-xs font-mono font-semibold text-[#f8fafc] transition-all hover:border-slate-600 active:scale-95"
            >
              Merchant Console
            </Link>
          </div>
        </div>
      </header>

      {/* 
        2. SECTION 1: HERO (Mechanism-First Asymmetric 2-Column Grid)
      */}
      <main className="z-10 flex w-full max-w-7xl flex-col items-center px-6 pt-28 md:pt-36">
        
        {/* Asymmetric 2-Column Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full mb-20 text-left">
          
          {/* Left Column: Mission & Core Mechanism (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-md border border-[#1e293b] bg-[#0e1223] px-3 py-1 text-xs font-mono font-semibold text-[#94a3b8]">
              <span className="h-2 w-2 rounded-full bg-[#059669]" />
              <span>RAZORPAY AI BUILDATHON 2026 &bull; TRACK 01</span>
            </div>

            {/* Mechanism Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#f8fafc] leading-[1.1] font-mono">
              LLM proposes, <br />
              <span className="text-[#94a3b8]">engine disposes.</span>
            </h1>

            {/* Concrete Problem Subhead */}
            <p className="text-base sm:text-lg leading-relaxed text-[#94a3b8] font-normal max-w-2xl">
              Traditional payment gateways expect human 2FA SMS OTPs and 3DS frames — failing when an autonomous AI buyer agent attempts a transaction. Agentpay provides the dual-gated infrastructure letting AI agents shop safely within deterministic spend caps and policy bounds.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs">
              <Link
                href="/customer/chat"
                className="flex h-11 items-center gap-2 rounded-lg bg-[#f8fafc] px-5 font-bold text-[#0a0e1a] transition-all hover:bg-slate-200 active:scale-95 shadow-sm"
              >
                <span>Launch Consumer Agent Demo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="https://github.com/prempatel-ai/buildathon"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center gap-2 rounded-lg border border-[#1e293b] bg-[#0e1223] px-5 font-semibold text-[#f8fafc] transition-all hover:border-slate-600 active:scale-95"
              >
                <Code2 className="h-4 w-4 text-[#94a3b8]" />
                <span>GitHub Repository</span>
              </a>

              <button
                onClick={handleCopyInstall}
                className="flex h-11 items-center gap-2 rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-4 text-[#94a3b8] transition-all hover:border-slate-600 hover:text-[#f8fafc]"
              >
                {copiedCode ? <Check className="h-4 w-4 text-[#059669]" /> : <Copy className="h-4 w-4 text-[#94a3b8]" />}
                <span>git clone buildathon</span>
              </button>
            </div>

            {/* Specification Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#1e293b] font-mono text-xs">
              <div>
                <div className="text-[10px] uppercase text-[#94a3b8] font-semibold mb-0.5">EVALUATION LATENCY</div>
                <div className="font-bold text-[#f8fafc] text-sm">&lt; 80ms</div>
                <div className="text-[11px] text-[#94a3b8]">Groq Llama 3.3 70B</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#94a3b8] font-semibold mb-0.5">SECURITY MODEL</div>
                <div className="font-bold text-[#f8fafc] text-sm">Dual-Gated</div>
                <div className="text-[11px] text-[#94a3b8]">Customer + Merchant</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[#94a3b8] font-semibold mb-0.5">SETTLEMENT ENGINE</div>
                <div className="font-bold text-[#f8fafc] text-sm">Razorpay Live</div>
                <div className="text-[11px] text-[#94a3b8]">HMAC SHA-256 Verified</div>
              </div>
            </div>
          </div>

          {/* Right Column: Code / Schema Anchor Visual (5 Cols) */}
          <div className="lg:col-span-5 w-full">
            <div className="rounded-xl border border-[#1e293b] bg-[#0e1223] overflow-hidden shadow-2xl font-mono text-xs">
              
              {/* Code Tab Bar */}
              <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0a0e1a] px-4 py-2.5">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-3.5 w-3.5 text-[#94a3b8]" />
                  <span className="font-bold text-[#f8fafc] text-xs">Agent Protocol Specs</span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setHeroTab('request')}
                    className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                      heroTab === 'request' ? 'bg-[#f8fafc] text-[#0a0e1a] font-bold' : 'text-[#94a3b8] hover:text-[#f8fafc]'
                    }`}
                  >
                    01. Request Payload
                  </button>
                  <button
                    onClick={() => setHeroTab('schema')}
                    className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                      heroTab === 'schema' ? 'bg-[#f8fafc] text-[#0a0e1a] font-bold' : 'text-[#94a3b8] hover:text-[#f8fafc]'
                    }`}
                  >
                    02. Schema.org Feed
                  </button>
                </div>
              </div>

              {/* Code Container */}
              <div className="p-4 bg-[#050811] overflow-x-auto min-h-[300px] text-[11px] sm:text-xs leading-relaxed">
                {heroTab === 'request' ? (
                  <pre className="text-slate-300">
{`// POST /agent/chat HTTP/1.1
// Authorization: Bearer agent_key_8f29c1d0

{
  "merchant_id": "fe9038dc-5d00-4171-a9d6-b292e5dae054",
  "customer_id": "cust_99a80b7c",
  "prompt": "Buy boAt Rockerz 450 Headphones under ₹2,500",
  "intent": {
    "action": "propose_order",
    "item_name": "boAt Rockerz 450 Wireless",
    "max_amount": 2500.00,
    "currency": "INR"
  }
}`}
                  </pre>
                ) : (
                  <pre className="text-slate-300">
{`// GET /catalog/agent-schema?merchant_id=fe9038...

{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "boAt Lifestyle Agent Catalog",
  "numberOfItems": 1,
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "item": {
      "@type": "Product",
      "name": "boAt Rockerz 450 Wireless",
      "offers": {
        "@type": "Offer",
        "price": "2499.00",
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock"
      }
    }
  }]
}`}
                  </pre>
                )}
              </div>
              <div className="border-t border-[#1e293b] bg-[#0a0e1a] px-4 py-2 text-[10px] text-[#94a3b8] flex justify-between">
                <span>FORMAT: OPENAPI / JSON-LD</span>
                <span className="text-[#059669] font-bold">STATUS: 200 OK</span>
              </div>
            </div>
          </div>
        </div>

        {/* 
          3. SECTION 2: PROBLEM FRAMING (Before & After Matrix)
        */}
        <div id="matrix" className="w-full mt-16 scroll-mt-24">
          <div className="border-b border-[#1e293b] pb-4 mb-8 text-left font-mono">
            <div className="text-xs uppercase text-[#94a3b8] font-semibold mb-1">02. ARCHITECTURAL PARADIGM</div>
            <h2 className="text-2xl font-bold text-[#f8fafc]">Traditional Checkout vs. Dual-Gated Protocol</h2>
            <p className="text-xs text-[#94a3b8] mt-1 font-sans">
              Why legacy payment gateways fail for autonomous AI agents and how Agentpay fixes the trust gap.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Legacy Gateway Box */}
            <div className="rounded-xl border border-[#1e293b] bg-[#0e1223] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] font-mono text-xs">
                <span className="font-bold text-[#dc2626]">LEGACY E-COMMERCE CHECKOUT</span>
                <span className="px-2 py-0.5 rounded bg-red-950/60 text-[#dc2626] border border-red-900/50 font-bold text-[10px]">
                  FAILS FOR AGENTS
                </span>
              </div>

              <ul className="space-y-3 font-mono text-xs text-[#94a3b8]">
                <li className="flex items-start gap-2">
                  <span className="text-[#dc2626] font-bold">✕</span>
                  <span><strong>Human 2FA Dependency</strong>: Requires interactive SMS OTPs and 3DS web frames that autonomous agents cannot answer.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#dc2626] font-bold">✕</span>
                  <span><strong>Raw Credential Exposure</strong>: Direct card details exposed to LLM prompts, introducing prompt injection risks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#dc2626] font-bold">✕</span>
                  <span><strong>Unbounded Spend Cap</strong>: All-or-nothing credit limits leading to runaway automated API loops.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#dc2626] font-bold">✕</span>
                  <span><strong>Human HTML Pages</strong>: Product catalogs rendered in HTML DOMs unreadable by AI buyers.</span>
                </li>
              </ul>
            </div>

            {/* Agentpay Dual-Gated Box */}
            <div className="rounded-xl border border-[#1e293b] bg-[#0e1223] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] font-mono text-xs">
                <span className="font-bold text-[#059669]">AGENTPAY DUAL-GATED PROTOCOL</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-[#059669] border border-emerald-900/50 font-bold text-[10px]">
                  DETERMINISTIC SAFE
                </span>
              </div>

              <ul className="space-y-3 font-mono text-xs text-[#94a3b8]">
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] font-bold">✓</span>
                  <span><strong>Tokenized Spend Vault</strong>: Pre-authorized UPI e-mandates with strict user-configured transaction caps.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] font-bold">✓</span>
                  <span><strong>LLM Proposes, Engine Disposes</strong>: Zero raw card exposure; LLM proposes intent, engine validates rules.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] font-bold">✓</span>
                  <span><strong>Merchant Policy Engine</strong>: Groq Llama 3.3 70B checks max order cap, category whitelist, and stock availability.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#059669] font-bold">✓</span>
                  <span><strong>Schema.org JSON-LD Feed</strong>: Standardized product schemas built for LangChain, AutoGPT, and Claude agents.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 
          4. SECTION 3: HOW IT WORKS (Horizontal 3-Gate Pipeline Diagram)
        */}
        <div id="pipeline" className="w-full mt-24 scroll-mt-24">
          <div className="border-b border-[#1e293b] pb-4 mb-8 text-left font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase text-[#94a3b8] font-semibold mb-1">01. EXECUTION PIPELINE</div>
              <h2 className="text-2xl font-bold text-[#f8fafc]">The 3-Gate Deterministic Evaluation Pipeline</h2>
              <p className="text-xs text-[#94a3b8] mt-1 font-sans">
                Every purchase proposal must clear all three independent gates before money moves via Razorpay.
              </p>
            </div>

            {/* Simulation Controls */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => runPipelineSim('valid')}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded bg-emerald-950 border border-emerald-800 text-[#059669] font-bold text-xs hover:bg-emerald-900 transition-colors disabled:opacity-50"
              >
                Simulate Valid Order (ALLOW)
              </button>
              <button
                onClick={() => runPipelineSim('violation')}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded bg-red-950 border border-red-800 text-[#dc2626] font-bold text-xs hover:bg-red-900 transition-colors disabled:opacity-50"
              >
                Simulate Violation (DENY)
              </button>
            </div>
          </div>

          {/* Pipeline Horizontal Flow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left font-mono text-xs">
            
            {/* GATE 1 */}
            <div className={`rounded-xl border p-6 transition-all ${
              simState.step >= 1
                ? 'border-[#1e293b] bg-[#0e1223]'
                : 'border-slate-800/40 bg-[#0a0e1a] opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1e293b]">
                <span className="font-bold text-[#94a3b8]">GATE 01</span>
                {simState.step >= 1 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-[#059669] border border-emerald-800 font-bold text-[10px]">
                    ALLOW [✓]
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Consumer Spend Vault</h3>
              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                Evaluates tokenized UPI e-mandates against user-set spend cap (e.g., ₹2,499.00 &lt;= ₹5,000.00 limit).
              </p>
            </div>

            {/* GATE 2 */}
            <div className={`rounded-xl border p-6 transition-all ${
              simState.step >= 2
                ? simState.simMode === 'violation'
                  ? 'border-red-900/80 bg-red-950/20'
                  : 'border-[#1e293b] bg-[#0e1223]'
                : 'border-slate-800/40 bg-[#0a0e1a] opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1e293b]">
                <span className="font-bold text-[#94a3b8]">GATE 02</span>
                {simState.step >= 2 && (
                  simState.simMode === 'violation' ? (
                    <span className="px-2 py-0.5 rounded bg-red-950 text-[#dc2626] border border-red-800 font-bold text-[10px]">
                      DENY [✕]
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-[#059669] border border-emerald-800 font-bold text-[10px]">
                      ALLOW [✓]
                    </span>
                  )
                )}
              </div>
              <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Merchant Policy Engine</h3>
              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                {simState.simMode === 'violation' && simState.step >= 2
                  ? 'Policy violation detected: Item amount ₹12,500 exceeds merchant max order cap (₹10,000).'
                  : 'Groq Llama 3.3 70B verifies max item limit (₹2,499 <= ₹10,000), catalog stock, and Redis rate limit.'}
              </p>
            </div>

            {/* GATE 3 */}
            <div className={`rounded-xl border p-6 transition-all ${
              simState.step >= 3
                ? simState.simMode === 'violation'
                  ? 'border-slate-800/40 bg-[#0a0e1a] opacity-40'
                  : 'border-[#1e293b] bg-[#0e1223]'
                : 'border-slate-800/40 bg-[#0a0e1a] opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1e293b]">
                <span className="font-bold text-[#94a3b8]">GATE 03</span>
                {simState.step >= 3 && (
                  simState.simMode === 'violation' ? (
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-[#94a3b8] border border-slate-800 font-bold text-[10px]">
                      SKIPPED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-[#059669] border border-emerald-800 font-bold text-[10px]">
                      SETTLED [✓]
                    </span>
                  )
                )}
              </div>
              <h3 className="text-sm font-bold text-[#f8fafc] mb-1">Razorpay Live Settlement</h3>
              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                Creates Razorpay Order ID, verifies payment capture signature, and fires HMAC SHA-256 webhook.
              </p>
            </div>
          </div>
        </div>

        {/* 
          5. SECTION 4: PROOF & TECHNICAL CREDIBILITY
        */}
        <div id="credibility" className="w-full mt-24 scroll-mt-24">
          <div className="border-b border-[#1e293b] pb-4 mb-8 text-left font-mono">
            <div className="text-xs uppercase text-[#94a3b8] font-semibold mb-1">03. TECHNICAL SPECIFICATIONS</div>
            <h2 className="text-2xl font-bold text-[#f8fafc]">Infrastructure Standards & Proofs</h2>
            <p className="text-xs text-[#94a3b8] mt-1 font-sans">
              Concrete facts and protocols built for developer transparency and zero-trust verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left font-mono text-xs">
            <div className="rounded-xl border border-[#1e293b] bg-[#0e1223] p-6 space-y-3">
              <div className="px-2.5 py-1 rounded bg-[#0a0e1a] border border-[#1e293b] text-[#f8fafc] font-bold inline-block">
                GET /catalog/agent-schema
              </div>
              <h3 className="text-sm font-bold text-[#f8fafc]">Schema.org JSON-LD Feed</h3>
              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                Auto-generates standardized Schema.org product feeds so LangChain, AutoGPT, LlamaIndex, and Claude agents can crawl prices and stock natively.
              </p>
            </div>

            <div className="rounded-xl border border-[#1e293b] bg-[#0e1223] p-6 space-y-3">
              <div className="px-2.5 py-1 rounded bg-[#0a0e1a] border border-[#1e293b] text-[#f8fafc] font-bold inline-block">
                X-Agentpay-Signature
              </div>
              <h3 className="text-sm font-bold text-[#f8fafc]">HMAC SHA-256 Webhook Signing</h3>
              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                Every settlement event fires an HTTP POST webhook signed with HMAC SHA-256 header signature and 3-attempt exponential backoff retry.
              </p>
            </div>

            <div className="rounded-xl border border-[#1e293b] bg-[#0e1223] p-6 space-y-3">
              <div className="px-2.5 py-1 rounded bg-[#0a0e1a] border border-[#1e293b] text-[#f8fafc] font-bold inline-block">
                POST /catalog/shopify-sync
              </div>
              <h3 className="text-sm font-bold text-[#f8fafc]">1-Click Shopify Live Crawler</h3>
              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                Real HTTPX crawler fetches live product titles, variant pricing, inventory stock, and product types directly from any Shopify domain in &lt;2s.
              </p>
            </div>
          </div>
        </div>

        {/* 
          6. SECTION 5: AUDIT TRAIL TEASER (Append-Only Postgres JSON Inspector)
        */}
        <div id="audit-ledger" className="w-full mt-24 scroll-mt-24">
          <div className="border-b border-[#1e293b] pb-4 mb-8 text-left font-mono">
            <div className="text-xs uppercase text-[#94a3b8] font-semibold mb-1">04. FINANCIAL EXPLAINABILITY</div>
            <h2 className="text-2xl font-bold text-[#f8fafc]">Append-Only PostgreSQL Audit Ledger</h2>
            <p className="text-xs text-[#94a3b8] mt-1 font-sans">
              Every monetary action logged to an immutable PostgreSQL event store with full reasoning traces across Customer, Agent, and Merchant.
            </p>
          </div>

          <div className="rounded-xl border border-[#1e293b] bg-[#0e1223] text-left shadow-2xl overflow-hidden font-mono text-xs">
            <div className="border-b border-[#1e293b] bg-[#0a0e1a] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
                <span className="font-bold text-[#f8fafc]">Audit Event Record: evt_7f8a9b0c-1d2e-3f4a</span>
              </div>
              <span className="text-[#94a3b8] text-[11px]">POSTGRESQL IMMUTABLE TRIGGER</span>
            </div>

            <div className="p-5 bg-[#050811] overflow-x-auto text-[11px] sm:text-xs leading-relaxed text-slate-200">
              <pre>
{`{
  "audit_event_id": "evt_7f8a9b0c-1d2e-3f4a",
  "timestamp": "2026-08-30T05:34:12Z",
  "merchant_id": "fe9038dc-5d00-4171-a9d6-b292e5dae054",
  "actor_type": "agent",
  "actor_id": "ag_8f29c1d0a7b4",
  "action": "payment_order_settled",
  "decision": "ALLOW",
  "input_payload": {
    "customer_id": "cust_99a80b7c",
    "amount": 2499.00,
    "currency": "INR",
    "prompt": "Buy boAt Rockerz 450 Headphones under ₹2,500"
  },
  "policy_evaluation": {
    "consumer_vault": "PASSED (₹2,499.00 <= ₹5,000.00 spend limit)",
    "merchant_policy": "PASSED (Groq Llama 3.3 70B check OK)",
    "rate_limiter": "PASSED (3/5 req/min via Redis)"
  },
  "settlement": {
    "provider": "Razorpay",
    "razorpay_order_id": "order_P8x9kL2mA0z",
    "razorpay_payment_id": "pay_Q9y0nM3nB1x",
    "status": "SETTLED"
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* 
          7. SECTION 6: HONEST CALL TO ACTION (CTA)
        */}
        <div className="w-full mt-24 rounded-2xl border border-[#1e293b] bg-[#0e1223] p-10 text-center flex flex-col items-center justify-center font-mono">
          <div className="text-xs uppercase text-[#94a3b8] font-semibold mb-2">READY FOR EVALUATION</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#f8fafc] mb-3">
            Inspect the Codebase & Live Interactive Demo
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8] font-sans max-w-xl mb-8">
            Explore the complete repository, test agent key generation in the merchant console, and trigger real-time AI shopping queries.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/customer/chat"
              className="flex h-11 items-center gap-2 rounded-lg bg-[#f8fafc] px-6 text-xs font-bold text-[#0a0e1a] transition-all hover:bg-slate-200 active:scale-95 shadow-sm"
            >
              <span>Launch Consumer Agent Demo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard"
              className="flex h-11 items-center gap-2 rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-6 text-xs font-semibold text-[#f8fafc] transition-all hover:border-slate-600 active:scale-95"
            >
              <span>Merchant Console</span>
            </Link>

            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center gap-2 rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-5 text-xs text-[#94a3b8] transition-all hover:border-slate-600 hover:text-[#f8fafc]"
            >
              <span>OpenAPI Swagger Docs</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>

      {/* 
        8. SECTION 7: MINIMALIST INFRASTRUCTURE FOOTER
      */}
      <footer className="w-full max-w-7xl border-t border-[#1e293b] mt-24 pt-8 pb-6 px-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-[#94a3b8]">
        <div>
          Agentpay Protocol v1.0 &bull; <a href="https://github.com/prempatel-ai/buildathon" target="_blank" rel="noreferrer" className="underline hover:text-[#f8fafc]">GitHub Repository</a>
        </div>

        <div>
          Razorpay AI Buildathon 2026 &bull; Track 01 (AI Growth & Agentic Commerce)
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-[#0e1223] border border-[#1e293b] text-[10px]">Next.js 16</span>
          <span className="px-2 py-0.5 rounded bg-[#0e1223] border border-[#1e293b] text-[10px]">FastAPI</span>
          <span className="px-2 py-0.5 rounded bg-[#0e1223] border border-[#1e293b] text-[10px]">Razorpay</span>
          <span className="px-2 py-0.5 rounded bg-[#0e1223] border border-[#1e293b] text-[10px]">Groq Llama 3.3</span>
          <span className="px-2 py-0.5 rounded bg-[#0e1223] border border-[#1e293b] text-[10px]">PostgreSQL</span>
        </div>
      </footer>

      {/* Command Search Modal Overlay */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </section>
  );
}
