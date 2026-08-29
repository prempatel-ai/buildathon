'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import { Hero } from '@/components/ui/hero-1';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <Navigation />

      <main className="flex-1 w-full">
        <Hero
          eyebrow="AGENTPAY PROTOCOL ACTIVE • RAZORPAY AI BUILDATHON"
          title="AI agents shop for you — every purchase gated, authorized & audited."
          subtitle="The first dual-gated commerce infrastructure connecting autonomous AI buyer agents with Razorpay payments. Consumer spend bounds • Merchant policy enforcement • Append-only audit trail."
          customerCtaLabel="I'm a Customer"
          customerCtaHref="/customer/chat"
          merchantCtaLabel="I'm a Merchant"
          merchantCtaHref="/login"
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-6 text-center text-xs font-semibold text-slate-500">
        Agentpay Commerce Platform &bull; Razorpay AI Buildathon 2026
      </footer>
    </div>
  );
}
