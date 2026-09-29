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
  isReverseCharge?: boolean;
  currency?: string;
  extraCharges?: number;
  /** Settlement rows, shown only on a saved invoice. */
  amountPaid?: number;
  balanceDue?: number;
  className?: string;
}

export function InvoiceTotals({
  totals,
  isIgst,
  isReverseCharge: explicitReverseCharge,
  currency,
  extraCharges,
  amountPaid,
  balanceDue,
  className
}: InvoiceTotalsProps) {
  const isRcm = explicitReverseCharge ?? totals.isReverseCharge ?? false;
  const rateRows = buildRateBreakdown(totals.lines);
  const effectiveExtraCharges = extraCharges ?? totals.extraCharges ?? 0;
  const hasSettlement = amountPaid !== undefined || balanceDue !== undefined;

  const Row = ({
    label,
    value,
    muted = false,
    negative = false,
    badge
  }: {
    label: string;
    value: number;
    muted?: boolean;
    negative?: boolean;
    badge?: string;
  }) => (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className={cn('text-xs', muted ? 'text-warm-textSubtle' : 'text-warm-textMuted')}>
          {label}
        </span>
        {badge && (
          <span className="px-1 py-0.2 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 rounded-none">
            {badge}
          </span>
        )}
      </div>
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
        {isRcm && (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-amber-500/15 text-amber-800 border border-amber-500/30">
            RCM Active
          </span>
        )}
      </div>

      <div className="p-4">
        <Row label="Subtotal" value={totals.subtotal} />

        {totals.discountAmount > 0 && (
          <Row label="Discount" value={totals.discountAmount} negative />
        )}

        <Row label="Taxable Value" value={totals.taxableAmount} />

        {(() => {
          const singleRate = rateRows.length === 1 ? rateRows[0].taxRate : null;
          const halfRate = singleRate !== null ? singleRate / 2 : null;

          if (isIgst) {
            const igstLabel = singleRate !== null ? `IGST (${singleRate}%)` : 'IGST';
            return <Row label={igstLabel} value={totals.igstAmount} badge={isRcm ? 'RCM' : undefined} />;
          }

          const cgstLabel = halfRate !== null ? `CGST (${halfRate}%)` : 'CGST';
          const sgstLabel = halfRate !== null ? `SGST (${halfRate}%)` : 'SGST';

          return (
            <>
              <Row label={cgstLabel} value={totals.cgstAmount} badge={isRcm ? 'RCM' : undefined} />
              <Row label={sgstLabel} value={totals.sgstAmount} badge={isRcm ? 'RCM' : undefined} />
            </>
          );
        })()}

        {/* Rate-wise detail for mixed-rate invoices */}
        {rateRows.length > 1 && (
          <div className="mt-2 pt-2 border-t border-dashed border-warm-border/70 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Tax Rate Breakdown {isRcm && '(Reverse Charge)'}
            </p>
            {rateRows.map((row) => {
              const rowHalf = row.taxRate / 2;
              return (
                <div
                  key={row.taxRate}
                  className="flex items-center justify-between gap-3 text-[11px] text-warm-textSubtle"
                >
                  <span>
                    {isIgst
                      ? `IGST (${row.taxRate}%) on ${formatCurrency(row.taxableAmount)}`
                      : `CGST (${rowHalf}%) + SGST (${rowHalf}%) on ${formatCurrency(row.taxableAmount)}`}
                  </span>
                  <span className="tabular-nums font-medium text-warm-text">
                    {formatCurrency(row.taxAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isRcm && totals.taxAmount > 0 && (
          <div className="my-2.5 p-2 bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 leading-snug">
            <span className="font-bold">Tax on Reverse Charge (₹{formatCurrency(totals.taxAmount).replace('₹', '')}):</span> Payable directly by recipient to Govt. Excluded from Grand Total.
          </div>
        )}

        {effectiveExtraCharges > 0 && (
          <Row label="Extra Charges" value={effectiveExtraCharges} />
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
