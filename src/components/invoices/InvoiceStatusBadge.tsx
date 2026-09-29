'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { InvoiceStatus } from '@/types/invoice';
import {
  FileEdit,
  CheckCircle2,
  IndianRupee,
  AlertTriangle,
  Clock,
  Ban
} from 'lucide-react';

export type InvoiceDisplayStatus =
  | 'DRAFT'
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

// Backward compatibility alias
export type PaymentStatus = InvoiceDisplayStatus;

export const INVOICE_STATUS_STYLES: Record<
  InvoiceDisplayStatus,
  {
    label: string;
    className: string;
    iconClassName: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-warm-input text-warm-textSubtle border-warm-border font-medium',
    iconClassName: 'text-warm-textSubtle',
    Icon: FileEdit
  },
  UNPAID: {
    label: 'Unpaid',
    className: 'bg-slate-50 text-slate-700 border-slate-200/90 font-semibold',
    iconClassName: 'text-slate-500',
    Icon: Clock
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    className: 'bg-amber-50/90 text-amber-800 border-amber-200 font-semibold',
    iconClassName: 'text-amber-600',
    Icon: IndianRupee
  },
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-50/90 text-emerald-800 border-emerald-200 font-semibold',
    iconClassName: 'text-emerald-600',
    Icon: CheckCircle2
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-red-50 text-red-800 border-red-200 font-bold',
    iconClassName: 'text-red-600',
    Icon: AlertTriangle
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-warm-input/70 text-warm-textSubtle border-warm-border/60 line-through font-normal',
    iconClassName: 'text-warm-textSubtle',
    Icon: Ban
  }
};

export const PAYMENT_STATUS_STYLES = INVOICE_STATUS_STYLES;

export function getInvoiceDisplayStatus(invoice: {
  status: InvoiceStatus | string;
  balanceDue?: number | string | null;
  amountPaid?: number | string | null;
  dueDate?: Date | string | null;
}): InvoiceDisplayStatus {
  if (invoice.status === 'CANCELLED') return 'CANCELLED';
  if (invoice.status === 'DRAFT') return 'DRAFT';

  const balance = Number(invoice.balanceDue ?? 0);
  const paid = Number(invoice.amountPaid ?? 0);

  if (invoice.status === 'PAID' || (balance <= 0 && paid > 0)) {
    return 'PAID';
  }

  const isPastDue = invoice.dueDate
    ? new Date(invoice.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
    : false;

  if (invoice.status === 'OVERDUE' || (balance > 0 && isPastDue)) {
    return 'OVERDUE';
  }

  if (invoice.status === 'PARTIALLY_PAID' || (paid > 0 && balance > 0)) {
    return 'PARTIALLY_PAID';
  }

  // If sent / issued and balance > 0
  return 'UNPAID';
}

export const getInvoicePaymentStatus = getInvoiceDisplayStatus;

export interface InvoiceStatusBadgeProps {
  status?: InvoiceStatus;
  invoice?: {
    status: InvoiceStatus | string;
    balanceDue?: number | string | null;
    amountPaid?: number | string | null;
    dueDate?: Date | string | null;
    sentAt?: Date | string | null;
  };
  direction?: 'col' | 'row';
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  invoice,
  size = 'sm',
  showIcon = true,
  className
}: InvoiceStatusBadgeProps) {
  let displayStatus: InvoiceDisplayStatus = 'UNPAID';

  if (invoice) {
    displayStatus = getInvoiceDisplayStatus(invoice);
  } else if (status) {
    if (status === 'DRAFT') displayStatus = 'DRAFT';
    else if (status === 'SENT') displayStatus = 'UNPAID';
    else if (status === 'PARTIALLY_PAID') displayStatus = 'PARTIALLY_PAID';
    else if (status === 'PAID') displayStatus = 'PAID';
    else if (status === 'OVERDUE') displayStatus = 'OVERDUE';
    else if (status === 'CANCELLED') displayStatus = 'CANCELLED';
  }

  const config = INVOICE_STATUS_STYLES[displayStatus] ?? INVOICE_STATUS_STYLES.UNPAID;
  const { Icon } = config;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-none select-none whitespace-nowrap shadow-xs',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5', 'shrink-0', config.iconClassName)} />
      )}
      <span>{config.label}</span>
    </span>
  );
}

// Backward compatibility alias
export const PaymentStatusBadge = InvoiceStatusBadge;
export const InvoiceStatusGroup = InvoiceStatusBadge;
