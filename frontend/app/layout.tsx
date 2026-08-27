import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentpay — Merchant Dashboard',
  description: 'Agent-ready merchant commerce platform for Razorpay AI Buildathon',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
