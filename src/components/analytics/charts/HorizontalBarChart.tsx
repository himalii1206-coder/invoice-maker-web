'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

export interface HorizontalBarItem {
  label: string;
  subLabel?: string;
  value: number;
  secondaryValue?: number;
  percentage?: number;
  colorClassName?: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarItem[];
  currencyFormat?: boolean;
  maxItems?: number;
}

const DEFAULT_COLORS = [
  'bg-warm-accent',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-rose-600'
];

export function HorizontalBarChart({
  data,
  currencyFormat = true,
  maxItems = 10
}: HorizontalBarChartProps) {
  const items = data.slice(0, maxItems);
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-warm-textMuted">
        No records to visualize.
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const percent = Math.min(100, Math.max(4, Math.round((item.value / maxVal) * 100)));
        const color = item.colorClassName || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

        return (
          <div key={idx} className="space-y-1.5 group">
            <div className="flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="font-bold text-warm-text truncate block">{item.label}</span>
                {item.subLabel && (
                  <span className="text-[11px] text-warm-textMuted truncate block">
                    {item.subLabel}
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold text-warm-text">
                  {currencyFormat ? formatCurrency(item.value) : item.value}
                </span>
                {item.percentage !== undefined && (
                  <span className="text-[10px] text-warm-textMuted ml-1.5 font-medium">
                    ({item.percentage}%)
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-2 bg-warm-input overflow-hidden">
              <div
                className={`h-full ${color} transition-all duration-500 group-hover:brightness-110`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
