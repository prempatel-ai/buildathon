'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CommandSearchModal from '@/components/CommandSearchModal';
import { AgentpayLogo } from '@/components/Logo';
import { removeAuthToken, getMerchantMe, Merchant } from '@/lib/api';
import {
  ChevronDown,
  Search,
  LayoutDashboard,
  Shield,
  Key,
  BarChart3,
  FileText,
  Webhook as WebhookIcon,
  LogOut,
  Check,
  User,
  MapPin,
  ShoppingBag,
  Menu,
  X
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCustomerContext, setIsCustomerContext] = useState(false);
  const [isMerchantContext, setIsMerchantContext] = useState(false);
  const [merchant, setMerchant] = useState<Merchant | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('agentpay_merchant_cache');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const custToken = localStorage.getItem('customer_token');
    const custName = localStorage.getItem('customer_name');
    const custMail = localStorage.getItem('customer_email');
    const merchToken = localStorage.getItem('agentpay_auth_token') || localStorage.getItem('access_token');

    if (pathname === '/' || pathname === '/login' || pathname.startsWith('/admin')) {
      setIsMerchantContext(false);
      setIsCustomerContext(false);
    } else if (pathname.startsWith('/customer')) {
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
        getMerchantMe()
          .then((data) => {
            if (data) {
              setMerchant(data);
              try {
                localStorage.setItem('agentpay_merchant_cache', JSON.stringify(data));
              } catch (e) {}
            }
          })
          .catch(() => {});
      }
    } else {
      setIsCustomerContext(false);
      setIsMerchantContext(false);
    }

    if (custToken) {
      setCustomerName(custName || 'Consumer');
      setCustomerEmail(custMail || '');
    } else {
      setCustomerName(null);
      setCustomerEmail(null);
    }
    setMobileMenuOpen(false);
  }, [pathname]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setUserMenuOpen(false);
        setCustomerMenuOpen(false);
        setStoreMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Policy & Governance', href: '/settings', icon: Shield },
    { label: 'AI Agent Keys', href: '/agents-list', icon: Key },
    { label: 'Analytics', href: '/usage', icon: BarChart3 },
    { label: 'Audit Trail', href: '/audit', icon: FileText },
    { label: 'Webhooks', href: '/webhooks', icon: WebhookIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-2xs">
        {/* Tier 1: Main Global Header */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between">
          {/* Brand & Store Selector */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 group">
              <AgentpayLogo size={20} />
              <span className="font-bold text-neutral-900 tracking-tight text-sm font-sans">Agentpay</span>
            </Link>

            <span className="text-neutral-300 font-mono text-xs shrink-0 hidden xs:inline">/</span>

            {isMerchantContext && pathname !== '/onboarding' ? (
              <div className="relative shrink-0 dropdown-container">
                <button
                  onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 py-0.5 rounded-full bg-neutral-100/70 hover:bg-neutral-100 border border-neutral-200/80 text-xs font-medium text-neutral-800 transition-colors select-none cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate max-w-[85px] sm:max-w-[140px] font-semibold text-neutral-900 text-[11px]">{merchant?.name || 'Merchant Store'}</span>
                  <span className="px-1 py-0.2 rounded text-[8px] sm:text-[8.5px] font-mono font-bold uppercase tracking-wider bg-neutral-200/60 text-neutral-600 shrink-0">
                    {merchant?.environment === 'live' ? 'LIVE' : 'SANDBOX'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
                </button>

                {storeMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-60 bg-white border border-neutral-200 rounded-lg shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100">
                      Active Merchant Context
                    </div>
                    <button
                      onClick={() => setStoreMenuOpen(false)}
                      className="w-full px-3 py-2 text-left flex items-center justify-between bg-neutral-50 text-neutral-900 font-medium cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="truncate font-semibold">{merchant?.name || 'Current Store'}</span>
                      </div>
                      <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                    </button>
                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <Link
                        href="/onboarding"
                        onClick={() => setStoreMenuOpen(false)}
                        className="block px-3 py-1.5 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 text-xs transition-colors"
                      >
                        + Register New Store
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs font-mono text-neutral-500 truncate hidden sm:inline">
                {pathname === '/onboarding' ? 'Account Setup' : (isCustomerContext ? 'Consumer Portal' : 'Razorpay AI Protocol')}
              </span>
            )}
          </div>

          {/* Global Action Utilities */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Command Search Button */}
            {pathname !== '/onboarding' && (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 active:scale-98 border border-neutral-200 rounded-md text-neutral-400 text-xs select-none transition-all cursor-pointer h-7 shrink-0"
                title="Search (⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="text-neutral-500 text-[11px] hidden md:inline">Search...</span>
                <kbd className="px-1 py-0.5 bg-white border border-neutral-200 rounded text-[9px] text-neutral-400 font-mono hidden sm:inline">
                  ⌘K
                </kbd>
              </button>
            )}

            {isMerchantContext && pathname !== '/onboarding' ? (
              <div className="relative shrink-0 dropdown-container flex items-center space-x-1.5">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-7 h-7 min-w-[28px] aspect-square rounded-full bg-neutral-950 text-white font-mono font-bold text-[11px] flex items-center justify-center hover:bg-black transition-colors cursor-pointer shadow-2xs"
                  title="Account Settings"
                >
                  {merchant?.name ? merchant.name[0].toUpperCase() : 'M'}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-9 w-56 bg-white border border-neutral-200 rounded-lg shadow-xl p-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                      <p className="font-semibold text-neutral-900 truncate text-xs">{merchant?.name || 'Merchant Admin'}</p>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Authenticated Merchant</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-neutral-700 hover:bg-neutral-100 font-medium transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Overview</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-neutral-700 hover:bg-neutral-100 font-medium transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Policy & Governance</span>
                    </Link>
                    <Link
                      href="/agents-list"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-neutral-700 hover:bg-neutral-100 font-medium transition-colors"
                    >
                      <Key className="w-3.5 h-3.5 text-neutral-400" />
                      <span>AI Agent Keys</span>
                    </Link>
                    <Link
                      href="/customer/chat"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-neutral-700 hover:bg-neutral-100 font-medium transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Consumer Shopping View</span>
                    </Link>
                    <div className="border-t border-neutral-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}

                {/* Mobile Menu Toggle Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="sm:hidden p-1.5 hover:bg-neutral-100 rounded-md text-neutral-600 cursor-pointer"
                  title="Toggle Navigation Menu"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            ) : customerName ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                {pathname !== '/customer/chat' && (
                  <Link
                    href="/customer/chat"
                    className="px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-900 text-white hover:bg-black transition-colors shadow-xs"
                  >
                    Shopping Chat
                  </Link>
                )}
                <div className="relative shrink-0 dropdown-container">
                  <button
                    onClick={() => setCustomerMenuOpen(!customerMenuOpen)}
                    className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-xs font-medium text-neutral-800 transition-colors cursor-pointer"
                  >
                    <div className="w-5 h-5 min-w-[20px] aspect-square rounded-full bg-neutral-900 text-white flex items-center justify-center text-[9px] font-bold">
                      {customerName[0].toUpperCase()}
                    </div>
                    <span className="truncate max-w-[70px] sm:max-w-[90px] font-semibold text-neutral-900 text-[11px]">{customerName}</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </button>

                  {customerMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-56 bg-white border border-neutral-200 rounded-lg shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-neutral-100">
                        <p className="font-semibold text-neutral-900 truncate text-xs">{customerName}</p>
                        {customerEmail && <p className="text-[10px] text-neutral-400 truncate mt-0.5">{customerEmail}</p>}
                      </div>
                      <Link
                        href="/customer/dashboard"
                        onClick={() => setCustomerMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 font-medium transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Spend Vault & Card</span>
                      </Link>
                      <Link
                        href="/customer/addresses"
                        onClick={() => setCustomerMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 font-medium transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Delivery Addresses</span>
                      </Link>
                      <Link
                        href="/customer/chat"
                        onClick={() => setCustomerMenuOpen(false)}
                        className="flex items-center space-x-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 font-medium transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Shopping Chat</span>
                      </Link>
                      <div className="border-t border-neutral-100 my-1" />
                      <button
                        onClick={handleCustomerLogout}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <nav className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                <Link
                  href="/customer/chat"
                  className="px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-900 text-white hover:bg-black transition-colors"
                >
                  Shopping Chat
                </Link>
                <Link
                  href="/customer/login"
                  className="px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors"
                >
                  Sign In
                </Link>
              </nav>
            )}
          </div>
        </div>

        {/* Tier 2: Horizontal Sub-Navigation Strip (Touch Optimized) */}
        {isMerchantContext && pathname !== '/onboarding' && (
          <div className="border-t border-neutral-100 bg-white">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center space-x-4 sm:space-x-6 overflow-x-auto scrollbar-none -mb-px">
              {merchantTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`py-2 text-xs flex items-center space-x-1.5 border-b-2 transition-all shrink-0 select-none whitespace-nowrap ${
                      isActive
                        ? 'border-neutral-900 text-neutral-900 font-semibold'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 font-medium'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`} />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile Slide-Down Drawer for Merchant Navigation */}
        {mobileMenuOpen && isMerchantContext && (
          <div className="sm:hidden border-t border-neutral-200 bg-neutral-50 p-3 space-y-1 animate-in slide-in-from-top duration-150">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2.5 py-1 font-mono">
              Merchant Navigation
            </div>
            {merchantTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive ? 'bg-white text-neutral-900 font-semibold shadow-2xs border border-neutral-200' : 'text-neutral-700 hover:bg-neutral-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Command Search Modal Overlay */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
