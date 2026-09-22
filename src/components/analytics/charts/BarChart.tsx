'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

export interface BarChartSeriesItem {
  label: string;
  invoiced: number;
  paid?: number;
  tax?: number;
  count?: number;
}

interface BarChartProps {
  data: BarChartSeriesItem[];
  height?: number;
  showPaidBar?: boolean;
  currencyFormat?: boolean;
  valuePrefix?: string;
}

export function BarChart({
  data,
  height = 200,
  showPaidBar = true,
  currencyFormat = true
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-warm-textMuted">
        No data available for this chart.
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.invoiced || 0, showPaidBar ? d.paid || 0 : 0)),
    1
  );

  return (
    <div className="space-y-4">
      <div
        className="grid gap-2 sm:gap-4 items-end pt-6 border-b border-warm-border"
        style={{
          height: `${height}px`,
          gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`
        }}
      >
        {data.map((item, idx) => {
          const invoicedHeight = Math.max(6, Math.round(((item.invoiced || 0) / maxVal) * 100));
          const paidHeight = showPaidBar
            ? Math.max(6, Math.round(((item.paid || 0) / maxVal) * 100))
            : 0;

          return (
            <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip */}
              <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-warm-text text-warm-surface text-[10px] p-2 shadow-xl whitespace-nowrap z-30 pointer-events-none">
                <p className="font-bold border-b border-warm-surface/20 pb-0.5 mb-1">{item.label}</p>
                <p>
                  Primary:{' '}
                  {currencyFormat ? formatCurrency(item.invoiced) : `${item.invoiced}`}
                </p>
                {showPaidBar && item.paid !== undefined && (
                  <p className="text-emerald-300">
                    Secondary: {currencyFormat ? formatCurrency(item.paid) : `${item.paid}`}
                  </p>
                )}
                {item.count !== undefined && (
                  <p className="text-warm-surface/70">Count: {item.count}</p>
                )}
              </div>

              {/* Bars */}
              <div className="flex items-end gap-1 w-full justify-center h-full pb-1">
                <div
                  style={{ height: `${invoicedHeight}%` }}
                  className="w-2.5 sm:w-4 bg-warm-accent transition-all duration-500 hover:brightness-110"
                />
                {showPaidBar && (
                  <div
                    style={{ height: `${paidHeight}%` }}
                    className="w-2.5 sm:w-4 bg-emerald-600 transition-all duration-500 hover:brightness-110"
                  />
                )}
              </div>

              <span className="text-[10px] font-medium text-warm-textMuted mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
