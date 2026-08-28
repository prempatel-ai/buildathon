import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-semibold text-white text-sm">
              AP
            </div>
            <span className="font-semibold text-slate-900 tracking-tight">Agentpay</span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/agent"
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              AI Buyer Agent
            </Link>
            <Link
              href="/audit"
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Audit Trail
            </Link>
            <Link
              href="/onboarding"
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Onboarding
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Merchant Dashboard &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-4 font-mono text-xs font-semibold">
            PHASE 1
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
            Agent-Readable Catalog Active
          </h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Merchants can now create stores, manage product catalogs, and expose standardized <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">schema.org</code> JSON-LD for AI buyer agents.
          </p>

          <div className="space-y-2 mb-6">
            <Link
              href="/onboarding"
              className="block w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Merchant Onboarding (&lt; 2 mins)
            </Link>
            <Link
              href="/dashboard"
              className="block w-full py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              View Catalog Dashboard
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 text-left space-y-2 text-xs font-mono text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Agent Schema</span>
              <span className="text-emerald-700 font-medium font-mono">schema.org JSON-LD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Backend API</span>
              <span className="text-slate-700 font-medium">FastAPI / Python</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Database</span>
              <span className="text-slate-700 font-medium">PostgreSQL + Redis</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Agentpay Platform &bull; Razorpay AI Buildathon
      </footer>
    </div>
  );
}
