'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { AgentpayLogo } from '@/components/Logo';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Settings,
  CreditCard,
  Headphones,
  Watch,
  Send,
  MoreHorizontal,
  LogOut,
  X,
  ChevronDown,
  Cpu,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Truck,
  Loader2,
  Check,
  MessageSquare
} from 'lucide-react';
import { CustomerAddress, fetchCustomerAddresses, getCustomerToken } from '@/lib/api';

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
  amount?: number;
  itemName?: string;
  merchantName?: string;
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
  const [customerName, setCustomerName] = useState<string>('Rahul Sharma');
  const [customerEmail, setCustomerEmail] = useState<string>('rahul@example.com');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'billing' | 'security'>('general');

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
    const token = getCustomerToken();
    const name = (typeof window !== 'undefined' && localStorage.getItem('customer_name')) || 'Rahul Sharma';
    const email = (typeof window !== 'undefined' && localStorage.getItem('customer_email')) || 'rahul@example.com';

    if (!token) {
      router.push('/customer/login');
      return;
    }
    setCustomerName(name);
    setCustomerEmail(email);

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

        if (data.recent_purchases && Array.isArray(data.recent_purchases)) {
          setRecentPurchases(data.recent_purchases);
        }

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

    const token = getCustomerToken();
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
          text: 'Delivery Address Required: Please add a shipping destination before confirming your purchase.',
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
        amount: data.amount,
        itemName: data.item_name,
        merchantName: data.merchant_name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
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
    <div className="flex h-screen bg-white text-neutral-900 font-sans antialiased overflow-hidden selection:bg-neutral-200">
      {/* 1. COLLAPSIBLE LEFT SIDEBAR */}
      <aside
        className={`bg-neutral-50/70 border-r border-neutral-200 flex flex-col transition-all duration-200 ease-in-out z-20 ${
          sidebarOpen ? 'w-64' : 'w-0 border-none'
        } overflow-hidden`}
      >
        <div className="p-3 flex items-center justify-between">
          <button
            onClick={startNewChat}
            className="flex-1 flex items-center space-x-2 px-3 h-8 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors shadow-xs group cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-neutral-200/60 rounded-md text-neutral-500 hover:text-neutral-900 transition-colors ml-1 cursor-pointer"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav Shortcuts */}
        <div className="px-2 py-1 space-y-0.5 border-b border-neutral-200 text-xs font-medium text-neutral-600">
          <button
            onClick={() => router.push('/customer/addresses')}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-neutral-100/80 rounded-md transition-colors text-left cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-neutral-500" />
            <span>Delivery Addresses</span>
          </button>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-neutral-100/80 rounded-md transition-colors text-left cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
            <span>Spend Vault & Card</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-neutral-100/80 rounded-md transition-colors text-left cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-neutral-500" />
            <span>Settings</span>
          </button>
        </div>

        {/* Recent Shopping Threads & Purchased Items */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* RECENTLY BOUGHT SECTION */}
          {recentPurchases.length > 0 && (
            <div>
              <div className="px-2.5 flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Recently Bought
                </span>
                <ShoppingBag className="w-3 h-3 text-neutral-500" />
              </div>
              <div className="space-y-1">
                {recentPurchases.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSendMessage(`check order details for ${item.item_name}`)}
                    className="w-full text-left p-2 bg-white hover:bg-neutral-100 border border-neutral-200/80 rounded-md transition-all shadow-2xs group flex items-center justify-between cursor-pointer"
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-neutral-900 truncate text-[11px] group-hover:text-black">
                        {item.item_name}
                      </p>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">{item.merchant_name} • {item.date}</p>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.2 bg-neutral-100 text-neutral-800 font-mono font-semibold text-[10px] rounded border border-neutral-200">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RECENT SEARCHES SECTION */}
          <div>
            <span className="px-2.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Recent Searches
            </span>
            <div className="space-y-0.5">
              {historyThreads.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSendMessage(item.title)}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-neutral-100/80 rounded-md text-xs text-neutral-700 hover:text-neutral-900 transition-colors text-left truncate cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate flex-1 font-medium">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Profile Pill */}
        <div className="p-2 border-t border-neutral-200 relative">
          {isProfileMenuOpen && (
            <div className="absolute bottom-14 left-2 right-2 bg-white rounded-lg border border-neutral-200 shadow-xl p-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                <p className="font-semibold text-neutral-900 truncate text-xs">{customerName}</p>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-mono">{customerEmail}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-neutral-100 text-neutral-800 font-mono font-medium text-[10px] rounded border border-neutral-200">
                  Limit: ₹{remainingLimit.toLocaleString('en-IN')}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  router.push('/customer/dashboard');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-700 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                <span>Spend Vault</span>
              </button>
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-neutral-100 rounded-md transition-colors text-neutral-700 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-500" />
                <span>Settings</span>
              </button>
              <div className="my-1 border-t border-neutral-100" />
              <button
                onClick={() => {
                  localStorage.clear();
                  router.push('/customer/login');
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full flex items-center justify-between p-1.5 hover:bg-neutral-100/80 rounded-md transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center space-x-2 truncate">
              <div className="w-6.5 h-6.5 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                {getInitials(customerName)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-neutral-900 truncate leading-tight">{customerName}</p>
                <p className="text-[10px] text-neutral-400 truncate font-mono">Consumer</p>
              </div>
            </div>
            <MoreHorizontal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </button>
        </div>
      </aside>

      {/* 2. MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        {/* Top Floating Header Bar */}
        <header className="h-12 px-4 flex items-center justify-between border-b border-neutral-200 bg-white z-10">
          <div className="flex items-center space-x-2.5">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 hover:bg-neutral-100 rounded-md text-neutral-600 transition-colors cursor-pointer"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center space-x-2 px-2.5 py-1 bg-neutral-50 rounded-md text-xs font-medium text-neutral-800 border border-neutral-200">
              <AgentpayLogo size={16} />
              <span className="font-semibold text-neutral-900">Shopping Assistant</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Delivery Destination Pill */}
            <button
              onClick={() => setIsAddressModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
              title="Change Delivery Destination"
            >
              <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
              <span className="truncate max-w-[140px]">
                Ship to: <strong className="text-neutral-900 font-semibold">{addresses.find((a) => a.id === selectedAddressId)?.label || (addresses.length > 0 ? addresses[0].label : 'Add Address')}</strong>
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
            </button>

            {/* Live Spend Limit Badge */}
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Limit: ₹{remainingLimit.toLocaleString('en-IN')}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 hover:bg-neutral-100 rounded-md text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat Stream / Hero Greeting Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 pb-32 space-y-6">
          {messages.length === 0 ? (
            /* HERO GREETING & SUGGESTION CARDS */
            <div className="max-w-xl mx-auto mt-10 sm:mt-16 text-center space-y-6">
              <div className="w-11 h-11 rounded-lg bg-neutral-950 text-white flex items-center justify-center mx-auto shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  Autonomous Commerce Assistant
                </h2>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Discover products across registered merchants. AI verifies your bounded spend policy and autonomously settles orders via Razorpay.
                </p>
              </div>

              {/* Quick Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
                <button
                  onClick={() => handleSendMessage('Search for wireless noise cancelling headphones under ₹3000')}
                  className="p-3.5 rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 transition-all text-left group cursor-pointer hover:shadow-xs"
                >
                  <Headphones className="w-4 h-4 text-neutral-700 mb-2.5 group-hover:scale-105 transition-transform" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">ANC Headphones</p>
                    <p className="text-[10.5px] text-neutral-400 mt-0.5">Budget under ₹3,000</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage('Find boAt Bluetooth speakers under ₹2000')}
                  className="p-3.5 rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 transition-all text-left group cursor-pointer hover:shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4 text-neutral-700 mb-2.5 group-hover:scale-105 transition-transform" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">boAt Speakers</p>
                    <p className="text-[10.5px] text-neutral-400 mt-0.5">Speakers under ₹2,000</p>
                  </div>
                </button>

                <button
                  onClick={() => handleSendMessage('Show top smartwatch options with health monitoring')}
                  className="p-3.5 rounded-lg bg-white border border-neutral-200 hover:border-neutral-900 transition-all text-left group cursor-pointer hover:shadow-xs"
                >
                  <Watch className="w-4 h-4 text-neutral-700 mb-2.5 group-hover:scale-105 transition-transform" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Smartwatches</p>
                    <p className="text-[10.5px] text-neutral-400 mt-0.5">Auto-settle with limit</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* CHAT MESSAGE STREAM */
            <div className="max-w-2xl mx-auto space-y-6 pb-28">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-6.5 h-6.5 rounded-md bg-neutral-950 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.status === 'PAYMENT_SETTLED' || msg.status === 'SETTLED' || msg.status === 'ORDER_DETAILS' ? (
                      <div className="bg-white rounded-lg border border-neutral-200 p-5 space-y-4 w-full text-xs animate-in fade-in zoom-in-95 duration-100 shadow-xs">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="font-semibold text-neutral-900 text-xs tracking-tight">
                              {msg.status === 'ORDER_DETAILS' ? 'Order Receipt Details' : 'Autonomous Payment Settled'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-emerald-700">
                            SETTLED ON RAZORPAY
                          </span>
                        </div>

                        {/* Product & Price */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-neutral-900 text-sm">
                              {msg.itemName || (msg.text.includes('for') ? msg.text.split('for')[1].split('on')[0].trim() : 'Product Purchase')}
                            </h4>
                            {msg.merchantName ? (
                              <p className="text-[11px] text-neutral-500 mt-0.5">Merchant: {msg.merchantName}</p>
                            ) : (
                              <p className="text-[11px] text-neutral-500 mt-0.5">Executed directly on Razorpay</p>
                            )}
                          </div>
                          {msg.amount ? (
                            <div className="text-base font-bold text-neutral-900 font-mono shrink-0">
                              ₹{Number(msg.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          ) : null}
                        </div>

                        {/* Razorpay Order & Payment ID */}
                        {msg.razorpayOrderId && (
                          <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200 space-y-1 font-mono text-[11px]">
                            <div className="flex items-center justify-between text-neutral-600">
                              <span className="text-neutral-500 font-sans">Razorpay Order</span>
                              <span className="font-semibold text-neutral-900">{msg.razorpayOrderId}</span>
                            </div>
                            {msg.razorpayPaymentId && (
                              <div className="flex items-center justify-between text-neutral-600">
                                <span className="text-neutral-500 font-sans">Payment ID</span>
                                <span className="font-semibold text-emerald-700">{msg.razorpayPaymentId}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Shipping & Delivery */}
                        {msg.estimatedDeliveryDate && (
                          <div className="bg-neutral-50 rounded-md p-3 border border-neutral-200 space-y-1">
                            <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xs">
                              <Truck className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
                              <span>
                                Expected Delivery:{' '}
                                <strong className="text-neutral-900 font-bold">
                                  {new Date(msg.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </strong>
                              </span>
                            </div>
                            {msg.deliveryAddress && (
                              <div className="flex items-start gap-2 text-[11px] text-neutral-600">
                                <MapPin className="w-3 h-3 text-neutral-400 shrink-0 mt-0.5" />
                                <span className="leading-tight">{msg.deliveryAddress}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Structured Gate Verification Grid */}
                        <div className="pt-3 border-t border-neutral-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="bg-neutral-50 border border-neutral-200 rounded py-1.5 px-2">
                            <span className="text-neutral-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Customer Auth</span>
                            <span className="font-semibold text-emerald-700 font-mono text-[10px]">{msg.customerAuthDecision || 'ALLOW'}</span>
                          </div>
                          <div className="bg-neutral-50 border border-neutral-200 rounded py-1.5 px-2">
                            <span className="text-neutral-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Policy Gate</span>
                            <span className="font-semibold text-emerald-700 font-mono text-[10px]">{msg.policyDecision || 'ALLOW'}</span>
                          </div>
                          <div className="bg-neutral-50 border border-neutral-200 rounded py-1.5 px-2">
                            <span className="text-neutral-400 block text-[9px] uppercase font-bold tracking-wider font-mono">Settlement</span>
                            <span className="font-semibold text-neutral-900 font-mono text-[10px]">AUTONOMOUS</span>
                          </div>
                        </div>

                        {msg.status === 'ORDER_DETAILS' && msg.itemName && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleSendMessage(`buy ${msg.itemName}`)}
                              className="h-8 px-3 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Buy Again</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-neutral-900 text-white font-normal'
                            : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    )}

                    {/* Product Options Grid */}
                    {msg.cards && msg.cards.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        {msg.cards.map((card) => (
                          <div
                            key={card.item_id}
                            className="bg-white p-3.5 rounded-lg border border-neutral-200 hover:border-neutral-400 transition-all flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                                <span>OPTION #{card.option_index}</span>
                                <span className="px-1.5 py-0.2 bg-neutral-100 rounded text-neutral-700 border border-neutral-200">
                                  {card.category}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">
                                {card.item_name}
                              </h4>
                              <p className="text-[11px] text-neutral-500 mt-0.5">by {card.merchant_name}</p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                              <span className="text-xs font-bold font-mono text-neutral-900">
                                ₹{card.price.toLocaleString('en-IN')}
                              </span>
                              <button
                                onClick={() => handleBuyOption(card)}
                                className="h-7 px-2.5 bg-neutral-900 hover:bg-black text-white rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>Instant Buy</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] font-mono text-neutral-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-6.5 h-6.5 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {getInitials(customerName)}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center space-x-2.5">
                  <div className="w-6.5 h-6.5 rounded-md bg-neutral-950 text-white flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-neutral-100 text-neutral-600 rounded-lg px-3.5 py-2 text-xs font-medium border border-neutral-200 flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 text-neutral-700 animate-spin" />
                    <span>Searching catalog & evaluating policy gates...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* 3. FLOATING BOTTOM INPUT DOCK */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-6 z-10">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-white rounded-xl border border-neutral-200 shadow-md p-1.5 flex items-center space-x-2 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all"
            >
              <button
                type="button"
                onClick={() => handleSendMessage('find cheap headphones')}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition-colors ml-1 cursor-pointer"
                title="Search Products"
              >
                <Plus className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask anything or search across merchants..."
                className="flex-1 bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none px-2 font-sans"
                disabled={loading}
              />

              <div className="flex items-center space-x-1.5 pr-1">
                <div
                  className="hidden sm:flex items-center space-x-1 px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[10.5px] font-mono"
                  title="LLM Reasoning Engine Enabled"
                >
                  <Cpu className="w-3 h-3 text-neutral-700" />
                  <span>Think</span>
                </div>

                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || loading}
                  className={`w-7 h-7 rounded-md transition-all flex items-center justify-center cursor-pointer ${
                    inputPrompt.trim() && !loading
                      ? 'bg-neutral-900 hover:bg-black text-white'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
            <p className="text-[10.5px] font-mono text-center text-neutral-400 mt-2">
              Agentpay AI evaluates spend rules & settles transactions directly via Razorpay.
            </p>
          </div>
        </div>
      </main>

      {/* 4. SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-44 bg-neutral-50/60 border-r border-neutral-100 p-2 space-y-0.5 text-xs font-medium text-neutral-600">
                <button
                  onClick={() => setSettingsTab('general')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                    settingsTab === 'general' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'hover:bg-neutral-100'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-500" />
                  <span>General</span>
                </button>
                <button
                  onClick={() => setSettingsTab('billing')}
                  className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                    settingsTab === 'billing' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'hover:bg-neutral-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Billing & Vault</span>
                </button>
              </div>

              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
                {settingsTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-1">Account Information</h3>
                      <p className="text-neutral-500">{customerName} &bull; {customerEmail}</p>
                    </div>
                    <div className="pt-3 border-t border-neutral-100">
                      <h3 className="font-semibold text-neutral-900 mb-1">Theme</h3>
                      <p className="text-neutral-500">Minimal Monochrome Light (System Default)</p>
                    </div>
                  </div>
                )}

                {settingsTab === 'billing' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-1">Active Spend Authorization</h3>
                      <p className="font-mono text-neutral-800">Remaining Balance: ₹{remainingLimit.toLocaleString('en-IN')}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        router.push('/customer/dashboard');
                      }}
                      className="h-8 px-3 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-black transition-colors cursor-pointer"
                    >
                      Manage Spend Vault & Card
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
