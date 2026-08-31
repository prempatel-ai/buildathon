'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  MessageSquare,
  Settings,
  User,
  CreditCard,
  Sparkles,
  Globe,
  Headphones,
  Laptop,
  Watch,
  Smartphone,
  Send,
  Mic,
  MoreHorizontal,
  Check,
  ExternalLink,
  ShieldCheck,
  LogOut,
  X,
  ChevronRight,
  ChevronDown,
  Moon,
  Sun,
  Sliders,
  Cpu,
  Lock,
  Compass,
  FileText,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Truck,
  Loader2
} from 'lucide-react';
import { CustomerAddress, fetchCustomerAddresses, createCustomerAddress } from '@/lib/api';

interface ProductCard {
  option_index: number;
  item_id: string;
  item_name: string;
  merchant_id: string;
  merchant_name: string;
  price: number;
  stock: number;
  category: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  cards?: ProductCard[];
  status?: string;
  customerAuthDecision?: string;
  policyDecision?: string;
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentLinkUrl?: string;
  estimatedDeliveryDate?: string;
  deliveryAddress?: string;
  timestamp: string;
}

interface ChatThreadHistory {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

export default function ConsumerChatPage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState<string>('Prem Patel');
  const [customerEmail, setCustomerEmail] = useState<string>('customer@example.com');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  
  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'billing' | 'security' | 'personalization'>('general');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  // Profile Popover State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // History State
  const [historyThreads, setHistoryThreads] = useState<ChatThreadHistory[]>([
    {
      id: 'thread_hist_1',
      title: 'Find cheap headphones',
      timestamp: 'Today',
      messages: [],
    },
    {
      id: 'thread_hist_2',
      title: 'Gaming Laptop under ₹80k',
      timestamp: 'Yesterday',
      messages: [],
    },
    {
      id: 'thread_hist_3',
      title: 'Wireless Earbuds with ANC',
      timestamp: '3 days ago',
      messages: [],
    },
  ]);

  // Spend Authorization Balance State
  const [spendLimit, setSpendLimit] = useState<number>(5000);
  const [remainingLimit, setRemainingLimit] = useState<number>(3800);
  const [cardLast4, setCardLast4] = useState<string>('4242');

  // Address Selection & Gating State
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  interface RecentPurchase {
    id: string;
    item_name: string;
    merchant_name: string;
    price: number;
    date: string;
  }

  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('customer_token') || localStorage.getItem('agentpay_customer_token');
    const name = localStorage.getItem('customer_name') || 'Prem Patel';
    const email = localStorage.getItem('customer_email') || 'customer@example.com';
    
    if (!token) {
      router.push('/customer/login');
      return;
    }
    setCustomerName(name);
    setCustomerEmail(email);

