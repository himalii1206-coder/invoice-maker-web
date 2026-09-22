'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReceivablesAnalyticsData, exportToCsv } from '@/lib/reports';
import { DonutChart, DonutSegment } from './charts/DonutChart';
import { HorizontalBarChart, HorizontalBarItem } from './charts/HorizontalBarChart';
import {
  Clock,
  AlertCircle,
  Download,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  PieChart,
  BarChart3
} from 'lucide-react';

interface ReceivablesAnalyticsTabProps {
  data: ReceivablesAnalyticsData;
}

export function ReceivablesAnalyticsTab({ data }: ReceivablesAnalyticsTabProps) {
  const agingDonutSegments: DonutSegment[] = useMemo(() => {
    return [
      { label: 'Not Yet Due', value: data.currentReceivables, color: '#16a34a' },
      { label: '1–30 Days Overdue', value: data.overdue1_30, color: '#d97706' },
      { label: '31–60 Days Overdue', value: data.overdue31_60, color: '#f59e0b' },
      { label: '61–90 Days Overdue', value: data.overdue61_90, color: '#ea580c' },
      { label: '90+ Days Overdue', value: data.overdue90Plus, color: '#dc2626' }
    ].filter((s) => s.value > 0);
  }, [data]);

  const agingBarData: HorizontalBarItem[] = useMemo(() => {
    return [
      {
        label: 'Not Yet Due (Current)',
        value: data.currentReceivables,
        colorClassName: 'bg-emerald-600'
      },
      {
        label: '1–30 Days Overdue',
        value: data.overdue1_30,
        colorClassName: 'bg-amber-500'
      },
      {
        label: '31–60 Days Overdue',
        value: data.overdue31_60,
        colorClassName: 'bg-amber-600'
      },
      {
        label: '61–90 Days Overdue',
        value: data.overdue61_90,
        colorClassName: 'bg-orange-600'
      },
      {
        label: 'Over 90 Days Overdue',
        value: data.overdue90Plus,
        colorClassName: 'bg-red-600'
      }
    ].filter((b) => b.value > 0);
  }, [data]);

  const handleExportAging = () => {
    const rows = data.agingList.map((inv) => ({
      'Invoice Number': inv.invoiceNumber,
      Customer: inv.customerName,
      'Issue Date': formatDate(inv.issueDate),
      'Due Date': formatDate(inv.dueDate),
      'Days Overdue': inv.overdueDays,
      'Aging Bucket': inv.bucket,
      'Invoice Grand Total': inv.grandTotal,
      'Balance Due': inv.balanceDue
    }));
    exportToCsv('Receivables_Aging_Report', rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Total Outstanding Banner */}
      <Card className="border-warm-border/70 bg-warm-surface">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle block mb-1">
              Total Accounts Receivable (Debtors)
            </span>
            <p className="text-3xl font-bold text-amber-900 tracking-tight">
              {formatCurrency(data.totalOutstanding)}
            </p>
            <p className="text-xs text-warm-textMuted mt-1">
              Aggregate unpaid balance across all issued client invoices
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportAging}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export Aging CSV
            </Button>
            <Link href="/invoices?status=OVERDUE">
              <Button size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                Overdue Invoices
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Aging Buckets 5-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Current (Not yet due) */}
        <Card className="border-warm-border/70 hover:border-warm-accent/40 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-warm-textMuted mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-warm-textSubtle">
                Not Yet Due
              </span>
              <div className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-warm-text">
              {formatCurrency(data.currentReceivables)}
            </p>
            <p className="text-[11px] text-warm-textMuted mt-1.5 pt-1.5 border-t border-warm-border/40">
              Current terms active
            </p>
          </CardContent>
        </Card>

        {/* 1 - 30 Days */}
        <Card className="border-warm-border/70 hover:border-amber-400 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-warm-textMuted mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                1–30 Days
              </span>
              <div className="p-1 bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-amber-900">
              {formatCurrency(data.overdue1_30)}
            </p>
            <p className="text-[11px] text-warm-textMuted mt-1.5 pt-1.5 border-t border-warm-border/40">
              Recent overdue
            </p>
          </CardContent>
        </Card>

        {/* 31 - 60 Days */}
        <Card className="border-warm-border/70 hover:border-amber-500 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-warm-textMuted mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                31–60 Days
              </span>
              <div className="p-1 bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-amber-900">
              {formatCurrency(data.overdue31_60)}
            </p>
            <p className="text-[11px] text-warm-textMuted mt-1.5 pt-1.5 border-t border-warm-border/40">
              Moderate aging
            </p>
          </CardContent>
        </Card>

        {/* 61 - 90 Days */}
        <Card className="border-warm-border/70 hover:border-red-400 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-warm-textMuted mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">
                61–90 Days
              </span>
              <div className="p-1 bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-red-900">
              {formatCurrency(data.overdue61_90)}
            </p>
            <p className="text-[11px] text-warm-textMuted mt-1.5 pt-1.5 border-t border-warm-border/40">
              Follow-up critical
            </p>
          </CardContent>
        </Card>

        {/* 90+ Days */}
        <Card className="border-warm-border/70 hover:border-red-600 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-warm-textMuted mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-800">
                90+ Days
              </span>
              <div className="p-1 bg-red-100 text-red-800 border border-red-300">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold text-red-900">
              {formatCurrency(data.overdue90Plus)}
            </p>
            <p className="text-[11px] text-red-700 font-semibold mt-1.5 pt-1.5 border-t border-warm-border/40">
              High risk default
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Graphs: Aging Delinquency Donut & Horizontal Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Aging Risk Donut Chart */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Aging Risk Distribution Graph
              </h3>
            </div>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={agingDonutSegments}
              centerLabel="Outstanding"
              centerValue={formatCurrency(data.totalOutstanding)}
              size={180}
            />
          </CardContent>
        </Card>

        {/* Aging Buckets Bar Chart */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Aging Delinquency Graph
                </h3>
                <p className="text-xs text-warm-textMuted">Amount due grouped by overdue bucket</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <HorizontalBarChart data={agingBarData} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Outstanding Invoices Aging Ledger */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Receivables Aging Schedule (By Due Date)
            </h3>
            <p className="text-xs text-warm-textMuted">
              Prioritized debtor recovery queue ordered by delinquency
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-warm-input text-warm-text font-bold uppercase tracking-wider border-b border-warm-border/60">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Debtor Customer</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Overdue Days</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/40">
              {data.agingList.length > 0 ? (
                data.agingList.map((inv) => (
                  <tr key={inv.id} className="hover:bg-warm-input/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-warm-accent">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-bold text-warm-text">{inv.customerName}</td>
                    <td className="py-3 px-4 text-warm-textMuted">{formatDate(inv.issueDate)}</td>
                    <td className="py-3 px-4 text-warm-textMuted">{formatDate(inv.dueDate)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold ${
                          inv.overdueDays > 60
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : inv.overdueDays > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {inv.overdueDays > 0 ? `${inv.overdueDays} Days Late` : 'Current'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-warm-text font-medium">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-900">
                      {formatCurrency(inv.balanceDue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link href={`/invoices/${inv.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-emerald-700 font-semibold">
                    No outstanding overdue receivables! All bills are clear.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
