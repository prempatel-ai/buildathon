'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { AgentpayLogo } from '@/components/Logo';
import {
  ArrowRight,
  Check,
  Copy,
  Terminal,
  Code2,
  Lock,
  Shield,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Database,
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  Globe,
  Store,
  Bot,
  CreditCard,
  FileSpreadsheet,
  AlertTriangle,
  Play,
  ArrowUpRight
} from 'lucide-react';

export function ModernLandingHero() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'approved' | 'rejected'>('approved');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(3);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText('git clone https://github.com/prempatel-ai/buildathon.git');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const runSimulation = (mode: 'approved' | 'rejected') => {
    if (isSimulating) return;
    setActiveTab(mode);
    setIsSimulating(true);
    setSimStep(0);

    setTimeout(() => setSimStep(1), 350);
    setTimeout(() => setSimStep(2), 700);
    setTimeout(() => {
      setSimStep(3);
      setIsSimulating(false);
    }, 1050);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 flex flex-col justify-between">
      <Navigation />

      {/* Hero Container */}
      <main className="flex-1 flex flex-col items-center">
        {/* SECTION 1: HERO */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-16">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            {/* Track Pill */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-xs font-mono text-neutral-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>RAZORPAY AI BUILDATHON 2026 &bull; TRACK 01</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 leading-[1.15]">
              Autonomous payment infrastructure for{' '}
              <span className="underline decoration-neutral-300 decoration-wavy underline-offset-8">
                AI shopping agents
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl">
              Traditional gateways block autonomous AI buyers with human SMS OTPs and 3DS frames. Agentpay provides the dual-gated protocol letting AI agents transact safely within deterministic spend limits and direct Razorpay settlements.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/customer/chat"
                className="h-10 px-5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-medium transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Launch Shopping Agent</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/onboarding"
                className="h-10 px-5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-medium transition-all shadow-2xs flex items-center space-x-2 cursor-pointer"
              >
                <Store className="w-4 h-4 text-neutral-600" />
                <span>Merchant Console</span>
              </Link>

              <button
                onClick={handleCopyInstall}
                className="h-10 px-4 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-lg text-xs font-mono transition-all flex items-center space-x-2 cursor-pointer"
                title="Copy git clone command"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>git clone buildathon</span>
              </button>
            </div>

            {/* Spec Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 w-full border-t border-neutral-100 text-left">
              <div className="p-3.5 bg-neutral-50/70 border border-neutral-200/80 rounded-lg">
                <div className="text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">SECURITY MODEL</div>
                <div className="text-xs font-bold text-neutral-900">Dual-Gated Governance</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Consumer Vaults + Merchant Rules</div>
              </div>
              <div className="p-3.5 bg-neutral-50/70 border border-neutral-200/80 rounded-lg">
                <div className="text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">SETTLEMENT GATEWAY</div>
                <div className="text-xs font-bold text-neutral-900">Razorpay Live APIs</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">HMAC-SHA256 Signature Verified</div>
              </div>
              <div className="p-3.5 bg-neutral-50/70 border border-neutral-200/80 rounded-lg">
                <div className="text-[10px] uppercase font-mono font-semibold text-neutral-500 mb-0.5">TEST COVERAGE</div>
                <div className="text-xs font-bold text-neutral-900">30+ Pytest Suite</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Unit, Integration & E2E Verified</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: LIVE PROTOCOL PIPELINE SIMULATOR */}
        <section className="w-full bg-neutral-50/60 border-y border-neutral-200 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-white border border-neutral-200 rounded text-[11px] font-mono text-neutral-700">
                <Cpu className="w-3 h-3 text-neutral-800" />
                <span>INTERACTIVE PIPELINE EVALUATION</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                How autonomous agent purchases are verified
              </h2>
              <p className="text-xs text-neutral-500">
                See how Agentpay deterministically checks consumer authorization and merchant risk bounds before calling Razorpay.
              </p>
            </div>

            {/* Interactive Simulation Frame */}
            <div className="bg-white border border-neutral-200 rounded-xl shadow-xs overflow-hidden max-w-4xl mx-auto">
              {/* Tab Bar Header */}
              <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => runSimulation('approved')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'approved'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    Scenario A: Approved Order (₹1,799 within ₹3,800 Limit)
                  </button>
                  <button
                    onClick={() => runSimulation('rejected')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'rejected'
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    Scenario B: Policy Violation (Exceeds ₹10,000 Cap)
                  </button>
                </div>

                <button
                  onClick={() => runSimulation(activeTab)}
                  disabled={isSimulating}
                  className="px-3 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 rounded text-xs font-mono text-neutral-700 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3 text-neutral-900" />
                  <span>{isSimulating ? 'Evaluating...' : 'Re-Run Evaluation'}</span>
                </button>
              </div>

              {/* Step Sequence Container */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1: Consumer Intent & Limit */}
                <div className={`p-4 rounded-lg border transition-all ${
                  simStep >= 1 ? 'border-neutral-900 bg-neutral-50/50' : 'border-neutral-200 opacity-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-neutral-500">STEP 01</span>
                    {simStep >= 1 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900">Consumer Spend Vault</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {activeTab === 'approved'
                      ? '₹1,799 boAt Watch verified against active ₹3,800 pre-authorized card.'
                      : '₹14,999 item checked against ₹5,000 daily spend authorization.'}
                  </p>
                  <div className="mt-3 p-2 bg-white border border-neutral-200 rounded text-[10px] font-mono text-neutral-700">
                    STATUS: <span className={activeTab === 'approved' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {activeTab === 'approved' ? 'LIMIT_SUFFICIENT' : 'AUTHORIZATION_PENDING'}
                    </span>
                  </div>
                </div>

                {/* Step 2: Merchant Policy Engine */}
                <div className={`p-4 rounded-lg border transition-all ${
                  simStep >= 2 ? 'border-neutral-900 bg-neutral-50/50' : 'border-neutral-200 opacity-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-neutral-500">STEP 02</span>
                    {simStep >= 2 ? (
                      activeTab === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900">Merchant Policy Check</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {activeTab === 'approved'
                      ? 'Category "Smartwatches" matches allowed rules. Per-order cap ₹10k satisfied.'
                      : 'Amount exceeds merchant maximum order cap rule (Cap: ₹10,000).'}
                  </p>
                  <div className="mt-3 p-2 bg-white border border-neutral-200 rounded text-[10px] font-mono text-neutral-700">
                    POLICY: <span className={activeTab === 'approved' ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {activeTab === 'approved' ? 'POLICY_SATISFIED' : 'REJECTED_MAX_AMOUNT'}
                    </span>
                  </div>
                </div>

                {/* Step 3: Razorpay Settlement Execution */}
                <div className={`p-4 rounded-lg border transition-all ${
                  simStep >= 3 ? 'border-neutral-900 bg-neutral-50/50' : 'border-neutral-200 opacity-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-neutral-500">STEP 03</span>
                    {simStep >= 3 ? (
                      activeTab === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900">Razorpay Settlement</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {activeTab === 'approved'
                      ? 'Order order_O5kP9x created. HMAC webhook dispatched to merchant.'
                      : 'Transaction aborted before hitting gateway. Cryptographic audit event logged.'}
                  </p>
                  <div className="mt-3 p-2 bg-white border border-neutral-200 rounded text-[10px] font-mono text-neutral-700">
                    RESULT: <span className={activeTab === 'approved' ? 'text-emerald-700 font-bold' : 'text-neutral-500 font-bold'}>
                      {activeTab === 'approved' ? 'PAYMENT_SETTLED_200' : 'BLOCKED_BY_GUARDRAIL'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: CORE CAPABILITIES (BENTO GRID) */}
        <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[11px] font-mono text-neutral-700">
              <Layers className="w-3 h-3 text-neutral-800" />
              <span>ARCHITECTURE CAPABILITIES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Built for deterministic AI transactions
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Every layer of Agentpay is engineered to enable programmatic commerce without compromising safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bento Card 1 */}
            <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-xs space-y-3 hover:border-neutral-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Dual-Gated Bounded Authorization</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Consumers set strict virtual card spending ceilings, merchant whitelist filters, and validity windows. Merchants enforce category restrictions and rolling velocity limits.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-[11px] font-mono text-neutral-400">
                <span>&bull; Zero Hallucinated Spend</span>
                <span>&bull; Deterministic Caps</span>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-xs space-y-3 hover:border-neutral-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Machine-Readable Schema & Discovery</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Exposes dynamic JSON-LD and OpenAPI schemas allowing LangChain, OpenAI, and Claude shopping agents to semantically search, discover prices, and parse catalog availability.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-[11px] font-mono text-neutral-400">
                <span>&bull; schema.org/Product</span>
                <span>&bull; Instant SWR Hydration</span>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-xs space-y-3 hover:border-neutral-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Razorpay Settlement Engine</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Executes orders via Razorpay Sandbox & Live APIs. Includes webhook signature verification (HMAC-SHA256) and direct settlement tracking in the merchant ledger.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-[11px] font-mono text-neutral-400">
                <span>&bull; Automated Payouts</span>
                <span>&bull; HMAC Webhook Security</span>
              </div>
            </div>

            {/* Bento Card 4 */}
            <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-xs space-y-3 hover:border-neutral-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900">Tamper-Evident Cryptographic Audit</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Every agent proposal, policy evaluation, price check, and settlement event is recorded into an immutable audit trail with SHA-256 integrity verification.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-[11px] font-mono text-neutral-400">
                <span>&bull; 100% Traceability</span>
                <span>&bull; Audit API Included</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: CALL TO ACTION */}
        <section className="w-full bg-neutral-900 text-white py-14 border-t border-neutral-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to test autonomous AI commerce?
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
              Try the consumer shopping assistant or deploy your merchant store with pre-seeded electronics products in seconds.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/customer/chat"
                className="h-10 px-5 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-xs"
              >
                <Bot className="w-4 h-4" />
                <span>Open Shopping Assistant</span>
              </Link>
              <Link
                href="/onboarding"
                className="h-10 px-5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-lg text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Set Up Merchant Store</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Monochrome Footer */}
      <footer className="border-t border-neutral-200 bg-white py-4 text-center text-xs text-neutral-400 font-mono">
        Agentpay &bull; Autonomous AI Commerce Protocol for Razorpay &bull; Track 01
      </footer>
    </div>
  );
}