    // Fetch Spend Limit & Realtime DB Activity
    fetchAuthLimit(token);
    loadAddresses();
  }, [router]);

  const loadAddresses = async () => {
    try {
      const data = await fetchCustomerAddresses();
      setAddresses(data);
      if (data.length > 0) {
        const def = data.find((a) => a.is_default) || data[0];
        setSelectedAddressId(def.id);
      }
    } catch (e) {
      console.log('Error loading customer addresses:', e);
    }
  };

  const fetchAuthLimit = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer/authorizations/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.initial_limit) setSpendLimit(data.initial_limit);
        if (data.remaining_limit !== undefined) setRemainingLimit(data.remaining_limit);
        if (data.card_last4) setCardLast4(data.card_last4);

        // Live Real-Time Database Fetched Purchases
        if (data.recent_purchases && Array.isArray(data.recent_purchases)) {
          setRecentPurchases(data.recent_purchases);
        }

        // Live Real-Time Database Fetched Searches
        if (data.recent_searches && Array.isArray(data.recent_searches) && data.recent_searches.length > 0) {
          setHistoryThreads(data.recent_searches.map((s: any) => ({
            id: s.id,
            title: s.title,
            timestamp: s.timestamp,
            messages: []
          })));
        }
      }
    } catch (e) {
      console.log('Error fetching limit info:', e);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startNewChat = () => {
    setMessages([]);
    setThreadId(null);
    setInputPrompt('');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || loading) return;

    const token = localStorage.getItem('customer_token') || localStorage.getItem('agentpay_customer_token');
    if (!token) {
      router.push('/customer/login');
      return;
    }

    const buyKeywords = ['buy', 'purchase', 'order', 'checkout', 'confirm'];
    const isBuyIntent = buyKeywords.some((k) => promptToSend.toLowerCase().includes(k));

    if (isBuyIntent && addresses.length === 0) {
      setIsAddressModalOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: '⚠️ **Delivery Address Required**: Please add a shipping destination before confirming your purchase.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setLoading(true);

    // Add to history thread title if first message
    if (messages.length === 0) {
      const newHistItem: ChatThreadHistory = {
        id: `thread_${Date.now()}`,
        title: promptToSend.length > 25 ? `${promptToSend.substring(0, 25)}...` : promptToSend,
        timestamp: 'Just now',
        messages: [userMsg],
      };
      setHistoryThreads((prev) => [newHistItem, ...prev]);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/customer/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: promptToSend,
          thread_id: threadId,
          address_id: selectedAddressId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Chat request failed');
      }

      if (data.thread_id) {
        setThreadId(data.thread_id);
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.response_message || 'Search completed.',
        cards: data.search_results || undefined,
        status: data.status,
        customerAuthDecision: data.customer_auth_decision,
        policyDecision: data.policy_decision,
        transactionId: data.transaction_id,
        razorpayOrderId: data.razorpay_order_id,
        razorpayPaymentId: data.razorpay_payment_id,
        paymentLinkUrl: data.payment_link_url,
        estimatedDeliveryDate: data.estimated_delivery_date,
        deliveryAddress: data.delivery_address,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Re-fetch limit after potential purchase settlement
      fetchAuthLimit(token);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Error processing query: ${err.message || 'Failed to complete task.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyOption = (opt: ProductCard) => {
    handleSendMessage(`buy option ${opt.option_index} - ${opt.item_name}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex h-screen bg-[#f9f9f9] text-slate-900 font-sans antialiased overflow-hidden selection:bg-slate-200">
      {/* ========================================================================= */}
      {/* 1. COLLAPSIBLE LEFT SIDEBAR (ChatGPT Style)                                */}
      {/* ========================================================================= */}
      <aside
        className={`bg-[#f9f9f9] border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out z-20 ${
          sidebarOpen ? 'w-[260px]' : 'w-0 border-none'
        } overflow-hidden`}
      >
        <div className="p-3 flex items-center justify-between">
          <button
            onClick={startNewChat}
            className="flex-1 flex items-center space-x-2.5 px-3 py-2 bg-white hover:bg-slate-100/80 border border-slate-200/90 text-slate-800 rounded-lg text-sm font-medium transition-colors shadow-2xs group"
          >
            <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="truncate">New chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-200/60 rounded-lg text-slate-500 hover:text-slate-800 transition-colors ml-1"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Shortcuts */}
        <div className="px-2 py-1 space-y-0.5 border-b border-slate-200/60 text-xs font-medium text-slate-600">
          <button
            onClick={() => router.push('/customer/addresses')}
            className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-200/50 rounded-lg transition-colors text-left"
          >
            <MapPin className="w-4 h-4 text-slate-500" />
            <span>Delivery Addresses</span>
          </button>
          <button
            onClick={() => router.push('/customer/authorizations')}
            className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-200/50 rounded-lg transition-colors text-left"
          >
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span>Spend Vault & Card</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-200/50 rounded-lg transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Settings</span>
          </button>
        </div>

        {/* Recent Shopping Threads & Purchased Items */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {/* RECENTLY BOUGHT SECTION */}
          <div>
            <div className="px-3 flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Recently Bought
              </h3>
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="space-y-1.5">
              {recentPurchases.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSendMessage(`check order details for ${item.item_name}`)}
                  className="w-full text-left p-2.5 bg-white hover:bg-slate-100/90 border border-slate-200/80 rounded-xl transition-all shadow-2xs group flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-slate-900 truncate text-[11px] group-hover:text-indigo-600 transition-colors">
                      {item.item_name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{item.merchant_name} • {item.date}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono font-extrabold text-[10px] rounded-lg border border-emerald-200/60">
                    ₹{item.price.toLocaleString('en-IN')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* RECENT SEARCHES SECTION */}
          <div>
            <h3 className="px-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
              Recent Searches
            </h3>
            <div className="space-y-0.5">
              {historyThreads.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSendMessage(item.title)}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-slate-200/60 rounded-xl text-xs text-slate-700 hover:text-slate-900 transition-colors text-left group truncate"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-indigo-600 transition-colors" />
                  <span className="truncate flex-1 font-medium">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Profile Pill (from ChatGPT Screenshot 2 & 3) */}
        <div className="p-2 border-t border-slate-200/80 relative">
          {/* Profile Popover Menu */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-16 left-2 right-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 text-xs z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-900 truncate">{customerName}</p>
                <p className="text-[11px] text-slate-400 truncate">{customerEmail}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[10px] rounded-full">
                  Limit: ₹{remainingLimit.toLocaleString('en-IN')} Available
                </span>
              </div>
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  router.push('/customer/dashboard');
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
              >
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span>Spend Authorization Vault</span>
              </button>
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Settings</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push('/customer/login');
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Log out</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full flex items-center justify-between p-2 hover:bg-slate-200/60 rounded-xl transition-colors text-left"
          >
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(customerName)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{customerName}</p>
                <p className="text-[10px] text-slate-400 truncate">Agentpay Pro</p>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CHAT AREA (ChatGPT Layout)                                        */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        {/* Top Floating Header Bar */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                title="Open sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            {/* Clean Model / Chat Selector */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-100/80 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200/60 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" />
              <span>Agentpay Shopping AI</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Delivery Destination Pill */}
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-full text-xs font-medium text-slate-700 shadow-2xs transition-colors"
              title="Change Delivery Destination"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[180px]">
                Ship to:{' '}
                <strong className="text-slate-900 font-semibold">
                  {addresses.find((a) => a.id === selectedAddressId)?.label || (addresses.length > 0 ? addresses[0].label : 'Add Address')}
                </strong>
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {/* Live Spend Limit Badge */}
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 rounded-full text-xs font-semibold transition-colors"
            >
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Limit: ₹{remainingLimit.toLocaleString('en-IN')}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Messages Feed or ChatGPT Hero Empty State */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 space-y-6">
          {messages.length === 0 ? (
            /* ========================================================================= */
            /* EMPTY STATE HERO (ChatGPT Screenshot 1 & 2)                               */
            /* ========================================================================= */
            <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center text-center pt-8 pb-16">
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-8 tracking-tight">
                What&apos;s on the agenda today?
              </h1>

              {/* Suggested Prompt Action Cards (ChatGPT Screenshot 1) */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleSendMessage('find cheap headphones')}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-left transition-all hover:border-slate-300 group flex flex-col justify-between"
                >
                  <Headphones className="w-5 h-5 text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Find noise-canceling headphones</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Search top catalog deals</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage('find wireless earbuds')}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-left transition-all hover:border-slate-300 group flex flex-col justify-between"
                >
                  <Smartphone className="w-5 h-5 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Wireless Earbuds with fast charge</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Compare price & stock</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage('find gaming smartwatch')}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-left transition-all hover:border-slate-300 group flex flex-col justify-between"
                >
                  <Watch className="w-5 h-5 text-amber-600 mb-3 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Smartwatch health tracking</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Auto-settle with limit</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* CHAT MESSAGE STREAM                                                       */
            /* ========================================================================= */
            <div className="max-w-2xl mx-auto space-y-6 pb-28">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-1 shadow-xs">
                      AI
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white font-normal rounded-tr-none shadow-xs'
                          : 'bg-slate-100/80 text-slate-800 rounded-tl-none border border-slate-200/60'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Autonomous Execution / Gate Badges */}
                      {msg.status && msg.status !== 'COMPLETED' && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs space-y-1.5 font-mono">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-500 font-semibold text-[11px]">Execution Status:</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                msg.status === 'PAYMENT_SETTLED' || msg.status === 'SETTLED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {msg.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-200/80 mt-1">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Customer Auth Gate</span>
                              <span className="font-bold text-emerald-700">{msg.customerAuthDecision || 'ALLOW'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Merchant Policy Gate</span>
                              <span className="font-bold text-emerald-700">{msg.policyDecision || 'ALLOW'}</span>
                            </div>
                          </div>

                          {msg.razorpayOrderId && (
                            <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                              <div>Razorpay Order: <span className="font-mono font-bold text-slate-900">{msg.razorpayOrderId}</span></div>
                              {msg.razorpayPaymentId && (
                                <div className="text-emerald-700 font-semibold">
                                  Payment Capture: <span className="font-mono font-bold">{msg.razorpayPaymentId}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {msg.estimatedDeliveryDate && (
                            <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl p-2.5 text-xs text-emerald-950 space-y-1 mt-2">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>
                                  Expected Delivery:{' '}
                                  {new Date(msg.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              {msg.deliveryAddress && (
                                <div className="text-[11px] text-emerald-800 flex items-start gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                  <span className="truncate">Shipping to: {msg.deliveryAddress}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Product Options Grid rendered in Assistant Response */}
                    {msg.cards && msg.cards.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        {msg.cards.map((card) => (
                          <div
                            key={card.item_id}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                                <span>Option #{card.option_index}</span>
                                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                                  {card.merchant_name}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {card.item_name}
                              </h3>
                              <div className="text-sm font-extrabold text-slate-900 mt-2">
                                ₹{card.price.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">Stock: {card.stock} units available</div>
                            </div>

                            <button
                              onClick={() => handleBuyOption(card)}
                              className="mt-3 w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-indigo-600 active:scale-[0.98] text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center space-x-2 group/btn"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-indigo-300 group-hover/btn:text-white transition-colors" />
                              <span>Confirm & Buy</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-all" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-1 shadow-xs">
                      {getInitials(customerName)}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 animate-pulse">
                    AI
                  </div>
                  <div className="bg-slate-100 text-slate-500 rounded-2xl px-4 py-2.5 text-xs font-medium border border-slate-200/60 flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                    <span>Searching catalog & evaluating gates...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. FLOATING BOTTOM INPUT DOCK (ChatGPT Style)                             */}
        {/* ========================================================================= */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-6 z-10">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-lg hover:border-slate-300 transition-all p-2 flex items-center space-x-2 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-400"
            >
              <button
                type="button"
                onClick={() => handleSendMessage('find cheap headphones')}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors ml-1"
                title="Search Products"
              >
                <Plus className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask anything or search across merchants..."
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none px-2"
                disabled={loading}
              />

              {/* Action Buttons Right (ChatGPT Screenshot 1) */}
              <div className="flex items-center space-x-1.5 pr-1">
                <button
                  type="button"
                  className="hidden sm:flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 text-slate-600 rounded-full text-xs font-medium transition-colors"
                  title="LLM Reasoning Engine Enabled"
                >
                  <Cpu className="w-3 h-3 text-indigo-600" />
                  <span>Think</span>
                </button>

                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || loading}
                  className={`p-2.5 rounded-full transition-all ${
                    inputPrompt.trim() && !loading
                      ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm scale-100'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed scale-95'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Agentpay AI evaluates spend rules & settles transactions directly via Razorpay.
            </p>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 4. CHATGPT SETTINGS MODAL (ChatGPT Screenshot 4)                          */}
      {/* ========================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-semibold text-slate-800">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Modal Left Navigation */}
              <div className="w-48 bg-slate-50/80 border-r border-slate-100 p-2 space-y-0.5 text-xs font-medium text-slate-600">
                <button
                  onClick={() => setSettingsTab('general')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                    settingsTab === 'general' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'hover:bg-slate-200/60'
                  }`}
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>General</span>
                </button>
                <button
                  onClick={() => setSettingsTab('billing')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                    settingsTab === 'billing' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'hover:bg-slate-200/60'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>Billing & Vault</span>
                </button>
                <button
                  onClick={() => setSettingsTab('security')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                    settingsTab === 'security' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'hover:bg-slate-200/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Security & Login</span>
                </button>
              </div>

              {/* Modal Tab Content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {settingsTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">Appearance</h3>
                      <p className="text-xs text-slate-500 mb-3">Customize how Agentpay looks on your device.</p>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setThemeMode('light')}
                          className={`flex-1 p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                            themeMode === 'light'
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <Sun className="w-4 h-4" />
                          <span>Light</span>
                        </button>
                        <button
                          onClick={() => setThemeMode('dark')}
                          className={`flex-1 p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                            themeMode === 'dark'
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <Moon className="w-4 h-4" />
                          <span>Dark</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">Language</h3>
                      <p className="text-xs text-slate-500 mb-2">Primary conversational language for Groq LLM.</p>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none">
                        <option>English (Auto-detect)</option>
                        <option>Hindi (हिंदी)</option>
                        <option>Gujarati (ગુજરાતી)</option>
                      </select>
                    </div>
                  </div>
                )}

                {settingsTab === 'billing' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">Spend Authorization Vault</h3>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Authorized Spend Cap</span>
                        <span className="font-bold text-slate-900">₹{spendLimit.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Remaining Balance</span>
                        <span className="font-bold text-emerald-700">₹{remainingLimit.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                        <span>Tokenized Card</span>
                        <span className="font-bold text-slate-900">Visa ending in {cardLast4}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        router.push('/customer/dashboard');
                      }}
                      className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
                    >
                      Manage Vault & Limits
                    </button>
                  </div>
                )}

                {settingsTab === 'security' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">Account Security</h3>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                      <p className="font-bold flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>Spend Authorization Secured</span>
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        Purchases require strict customer limit verification ($\le$ ₹{remainingLimit}).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Destination Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Delivery Address</h3>
                  <p className="text-[11px] text-slate-500">Autonomous orders will be shipped here</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-500 mb-4">No delivery addresses found. Add one to enable autonomous purchasing.</p>
                <button
                  onClick={() => {
                    setIsAddressModalOpen(false);
                    router.push('/customer/addresses');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Address
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setIsAddressModalOpen(false);
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      selectedAddressId === addr.id
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{addr.label}</span>
                        {addr.is_default && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-full font-semibold border border-emerald-200">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium">{addr.recipient_name} • {addr.phone}</p>
                      <p className="text-slate-500 text-[11px] leading-tight">
                        {addr.line1}, {addr.city} ({addr.postal_code})
                      </p>
                    </div>
                    <div className="pt-0.5 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedAddressId === addr.id
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedAddressId === addr.id && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsAddressModalOpen(false);
                  router.push('/customer/addresses');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Manage All Addresses
              </button>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
