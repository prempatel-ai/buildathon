'use client';

import React from 'react';
import { ModernLandingHero } from '@/components/ui/modern-landing-hero';

export default function Home() {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <ModernLandingHero />

      {/* Sleek Dark Footer */}
      <footer className="border-t border-white/[0.08] bg-black py-8 text-center font-mono text-xs text-neutral-500">
        Agentpay Commerce Infrastructure &bull; Razorpay AI Buildathon 2026
      </footer>
    </div>
  );
}
