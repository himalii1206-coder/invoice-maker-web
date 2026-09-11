'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

/**
 * Dashboard stat tile.
 *
 * Tones are semantic rather than decorative: the same colour always means the
 * same thing across the module, so "red" reliably reads as money that is late.
 */
export type StatTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<StatTone, { icon: string; value: string }> = {
  accent: { icon: 'bg-warm-accentLight text-warm-accent', value: 'text-warm-text' },
  success: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
  warning: { icon: 'bg-amber-50 text-amber-600', value: 'text-amber-700' },
  danger: { icon: 'bg-red-50 text-red-600', value: 'text-red-700' },
  neutral: { icon: 'bg-warm-input text-warm-textMuted', value: 'text-warm-text' }
};

export interface StatCardProps {
  label: string;
  value: number;
  /** Rendered under the value, e.g. "12 invoices". */
  hint?: string;
  icon: React.ReactNode;
  tone?: StatTone;
  /** Turns the whole tile into a filter shortcut. */
  href?: string;
  isLoading?: boolean;
  /** Set false for counts, which must not be formatted as currency. */
  isCurrency?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  href,
  isLoading = false,
  isCurrency = true
}: StatCardProps) {
  const palette = TONES[tone];

  const body = (
    <div
      className={cn(
        'h-full bg-warm-surface border border-warm-border/70 shadow-warm p-5 transition-colors',
        href && 'hover:border-warm-accent/40 hover:bg-warm-accentLight/20 cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-textMuted">
          {label}
        </span>
        <span className={cn('p-2 rounded-none shrink-0', palette.icon)}>{icon}</span>
      </div>

      {isLoading ? (
        // Reserves the exact height of the value so the grid does not jump.
        <div className="h-8 w-28 bg-warm-input animate-pulse" />
      ) : (
        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', palette.value)}>
          {isCurrency ? formatCurrency(value) : value.toLocaleString('en-IN')}
        </p>
      )}

      {hint && !isLoading && (
        <p className="text-[11px] text-warm-textMuted font-medium mt-1">{hint}</p>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
