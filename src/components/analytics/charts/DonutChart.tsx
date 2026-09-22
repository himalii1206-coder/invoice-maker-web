'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  subText?: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  currencyFormat?: boolean;
}

export function DonutChart({
  data,
  centerLabel = 'Total',
  centerValue,
  size = 180,
  currencyFormat = true
}: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0 || data.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-warm-textMuted">
        No breakdown data available.
      </div>
    );
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const displayCenterValue =
    centerValue !== undefined
      ? centerValue
      : currencyFormat
      ? formatCurrency(total)
      : total;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-2">
      {/* SVG Ring */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-warm-input"
            strokeWidth="14"
          />

          {data.map((item, idx) => {
            const share = item.value / total;
            const strokeDasharray = `${share * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedOffset;
            accumulatedOffset += share * circumference;
            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? '18' : '14'}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle block truncate max-w-[100px]">
            {hoveredIdx !== null ? data[hoveredIdx].label : centerLabel}
          </span>
          <span className="text-sm font-bold text-warm-text truncate max-w-[120px]">
            {hoveredIdx !== null
              ? currencyFormat
                ? formatCurrency(data[hoveredIdx].value)
                : data[hoveredIdx].value
              : displayCenterValue}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2 flex-1 min-w-[180px] w-full">
        {data.map((item, idx) => {
          const sharePercent = Math.round((item.value / total) * 100);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className={`p-2 border transition-all cursor-pointer flex items-center justify-between text-xs ${
                isHovered
                  ? 'bg-warm-input/60 border-warm-accent shadow-sm'
                  : 'bg-warm-surface border-warm-border/50 hover:border-warm-border'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 shrink-0 inline-block"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-warm-text truncate">{item.label}</span>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-warm-text">
                  {currencyFormat ? formatCurrency(item.value) : item.value}
                </span>
                <span className="text-[10px] text-warm-textMuted ml-1.5 font-medium">
                  {sharePercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
