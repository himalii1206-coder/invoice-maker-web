'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { QuotationStatus } from '@/types/quotation';
import {
  FileEdit,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  Ban
} from 'lucide-react';

const STATUS_STYLES: Record<
  QuotationStatus,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-warm-input text-warm-textSubtle border-warm-border',
    Icon: FileEdit
  },
  SENT: {
    label: 'Sent',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    Icon: Send
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon: CheckCircle2
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
    Icon: XCircle
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: Clock
  },
  CONVERTED: {
    label: 'Converted',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    Icon: ArrowRightLeft
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-500 border-gray-300 line-through',
    Icon: Ban
  }
};

export interface QuotationStatusBadgeProps {
  status: QuotationStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function QuotationStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
  className
}: QuotationStatusBadgeProps) {
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
