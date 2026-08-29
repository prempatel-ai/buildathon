import React from 'react';

interface PageHeaderProps {
  category: string;
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  category,
  title,
  subtitle,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-200/80 gap-4">
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase font-mono">
          <span>Merchant Admin</span>
          <span>&bull;</span>
          <span className="text-indigo-600 font-extrabold">{category}</span>
        </div>
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="px-3 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-bold shadow-2xs font-mono">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center space-x-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
