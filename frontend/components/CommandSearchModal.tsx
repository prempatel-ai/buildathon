'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Package, Shield, Key, BarChart3, FileText, Webhook, ArrowRight } from 'lucide-react';

interface CommandSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandSearchModal({ isOpen, onClose }: CommandSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickLinks = [
    {
      title: 'Products & Store Catalog',
      category: 'Catalog',
      href: '/dashboard',
      icon: Package,
      description: 'Manage merchant inventory, prices, and JSON-LD schema',
    },
    {
      title: 'Policy Rules & Velocity Limits',
      category: 'Governance',
      href: '/settings',
      icon: Shield,
      description: 'Configure max spend amount, daily limit, and velocity guard',
    },
    {
      title: 'AI Agent API Keys',
      category: 'Security',
      href: '/agents-list',
      icon: Key,
      description: 'Issue and rotate scoped API keys for autonomous buyer agents',
    },
    {
      title: 'Executive Analytics',
      category: 'Analytics',
      href: '/usage',
      icon: BarChart3,
      description: 'View gross settled volume, gate approval rates, and timeline',
    },
    {
      title: 'Immutable Audit Trail',
      category: 'Audit',
      href: '/audit',
      icon: FileText,
      description: 'Inspect real-time policy evaluation logs and settlement records',
    },
    {
      title: 'Webhooks & Signature Secret',
      category: 'Webhooks',
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle Keyboard navigation (Arrow keys, Enter, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredLinks.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredLinks.length) % Math.max(1, filteredLinks.length));
      } else if (e.key === 'Enter' && filteredLinks[selectedIndex]) {
        e.preventDefault();
        handleNavigate(filteredLinks[selectedIndex].href);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredLinks, selectedIndex]);

  if (!isOpen) return null;

  const handleNavigate = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-neutral-200 rounded-lg shadow-2xl overflow-hidden font-sans text-neutral-900 animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-200 bg-white">
          <Search className="w-4 h-4 text-neutral-400 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search policies, keys, analytics, audit log..."
            className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-neutral-600 mr-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded text-[10px] font-mono cursor-pointer border border-neutral-200"
          >
            ESC
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredLinks.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400 font-mono">
              No matching pages or policies found for &quot;{query}&quot;
            </div>
          ) : (
            filteredLinks.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.href}
                  onClick={() => handleNavigate(item.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer group transition-colors ${
                    isSelected ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-neutral-50 border-neutral-200 text-neutral-600 group-hover:text-neutral-900'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-neutral-900 truncate">
                          {item.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80 uppercase shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isSelected ? 'text-neutral-900 translate-x-0.5' : 'text-neutral-300 group-hover:text-neutral-500'
                  }`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-3.5 py-2 bg-neutral-50/80 border-t border-neutral-200 flex items-center justify-between text-[10.5px] font-mono text-neutral-500">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Agentpay Protocol</span>
        </div>
      </div>
    </div>
  );
}
