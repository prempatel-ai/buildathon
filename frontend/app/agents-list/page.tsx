'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMerchantAgents,
  getMerchantMe,
  createMerchantAgent,
  rotateAgentKey,
  getAuthToken,
  Merchant,
  MerchantAgentItem,
} from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';

import Navigation from '@/components/Navigation';
import { Plus, RotateCcw, Trash2, Copy, Check, KeyRound, Loader2, X } from 'lucide-react';

export default function AgentsListPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [agents, setAgents] = useState<MerchantAgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Agent Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [scopeReadCatalog, setScopeReadCatalog] = useState(true);
  const [scopeProposeOrder, setScopeProposeOrder] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Newly issued key banner
  const [createdKeyData, setCreatedKeyData] = useState<{ name: string; api_key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [merchantData, agentData] = await Promise.all([
        getMerchantMe(),
        getMerchantAgents(),
      ]);
      if (!merchantData || !merchantData.id) {
        router.push('/onboarding');
        return;
      }
      setMerchant(merchantData);
      setAgents(agentData);
    } catch (err: any) {
      router.push('/onboarding');
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  useAuthGuard(loadData);

  async function handleCreateAgent(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setFormLoading(true);

    const scopes: string[] = [];
    if (scopeReadCatalog) scopes.push('read_catalog');
    if (scopeProposeOrder) scopes.push('propose_order');

    if (scopes.length === 0) {
      setMsg({ type: 'error', text: 'Select at least one scope permission for the agent.' });
      setFormLoading(false);
      return;
    }

    try {
      const res = await createMerchantAgent(agentName, scopes);
      setCreatedKeyData({ name: res.name, api_key: res.api_key });
      setCopied(false);
      setAgentName('');
      setScopeReadCatalog(true);
      setScopeProposeOrder(true);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create agent' });
    } finally {
      setFormLoading(false);
    }
  }

  async function handleRotateKey(agentId: string) {
    if (!merchant?.id) {
      setMsg({ type: 'error', text: 'Merchant context not loaded. Refresh and try again.' });
      return;
    }
    if (!confirm('Rotate this agent API key? Old key will be invalidated immediately.')) return;
    try {
      const res = await rotateAgentKey(agentId, merchant.id);
      setCreatedKeyData({ name: res.name || agentId, api_key: res.new_api_key });
      setCopied(false);
      setMsg({ type: 'success', text: `Key rotated for agent. Copy the new key now — it will not be shown again.` });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to rotate key' });
    }
  }

  async function handleDeleteAgent(agentId: string) {
    if (!confirm('Permanently revoke and delete this agent key? This cannot be undone.')) return;
    setDeletingId(agentId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/merchants/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to delete agent' }));
        throw new Error(err.detail || 'Failed to delete agent');
      }
      setMsg({ type: 'success', text: 'Agent key permanently revoked and deleted.' });
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete agent' });
    } finally {
      setDeletingId(null);
    }
  }

  function handleCopyKey() {
    if (createdKeyData?.api_key) {
      navigator.clipboard.writeText(createdKeyData.api_key).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Agent Governance</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">HMAC Scoped Access</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">AI Agent Keys & Scopes</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Issue and rotate API keys with bounded scope permissions for autonomous buyer agents.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {merchant?.name && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-medium font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{merchant.name}</span>
              </div>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="h-8 px-3 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Agent Key</span>
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {msg && (
          <div
            className={`mb-6 p-3.5 rounded-md text-xs font-medium flex items-center justify-between ${
              msg.type === 'success'
                ? 'bg-neutral-50 border border-neutral-300 text-neutral-900'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.type === 'success' && <Check className="w-4 h-4 text-neutral-900" />}
              <span>{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="text-neutral-400 hover:text-neutral-700 ml-2 text-sm font-bold">×</button>
          </div>
        )}

        {/* Newly Issued / Rotated Key Banner */}
        {createdKeyData && (
          <div className="mb-6 p-4 bg-neutral-50 border border-neutral-300 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-neutral-800" />
                <p className="text-xs font-semibold text-neutral-900">
                  Newly Issued API Key — Copy Now
                </p>
                <span className="text-[11px] text-neutral-500">({createdKeyData.name})</span>
              </div>
              <button
                onClick={() => setCreatedKeyData(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mb-2.5">
              This secret API key is shown only once. Store it securely in your agent configuration.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded font-mono text-xs text-neutral-900 select-all break-all">
                {createdKeyData.api_key}
              </code>
              <button
                onClick={handleCopyKey}
                className="h-8 px-3 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Registered Agent Keys Table */}
        <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
          <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Registered Agent Keys
              </h2>
              {!loading && (
                <span className="text-xs font-mono text-neutral-400">({agents.length})</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-neutral-100 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3.5 px-4 flex items-center justify-between gap-4">
                  <div className="h-4 w-36 bg-neutral-200/70 rounded"></div>
                  <div className="h-4 w-28 bg-neutral-100 rounded"></div>
                  <div className="h-4 w-32 bg-neutral-200/60 rounded"></div>
                  <div className="h-4 w-16 bg-neutral-100 rounded"></div>
                  <div className="h-4 w-20 bg-neutral-200/50 rounded"></div>
                  <div className="h-6 w-16 bg-neutral-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-600 font-mono text-xs font-bold">
                KEY
              </div>
              <p className="text-xs font-semibold text-neutral-800">No agent keys registered</p>
              <p className="text-[11px] text-neutral-400 mt-0.5 mb-4">Issue an API key to allow autonomous agents to transact on your catalog.</p>
              <button
                onClick={() => setShowModal(true)}
                className="h-8 px-3.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Agent Key</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Agent Name</th>
                    <th className="py-2.5 px-4">Agent ID</th>
                    <th className="py-2.5 px-4">Scope Permissions</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Created Date</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {agents.map((ag) => (
                    <tr key={ag.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">{ag.name}</td>
                      <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">{ag.id}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {ag.scopes.map((sc) => (
                            <span
                              key={sc}
                              className="px-2 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded font-mono text-[10px] font-medium"
                            >
                              {sc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {ag.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-500 text-[11px]">
                        {formatDate(ag.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleRotateKey(ag.id)}
                          className="h-7 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[11px] font-medium transition-colors border border-neutral-200 cursor-pointer inline-flex items-center gap-1"
                          title="Rotate API key — old key immediately invalidated"
                        >
                          <RotateCcw className="w-3 h-3 text-neutral-600" />
                          <span>Rotate</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(ag.id)}
                          disabled={deletingId === ag.id}
                          className="h-7 px-2.5 bg-neutral-50 hover:bg-red-50 text-neutral-600 hover:text-red-700 rounded text-[11px] font-medium transition-colors border border-neutral-200 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                          title="Permanently revoke and delete this agent"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-neutral-200 rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">Issue New AI Agent Key</h3>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              Specify explicit scope permissions for this agent key. The raw HMAC secret is displayed once upon creation.
            </p>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Agent Label / Name *
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Autonomous Buyer Agent #1"
                  className="w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Scope Permissions
                </label>
                <div className="space-y-2 p-3 bg-neutral-50/50 rounded-md border border-neutral-200">
                  <label className="flex items-center space-x-2.5 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeReadCatalog}
                      onChange={(e) => setScopeReadCatalog(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-black"
                    />
                    <span className="font-mono font-medium text-neutral-900">read_catalog</span>
                    <span className="text-[11px] text-neutral-500">— Query product catalog</span>
                  </label>
                  <label className="flex items-center space-x-2.5 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeProposeOrder}
                      onChange={(e) => setScopeProposeOrder(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-black"
                    />
                    <span className="font-mono font-medium text-neutral-900">propose_order</span>
                    <span className="text-[11px] text-neutral-500">— Propose and settle orders</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-8 px-3 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="h-8 px-4 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Key</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
