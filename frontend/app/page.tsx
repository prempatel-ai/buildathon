'use client';

import React from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <Navigation />

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Agentpay Protocol Active &bull; Razorpay AI Buildathon</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl mb-6">
          AI agents shop for you — every purchase gated, authorized, and audited.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed font-normal">
          The first dual-gated commerce infrastructure connecting autonomous AI buyer agents with Razorpay payments. Consumer spend bounds $\cap$ Merchant policy enforcement $\cap$ Append-only audit trail.
        </p>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md w-full mb-16">
          <Link
            href="/customer/chat"
            className="flex flex-col items-center justify-center p-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold mb-3 group-hover:scale-105 transition-transform">
              👤
            </div>
            <span className="text-base font-bold">I'm a Customer</span>
            <span className="text-xs text-slate-400 mt-1">Shop via AI Agent & set spend limits</span>
          </Link>

          <Link
            href="/onboarding"
            className="flex flex-col items-center justify-center p-6 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold mb-3 group-hover:scale-105 transition-transform">
              🏪
            </div>
            <span className="text-base font-bold">I'm a Merchant</span>
            <span className="text-xs text-slate-500 mt-1">Onboard store & configure policy rules</span>
          </Link>
        </div>

        {/* 4 Governance Pillars Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left w-full">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-wider mb-2">Pillar 1</div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Consumer Authorization</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              UPI Reserve Pay tokenized e-mandates. Bounded spend limits set by the user before any agent purchase.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-wider mb-2">Pillar 2</div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Merchant Policy Engine</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Groq Llama 3.3 70B policy checks, category rules, and Redis velocity rate limiting per agent key.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-wider mb-2">Pillar 3</div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Razorpay Settlement</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instant Order creation and HMAC SHA256 signature verified live capture settlement with webhooks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold font-mono text-emerald-600 uppercase tracking-wider mb-2">Pillar 4</div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">3-Actor Audit Store</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Immutable PostgreSQL ledger recording actions across customer, agent, and merchant actor types.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Agentpay Commerce Platform &bull; Razorpay AI Buildathon 2026
      </footer>
    </div>
  );
}
