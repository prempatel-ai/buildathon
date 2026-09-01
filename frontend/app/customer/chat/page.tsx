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
  ArrowUp,
  MoreHorizontal,
  LogOut,
  X,
  ChevronDown,
  ShoppingBag,
  ArrowRight,
  MapPin,
  Truck,
  Loader2,
  Check,
  MessageSquare,
  Trash2,
  Building2,
  Home,
  Briefcase,
  Phone,
  Sparkles,
  Bell,
  Tag,
  Gift,
  Percent
} from 'lucide-react';
import { CustomerAddress, fetchCustomerAddresses, createCustomerAddress, CreateAddressPayload, getCustomerToken, UpsellCrossSellSuggestion, CampaignOfferItem } from '@/lib/api';

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

interface RecommendationCard {
  id: string;
  customer_id: string;
  source_transaction_id: string;
  recommended_item_id: string;
  recommended_merchant_id: string;
  item_name: string;
  merchant_name: string;
  price: number;
  category: string;
  stock: number;
  reason: string;
  status: string;
  shown_at: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  cards?: ProductCard[];
  recommendations?: RecommendationCard[];
  suggestions?: UpsellCrossSellSuggestion[];
  pendingOffers?: CampaignOfferItem[];
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
  updatedAt?: number;
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
  const [historyThreads, setHistoryThreads] = useState<ChatThreadHistory[]>([]);

  // Spend Authorization Balance State
  const [spendLimit, setSpendLimit] = useState<number>(0);
  const [remainingLimit, setRemainingLimit] = useState<number | null>(null);
  const [hasActiveAuth, setHasActiveAuth] = useState<boolean>(false);
  const [cardLast4, setCardLast4] = useState<string>('4242');

  // Address Selection & Gating State
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [newAddressForm, setNewAddressForm] = useState<CreateAddressPayload>({
    label: 'Home',
    recipient_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'IN',
    is_default: false,
  });

