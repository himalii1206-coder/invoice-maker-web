'use client';

import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';

export interface QuotationTotalsProps {
  total: number; // Subtotal/Taxable
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  forwardingPackagingAmount: number;
  secondTotal: number;
  roundOff?: number;
  grandTotal: number;
  isIgst: boolean;
  taxRate?: number;
  discountAmount?: number;
  className?: string;
}

export function QuotationTotals({
  total,
  cgstAmount,
  sgstAmount,
  igstAmount,
  forwardingPackagingAmount,
  secondTotal,
  roundOff = 0,
  grandTotal,
  isIgst,
  taxRate,
  discountAmount = 0,
  className
}: QuotationTotalsProps) {
  const halfRate = taxRate !== undefined ? taxRate / 2 : undefined;

  const Row = ({
    label,
    value,
    muted = false,
    highlight = false,
    negative = false
  }: {
    label: string;
    value: number;
    muted?: boolean;
    highlight?: boolean;
    negative?: boolean;
  }) => (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-1.5',
        highlight && 'font-semibold text-warm-text bg-warm-input/40 px-2 -mx-2'
      )}
    >
      <span className={cn('text-xs', muted ? 'text-warm-textSubtle' : 'text-warm-textMuted')}>
        {label}
      </span>
      <span
        className={cn(
          'text-xs font-semibold tabular-nums',
          muted ? 'text-warm-textMuted' : 'text-warm-text'
        )}
      >
        {negative && value > 0 ? '-' : ''}
        {formatCurrency(value)}
      </span>
    </div>
  );

  return (
    <div className={cn('bg-warm-surface border border-warm-border/60 shadow-warm', className)}>
      <div className="px-4 py-3 border-b border-warm-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-warm-text tracking-tight">Summary</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
          {isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
        </span>
      </div>

      <div className="p-4 space-y-1">
        <Row label="Total (Item Value)" value={total} />

        {discountAmount > 0 && (
          <Row label="Discount" value={discountAmount} negative />
        )}

        {/* CGST */}
        <Row
          label={halfRate !== undefined && !isIgst ? `CGST @ ${halfRate}%` : 'CGST'}
          value={isIgst ? 0 : cgstAmount}
          muted={isIgst}
        />

        {/* SGST */}
        <Row
          label={halfRate !== undefined && !isIgst ? `SGST @ ${halfRate}%` : 'SGST'}
          value={isIgst ? 0 : sgstAmount}
          muted={isIgst}
        />

        {/* IGST */}
        <Row
          label={taxRate !== undefined && isIgst ? `IGST @ ${taxRate}%` : 'IGST'}
          value={isIgst ? igstAmount : 0}
          muted={!isIgst}
        />

        {/* Forwarding & Packaging */}
        <Row label="Forwarding & Packaging" value={forwardingPackagingAmount} />

        <div className="my-2 border-t border-dashed border-warm-border/80" />

        {/* Second Total */}
        <Row label="Second Total" value={secondTotal} highlight />

        {roundOff !== 0 && (
          <Row label="Round Off" value={roundOff} />
        )}

        {/* Grand Total */}
        <div className="mt-3 pt-3 border-t border-warm-border flex items-center justify-between gap-4 bg-warm-accent-light/50 -mx-4 px-4 py-2.5">
          <span className="text-sm font-bold text-warm-text">Grand Total</span>
          <span className="text-base font-extrabold text-warm-accent tabular-nums">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
