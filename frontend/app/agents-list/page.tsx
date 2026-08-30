'use client';

import { useState, useEffect, useCallback } from 'react';
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

import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RotateCcw, Trash2, Copy, Check, KeyRound, Bot } from 'lucide-react';

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

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('onboarding_in_progress') === 'true') {
      router.push('/onboarding');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [loadData, router]);

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
    // BUG FIX: pass merchant.id (from JWT context), not agentId
    if (!merchant?.id) {
      setMsg({ type: 'error', text: 'Merchant context not loaded. Refresh and try again.' });
      return;
    }
    if (!confirm('Rotate this agent API key? Old key will be invalidated immediately.')) return;
    try {
      const res = await rotateAgentKey(agentId, merchant.id);
      setCreatedKeyData({ name: res.name || agentId, api_key: res.new_api_key });
      setCopied(false);
      setMsg({ type: 'success', text: `Key rotated for agent. Copy the new key now — it won't be shown again.` });
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
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-indigo-100 pb-16">
      <Navigation />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <PageHeader
          category="Agent Management"
          title="AI Agent Keys & Scopes"
          subtitle="Create and manage API keys with explicit scope permissions for autonomous buyer agents."
          badge={merchant?.name}
          actions={
            <Button variant="indigo" size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create New Agent Key
            </Button>
          }
        />

        {msg && (
          <div
            className={`mb-6 p-3.5 rounded-2xl text-xs font-medium ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Newly Issued / Rotated Key Banner */}
        {createdKeyData && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-3xl shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Newly Issued API Key — Copy Now
                </p>
                <p className="text-xs text-slate-600 mt-0.5">Agent: <span className="font-semibold">{createdKeyData.name}</span> · This key will not be shown again.</p>
              </div>
              <button
                onClick={() => setCreatedKeyData(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none font-light"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <code className="flex-1 p-3 bg-white border border-amber-300 rounded-xl font-mono text-xs text-slate-900 select-all break-all">
                {createdKeyData.api_key}
              </code>
              <Button
                variant={copied ? 'indigo' : 'outline'}
                size="sm"
                onClick={handleCopyKey}
                className="shrink-0"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Agents Table */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="text-sm font-bold text-slate-900">
                Registered Agent Keys
              </h2>
              {!loading && (
                <span className="text-xs font-mono text-slate-400">({agents.length} active)</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : agents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-6 h-6 text-indigo-500" />
              </div>
              <p className="text-sm font-bold text-slate-800">No agent keys registered</p>
              <p className="text-xs text-slate-400 mt-1 mb-5">Create an API key to allow AI agents to transact on your store.</p>
              <Button variant="indigo" size="sm" onClick={() => setShowModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create First Agent Key
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Agent Name</th>
                    <th className="px-6 py-3.5">Agent ID</th>
                    <th className="px-6 py-3.5">Scopes</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((ag) => (
                    <tr key={ag.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{ag.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">{ag.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {ag.scopes.map((sc) => (
                            <Badge
                              key={sc}
                              variant={sc === 'propose_order' ? 'default' : 'secondary'}
                              className="font-mono text-[10px]"
                            >
                              {sc}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono text-[10px] font-semibold">
                          {ag.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">
                        {formatDate(ag.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRotateKey(ag.id)}
                          title="Rotate API key — old key immediately invalidated"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Rotate Key
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleDeleteAgent(ag.id)}
                          loading={deletingId === ag.id}
                          title="Permanently revoke and delete this agent"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Revoke
                        </Button>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create New AI Agent Key</h3>
            <p className="text-xs text-slate-500 mb-5">
              Specify explicit scope permissions for this agent key. The raw key is shown once.
            </p>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Authorized Inventory Buyer #3"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Scope Permissions
                </label>
                <div className="space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeReadCatalog}
                      onChange={(e) => setScopeReadCatalog(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-indigo-600"
                    />
                    <span className="font-mono font-semibold text-slate-800">read_catalog</span>
                    <span className="text-[10px] text-slate-400">Query store product catalog</span>
                  </label>
                  <label className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopeProposeOrder}
                      onChange={(e) => setScopeProposeOrder(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-indigo-600"
                    />
                    <span className="font-mono font-semibold text-indigo-700">propose_order</span>
                    <span className="text-[10px] text-slate-400">Propose & execute purchases</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="indigo" size="sm" loading={formLoading}>
                  Generate Agent Key
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 mt-12">
        Agentpay · Agent Key Management · Razorpay AI Protocol
      </footer>
    </div>
  );
}
