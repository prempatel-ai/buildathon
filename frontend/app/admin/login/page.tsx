'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin, getAdminToken } from '@/lib/api';
import { Loader2 } from 'lucide-react';

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
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('admin');
    setPassword('Admin@Agentpay2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col justify-center items-center px-4 font-sans antialiased selection:bg-neutral-200">
      <div className="max-w-[380px] w-full">
        {/* Minimal Black Logo Icon */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm shadow-xs mb-3">
            AP
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Platform Admin</h1>
          <p className="text-xs text-neutral-500 mt-1">Authenticate to access system governance</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-neutral-400 hover:text-neutral-700 ml-2">×</button>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full h-10 px-3.5 text-sm rounded-lg border border-neutral-200 bg-neutral-50/40 text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-700">
                  Master Password
                </label>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium transition-colors"
                >
                  Quick Fill Demo
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-10 px-3.5 text-sm rounded-lg border border-neutral-200 bg-neutral-50/40 text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all font-mono"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-black hover:bg-neutral-800 text-white font-medium text-xs rounded-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-xs"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In to Admin</span>}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6 text-[11px] text-neutral-400 font-mono">
          Agentpay AI Platform Governance
        </div>
      </div>
    </div>
  );
}
