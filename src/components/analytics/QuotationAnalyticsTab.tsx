'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { QuotationPipelineData, exportToCsv } from '@/lib/reports';
import { BarChart } from './charts/BarChart';
import { DonutChart, DonutSegment } from './charts/DonutChart';
import { HorizontalBarChart, HorizontalBarItem } from './charts/HorizontalBarChart';
import {
  FileSpreadsheet,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Target,
  Filter,
  ArrowRight,
  Download,
  AlertTriangle,
  PieChart,
  BarChart3,
  Users
} from 'lucide-react';

interface QuotationAnalyticsTabProps {
  data?: QuotationPipelineData;
}

const QUOTATION_STATUS_COLORS: Record<string, string> = {
  CONVERTED: '#7e22ce', // Purple 700
  ACCEPTED: '#16a34a', // Emerald 600
  SENT: '#2563eb', // Blue 600
  DRAFT: '#64748b', // Slate 500
  EXPIRED: '#d97706', // Amber 600
  REJECTED: '#dc2626', // Red 600
  CANCELLED: '#9ca3af' // Gray 400
};

export function QuotationAnalyticsTab({ data }: QuotationAnalyticsTabProps) {
  const qPipe = data;

  const statusDonutSegments: DonutSegment[] = useMemo(() => {
    if (!qPipe) return [];
    return qPipe.byStatus
      .filter((st) => st.amount > 0)
      .map((st) => ({
        label: (st.label || st.status).replace(/_/g, ' '),
        value: st.amount,
        color: QUOTATION_STATUS_COLORS[st.status] || '#8d6e63'
      }));
  }, [qPipe]);

  const monthlySeries = useMemo(() => {
    if (!qPipe?.byMonth || qPipe.byMonth.length === 0) return [];
    return qPipe.byMonth.map((m) => ({
      label: m.month,
      invoiced: m.quoted, // BarChart brown column
      paid: m.converted, // BarChart purple/green column
      count: m.count
    }));
  }, [qPipe]);

  const customerBarData: HorizontalBarItem[] = useMemo(() => {
    if (!qPipe?.byCustomer || qPipe.byCustomer.length === 0) return [];
    const maxVal = qPipe.totalQuotedValue || 1;
    return qPipe.byCustomer.slice(0, 6).map((c) => ({
      label: c.name,
      subLabel: `${c.count} ${c.count === 1 ? 'quotation' : 'quotations'} • Converted: ${formatCurrency(c.converted)}`,
      value: c.quoted,
      percentage: Math.round((c.quoted / maxVal) * 100)
    }));
  }, [qPipe]);

  const handleExportPipeline = () => {
    if (!qPipe) return;
    const rows = qPipe.byStatus.map((st, i) => ({
      Rank: i + 1,
      Status: st.label || st.status,
      'Quotation Count': st.count,
      'Total Value (INR)': st.amount,
      'Share (%)': `${st.percentage}%`
    }));
    exportToCsv('Quotation_Pipeline_Report', rows);
  };

  if (!qPipe || qPipe.totalQuotations === 0) {
    return (
      <Card className="border-warm-border/70 p-12 text-center">
        <FileSpreadsheet className="w-10 h-10 text-warm-accent mx-auto mb-3" />
        <h3 className="text-base font-bold text-warm-text">No Quotation Data Available</h3>
        <p className="text-xs text-warm-textMuted max-w-md mx-auto mt-1">
          Create and send sales quotations to unlock opportunity pipeline tracking, win-rate analytics, and deal conversion funnels.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Quotation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pipeline */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Total Quoted Pipeline
              </span>
              <div className="p-2 bg-warm-accentLight text-warm-accent">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight tabular-nums">
              {formatCurrency(qPipe.totalQuotedValue)}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Volume:</span>
              <span className="font-semibold text-warm-text">
                {qPipe.totalQuotations} {qPipe.totalQuotations === 1 ? 'estimate' : 'estimates'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Active Open Deals */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Active Open Deals
              </span>
              <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-700 tracking-tight tabular-nums">
              {formatCurrency(qPipe.activePipelineValue)}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Sent &amp; Accepted:</span>
              <span className="font-semibold text-blue-700">
                {qPipe.sentQuotesCount} sent, {qPipe.acceptedQuotesCount} accepted
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Converted into Invoices */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Converted into Invoices
              </span>
              <div className="p-2 bg-purple-50 text-purple-700 border border-purple-200">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-700 tracking-tight tabular-nums">
              {formatCurrency(qPipe.convertedQuotesValue)}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Invoiced Deals:</span>
              <span className="font-semibold text-purple-700">
                {qPipe.convertedQuotesCount} converted
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Deal Win Rate
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-emerald-700 tracking-tight tabular-nums">
                {qPipe.conversionRatePercent}%
              </p>
              <span className="text-xs text-warm-textMuted">conversion</span>
            </div>
            <div className="w-full bg-warm-input h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, qPipe.conversionRatePercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Avg Quote Size:</span>
              <span className="font-semibold text-warm-text">
                {formatCurrency(qPipe.averageQuotationValue)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Quoted vs Converted Graph */}
      {monthlySeries.length > 0 && (
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Monthly Quotation Volume vs Invoice Conversion
                </h3>
                <p className="text-xs text-warm-textMuted">
                  Comparison of total value quoted (brown) vs value successfully converted into invoices (green)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-warm-accent inline-block" />
                <span className="text-warm-text">Quoted Value</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-600 inline-block" />
                <span className="text-warm-text">Converted Value</span>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <BarChart data={monthlySeries} height={220} showPaidBar={true} />
          </CardContent>
        </Card>
      )}

      {/* Visual Graphs Grid: Donut Status Chart & Horizontal Customer Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Quotation Status Distribution Donut */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-purple-50 text-purple-700 border border-purple-200">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Quotation Status Distribution
                </h3>
                <p className="text-xs text-warm-textMuted">Proportional value across quotation stages</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={statusDonutSegments}
              centerLabel="Pipeline Total"
              centerValue={formatCurrency(qPipe.totalQuotedValue)}
              size={180}
            />
          </CardContent>
        </Card>

        {/* Sales Pipeline Lifecycle Funnel */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Opportunity-to-Invoice Funnel
                </h3>
                <p className="text-xs text-warm-textMuted">Progression from initial proposal to invoice conversion</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5 space-y-3">
            {/* Stage 1: Quotations Created */}
            <div className="p-3 bg-warm-surface border border-warm-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-warm-text flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-warm-accent rounded-full" />
                  1. Estimates &amp; Quotations Created
                </span>
                <span className="font-bold text-warm-text tabular-nums">
                  {formatCurrency(qPipe.totalQuotedValue)} ({qPipe.totalQuotations})
                </span>
              </div>
            </div>

            <div className="flex justify-center -my-1 text-warm-textMuted">
              <ArrowRight className="w-3.5 h-3.5 rotate-90" />
            </div>

            {/* Stage 2: Active / Sent to Customer */}
            <div className="p-3 bg-warm-surface border border-blue-200 bg-blue-50/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  2. Active Deals Sent &amp; Accepted
                </span>
                <span className="font-bold text-blue-700 tabular-nums">
                  {formatCurrency(qPipe.activePipelineValue)} ({qPipe.sentQuotesCount + qPipe.acceptedQuotesCount})
                </span>
              </div>
            </div>

            <div className="flex justify-center -my-1 text-warm-textMuted">
              <ArrowRight className="w-3.5 h-3.5 rotate-90" />
            </div>

            {/* Stage 3: Converted to Invoice */}
            <div className="p-3 bg-warm-surface border border-purple-200 bg-purple-50/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-purple-600 rounded-full" />
                  3. Converted into Tax Invoices
                </span>
                <span className="font-bold text-purple-700 tabular-nums">
                  {formatCurrency(qPipe.convertedQuotesValue)} ({qPipe.convertedQuotesCount})
                </span>
              </div>
            </div>

            <div className="flex justify-center -my-1 text-warm-textMuted">
              <ArrowRight className="w-3.5 h-3.5 rotate-90" />
            </div>

            {/* Stage 4: Lost / Expired */}
            <div className="p-3 bg-warm-surface border border-warm-border/60 bg-warm-input/30">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-warm-textMuted flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Lost / Expired / Cancelled Deals
                </span>
                <span className="font-semibold text-warm-textMuted tabular-nums">
                  {formatCurrency(qPipe.lostQuotesValue)} ({qPipe.lostQuotesCount})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Quoted & Export Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Top Customers Quoted */}
        <div className="lg:col-span-2">
          <Card className="border-warm-border/70">
            <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                    Top Clients by Quoted Value
                  </h3>
                  <p className="text-xs text-warm-textMuted">Ranked estimates and conversion volume</p>
                </div>
              </div>
            </div>

            <CardContent className="p-5">
              {customerBarData.length > 0 ? (
                <HorizontalBarChart data={customerBarData} maxItems={6} />
              ) : (
                <p className="text-xs text-warm-textMuted py-4">No customer quotations available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Summary & Export Card */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-input text-warm-text">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Pipeline Report Export
              </h3>
            </div>
          </div>

          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-warm-textMuted">
              Export stage-wise quotation metrics, conversion ratios, and volume breakdown for sales reviews.
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-warm-border/40">
                <span className="text-warm-textMuted">Total Estimates:</span>
                <span className="font-bold text-warm-text">{qPipe.totalQuotations}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-warm-border/40">
                <span className="text-warm-textMuted">Total Quoted:</span>
                <span className="font-bold text-warm-text">{formatCurrency(qPipe.totalQuotedValue)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-warm-border/40">
                <span className="text-warm-textMuted">Total Invoiced:</span>
                <span className="font-bold text-purple-700">{formatCurrency(qPipe.convertedQuotesValue)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-warm-border/40">
                <span className="text-warm-textMuted">Win Rate:</span>
                <span className="font-bold text-emerald-700">{qPipe.conversionRatePercent}%</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleExportPipeline}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Quotation Pipeline CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
