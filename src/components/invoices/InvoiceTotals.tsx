'use client';

import React from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { buildRateBreakdown, PreviewTotals } from '@/lib/gst';

/**
 * Totals panel shared by the invoice form and the read-only detail view, so a
 * user sees the figures laid out identically before and after saving.
 */

export interface InvoiceTotalsProps {
  totals: PreviewTotals;
  isIgst: boolean;
  currency?: string;
  /** Settlement rows, shown only on a saved invoice. */
  amountPaid?: number;
  creditNoteTotal?: number;
  debitNoteTotal?: number;
  balanceDue?: number;
  className?: string;
}

export function InvoiceTotals({
  totals,
  isIgst,
  amountPaid,
  creditNoteTotal,
  debitNoteTotal,
  balanceDue,
  className
}: InvoiceTotalsProps) {
  const rateRows = buildRateBreakdown(totals.lines);
  const hasSettlement = amountPaid !== undefined || balanceDue !== undefined;

  const Row = ({
    label,
    value,
    muted = false,
    negative = false
  }: {
    label: string;
    value: number;
    muted?: boolean;
    negative?: boolean;
  }) => (
    <div className="flex items-center justify-between gap-4 py-1.5">
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
      <div className="px-4 py-3 border-b border-warm-border/50">
        <h3 className="text-sm font-semibold text-warm-text tracking-tight">Summary</h3>
      </div>

      <div className="p-4">
        <Row label="Subtotal" value={totals.subtotal} />

        {totals.discountAmount > 0 && (
          <Row label="Discount" value={totals.discountAmount} negative />
        )}

        <Row label="Taxable Value" value={totals.taxableAmount} />

        <div className="my-2 border-t border-dashed border-warm-border/70" />

        {isIgst ? (
          <Row label="IGST" value={totals.igstAmount} />
        ) : (
          <>
            <Row label="CGST" value={totals.cgstAmount} />
            <Row label="SGST" value={totals.sgstAmount} />
          </>
        )}

        {/* Rate-wise detail, so a mixed-rate invoice can be checked at a glance. */}
        {rateRows.length > 1 && (
          <div className="mt-2 pt-2 border-t border-dashed border-warm-border/70 space-y-1">
            {rateRows.map((row) => (
              <div
                key={row.taxRate}
                className="flex items-center justify-between gap-3 text-[11px] text-warm-textSubtle"
              >
                <span>
                  GST {row.taxRate}% on {formatCurrency(row.taxableAmount)}
                </span>
                <span className="tabular-nums">{formatCurrency(row.taxAmount)}</span>
              </div>
            ))}
          </div>
        )}

        {totals.roundOff !== 0 && (
          <>
            <div className="my-2 border-t border-dashed border-warm-border/70" />
            <Row label="Round Off" value={totals.roundOff} muted />
          </>
        )}

        <div className="mt-3 -mx-4 -mb-4 px-4 py-3 bg-warm-accent flex items-center justify-between gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-white/90">
            Grand Total
          </span>
          <span className="text-lg font-bold text-white tabular-nums">
            {formatCurrency(totals.grandTotal)}
          </span>
        </div>
      </div>

      {hasSettlement && (
        <div className="p-4 border-t border-warm-border/50 bg-warm-accentLight/20">
          {amountPaid !== undefined && amountPaid > 0 && (
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-xs text-warm-textMuted">Amount Paid</span>
              <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                {formatCurrency(amountPaid)}
              </span>
            </div>
          )}

          {creditNoteTotal !== undefined && creditNoteTotal > 0 && (
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-xs text-warm-textMuted">Credit Notes</span>
              <span className="text-xs font-semibold text-warm-textMuted tabular-nums">
                -{formatCurrency(creditNoteTotal)}
              </span>
            </div>
          )}

          {debitNoteTotal !== undefined && debitNoteTotal > 0 && (
            <div className="flex items-center justify-between gap-4 py-1.5">
              <span className="text-xs text-warm-textMuted">Debit Notes</span>
              <span className="text-xs font-semibold text-warm-textMuted tabular-nums">
                {formatCurrency(debitNoteTotal)}
              </span>
            </div>
          )}

          {balanceDue !== undefined && (
            <div className="flex items-center justify-between gap-4 pt-2 mt-1 border-t border-warm-border/60">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textMuted">
                Balance Due
              </span>
              <span
                className={cn(
                  'text-base font-bold tabular-nums',
                  balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'
                )}
              >
                {formatCurrency(balanceDue)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
