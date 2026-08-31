'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin, getAdminToken } from '@/lib/api';
import { Shield, Lock, ArrowRight, Loader2, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      router.push('/admin');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await adminLogin({ username, password });
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 font-sans selection:bg-slate-800">
      <div className="max-w-md w-full">
        {/* Security Shield Logo Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/40">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full">
            Restricted System Access
          </span>
          <h1 className="text-xl font-bold text-white tracking-tight mt-3">Platform Governance Gateway</h1>
          <p className="text-xs text-slate-400 mt-1">Super administrator authentication required.</p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/50 text-red-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 font-bold ml-2">×</button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-200 text-xs font-mono focus:border-slate-400 focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Master Security Key / Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-slate-200 text-xs font-mono focus:border-slate-400 focus:outline-hidden transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Authenticate Session</span>
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-500 font-mono">
              Demo Master Key: <code className="text-slate-300">Admin@Agentpay2026</code>
            </span>
          </div>
        </div>

        <div className="text-center mt-6 text-[11px] text-slate-600 font-mono">
          Agentpay AI Platform Governance • Protocol v1.4
        </div>
      </div>
    </div>
  );
}
