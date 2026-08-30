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
    normalized === 'DENIED' ||
    normalized === 'DENY' ||
    normalized === 'BLOCKED' ||
    normalized === 'REJECTED'
  ) {
    return <Badge variant="destructive">{status}</Badge>;
  }

  if (
    normalized === 'FAILED' ||
    normalized === 'ERROR' ||
    normalized === 'THROTTLED' ||
    normalized === 'DECLINED'
  ) {
    return <Badge variant="amber">{status}</Badge>;
  }

  if (
    normalized === 'NEEDS_APPROVAL' ||
    normalized === 'PENDING' ||
    normalized === 'IN_PROGRESS' ||
    normalized === 'EVALUATING'
  ) {
    return <Badge variant="indigo">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}
