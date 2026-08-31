'use client';

import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function AgentpayLogo({ size = 22, className = '', ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#09090b" />
      {/* Precision Geometric Monogram */}
      <path
        d="M16 6.5L25 22.5H19.8L16 15.2L12.2 22.5H7L16 6.5Z"
        fill="#FFFFFF"
      />
      {/* Autonomous Payment Gateway Node */}
      <circle cx="16" cy="24.5" r="2" fill="#10B981" />
      <path
        d="M14 16.5H18"
        stroke="#09090b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AgentpayBrand({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      <AgentpayLogo size={size} />
      <div className="flex items-center tracking-tight">
        <span className="font-bold text-neutral-900 text-sm font-sans tracking-tight">Agentpay</span>
      </div>
    </div>
  );
}
