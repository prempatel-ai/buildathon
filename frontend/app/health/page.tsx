'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-16">
      <Navigation />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          category="System Diagnostic"
          title="Backend Health & Connection Check"
          subtitle="Ticket A2.5: Verifies direct and proxied API connectivity between Next.js frontend and FastAPI backend."
          actions={
            <Button variant="indigo" size="sm" onClick={checkHealth} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Re-check Status
            </Button>
          }
        />

        {/* Health Check Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">FastAPI Engine Connectivity</h2>
                <p className="text-xs text-slate-500 font-mono">Target: {API_BASE_URL}/health</p>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              {status === 'checking' ? (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Checking...</span>
                </span>
              ) : status === 'online' ? (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ONLINE (200 OK)</span>
                </span>
              ) : (
                <span className="px-3 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>UNREACHABLE</span>
                </span>
              )}
            </div>
          </div>

          {/* Details & Output */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                API Response Payload
              </label>
              <div className="p-4 bg-slate-900 rounded-2xl text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
                {status === 'checking' ? (
                  <span className="text-slate-500">// Sending GET request to backend...</span>
                ) : responseJson ? (
                  <pre>{JSON.stringify(responseJson, null, 2)}</pre>
                ) : (
                  <span className="text-red-400">// Error: {errorMsg}</span>
                )}
              </div>
            </div>

            {lastChecked && (
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-2">
                <span>Protocol Version: v1.0.0</span>
                <span>Last Audited: {lastChecked}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400 mt-12">
        Agentpay · Health Connection Check · Razorpay AI Protocol
      </footer>
    </div>
  );
}
