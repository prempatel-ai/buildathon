'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const [isCustomerContext, setIsCustomerContext] = useState(false);
  const [isMerchantContext, setIsMerchantContext] = useState(false);

  useEffect(() => {
    const custToken = localStorage.getItem('customer_token');
    const merchToken = localStorage.getItem('access_token');

    if (pathname.startsWith('/customer')) {
      setIsCustomerContext(true);
      setIsMerchantContext(false);
    } else if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/agents-list') ||
      pathname.startsWith('/audit') ||
      pathname.startsWith('/webhooks') ||
      pathname.startsWith('/usage')
    ) {
      setIsMerchantContext(true);
      setIsCustomerContext(false);
    } else {
      setIsCustomerContext(Boolean(custToken && !merchToken));
      setIsMerchantContext(Boolean(merchToken));
    }
  }, [pathname]);

  // Context-specific navigation items
  let navItems: { href: string; label: string }[] = [];

  if (isCustomerContext) {
    navItems = [
      { href: '/customer/chat', label: 'Consumer Chat AI' },
      { href: '/customer/dashboard', label: 'Spend Authorization' },
    ];
  } else if (isMerchantContext) {
    navItems = [
      { href: '/dashboard', label: 'Catalog & Store' },
      { href: '/settings', label: 'Policy Rules' },
      { href: '/agents-list', label: 'Agent Keys' },
      { href: '/audit', label: 'Audit Trail' },
      { href: '/webhooks', label: 'Webhooks' },
      { href: '/usage', label: 'Analytics' },
    ];
  } else {
    // Logged Out / Public Context
    navItems = [
      { href: '/customer/chat', label: 'Consumer Chat AI' },
      { href: '/login', label: 'Merchant Sign In' },
      { href: '/customer/dashboard', label: 'Consumer Portal' },
    ];
  }

  const isDevSimulator = pathname.startsWith('/agent');

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-semibold text-white text-sm group-hover:bg-slate-800 transition-colors">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-base">Agentpay</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
              {isCustomerContext
                ? 'Consumer Portal'
                : isMerchantContext
                ? 'Merchant Admin'
                : isDevSimulator
                ? 'Internal Dev'
                : 'Razorpay AI Protocol'}
            </span>
          </Link>

          {isDevSimulator && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider font-mono">
              Dev Simulator
            </span>
          )}
        </div>

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
