'use client';

import React from 'react';
import { ModernLandingHero } from '@/components/ui/modern-landing-hero';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-neutral-200">
      <ModernLandingHero />
    </div>
  );
}
