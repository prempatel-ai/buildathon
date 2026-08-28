'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { fetchMerchants, Merchant } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AgentResponse {
  merchant_id: string;
  agent_id: string;
  prompt: string;
  proposed_tool?: string;
  tool_args?: Record<string, any>;
  policy_decision?: string;
  reasoning?: string;
  transaction_id?: string;
  razorpay_order_id?: string;
  pending_approval_id?: string;
  catalog_results?: Array<Record<string, any>>;
  status: string;
  response_message: string;
}

interface PendingApprovalItem {
  id: string;
  merchant_id: string;
  agent_id: string;
  action_type: string;
  proposed_action: Record<string, any>;
  status: string;
  reasoning: string;
  created_at: string;
}

export default function AgentPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
  const [promptInput, setPromptInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const [history, setHistory] = useState<AgentResponse[]>([]);
  const [pendingList, setPendingList] = useState<PendingApprovalItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    if (selectedMerchantId) {
      loadPendingApprovals(selectedMerchantId);
    }
  }, [selectedMerchantId]);

  const loadMerchants = async () => {
    try {
      const data = await fetchMerchants();
      setMerchants(data);
      if (data.length > 0) {
        setSelectedMerchantId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load merchants', err);
    }
  };

  const loadPendingApprovals = async (merchantId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/agent/pending?merchant_id=${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setPendingList(data);
      }
    } catch (err: any) {
      console.error('Failed to load pending approvals', err);
    }
  };

  const runAgentPrompt = async (text: string) => {
    if (!text.trim() || !selectedMerchantId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: selectedMerchantId,
          agent_id: 'buyer_agent_01',
          prompt: text,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Agent execution failed');
      }

      const data: AgentResponse = await res.json();
      setHistory((prev) => [data, ...prev]);
      loadPendingApprovals(selectedMerchantId);
    } catch (err: any) {
      setError(err.message || 'Agent query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async (pendingId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${API_BASE_URL}/agent/approve/${pendingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          merchant_id: selectedMerchantId,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to ${action} action`);
      }
      const outcome = await res.json();
      loadPendingApprovals(selectedMerchantId);

      // Append outcome card to chat history
      setHistory((prev) => [
        {
          merchant_id: selectedMerchantId,
          agent_id: 'buyer_agent_01',
          prompt: `Human Merchant ${action === 'approve' ? 'Approved' : 'Rejected'} Action`,
          policy_decision: action === 'approve' ? 'APPROVED' : 'REJECTED',
          reasoning: outcome.message || `Merchant explicitly ${action}d pending request ${pendingId}.`,
          razorpay_order_id: outcome.razorpay_order_id,
          transaction_id: outcome.transaction_id,
          status: action === 'approve' ? 'PAYMENT_EXECUTED' : 'REJECTED_BY_MERCHANT',
          response_message: outcome.message || `Action ${action}d cleanly.`
        },
        ...prev
      ]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getDecisionBadge = (decision?: string) => {
    if (!decision) return null;
    const d = decision.toUpperCase();
    if (d === 'ALLOW' || d === 'APPROVED') {
      return (
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono text-xs font-semibold">
          ALLOW (GATE PASSED)
        </span>
      );
    }
    if (d === 'DENY') {
      return (
        <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full font-mono text-xs font-semibold">
          DENY (BLOCKED BY POLICY)
        </span>
      );
    }
    if (d === 'NEEDS_APPROVAL') {
      return (
        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-mono text-xs font-semibold">
          NEEDS_APPROVAL (HUMAN PAUSE)
        </span>
      );
    }
    if (d === 'REJECTED') {
      return (
        <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-full font-mono text-xs font-semibold">
          REJECTED (HUMAN DENIED)
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono text-xs font-medium">
        {d}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: AI Agent Chat & Pipeline (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                  AI Buyer Agent Simulation
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Powered by Groq LLM & LangGraph. Every tool call is gated by the policy engine before money moves.
                </p>
              </div>
              <div className="text-right">
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Target Merchant</label>
                <select
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                >
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Demo Action Presets */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 font-mono self-center mr-1">Demo Presets:</span>
              <button
                onClick={() => {
                  setPromptInput("What items are currently available in the catalog?");
                  runAgentPrompt("What items are currently available in the catalog?");
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs transition-colors"
              >
                🛒 Query Catalog
              </button>
              <button
                onClick={() => {
                  setPromptInput("Order wireless noise-canceling headphones for 450 INR");
                  runAgentPrompt("Order wireless noise-canceling headphones for 450 INR");
                }}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium transition-colors"
              >
                ⚡ Order ₹450 (ALLOW)
              </button>
              <button
                onClick={() => {
                  setPromptInput("Order premium laptop for 45000 INR");
                  runAgentPrompt("Order premium laptop for 45000 INR");
                }}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-xs font-medium transition-colors"
              >
                🛑 Order ₹45,000 (DENY)
              </button>
              <button
                onClick={() => {
                  setPromptInput("Order professional camera kit for 1200 INR");
                  runAgentPrompt("Order professional camera kit for 1200 INR");
                }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-xs font-medium transition-colors"
              >
                ⏳ Order ₹1,200 (NEEDS_APPROVAL)
              </button>
            </div>
          </div>

          {/* Prompt Input Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center space-x-3">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAgentPrompt(promptInput)}
              placeholder="Ask the AI buyer agent (e.g. 'Order headphones for 450 INR in Electronics')..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              onClick={() => runAgentPrompt(promptInput)}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Orchestrating...' : 'Run Agent &rarr;'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-xs border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Execution History Cards */}
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 font-mono">
                No agent requests executed yet. Click a demo preset above to start!
              </div>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  {/* User Prompt */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono text-[11px]">
                        Buyer Agent ({item.agent_id})
                      </span>
                      <p className="text-xs font-semibold text-slate-900">"{item.prompt}"</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{item.status}</span>
                  </div>

                  {/* Pipeline Steps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Step 1: LLM Tool Proposal */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <span className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                        Step 1: LLM Proposal
                      </span>
                      <p className="font-mono font-semibold text-slate-800 text-[11px]">
                        Tool: {item.proposed_tool || 'N/A'}
                      </p>
                      {item.tool_args && (
                        <pre className="mt-1 text-[10px] font-mono text-slate-500 bg-white p-1.5 rounded border border-slate-200 overflow-x-auto">
                          {JSON.stringify(item.tool_args, null, 2)}
                        </pre>
                      )}
                    </div>

                    {/* Step 2: Policy Gate */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <span className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                        Step 2: Policy Gate
                      </span>
                      <div className="mb-1.5">{getDecisionBadge(item.policy_decision)}</div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {item.reasoning}
                      </p>
                    </div>

                    {/* Step 3: Execution Outcome */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <span className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                        Step 3: Outcome
                      </span>
                      {item.razorpay_order_id ? (
                        <div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px] font-semibold">
                            Razorpay Order Created
                          </span>
                          <p className="mt-1 font-mono text-[11px] text-slate-800 font-medium">
                            {item.razorpay_order_id}
                          </p>
                        </div>
                      ) : item.catalog_results ? (
                        <p className="text-[11px] text-slate-700">
                          Catalog fetched ({item.catalog_results.length} items)
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.response_message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Catalog Results Grid if present */}
                  {item.catalog_results && item.catalog_results.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <span className="block text-[11px] font-mono text-slate-500 mb-2">
                        Minimal Catalog Returned to LLM:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {item.catalog_results.map((c, cIdx) => (
                          <div key={cIdx} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px]">
                            <p className="font-semibold text-slate-800">{c.name}</p>
                            <p className="text-slate-500">₹{c.price} &bull; Stock: {c.stock}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Link
                      href="/audit"
                      className="text-[11px] font-mono text-slate-500 hover:text-slate-900 underline"
                    >
                      View Immutable Audit Log &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Pending Approvals Sidebar (Human-in-the-loop) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Pending Merchant Approvals
              </h2>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-mono font-semibold">
                {pendingList.length} Pending
              </span>
            </div>

            {pendingList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono bg-slate-50 rounded-lg border border-slate-200">
                No pending approval requests. Triggers when policy decision is NEEDS_APPROVAL.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map((p) => (
                  <div key={p.id} className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-amber-900">
                        {p.action_type}
                      </span>
                      <span className="text-[10px] font-mono text-amber-700">
                        Agent: {p.agent_id}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {p.reasoning}
                    </p>

                    <div className="bg-white p-2 rounded border border-amber-200 font-mono text-[11px] text-slate-800">
                      Amount: ₹{p.proposed_action?.amount} &bull; Item: {p.proposed_action?.item_name || 'N/A'}
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleApproveAction(p.id, 'approve')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Approve Payment
                      </button>
                      <button
                        onClick={() => handleApproveAction(p.id, 'reject')}
                        className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Agentpay &bull; LangGraph + Groq Agent Orchestration &bull; Razorpay AI Buildathon
      </footer>
    </div>
  );
}
