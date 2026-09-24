'use client';

import React from 'react';
import Link from 'next/link';
import { cn, formatCurrency } from '@/lib/utils';

export type StatTone =
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'neutral';

const TONES: Record<StatTone, { icon: string; value: string; hint?: string }> = {
  accent: { icon: 'text-warm-accent', value: 'text-warm-text', hint: 'text-warm-textMuted' },
  success: { icon: 'text-emerald-600', value: 'text-emerald-700', hint: 'text-emerald-700/80' },
  warning: { icon: 'text-amber-600', value: 'text-amber-800', hint: 'text-amber-800/80' },
  danger: { icon: 'text-red-600', value: 'text-red-700', hint: 'text-red-600/80' },
  info: { icon: 'text-blue-600', value: 'text-blue-700', hint: 'text-blue-700/80' },
  purple: { icon: 'text-purple-600', value: 'text-purple-700', hint: 'text-purple-700/80' },
  neutral: { icon: 'text-warm-textMuted', value: 'text-warm-text', hint: 'text-warm-textMuted' }
};

export interface StatCardProps {
  label: string;
  value: number | string;
  /** Rendered under the value, e.g. "12 invoices". */
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatTone;
  /** Turns the whole tile into a filter shortcut or link. */
  href?: string;
  isLoading?: boolean;
  /** Set false for counts or pre-formatted text, which must not be formatted as currency. */
  isCurrency?: boolean;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  href,
  isLoading = false,
  isCurrency = true,
  className,
  onClick
}: StatCardProps) {
  const palette = TONES[tone] || TONES.neutral;

  const content = (
    <div
      onClick={onClick}
      className={cn(
        'p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm transition-colors',
        (href || onClick) && 'hover:border-warm-accent/40 cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between text-warm-textMuted text-xs mb-1">
        <span>{label}</span>
        <span className={cn('shrink-0', palette.icon)}>{icon}</span>
      </div>

      {isLoading ? (
        <div className="h-7 w-28 bg-warm-input animate-pulse my-0.5" />
      ) : (
        <p className={cn('text-xl font-bold tracking-tight tabular-nums', palette.value)}>
          {typeof value === 'number'
            ? isCurrency
              ? formatCurrency(value)
              : value.toLocaleString('en-IN')
            : value}
        </p>
      )}

      {hint && !isLoading && (
        <div className={cn('text-[11px] mt-1 block', palette.hint || 'text-warm-textMuted')}>
          {hint}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
