'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Package, Shield, Key, FileText, Webhook, ArrowRight } from 'lucide-react';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandSearchModal({ isOpen, onClose }: CommandSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickLinks = [
    {
      title: 'Products & Store Catalog',
      category: 'Store & Catalog',
      href: '/dashboard',
      icon: Package,
      description: 'Manage merchant inventory, prices, and JSON-LD schema',
    },
    {
      title: 'Policy Rules & Velocity Limits',
      category: 'Governance',
      href: '/settings',
      icon: Shield,
      description: 'Configure max spend amount, daily limit, velocity guard',
    },
    {
      title: 'AI Agent API Keys',
      category: 'Security',
      href: '/agents-list',
      icon: Key,
      description: 'Generate scoped API keys for ChatGPT and AI Agents',
    },
    {
      title: 'Executive Analytics',
      category: 'Performance',
      href: '/usage',
      icon: FileText,
      description: 'View gross settled volume, gate approval rate, Recharts timeline',
    },
    {
      title: 'Immutable Audit Trail',
      category: 'Audit',
      href: '/audit',
      icon: FileText,
      description: 'Inspect real-time policy evaluation logs and decision events',
    },
    {
      title: 'Webhooks & Signature Secret',
      category: 'Integration',
      href: '/webhooks',
      icon: Webhook,
      description: 'Configure HMAC SHA-256 webhooks for payment settlements',
    },
  ];

  const filteredLinks = query.trim() === ''
    ? quickLinks
    : quickLinks.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      );

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search policies, API keys, analytics, audit log..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 mr-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 bg-slate-200/80 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-mono font-bold"
          >
            ESC
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredLinks.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              No matching pages or policies found for &quot;{query}&quot;
            </div>
          ) : (
            filteredLinks.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  onClick={() => handleNavigate(item.href)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/60 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-900">
                          {item.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 uppercase">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Tap item or press Enter to navigate</span>
          <span>Agentpay Search Engine</span>
        </div>
      </div>
    </div>
  );
}
