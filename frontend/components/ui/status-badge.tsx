import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  if (
    normalized === 'SETTLED' ||
    normalized === 'ALLOW' ||
    normalized === 'APPROVED' ||
    normalized === 'ACTIVE' ||
    normalized === 'SUCCESS' ||
    normalized === 'PAID'
  ) {
    return <Badge variant="emerald">{status}</Badge>;
  }

  if (
    normalized === 'GATED' ||
    normalized === 'DENIED' ||
    normalized === 'WARNING' ||
    normalized === 'BLOCKED'
  ) {
    return <Badge variant="amber">{status}</Badge>;
  }

  if (
    normalized === 'FAILED' ||
    normalized === 'THROTTLED' ||
    normalized === 'REJECTED' ||
    normalized === 'ERROR'
  ) {
    return <Badge variant="destructive">{status}</Badge>;
  }

  if (
    normalized === 'PENDING' ||
    normalized === 'IN_PROGRESS' ||
    normalized === 'EVALUATING'
  ) {
    return <Badge variant="indigo">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
