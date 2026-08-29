import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  footerLeft?: string;
  footerRight?: string;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  unit,
  change,
  changeType = 'positive',
  footerLeft,
  footerRight,
  loading = false,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-full pt-2" />
      </div>
    );
  }

  return (
    <Card className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-2">
          {title}
        </div>
        <div className="text-3xl font-black font-mono text-slate-900 tracking-tight flex items-baseline space-x-1">
          <span>{value}</span>
          {unit && <span className="text-xs font-sans text-slate-400 font-normal ml-1">{unit}</span>}
        </div>
      </div>

      {(footerLeft || footerRight || change) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
          {footerLeft ? (
            <span className="text-slate-700 flex items-center space-x-1 font-bold">
              {change && (
                changeType === 'positive' ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 inline" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-600 inline" />
                )
              )}
              <span>{footerLeft}</span>
            </span>
          ) : change ? (
            <Badge variant={changeType === 'positive' ? 'emerald' : changeType === 'negative' ? 'destructive' : 'secondary'}>
              {change}
            </Badge>
          ) : null}

          {footerRight && (
            <span className="text-slate-400 text-[11px] font-mono">{footerRight}</span>
          )}
        </div>
      )}
    </Card>
  );
}
