'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED' | 'ACTIVE' | 'INACTIVE' | 'INDIVIDUAL' | 'BUSINESS';

export interface BadgeProps {
  status?: StatusVariant;
  variant?: 'paid' | 'pending' | 'draft' | 'overdue' | 'neutral' | 'accent';
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ status, variant, children, className }: BadgeProps) {
  let resolvedVariant = variant || 'neutral';
  let label = children;

  if (status) {
    switch (status) {
      case 'PAID':
      case 'ACTIVE':
        resolvedVariant = 'paid';
        label = label || (status === 'PAID' ? 'Paid' : 'Active');
        break;
      case 'SENT':
      case 'PARTIALLY_PAID':
        resolvedVariant = 'pending';
        label = label || (status === 'SENT' ? 'Sent' : 'Partially Paid');
        break;
      case 'OVERDUE':
        resolvedVariant = 'overdue';
        label = label || 'Overdue';
        break;
      case 'DRAFT':
      case 'INACTIVE':
        resolvedVariant = 'draft';
        label = label || (status === 'DRAFT' ? 'Draft' : 'Inactive');
        break;
      case 'CANCELLED':
        resolvedVariant = 'draft';
        label = label || 'Cancelled';
        break;
      case 'BUSINESS':
      case 'INDIVIDUAL':
        resolvedVariant = 'accent';
        label = label || (status === 'BUSINESS' ? 'Business' : 'Individual');
        break;
    }
  }

  const styles = {
    paid: 'bg-status-paidBg text-status-paidText border-emerald-200',
    pending: 'bg-status-pendingBg text-status-pendingText border-amber-200',
    draft: 'bg-status-draftBg text-status-draftText border-gray-200',
    overdue: 'bg-status-overdueBg text-status-overdueText border-red-200',
    neutral: 'bg-warm-input text-warm-textMuted border-warm-border',
    accent: 'bg-warm-accentLight text-warm-accent border-warm-border'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold border rounded-none transition-colors select-none',
        styles[resolvedVariant],
        className
      )}
    >
      {label}
    </span>
  );
}
