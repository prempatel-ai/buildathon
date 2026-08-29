'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Hero } from '@/components/ui/hero-1';

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const merchToken = localStorage.getItem('agentpay_auth_token') || localStorage.getItem('access_token');
    const custToken = localStorage.getItem('customer_token');

    if (merchToken) {
      router.replace('/dashboard');
    } else if (custToken) {
      router.replace('/customer/chat');
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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