  // Re-Engagement Campaign Offers & Push Notification State
  const [activeOffers, setActiveOffers] = useState<CampaignOfferItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string; offer?: CampaignOfferItem } | null>(null);

  const triggerBrowserPushNotification = (offer: CampaignOfferItem) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`🎉 Special ${offer.discount_value}% Discount on ${offer.item_name}!`, {
          body: `Save ₹${(offer.original_price - offer.discounted_price).toLocaleString('en-IN')} on your previously explored item.`,
          icon: '/icon.svg'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(`🎉 Special ${offer.discount_value}% Discount on ${offer.item_name}!`, {
              body: `Save ₹${(offer.original_price - offer.discounted_price).toLocaleString('en-IN')} on your previously explored item.`,
              icon: '/icon.svg'
            });
          }
        });
      }
    }
  };

  interface RecentPurchase {
    id: string;
    item_name: string;
    merchant_name: string;
    price: number;
    date: string;
  }

  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Initial User & Restores Chat History from localStorage
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

    // Restore persistent threads from localStorage
    try {
      const storedThreadsRaw = localStorage.getItem(`agentpay_threads_${email}`);
      const activeThreadId = localStorage.getItem(`agentpay_active_thread_${email}`);
      
      let parsedThreads: ChatThreadHistory[] = [];
      if (storedThreadsRaw) {
        parsedThreads = JSON.parse(storedThreadsRaw);
        setHistoryThreads(parsedThreads);
      }

      if (activeThreadId && parsedThreads.length > 0) {
        const found = parsedThreads.find((t) => t.id === activeThreadId);
        if (found && found.messages && found.messages.length > 0) {
          setThreadId(found.id);
          setMessages(found.messages);
        }
      }
    } catch (err) {
      console.log('Error restoring stored chat threads:', err);
    }

    fetchAuthLimit(token);
    loadAddresses();
  }, [router]);

  const saveThreadsToStorage = (threads: ChatThreadHistory[], activeId: string | null) => {
    const email = (typeof window !== 'undefined' && localStorage.getItem('customer_email')) || 'rahul@example.com';
    try {
      localStorage.setItem(`agentpay_threads_${email}`, JSON.stringify(threads));
      if (activeId) {
        localStorage.setItem(`agentpay_active_thread_${email}`, activeId);
      } else {
        localStorage.removeItem(`agentpay_active_thread_${email}`);
      }
    } catch (e) {
      console.log('Error saving threads to localStorage:', e);
    }
  };

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
        const activeAuth = data.active_authorization;
        if (activeAuth) {
          setHasActiveAuth(true);
          setSpendLimit(Number(activeAuth.spend_limit) || 0);
          setRemainingLimit(Number(activeAuth.remaining_limit) || 0);
          if (activeAuth.card_last4) setCardLast4(activeAuth.card_last4);
        } else {
          setHasActiveAuth(false);
          setSpendLimit(0);
          setRemainingLimit(0);
        }

        if (data.recent_purchases && Array.isArray(data.recent_purchases)) {
          setRecentPurchases(data.recent_purchases);
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
    const email = (typeof window !== 'undefined' && localStorage.getItem('customer_email')) || 'rahul@example.com';
    localStorage.removeItem(`agentpay_active_thread_${email}`);
  };

  const handleSelectThread = (thread: ChatThreadHistory) => {
    setThreadId(thread.id);
    setMessages(thread.messages || []);
    const email = (typeof window !== 'undefined' && localStorage.getItem('customer_email')) || 'rahul@example.com';
    localStorage.setItem(`agentpay_active_thread_${email}`, thread.id);
  };

  const handleDeleteThread = (e: React.MouseEvent, targetThreadId: string) => {
    e.stopPropagation();
    const updated = historyThreads.filter((t) => t.id !== targetThreadId);
    setHistoryThreads(updated);
    if (threadId === targetThreadId) {
      startNewChat();
    } else {
      saveThreadsToStorage(updated, threadId);
    }
  };

  const handleSendMessage = async (customPrompt?: string, sourceRecommendationId?: string, sourceCampaignOfferId?: string) => {
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

    const currentThreadId = threadId || `thread_${Date.now()}`;
    if (!threadId) {
      setThreadId(currentThreadId);
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!customPrompt) setInputPrompt('');
    setLoading(true);

    // Update history threads
    let updatedThreads = [...historyThreads];
    const existingIdx = updatedThreads.findIndex((t) => t.id === currentThreadId);
    if (existingIdx >= 0) {
      updatedThreads[existingIdx] = {
        ...updatedThreads[existingIdx],
        messages: newMessages,
        updatedAt: Date.now(),
      };
    } else {
      const newThread: ChatThreadHistory = {
        id: currentThreadId,
        title: promptToSend.length > 28 ? `${promptToSend.substring(0, 28)}...` : promptToSend,
        timestamp: 'Just now',
        updatedAt: Date.now(),
        messages: newMessages,
      };
      updatedThreads = [newThread, ...updatedThreads];
    }
    setHistoryThreads(updatedThreads);
    saveThreadsToStorage(updatedThreads, currentThreadId);

    try {
      const res = await fetch(`${API_BASE_URL}/customer/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: promptToSend,
          thread_id: currentThreadId,
          address_id: selectedAddressId,
          source_recommendation_id: sourceRecommendationId || undefined,
          source_campaign_offer_id: sourceCampaignOfferId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Chat request failed');
      }

      if (data.thread_id && data.thread_id !== currentThreadId) {
        setThreadId(data.thread_id);
      }

      if (data.pending_offers && data.pending_offers.length > 0) {
        setActiveOffers(data.pending_offers);
        const topOffer = data.pending_offers[0];
        setActiveToast({
          title: `Special ${topOffer.discount_value}% Discount Unlocked!`,
          message: `Save ₹${(topOffer.original_price - topOffer.discounted_price).toLocaleString('en-IN')} on ${topOffer.item_name}`,
          offer: topOffer
        });
        triggerBrowserPushNotification(topOffer);
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.response_message || 'Search completed.',
        cards: data.search_results || undefined,
        recommendations: data.recommendations || undefined,
        suggestions: data.suggestions || undefined,
        pendingOffers: data.pending_offers || undefined,
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

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Persist completed conversation turn to localStorage
      const threadToUpdateIdx = updatedThreads.findIndex((t) => t.id === currentThreadId);
      if (threadToUpdateIdx >= 0) {
        updatedThreads[threadToUpdateIdx] = {
          ...updatedThreads[threadToUpdateIdx],
          messages: finalMessages,
          updatedAt: Date.now(),
        };
      }
      setHistoryThreads(updatedThreads);
      saveThreadsToStorage(updatedThreads, currentThreadId);

      fetchAuthLimit(token);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Error processing query: ${err.message || 'Failed to complete task.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const finalMessages = [...newMessages, errMsg];
      setMessages(finalMessages);

      const threadToUpdateIdx = updatedThreads.findIndex((t) => t.id === currentThreadId);
      if (threadToUpdateIdx >= 0) {
        updatedThreads[threadToUpdateIdx] = {
          ...updatedThreads[threadToUpdateIdx],
          messages: finalMessages,
          updatedAt: Date.now(),
        };
      }
      setHistoryThreads(updatedThreads);
      saveThreadsToStorage(updatedThreads, currentThreadId);
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

          {/* RECENT CONVERSATIONS / THREADS SECTION */}
          <div>
            <span className="px-2.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
              Recent Conversations
            </span>
            {historyThreads.length === 0 ? (
              <div className="px-2.5 py-2 text-[11px] text-neutral-400 font-mono">
                No saved chats yet.
              </div>
            ) : (
              <div className="space-y-0.5">
                {historyThreads.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectThread(item)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left truncate cursor-pointer group ${
                      threadId === item.id ? 'bg-neutral-200/80 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-100/80'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate flex-1">{item.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 rounded transition-opacity cursor-pointer shrink-0"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3 h-3 text-neutral-400 hover:text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  {hasActiveAuth ? `Limit: ₹${(remainingLimit || 0).toLocaleString('en-IN')}` : 'Limit: Not Configured'}
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
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-7 h-7 min-w-[28px] max-w-[28px] aspect-square rounded-full bg-neutral-950 text-white flex items-center justify-center font-mono font-bold text-[11px] shrink-0 shadow-2xs">
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
              <span className={`w-1.5 h-1.5 rounded-full ${hasActiveAuth ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{hasActiveAuth ? `Limit: ₹${(remainingLimit || 0).toLocaleString('en-IN')}` : 'Set Spend Limit'}</span>
            </button>

            {/* Notification Bell for Personalized Re-Engagement Discount Offers */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-1.5 hover:bg-neutral-100 rounded-md text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
                title="Notifications & Active Discounts"
              >
                <Bell className="w-4 h-4" />
                {activeOffers.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-bold text-neutral-900 font-mono uppercase">Special Offers ({activeOffers.length})</span>
                    </div>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {activeOffers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-400 font-mono">
                        No active discount offers right now.
                      </div>
                    ) : (
                      activeOffers.map((off) => (
                        <div key={off.id} className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-md space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9.5px] font-bold font-mono">
                              {off.discount_value}% OFF
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400">by {off.merchant_name}</span>
                          </div>
                          <p className="text-xs font-bold text-neutral-900 truncate">{off.item_name}</p>
                          <div className="flex items-center justify-between pt-1">
                            <div className="text-xs font-mono">
                              <span className="line-through text-neutral-400 text-[10px] mr-1.5">₹{off.original_price}</span>
                              <span className="font-bold text-neutral-900">₹{off.discounted_price}</span>
                            </div>
                            <button
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                handleSendMessage(`buy ${off.item_name}`, undefined, off.id);
                              }}
                              className="h-6 px-2 bg-neutral-900 hover:bg-black text-white rounded text-[10.5px] font-medium transition cursor-pointer"
                            >
                              Claim Offer
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
                    <div className="w-7 h-7 min-w-[28px] max-w-[28px] aspect-square rounded-md bg-neutral-950 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <ShoppingBag className="w-3.5 h-3.5 text-neutral-200" />
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

                    {/* Pre-Settlement Upsell & Cross-Sell Product Comparison Engine */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-neutral-200/80 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2.5 px-0.5">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider font-mono">
                              Compare Alternatives & Upgrades
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono uppercase">
                            Feature-by-Feature Tradeoff
                          </span>
                        </div>

                        <div className="space-y-3">
                          {msg.suggestions.map((sugg) => (
                            <div
                              key={sugg.item_id}
                              className="bg-white p-3.5 rounded-lg border border-neutral-200 hover:border-neutral-900 transition-all shadow-2xs"
                            >
                              {/* Header: Type Badge, Title, Price Delta */}
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2.5 border-b border-neutral-100">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                        sugg.suggestion_type === 'upsell'
                                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      {sugg.suggestion_type === 'upsell' ? '⚡ Premium Upgrade' : '🔗 Complementary Pairing'}
                                    </span>
                                    <span className="text-[10.5px] text-neutral-500 font-mono">
                                      by {sugg.merchant_name}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-neutral-900">
                                    {sugg.item_name}
                                  </h4>
                                </div>

                                <div className="text-left sm:text-right shrink-0">
                                  <div className="text-xs font-bold font-mono text-neutral-900">
                                    ₹{sugg.price.toLocaleString('en-IN')}
                                  </div>
                                  <span
                                    className={`text-[10.5px] font-mono font-semibold block ${
                                      sugg.comparison.price_delta >= 0 ? 'text-amber-700' : 'text-emerald-700'
                                    }`}
                                  >
                                    {sugg.comparison.price_delta >= 0 ? `+₹${sugg.comparison.price_delta.toLocaleString('en-IN')}` : `-₹${Math.abs(sugg.comparison.price_delta).toLocaleString('en-IN')}`} ({sugg.comparison.price_delta_percentage >= 0 ? '+' : ''}{sugg.comparison.price_delta_percentage}%)
                                  </span>
                                </div>
                              </div>

                              {/* Explainable Rationale */}
                              <p className="text-[11px] text-neutral-600 mt-2 leading-relaxed">
                                {sugg.reason}
                              </p>

                              {/* Spec Difference Matrix */}
                              {sugg.comparison.spec_differences && sugg.comparison.spec_differences.length > 0 && (
                                <div className="mt-2.5 bg-neutral-50 rounded-md p-2.5 border border-neutral-200/70 space-y-1.5">
                                  <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                                    Spec & Feature Breakdown
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                    {sugg.comparison.spec_differences.map((spec, idx) => (
                                      <div key={idx} className="bg-white p-2 rounded border border-neutral-200/60 shadow-2xs">
                                        <div className="text-[10px] text-neutral-400 font-mono font-medium">
                                          {spec.feature_name}
                                        </div>
                                        <div className="text-neutral-900 font-semibold mt-0.5 flex items-center justify-between gap-1">
                                          <span>{spec.suggested_value}</span>
                                          {spec.advantage && (
                                            <span className="text-[9.5px] text-emerald-700 font-mono bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                              {spec.advantage}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-neutral-400 mt-0.5 line-through">
                                          Base: {spec.original_value}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action: Switch to Upgrade / Explore */}
                              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                                <span className="text-[10.5px] text-neutral-400 font-mono">
                                  Goes through Dual-Gate Verification
                                </span>
                                <button
                                  onClick={() => handleSendMessage(`buy ${sugg.item_name}`)}
                                  className="h-7 px-3 bg-neutral-900 hover:bg-black text-white rounded text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                                >
                                  <span>{sugg.suggestion_type === 'upsell' ? 'Switch to Upgrade' : 'Explore Pairing'}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Personalized Abandonment Re-Engagement Offers */}
                    {msg.pendingOffers && msg.pendingOffers.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-amber-200/90 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2 px-0.5">
                          <div className="flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider font-mono">
                              Exclusive Re-Engagement Discount
                            </span>
                          </div>
                          <span className="text-[10px] text-amber-700 font-mono font-semibold uppercase bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                            Bounded Offer
                          </span>
                        </div>

                        <div className="space-y-2">
                          {msg.pendingOffers.map((off) => (
                            <div
                              key={off.id}
                              className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 p-3.5 rounded-lg border border-amber-300/80 hover:border-amber-500 transition-all shadow-2xs group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded text-[9.5px] font-bold font-mono">
                                      {off.discount_value}% OFF
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-mono">
                                      by {off.merchant_name}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-neutral-900">
                                    {off.item_name}
                                  </h4>
                                  <p className="text-[10.5px] text-neutral-600 mt-1 leading-snug">
                                    {off.reason}
                                  </p>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-[10.5px] text-neutral-400 line-through font-mono">
                                    ₹{off.original_price.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-xs font-bold font-mono text-neutral-900">
                                    ₹{off.discounted_price.toLocaleString('en-IN')}
                                  </div>
                                  <span className="text-[9.5px] text-emerald-700 font-mono font-semibold">
                                    Save ₹{(off.original_price - off.discounted_price).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-amber-200/50 flex items-center justify-between">
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  Full Dual-Gate Checked
                                </span>
                                <button
                                  onClick={() => handleSendMessage(`buy ${off.item_name}`, undefined, off.id)}
                                  className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                                >
                                  <span>Claim & Instant Buy</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Post-Purchase Explainable Recommendations */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-neutral-200/80 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between mb-2.5 px-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-neutral-900 uppercase tracking-wider font-mono">
                              Recommended For You
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono uppercase">
                            AI Cross-Store Discovery
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {msg.recommendations.map((rec) => (
                            <div
                              key={rec.id}
                              className="bg-white p-3.5 rounded-lg border border-neutral-200/90 hover:border-neutral-900 transition-all flex flex-col justify-between group shadow-2xs"
                            >
                              <div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mb-1">
                                  <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-700 font-medium">
                                    {rec.category}
                                  </span>
                                  <span className="text-neutral-400 truncate max-w-[110px]">by {rec.merchant_name}</span>
                                </div>
                                <h4 className="text-xs font-bold text-neutral-900 line-clamp-1 group-hover:text-black">
                                  {rec.item_name}
                                </h4>
                                <div className="mt-1.5 flex items-start gap-1 text-[10.5px] text-neutral-600 bg-neutral-50 border border-neutral-200/60 rounded px-2 py-1">
                                  <span className="text-emerald-600 font-bold shrink-0">💡</span>
                                  <span className="line-clamp-2 leading-tight">{rec.reason}</span>
                                </div>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                                <span className="text-xs font-bold font-mono text-neutral-900">
                                  ₹{rec.price.toLocaleString('en-IN')}
                                </span>
                                <button
                                  onClick={() => handleSendMessage(`buy ${rec.item_name}`, rec.id)}
                                  className="h-7 px-3 bg-neutral-900 hover:bg-black text-white rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                                >
                                  <span>Instant Buy</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] font-mono text-neutral-400 mt-1 px-1">{msg.timestamp}</span>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 min-w-[28px] max-w-[28px] aspect-square rounded-full bg-neutral-950 text-white flex items-center justify-center font-mono font-bold text-[11px] shrink-0 mt-0.5 shadow-2xs">
                      {getInitials(customerName)}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="w-7 h-7 min-w-[28px] max-w-[28px] aspect-square rounded-md bg-neutral-950 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShoppingBag className="w-3.5 h-3.5 text-neutral-200" />
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl px-4 py-2.5 text-xs text-neutral-600 flex items-center space-x-3 shadow-2xs">
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[11.5px] font-medium text-neutral-600">
                      Searching catalog across merchants & evaluating policy gates...
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* 3. FLOATING BOTTOM INPUT DOCK (ChatGPT / Claude Standard) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-6 z-10">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm hover:border-neutral-300 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-all p-1.5 px-2 flex items-center space-x-2"
            >
              <button
                type="button"
                onClick={() => handleSendMessage('find cheap headphones')}
                className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
                title="Search Products"
              >
                <Plus className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask anything or search across merchants..."
                className="flex-1 bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none px-1.5 font-sans"
                disabled={loading}
              />

              <div className="flex items-center pr-0.5 shrink-0">
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || loading}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                    loading
                      ? 'bg-neutral-900 text-white animate-pulse'
                      : inputPrompt.trim()
                        ? 'bg-neutral-900 hover:bg-black text-white active:scale-95 shadow-xs'
                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                  title={loading ? 'Processing...' : 'Send Message'}
                >
                  <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </form>
            <p className="text-[10.5px] font-mono text-center text-neutral-400 mt-2">
              Agentpay AI evaluates spend rules & settles transactions directly via Razorpay.
            </p>
          </div>
        </div>

        {/* Floating In-App Re-Engagement Toast */}
        {activeToast && (
          <div className="fixed bottom-20 right-6 max-w-sm bg-neutral-900 text-white p-3.5 rounded-lg shadow-2xl border border-neutral-700 z-50 animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Gift className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-white font-sans">{activeToast.title}</h5>
                <button
                  onClick={() => setActiveToast(null)}
                  className="text-neutral-400 hover:text-white cursor-pointer ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">{activeToast.message}</p>
              {activeToast.offer && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      const off = activeToast.offer!;
                      setActiveToast(null);
                      handleSendMessage(`buy ${off.item_name}`, undefined, off.id);
                    }}
                    className="h-6 px-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded text-[10.5px] transition cursor-pointer"
                  >
                    Claim Discount Now
                  </button>
                  <button
                    onClick={() => setActiveToast(null)}
                    className="text-[10px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
                      <p className="font-mono text-neutral-800">Remaining Balance: ₹{(remainingLimit || 0).toLocaleString('en-IN')}</p>
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

      {/* 5. DELIVERY ADDRESS SELECTION & ADD MODAL */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-neutral-900" />
                <h2 className="text-sm font-semibold text-neutral-900">Select Delivery Destination</h2>
              </div>
              <button
                onClick={() => {
                  setIsAddressModalOpen(false);
                  setIsAddingNewAddress(false);
                  setAddressError(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {addressError && (
                <div className="p-2.5 bg-red-50 text-red-600 rounded-md text-[11px] border border-red-200">
                  {addressError}
                </div>
              )}

              {!isAddingNewAddress ? (
                <>
                  <div className="space-y-2">
                    {addresses.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-neutral-200 rounded-lg text-neutral-400">
                        <MapPin className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="font-medium text-xs text-neutral-600">No delivery destinations found</p>
                        <p className="text-[11px] mt-0.5">Add your primary shipping address to enable instant orders.</p>
                      </div>
                    ) : (
                      addresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => {
                              setSelectedAddressId(addr.id);
                              setIsAddressModalOpen(false);
                            }}
                            className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start justify-between ${
                              isSelected
                                ? 'border-neutral-900 bg-neutral-50/80 shadow-2xs'
                                : 'border-neutral-200 hover:border-neutral-400 bg-white'
                            }`}
                          >
                            <div className="flex items-start space-x-2.5">
                              <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5" />}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-neutral-900 text-xs">{addr.label}</span>
                                  {addr.is_default && (
                                    <span className="px-1.5 py-0.2 bg-neutral-100 text-neutral-600 rounded text-[9.5px] font-mono">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-neutral-700 font-medium text-[11px]">
                                  {addr.recipient_name} &bull; {addr.phone}
                                </p>
                                <p className="text-neutral-500 text-[11px] leading-tight">
                                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} - {addr.postal_code}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => setIsAddingNewAddress(true)}
                      className="px-3 h-8 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Address</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAddressModalOpen(false);
                        router.push('/customer/addresses');
                      }}
                      className="text-xs text-neutral-500 hover:text-neutral-900 font-medium transition-colors cursor-pointer"
                    >
                      Manage Addresses &rarr;
                    </button>
                  </div>
                </>
              ) : (
                /* INLINE ADD NEW ADDRESS FORM */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newAddressForm.recipient_name || !newAddressForm.phone || !newAddressForm.line1 || !newAddressForm.city || !newAddressForm.postal_code) {
                      setAddressError('Please fill all required fields.');
                      return;
                    }
                    try {
                      setAddressSubmitting(true);
                      setAddressError(null);
                      const created = await createCustomerAddress(newAddressForm);
                      const updated = await fetchCustomerAddresses();
                      setAddresses(updated);
                      setSelectedAddressId(created.id);
                      setIsAddingNewAddress(false);
                      setIsAddressModalOpen(false);
                    } catch (err: any) {
                      setAddressError(err.message || 'Failed to save address.');
                    } finally {
                      setAddressSubmitting(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {['Home', 'Office', 'Other'].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewAddressForm({ ...newAddressForm, label: lbl })}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                          newAddressForm.label === lbl
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.recipient_name}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, recipient_name: e.target.value })}
                        placeholder="Rahul Sharma"
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md text-xs focus:border-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={newAddressForm.phone}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                        placeholder="+91 9876543210"
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md text-xs focus:border-neutral-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      required
                      value={newAddressForm.line1}
                      onChange={(e) => setNewAddressForm({ ...newAddressForm, line1: e.target.value })}
                      placeholder="Flat 402, Sunshine Heights"
                      className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md text-xs focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.city}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                        placeholder="Bengaluru"
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md text-xs focus:border-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.state}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, state: e.target.value })}
                        placeholder="Karnataka"
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md text-xs focus:border-neutral-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-medium text-neutral-600 mb-1">PIN Code *</label>
                      <input
                        type="text"
                        required
                        value={newAddressForm.postal_code}
                        onChange={(e) => setNewAddressForm({ ...newAddressForm, postal_code: e.target.value })}
                        placeholder="560001"
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md text-xs focus:border-neutral-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewAddress(false);
                        setAddressError(null);
                      }}
                      className="px-3 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addressSubmitting}
                      className="px-4 h-8 bg-neutral-900 hover:bg-black text-white rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {addressSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Save & Select</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
