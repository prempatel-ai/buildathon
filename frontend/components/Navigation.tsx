'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconStoreCatalog,
  IconGovernance,
  IconAnalytics,
  IconAgentKey,
  IconAudit,
  IconWebhook,
  IconDashboard,
  IconSignOut
} from '@/components/ui/custom-icons';
import CommandSearchModal from '@/components/CommandSearchModal';
import { removeAuthToken, getMerchantMe, Merchant } from '@/lib/api';
import { ChevronDown, Search, ExternalLink, ShieldCheck, Shield, User, LogOut, Check, ShoppingBag, MapPin } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCustomerContext, setIsCustomerContext] = useState(false);
  const [isMerchantContext, setIsMerchantContext] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const custToken = localStorage.getItem('customer_token');
    const custName = localStorage.getItem('customer_name');
    const custMail = localStorage.getItem('customer_email');
    const merchToken = localStorage.getItem('agentpay_auth_token') || localStorage.getItem('access_token');

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
      if (merchToken) {
        getMerchantMe().then(setMerchant).catch(() => {});
      }
    } else {
      setIsCustomerContext(Boolean(custToken && !merchToken));
      setIsMerchantContext(Boolean(merchToken));
    }

    if (custToken) {
      setCustomerName(custName || 'Consumer');
      setCustomerEmail(custMail || '');
    } else {
      setCustomerName(null);
      setCustomerEmail(null);
    }
  }, [pathname]);

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

  const handleLogout = () => {
    removeAuthToken();
    localStorage.removeItem('customer_token');
    router.push('/login');
  };

  const handleCustomerLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('customer_name');
    localStorage.removeItem('customer_email');
    setCustomerName(null);
    setCustomerEmail(null);
    setCustomerMenuOpen(false);
    router.push('/customer/login');
  };

  const merchantTabs = [
    { label: 'Overview', href: '/dashboard', icon: IconDashboard },
    { label: 'Policy & Governance', href: '/settings', icon: IconGovernance },
    { label: 'AI Agent Keys', href: '/agents-list', icon: IconAgentKey },
    { label: 'Analytics', href: '/usage', icon: IconAnalytics },
    { label: 'Audit Trail', href: '/audit', icon: IconAudit },
    { label: 'Webhooks', href: '/webhooks', icon: IconWebhook },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        {/* Tier 1: Main Global Header */}
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Brand & Organization Selector */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center font-black text-white text-xs group-hover:bg-indigo-600 transition-colors shadow-2xs font-mono">
                AP
              </div>
              <span className="font-black text-slate-900 tracking-tight text-sm">Agentpay</span>
            </Link>

            <span className="text-slate-300 font-mono text-xs">/</span>

            {isMerchantContext && pathname !== '/onboarding' ? (
              <div className="relative">
                <button
                  onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                  className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-800 transition-colors select-none"
                >
                  <div className="w-4 h-4 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold font-mono">
                    {merchant?.name ? merchant.name[0].toUpperCase() : 'M'}
                  </div>
                  <span className="truncate max-w-[130px] font-semibold">{merchant?.name || 'Merchant Store'}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                    merchant?.environment === 'live'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {merchant?.environment === 'live' ? 'LIVE API' : 'SANDBOX API'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {storeMenuOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                    <div className="px-3 py-2 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Switch Merchant Store
                    </div>
                    <button
                      onClick={() => setStoreMenuOpen(false)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between bg-indigo-50/60 text-indigo-900 font-bold"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-4.5 h-4.5 rounded bg-indigo-600 text-white flex items-center justify-center text-[10px] font-mono">
                          {merchant?.name ? merchant.name[0].toUpperCase() : 'M'}
                        </div>
                        <span className="truncate font-bold">{merchant?.name || 'Current Store'}</span>
                      </div>
                      <Check className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <Link
                        href="/onboarding"
                        onClick={() => setStoreMenuOpen(false)}
                        className="block px-3 py-2 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                      >
                        + Register New Store
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
                {pathname === '/onboarding' ? 'Merchant Account Setup' : (isCustomerContext ? 'Consumer Portal' : 'Razorpay AI Protocol')}
              </span>
            )}
          </div>

          {/* Global Action Utilities */}
          <div className="flex items-center space-x-3">
            {/* Interactive Search Bar Button */}
            {pathname !== '/onboarding' && (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 active:scale-95 border border-slate-200/80 rounded-xl text-slate-600 text-xs font-medium select-none transition-all shadow-2xs"
              >
                <Search className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-semibold text-slate-700 hidden sm:inline">Search app...</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200/90 rounded text-[10px] text-slate-500 font-mono shadow-2xs font-bold">
                  ⌘K
                </kbd>
              </button>
            )}

            {isMerchantContext && pathname !== '/onboarding' ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs hover:bg-indigo-600 transition-colors"
                >
                  {merchant?.name ? merchant.name[0].toUpperCase() : 'A'}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <p className="font-extrabold text-slate-900 truncate text-xs">{merchant?.name || 'Merchant Admin'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">HMAC Authorized Token</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-semibold"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Store Governance</span>
                    </Link>
                    <Link
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-semibold"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>Platform Admin</span>
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 font-bold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : customerName ? (
              <div className="flex items-center space-x-2.5">
                {pathname !== '/customer/chat' && (
                  <Link
                    href="/customer/chat"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
                  >
                    Consumer Chat AI
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setCustomerMenuOpen(!customerMenuOpen)}
                    className="flex items-center space-x-2 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-xs font-semibold text-slate-800 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {customerName[0].toUpperCase()}
                    </div>
                    <span className="truncate max-w-[100px] font-bold text-slate-900">{customerName}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {customerMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                      <div className="px-3 py-2.5 border-b border-slate-100">
                        <p className="font-extrabold text-slate-900 truncate text-xs">{customerName}</p>
                        {customerEmail && <p className="text-[10px] text-slate-400 truncate mt-0.5">{customerEmail}</p>}
                      </div>
                      <Link
                        href="/customer/dashboard"
                        onClick={() => setCustomerMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Spend Vault & Card</span>
                      </Link>
                      <Link
                        href="/customer/addresses"
                        onClick={() => setCustomerMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Delivery Addresses</span>
                      </Link>
                      <Link
                        href="/customer/chat"
                        onClick={() => setCustomerMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                        <span>Shopping Chat</span>
                      </Link>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={handleCustomerLogout}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 font-bold"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <nav className="flex items-center space-x-2">
                <Link
                  href="/customer/chat"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  Consumer Chat AI
                </Link>
                <Link
                  href="/customer/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Sign In
                </Link>
              </nav>
            )}
          </div>
        </div>

        {/* Tier 2: Horizontal Sub-Navigation Strip (Hidden on Onboarding) */}
        {isMerchantContext && pathname !== '/onboarding' && (
          <div className="border-t border-slate-100 bg-white">
            <div className="max-w-7xl mx-auto px-6 flex items-center space-x-7 overflow-x-auto no-scrollbar">
              {merchantTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`py-2.5 text-xs flex items-center space-x-2 border-b-2 transition-all shrink-0 select-none tracking-tight ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600 font-extrabold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 font-semibold'
                    }`}
                  >
                    <Icon size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Command Search Modal Overlay */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
