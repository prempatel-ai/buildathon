'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { API_BASE_URL } from '@/lib/api';
import { Activity, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [responseJson, setResponseJson] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setStatus('checking');
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const data = await res.json();
      setResponseJson(data);
      setStatus('online');
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection failed');
      setStatus('offline');
      setResponseJson(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">System Diagnostic</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">Connectivity Health</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">API Connectivity Diagnostic</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
              Verifies live HTTP connectivity and database connectivity for the Agentpay Gateway Engine.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={checkHealth}
              disabled={loading}
              className="h-8 px-3.5 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-check Status</span>
            </button>
          </div>
        </div>

        {/* Health Check Card */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-2xs mb-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">Core Engine Connectivity</h2>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">Target: {API_BASE_URL}/health</p>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              {status === 'checking' ? (
                <span className="px-2.5 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded text-xs font-mono font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" />
                  <span>Checking...</span>
                </span>
              ) : status === 'online' ? (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-mono font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ONLINE (200 OK)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded text-xs font-mono font-semibold flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>UNREACHABLE</span>
                </span>
              )}
            </div>
          </div>

          {/* Details & Output */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5 font-mono">
                API Response Payload
              </label>
              <div className="p-4 bg-neutral-950 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-neutral-800">
                {status === 'checking' ? (
                  <span className="text-neutral-500">// Sending GET request to backend...</span>
                ) : responseJson ? (
                  <pre>{JSON.stringify(responseJson, null, 2)}</pre>
                ) : (
                  <span className="text-red-400">// Error: {errorMsg}</span>
                )}
              </div>
            </div>

            {lastChecked && (
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-2 border-t border-neutral-100">
                <span>Protocol: Agentpay Gateway v1.0</span>
                <span>Last Audited: {lastChecked}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
