import type { Metadata } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-ibm-plex',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Agentpay — Agent-Readable Commerce Infrastructure',
  description: 'Dual-gated payment settlement and policy engine for autonomous AI buyer agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-[#0a0e1a] text-slate-100 font-sans antialiased selection:bg-slate-200 selection:text-slate-900 tracking-normal leading-normal">
        {children}
      </body>
    </html>
  );
}
