'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWebhooks, registerWebhook, testWebhook } from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';

import Navigation from '@/components/Navigation';
import { Eye, EyeOff, Zap, RefreshCw, Check, Loader2 } from 'lucide-react';

export default function WebhooksPage() {
  const router = useRouter();
  const [data, setData] = useState<{ endpoint: any; logs: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useAuthGuard(loadWebhooks);

  async function loadWebhooks() {
    setLoading(true);
    try {
      const res = await getWebhooks();
      setData(res);
      if (res.endpoint) {
        setUrl(res.endpoint.url || '');
        setSecret(res.endpoint.secret || '');
      }
    } catch (err: any) {
      router.push('/onboarding');
      return;
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveWebhook(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const ep = await registerWebhook(url, secret || undefined);
      setMsg({ type: 'success', text: 'Webhook endpoint saved successfully. HMAC-SHA256 signing is active.' });
      setSecret(ep.secret);
      loadWebhooks();
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save webhook endpoint' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWebhook() {
    setTesting(true);
    setMsg(null);

    try {
      const res = await testWebhook();
      setMsg({ type: 'success', text: `Test webhook dispatched! Status: ${res.status} (HTTP ${res.response_status})` });
      loadWebhooks();
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Test webhook delivery failed' });
    } finally {
      setTesting(false);
    }
  }

  const inputCls = "w-full h-9 px-3 bg-neutral-50/50 border border-neutral-200 rounded-md text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-mono";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1.5";
  const hintCls = "text-[11px] text-neutral-500 mt-1";

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Integrations</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">HMAC-SHA256 Signed Webhooks</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Webhook Endpoints</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Receive real-time signed HTTP POST notifications whenever an autonomous buyer agent executes or settles an order.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadWebhooks}
              disabled={loading}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Reload</span>
            </button>
            {data?.endpoint && (
              <button
                onClick={handleTestWebhook}
                disabled={testing}
                className="h-8 px-3 rounded-md bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-neutral-200"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-neutral-800" />}
                <span>Fire Test Event</span>
              </button>
            )}
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

        {/* Active Endpoint Status Banner */}
        {data?.endpoint && !loading && (
          <div className="mb-6 p-4 rounded-lg bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Live Endpoint</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  HMAC ACTIVE
                </span>
              </div>
              <p className="font-mono text-xs text-neutral-900 break-all font-medium">{data.endpoint.url}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
            <p className="text-xs">Loading webhook configurations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Endpoint Configuration Panel */}
            <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">Endpoint Configuration</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Signed payloads are dispatched with the header <code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] text-neutral-800">X-Agentpay-Signature: t=timestamp,v1=hmac</code>.
                </p>
              </div>

              <form onSubmit={handleSaveWebhook} className="space-y-4 pt-2">
                <div>
                  <label className={labelCls}>Webhook Receiving URL *</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-store.com/api/webhooks/agentpay"
                    className={inputCls}
                    required
                  />
                  <p className={hintCls}>Publicly accessible HTTPS endpoint. Use ngrok or localtunnel for local sandbox testing.</p>
                </div>

                <div>
                  <label className={labelCls}>HMAC Signing Secret</label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="whsec_..."
                      className={inputCls + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                      title={showSecret ? 'Hide secret' : 'Reveal secret'}
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className={hintCls}>
                    Verify incoming event signatures: <code className="font-mono bg-neutral-100 px-1 rounded text-[10px]">HMAC-SHA256(secret, t + &quot;.&quot; + payload)</code>. Leave blank to auto-generate.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-9 px-4 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-md shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Webhook Configuration</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Delivery Logs Table */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
              <div className="px-6 py-3.5 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Webhook Delivery Attempt History
                </h2>
                <span className="text-[11px] font-mono text-neutral-400">3-attempt Exponential Backoff</span>
              </div>

              {!data?.logs || data.logs.length === 0 ? (
                <div className="p-14 text-center">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-600 font-mono text-xs font-bold">
                    HOOK
                  </div>
                  <p className="text-xs font-semibold text-neutral-800">No delivery attempts recorded</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Configure your URL and click &quot;Fire Test Event&quot; to test HMAC delivery.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-6 whitespace-nowrap">Event Type</th>
                        <th className="py-3 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 whitespace-nowrap">HTTP Response</th>
                        <th className="py-3 px-4 whitespace-nowrap">Attempts</th>
                        <th className="py-3 pr-6 pl-4 text-right whitespace-nowrap">Delivered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.logs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-6 font-mono font-medium text-neutral-900 text-[11px] whitespace-nowrap">
                            {log.event_type}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
                                log.status === 'delivered'
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'delivered' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-600 text-[11px] whitespace-nowrap">
                            {log.response_status ? `HTTP ${log.response_status}` : 'Timeout / Gated'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-neutral-500 text-[11px]">{log.attempts}</td>
                          <td className="py-3.5 pr-6 pl-4 text-right text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleString('en-IN', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
