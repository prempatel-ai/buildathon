'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar';
import {
  LayoutGrid,
  Home,
  Activity,
  BarChart3,
  Settings,
  ShieldCheck,
  Key,
  FileText,
  Webhook,
  LogOut,
  Store,
  UserCheck
} from 'lucide-react';
import { removeAuthToken } from '@/lib/api';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCustomerContext, setIsCustomerContext] = useState(false);
  const [isMerchantContext, setIsMerchantContext] = useState(false);

  useEffect(() => {
    const custToken = localStorage.getItem('customer_token');
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
    } else {
      setIsCustomerContext(Boolean(custToken && !merchToken));
      setIsMerchantContext(Boolean(merchToken));
    }
  }, [pathname]);

  const handleLogout = () => {
    removeAuthToken();
    localStorage.removeItem('customer_token');
    router.push('/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Header */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8.5 h-8.5 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white text-sm group-hover:bg-indigo-600 transition-colors shadow-2xs">
              AP
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-base">Agentpay</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
              {isCustomerContext
                ? 'Consumer Portal'
                : isMerchantContext
                ? 'Merchant Admin'
                : 'Razorpay AI Protocol'}
            </span>
          </Link>
        </div>

        {/* Shadcn Menubar Component Integration for Merchant Side */}
        {isMerchantContext ? (
          <div className="flex items-center space-x-3">
            <Menubar className="border-slate-200 bg-slate-50/70 shadow-2xs">
              {/* Menu 1: Store & Catalog */}
              <MenubarMenu>
                <MenubarTrigger className="text-xs font-semibold cursor-pointer">
                  <Store className="mr-1.5 size-3.5 text-indigo-600" />
                  Store & Catalog
                </MenubarTrigger>
                <MenubarContent className="bg-white border border-slate-200 shadow-lg text-xs font-sans">
                  <MenubarItem onClick={() => router.push('/dashboard')} className="cursor-pointer">
                    <Home className="mr-2 size-3.5 text-slate-500" />
                    Dashboard & Products
                  </MenubarItem>
                  <MenubarItem onClick={() => router.push('/dashboard')} className="cursor-pointer">
                    <LayoutGrid className="mr-2 size-3.5 text-slate-500" />
                    Agent JSON-LD Schema
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              {/* Menu 2: Governance & Rules */}
              <MenubarMenu>
                <MenubarTrigger className="text-xs font-semibold cursor-pointer">
                  <ShieldCheck className="mr-1.5 size-3.5 text-emerald-600" />
                  Governance
                </MenubarTrigger>
                <MenubarContent className="bg-white border border-slate-200 shadow-lg text-xs font-sans">
                  <MenubarItem onClick={() => router.push('/settings')} className="cursor-pointer">
                    <Settings className="mr-2 size-3.5 text-slate-500" />
                    Policy Rules & Limits
                  </MenubarItem>
                  <MenubarItem onClick={() => router.push('/agents-list')} className="cursor-pointer">
                    <Key className="mr-2 size-3.5 text-slate-500" />
                    AI Agent API Keys
                  </MenubarItem>
                  <MenubarSeparator />
                  <MenubarItem onClick={() => router.push('/audit')} className="cursor-pointer">
                    <FileText className="mr-2 size-3.5 text-slate-500" />
                    Immutable Audit Log
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              {/* Menu 3: Integrations & Analytics */}
              <MenubarMenu>
                <MenubarTrigger className="text-xs font-semibold cursor-pointer">
                  <BarChart3 className="mr-1.5 size-3.5 text-amber-600" />
                  Analytics & Hooks
                </MenubarTrigger>
                <MenubarContent className="bg-white border border-slate-200 shadow-lg text-xs font-sans">
                  <MenubarItem onClick={() => router.push('/usage')} className="cursor-pointer">
                    <Activity className="mr-2 size-3.5 text-slate-500" />
                    Executive Analytics
                  </MenubarItem>
                  <MenubarItem onClick={() => router.push('/webhooks')} className="cursor-pointer">
                    <Webhook className="mr-2 size-3.5 text-slate-500" />
                    Webhooks & Notifications
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Standard Customer / Public Nav */
          <nav className="flex items-center space-x-2">
            <Link
              href="/customer/chat"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                pathname === '/customer/chat'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 bg-slate-50/50'
              }`}
            >
              Consumer Chat AI
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 bg-slate-50/50"
            >
              Merchant Sign In
            </Link>
            <Link
              href="/customer/dashboard"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 bg-slate-50/50 flex items-center space-x-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Consumer Portal</span>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
