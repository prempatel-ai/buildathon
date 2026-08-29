'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/onboarding', label: 'Onboarding' },
    { href: '/dashboard', label: 'Merchant Dashboard' },
    { href: '/customer/dashboard', label: 'Consumer Portal' },
    { href: '/agent', label: 'AI Buyer Agent' },
    { href: '/audit', label: 'Audit Trail' },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-semibold text-white text-sm group-hover:bg-slate-800 transition-colors">
            AP
          </div>
          <span className="font-semibold text-slate-900 tracking-tight text-base">Agentpay</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
            Razorpay AI Gate
          </span>
        </Link>

        <nav className="flex items-center space-x-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 bg-slate-50/50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
