'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

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
  timestamp: string;
}

export default function ConsumerChatPage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const name = localStorage.getItem('customer_name') || 'Consumer';
    if (!token) {
      router.push('/customer/login');
      return;
    }
    setCustomerName(name);

    // Initial greeting message
    setMessages([
      {
        id: '1',
        sender: 'assistant',
        text: `Hello ${name}! I'm your AI Shopping Assistant. Ask me to find products across merchants (e.g. "find cheap headphones"). I will search and present clean options for you to confirm before any purchase!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || loading) return;

    const token = localStorage.getItem('customer_token');
    if (!token) {
      router.push('/customer/login');
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

    try {
      const res = await fetch('http://localhost:8000/customer/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: promptToSend,
          thread_id: threadId,
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
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Error: ${err.message || 'Failed to process prompt.'}`,
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navigation />

      <main className="max-w-4xl mx-auto w-full px-6 py-6 flex-1 flex flex-col h-[calc(100vh-4rem)]">
        {/* Header Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
              AI
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Consumer Shopping Agent</h1>
              <p className="text-xs text-slate-500">Cross-Merchant Discovery & Bounded Spend Execution</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Signed in as: <span className="font-semibold text-slate-800">{customerName}</span>
          </div>
        </div>

        {/* Chat Messages Container */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6 overflow-y-auto space-y-6 shadow-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white font-medium rounded-br-none shadow-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Execution / Gate Status Badges */}
                {msg.status && msg.status !== 'COMPLETED' && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1 font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 font-semibold">Status:</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          msg.status === 'PAYMENT_EXECUTED' || msg.status === 'SETTLED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>
                    {msg.customerAuthDecision && (
                      <div>Customer Auth Gate: <span className="font-bold">{msg.customerAuthDecision}</span></div>
                    )}
                    {msg.policyDecision && (
                      <div>Merchant Policy Gate: <span className="font-bold">{msg.policyDecision}</span></div>
                    )}
                    {msg.razorpayOrderId && (
                      <div className="text-emerald-700">Razorpay Order ID: <span className="font-bold">{msg.razorpayOrderId}</span></div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Comparison Cards Rendered in Assistant Messages */}
              {msg.cards && msg.cards.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                  {msg.cards.map((card) => (
                    <div
                      key={card.item_id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                          <span>Option #{card.option_index}</span>
                          <span className="text-slate-500">{card.merchant_name}</span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-2">{card.item_name}</h3>
                        <div className="text-base font-extrabold text-slate-900 mt-2">
                          ₹{card.price.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Stock: {card.stock} units</div>
                      </div>

                      <button
                        onClick={() => handleBuyOption(card)}
                        className="mt-4 w-full py-2 px-3 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        Confirm & Buy
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-start space-x-2">
              <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-500 font-medium animate-pulse">
                AI Agent is searching across merchants...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-3"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder='Try "find cheap headphones" or "buy option 1"...'
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
            />
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="py-3 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
