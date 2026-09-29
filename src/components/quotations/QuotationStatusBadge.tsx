'use client';

import React from 'react';
import Link from 'next/link';
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
    className: 'bg-warm-accentLight/70 text-warm-accent border-warm-accent/30',
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
  convertedInvoiceId?: string | null;
  convertedInvoiceNumber?: string | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function QuotationStatusBadge({
  status,
  convertedInvoiceId,
  convertedInvoiceNumber,
  size = 'sm',
  showIcon = true,
  className
}: QuotationStatusBadgeProps) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  const { Icon } = config;

  const isConvertedWithInvoice = status === 'CONVERTED' && Boolean(convertedInvoiceId);

  const badgeContent = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold border rounded-none select-none whitespace-nowrap transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        isConvertedWithInvoice
          ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-600 hover:text-white cursor-pointer group shadow-xs'
          : config.className,
        className
      )}
      title={
        isConvertedWithInvoice
          ? `Converted to Invoice ${convertedInvoiceNumber ? convertedInvoiceNumber : ''} · Click to view invoice`
          : undefined
      }
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />}
      <span>{config.label}</span>
    </span>
  );

  if (isConvertedWithInvoice && convertedInvoiceId) {
    return (
      <Link
        href={`/invoices/${convertedInvoiceId}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-block"
        title={`Open related invoice ${convertedInvoiceNumber || ''}`}
      >
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
}

