'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMerchantAgents, createMerchantAgent, rotateAgentKey, getAuthToken, removeAuthToken, MerchantAgentItem } from '@/lib/api';

export default function AgentsListPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<MerchantAgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Agent Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [scopeReadCatalog, setScopeReadCatalog] = useState(true);
  const [scopeProposeOrder, setScopeProposeOrder] = useState(true);
  const [createdKeyData, setCreatedKeyData] = useState<{ name: string; api_key: string } | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadAgents();
  }, []);

  async function loadAgents() {
    setLoading(true);
    try {
      const data = await getMerchantAgents();
      setAgents(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load agents list' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAgent(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const scopes: string[] = [];
    if (scopeReadCatalog) scopes.push('read_catalog');
    if (scopeProposeOrder) scopes.push('propose_order');

    if (scopes.length === 0) {
      setMsg({ type: 'error', text: 'Select at least one scope permission for the agent.' });
      return;
    }

    try {
      const res = await createMerchantAgent(agentName, scopes);
      setCreatedKeyData({ name: res.name, api_key: res.api_key });
      setAgentName('');
      setShowModal(false);
      loadAgents();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create agent' });
    }
  }

  async function handleRotateKey(agentId: string, merchantId: string) {
    if (!confirm('Rotate this agent API key? Old key will be invalidated immediately.')) return;
    try {
      const res = await rotateAgentKey(agentId, merchantId);
      setCreatedKeyData({ name: res.agent_id, api_key: res.new_api_key });
      setMsg({ type: 'success', text: `Key rotated! New Key: ${res.new_api_key}` });
      loadAgents();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to rotate key' });
    }
  }

  function handleLogout() {
    removeAuthToken();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-sm">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-lg">Agentpay</span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
              Agent Roster
            </span>
          </div>

          <nav className="flex items-center space-x-2 text-xs font-medium">
            <Link href="/" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/agents-list" className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded font-semibold transition-colors">
              AI Agents
            </Link>
            <Link href="/usage" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              Usage & Billing
            </Link>
            <Link href="/settings" className="px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded text-slate-600 transition-colors"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Agents & Key Scopes</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage API keys, configured permissions, and credential rotation for your store's AI buyer agents.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            + Create New Agent Key
          </button>
        </div>

        {msg && (
          <div
            className={`mb-6 p-3 rounded-lg text-xs font-medium ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        {createdKeyData && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
              Newly Issued Agent API Key (Copy Now)
            </h3>
            <p className="text-xs text-slate-600 mb-2">Agent: {createdKeyData.name}</p>
            <div className="p-2.5 bg-white border border-amber-300 rounded font-mono text-xs text-slate-900 select-all">
              {createdKeyData.api_key}
            </div>
          </div>
        )}

        {/* Agents Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-sans">
              Loading agent roster...
            </div>
          ) : agents.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-sans">
              No active AI agents registered for your merchant store.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Agent ID</th>
                  <th className="py-3 px-4">Configured Scopes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((ag) => (
                  <tr key={ag.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{ag.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{ag.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {ag.scopes.map((sc) => (
                          <span
                            key={sc}
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                              sc === 'propose_order'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] font-semibold">
                        {ag.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRotateKey(ag.id, ag.id)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                      >
                        Rotate Key
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-base font-bold text-slate-900 mb-1">Create New AI Agent Key</h2>
            <p className="text-xs text-slate-500 mb-4">
              Specify explicit scope permissions for this agent key.
            </p>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Authorized Inventory Buyer #3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Scope Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={scopeReadCatalog}
                      onChange={(e) => setScopeReadCatalog(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-mono">read_catalog</span>
                    <span className="text-[10px] text-slate-400">(Query store product catalog)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={scopeProposeOrder}
                      onChange={(e) => setScopeProposeOrder(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-mono font-semibold text-purple-700">propose_order</span>
                    <span className="text-[10px] text-slate-400">(Propose order purchase)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Generate Agent Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
