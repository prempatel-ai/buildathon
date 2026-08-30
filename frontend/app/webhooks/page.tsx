'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWebhooks, registerWebhook, testWebhook, getAuthToken } from '@/lib/api';
import { useAuthGuard } from '@/lib/useAuthGuard';

import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Webhook, Eye, EyeOff, Zap, RefreshCw } from 'lucide-react';

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
  const [showSecret, setShowSecret] = useState(false);  // P5: mask secret by default

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
      setMsg({ type: 'success', text: 'Webhook endpoint saved successfully. HMAC signing is active.' });
      setSecret(ep.secret);
      loadWebhooks();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save webhook' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWebhook() {
    setTesting(true);
    setMsg(null);

    try {
      const res = await testWebhook();
      setMsg({ type: 'success', text: `Test webhook fired! Status: ${res.status} (HTTP ${res.response_status})` });
      loadWebhooks();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Test webhook delivery failed' });
    } finally {
      setTesting(false);
    }
  }

  const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400 transition font-mono";
  const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5";
  const hintCls = "text-[10px] text-slate-400 mt-1";

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-indigo-100 pb-16">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          category="Integrations"
          title="Webhook Endpoints"
          subtitle="Receive real-time HMAC-signed HTTP POST notifications for every payment and approval event."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadWebhooks} loading={loading}>
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                Reload
              </Button>
              {data?.endpoint && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestWebhook}
                  loading={testing}
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  Fire Test Event
                </Button>
              )}
            </div>
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

        {/* Current Endpoint Status Banner */}
        {data?.endpoint && !loading && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-0.5">Active Endpoint</p>
              <p className="font-mono text-xs text-indigo-700 break-all">{data.endpoint.url}</p>
            </div>
            <span className="shrink-0 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-mono font-bold uppercase">
              HMAC Active
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        ) : (
          <>
            {/* Config Card */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Webhook className="w-4 h-4 text-indigo-500 shrink-0" />
                <h2 className="text-sm font-extrabold text-slate-900">Endpoint Configuration</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Agentpay will POST signed events to this URL with header <code className="font-mono bg-slate-100 px-1 rounded">X-Agentpay-Signature: t=timestamp,v1=hmac</code>.
              </p>

              <form onSubmit={handleSaveWebhook} className="space-y-4">
                <div>
                  <label className={labelCls}>Webhook Receiving URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-store.com/api/webhooks/agentpay"
                    className={inputCls}
                    required
                  />
                  <p className={hintCls}>Must be publicly reachable over HTTPS. Use ngrok for local testing.</p>
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
                      onClick={() => setShowSecret(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showSecret ? 'Hide secret' : 'Reveal secret'}
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className={hintCls}>
                    Verify signatures with: <code className="font-mono bg-slate-100 px-1 rounded">HMAC-SHA256(secret, t+"."+payload)</code>. Leave blank to auto-generate.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="indigo" size="sm" loading={saving}>
                    Save Webhook Configuration
                  </Button>
                </div>
              </form>
            </div>

            {/* Delivery Logs Table */}
            <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-900">Webhook Delivery Attempt History</h2>
                <span className="text-[11px] font-mono text-slate-400">HMAC Signed · 3-attempt Retry Backoff</span>
              </div>

              {!data?.logs || data.logs.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <Webhook className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">No delivery attempts yet</p>
                  <p className="text-xs text-slate-400 mt-1">Configure an endpoint and fire a test event to see logs here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-3.5">Event Type</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">HTTP Response</th>
                        <th className="px-6 py-3.5">Attempts</th>
                        <th className="px-6 py-3.5">Delivered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-semibold text-slate-900">{log.event_type}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                                log.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 text-[11px]">
                            {log.response_status ? `HTTP ${log.response_status}` : 'Connection Timeout'}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-500">{log.attempts}</td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 mt-12">
        Agentpay · Webhook Infrastructure · HMAC SHA-256 Signed · Razorpay AI Protocol
      </footer>
    </div>
  );
}
