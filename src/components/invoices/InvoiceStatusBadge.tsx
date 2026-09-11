'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { InvoiceStatus } from '@/types/invoice';
import {
  FileEdit,
  Send,
  CheckCircle2,
  CircleDollarSign,
  AlertTriangle,
  Ban
} from 'lucide-react';

/**
 * Status pill for invoices.
 *
 * The generic `Badge` handles simple labels; invoices get their own because the
 * status is the single most scanned thing in the list, and pairing each one
 * with a fixed icon lets it be recognised without reading the word.
 */

const STATUS_STYLES: Record<
  InvoiceStatus,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-status-draftBg text-status-draftText border-gray-200',
    Icon: FileEdit
  },
  SENT: {
    label: 'Sent',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: Send
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    className: 'bg-status-pendingBg text-status-pendingText border-amber-200',
    Icon: CircleDollarSign
  },
  PAID: {
    label: 'Paid',
    className: 'bg-status-paidBg text-status-paidText border-emerald-200',
    Icon: CheckCircle2
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-status-overdueBg text-status-overdueText border-red-200',
    Icon: AlertTriangle
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-warm-input text-warm-textSubtle border-warm-border line-through',
    Icon: Ban
  }
};

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  className
}: InvoiceStatusBadgeProps) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const { Icon } = config;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold border rounded-none select-none whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {config.label}
    </span>
  );
}
