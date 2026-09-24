'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { SalesAnalyticsData, exportToCsv } from '@/lib/reports';
import { BarChart } from './charts/BarChart';
import { DonutChart, DonutSegment } from './charts/DonutChart';
import { HorizontalBarChart, HorizontalBarItem } from './charts/HorizontalBarChart';
import {
  TrendingUp,
  BarChart3,
  Users,
  Download,
  Building2,
  PieChart
} from 'lucide-react';

interface SalesAnalyticsTabProps {
  data: SalesAnalyticsData;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: '#16a34a', // Emerald 600
  PARTIALLY_PAID: '#d97706', // Amber 600
  SENT: '#2563eb', // Blue 600
  OVERDUE: '#dc2626', // Red 600
  DRAFT: '#64748b', // Slate 500
  CANCELLED: '#9ca3af' // Gray 400
};

export function SalesAnalyticsTab({ data }: SalesAnalyticsTabProps) {
  const [periodMode, setPeriodMode] = useState<'month' | 'day' | 'week'>('month');

  const activeSeries = useMemo(() => {
    if (periodMode === 'day') return data.byDay;
    if (periodMode === 'week') return data.byWeek;
    return data.byMonth.map((m) => ({
      label: m.month,
      invoiced: m.invoiced,
      paid: m.paid,
      count: m.count
    }));
  }, [periodMode, data]);

  const statusDonutSegments: DonutSegment[] = useMemo(() => {
    return data.byStatus
      .filter((st) => st.amount > 0)
      .map((st) => ({
        label: st.status.replace(/_/g, ' '),
        value: st.amount,
        color: STATUS_COLORS[st.status] || '#8d6e63'
      }));
  }, [data.byStatus]);

  const customerBarData: HorizontalBarItem[] = useMemo(() => {
    const totalSales = data.companyOverview.totalTurnover || 1;
    return data.byCustomer.slice(0, 6).map((c) => ({
      label: c.name,
      subLabel: `${c.count} ${c.count === 1 ? 'bill' : 'bills'} • ${c.gstin || 'Unregistered'}`,
      value: c.invoiced,
      percentage: Math.round((c.invoiced / totalSales) * 100)
    }));
  }, [data.byCustomer, data.companyOverview.totalTurnover]);

  const handleExportSales = () => {
    const rows = data.byCustomer.map((c, i) => ({
      Rank: i + 1,
      Customer: c.name,
      GSTIN: c.gstin || 'Unregistered',
      'Invoiced Amount': c.invoiced,
      'Paid Amount': c.paid,
      'Outstanding Balance': c.outstanding,
      'Invoice Count': c.count
    }));
    exportToCsv('Sales_By_Customer_Report', rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Sales Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Total Gross Sales
              </span>
              <div className="p-2 bg-warm-accentLight text-warm-accent">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {formatCurrency(data.companyOverview.totalTurnover)}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Period MoM Growth:</span>
              <span
                className={`font-bold ${
                  data.growthRatePercent >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {data.growthRatePercent >= 0 ? `+${data.growthRatePercent}%` : `${data.growthRatePercent}%`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Top Client Share
              </span>
              <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight truncate">
              {data.byCustomer[0]?.name || 'N/A'}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Billing Share:</span>
              <span className="font-bold text-warm-text">
                {data.byCustomer[0] ? formatCurrency(data.byCustomer[0].invoiced) : '₹0'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Business Unit
              </span>
              <div className="p-2 bg-amber-50 text-amber-700 border border-amber-200">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-base font-bold text-warm-text tracking-tight truncate">
              {data.companyOverview.name}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">GSTIN:</span>
              <span className="font-semibold text-warm-text">{data.companyOverview.gstin}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Report Export
              </span>
              <div className="p-2 bg-warm-input text-warm-text">
                <Download className="w-4 h-4" />
              </div>
            </div>
            <p className="text-sm text-warm-textMuted mb-3">
              Export full customer sales ledger for CA and audits.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleExportSales}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Sales CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Bar Graph Visualization with Day/Week/Month Switcher */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Sales Volume &amp; Collections Graph
              </h3>
              <p className="text-xs text-warm-textMuted">
                Period comparison: Total billed revenue (brown) vs money collected (green)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-warm-accent inline-block" />
                <span className="text-warm-text">Invoiced</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-600 inline-block" />
                <span className="text-warm-text">Collected</span>
              </div>
            </div>

            {/* Granularity Switcher */}
            <div className="flex border border-warm-border bg-warm-input/50 p-0.5">
              <button
                type="button"
                onClick={() => setPeriodMode('day')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  periodMode === 'day'
                    ? 'bg-warm-surface text-warm-text shadow-sm'
                    : 'text-warm-textMuted hover:text-warm-text'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('week')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  periodMode === 'week'
                    ? 'bg-warm-surface text-warm-text shadow-sm'
                    : 'text-warm-textMuted hover:text-warm-text'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('month')}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  periodMode === 'month'
                    ? 'bg-warm-surface text-warm-text shadow-sm'
                    : 'text-warm-textMuted hover:text-warm-text'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <BarChart data={activeSeries} height={220} showPaidBar={true} />
        </CardContent>
      </Card>

      {/* Visual Graphs Grid: Donut Status Chart & Horizontal Customer Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Sales by Status Donut Graph */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Sales by Status Graph
                </h3>
                <p className="text-xs text-warm-textMuted">Proportional value across invoice statuses</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={statusDonutSegments}
              centerLabel="Sales Total"
              centerValue={formatCurrency(data.companyOverview.totalTurnover)}
              size={180}
            />
          </CardContent>
        </Card>

        {/* Top Customers Horizontal Bar Chart */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Top Customers Sales Graph
                </h3>
                <p className="text-xs text-warm-textMuted">Ranked revenue share comparison</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <HorizontalBarChart data={customerBarData} maxItems={6} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
