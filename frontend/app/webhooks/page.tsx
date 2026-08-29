'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getWebhooks, registerWebhook, testWebhook, getAuthToken, removeAuthToken } from '@/lib/api';

import Navigation from '@/components/Navigation';

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

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadWebhooks();
  }, []);

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
      setMsg({ type: 'error', text: err.message || 'Failed to load webhooks' });
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
      setMsg({ type: 'success', text: 'Webhook receiving endpoint saved successfully!' });
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
      setMsg({ type: 'success', text: `Test webhook dispatched! Status: ${res.status} (HTTP ${res.response_status})` });
      loadWebhooks();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Test webhook delivery failed' });
    } finally {
      setTesting(false);
    }
  }

  function handleLogout() {
    removeAuthToken();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Webhook Receiving Endpoint</h1>
              <p className="text-xs text-slate-500 mt-1">
                Receive real-time HTTP POST notifications signed with HMAC SHA-256 (`X-Agentpay-Signature`) on transaction events.
              </p>
            </div>

            {data?.endpoint && (
              <button
                onClick={handleTestWebhook}
                disabled={testing}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {testing ? 'Sending Test Event...' : '⚡ Fire Test Webhook'}
              </button>
            )}
          </div>

          {msg && (
            <div
              className={`mt-4 p-3 rounded-lg text-xs font-medium ${
                msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSaveWebhook} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-store.com/api/webhooks/agentpay"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HMAC Signing Secret Key</label>
              <input
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="whsec_..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Used to verify signature header `X-Agentpay-Signature: t=timestamp,v1=signature`.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving Endpoint...' : 'Save Webhook Configuration'}
              </button>
            </div>
          </form>
        </div>

        {/* Delivery Logs Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Webhook Delivery Attempt History</h2>
            <span className="text-xs font-mono text-slate-500">HMAC Signed Delivery Logs</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-sans">
              Loading webhook logs...
            </div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-sans">
              No webhook delivery attempts recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">HTTP Response</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Delivered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{log.event_type}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                          log.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {log.response_status ? `HTTP ${log.response_status}` : 'Connection Timeout'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{log.attempts}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
