'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { InvoiceAnalyticsData } from '@/lib/reports';
import { DonutChart, DonutSegment } from './charts/DonutChart';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  Ban,
  Hourglass,
  Percent,
  ArrowUpRight,
  PieChart,
  BarChart3
} from 'lucide-react';

interface InvoiceAnalyticsTabProps {
  data: InvoiceAnalyticsData;
}

export function InvoiceAnalyticsTab({ data }: InvoiceAnalyticsTabProps) {
  const invoiceCountDonutSegments: DonutSegment[] = useMemo(() => {
    return [
      { label: 'Paid', value: data.paidInvoices, color: '#16a34a' },
      { label: 'Unpaid', value: data.unpaidInvoices, color: '#d97706' },
      { label: 'Overdue', value: data.overdueInvoices, color: '#dc2626' },
      { label: 'Draft', value: data.draftInvoices, color: '#64748b' },
      { label: 'Cancelled', value: data.cancelledInvoices, color: '#9ca3af' }
    ].filter((s) => s.value > 0);
  }, [data]);

  const valueDonutSegments: DonutSegment[] = useMemo(() => {
    return [
      { label: 'Paid Amount', value: data.totalPaidAmount, color: '#16a34a' },
      { label: 'Balance Due', value: data.totalDueAmount, color: '#d97706' }
    ].filter((s) => s.value > 0);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Total Invoices
              </span>
              <div className="p-2 bg-warm-input text-warm-text">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-warm-text tracking-tight">
              {data.totalInvoices}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Total billing documents generated
            </p>
          </CardContent>
        </Card>

        {/* Paid Invoices */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Paid Invoices
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-800 tracking-tight">
              {data.paidInvoices}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Settled Amount:</span>
              <span className="font-bold text-emerald-700">{formatCurrency(data.totalPaidAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Unpaid Invoices */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Unpaid Invoices
              </span>
              <div className="p-2 bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-900 tracking-tight">
              {data.unpaidInvoices}
            </p>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-warm-border/50">
              <span className="text-warm-textMuted">Balance Pending:</span>
              <span className="font-bold text-amber-800">{formatCurrency(data.totalDueAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Overdue Invoices
              </span>
              <div className="p-2 bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-red-900 tracking-tight">
              {data.overdueInvoices}
            </p>
            <p className="text-xs text-red-700 font-medium mt-2 pt-2 border-t border-warm-border/50">
              Past payment deadline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Graphs Grid: Count Distribution & Value Settlement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Invoice Count Status Distribution Donut */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Invoice Status Distribution Graph
                </h3>
                <p className="text-xs text-warm-textMuted">Document count split across status buckets</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={invoiceCountDonutSegments}
              centerLabel="Total Invoices"
              centerValue={data.totalInvoices}
              currencyFormat={false}
              size={180}
            />
          </CardContent>
        </Card>

        {/* Invoiced Value Settlement Donut */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Settlement &amp; Balance Graph
                </h3>
                <p className="text-xs text-warm-textMuted">Paid collections vs unpaid balance value</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={valueDonutSegments}
              centerLabel="Billed Turnover"
              centerValue={formatCurrency(data.totalInvoicedAmount)}
              size={180}
            />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Performance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Draft Invoices */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Draft Invoices
              </span>
              <div className="p-2 bg-warm-input text-warm-text">
                <FileEdit className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {data.draftInvoices}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Unsent preparation drafts
            </p>
          </CardContent>
        </Card>

        {/* Cancelled Invoices */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Cancelled Invoices
              </span>
              <div className="p-2 bg-gray-100 text-gray-700 border border-gray-200">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800 tracking-tight">
              {data.cancelledInvoices}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Voided / Cancelled vouchers
            </p>
          </CardContent>
        </Card>

        {/* Average Payment Turnaround */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Avg. Payment Turnaround
              </span>
              <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200">
                <Hourglass className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warm-text tracking-tight">
              {data.averagePaymentDays} {data.averagePaymentDays === 1 ? 'Day' : 'Days'}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Days from issue to full settlement
            </p>
          </CardContent>
        </Card>

        {/* Collection Efficiency */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Collection Rate
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-800 tracking-tight">
              {data.collectionEfficiency}%
            </p>
            <div className="w-full h-1.5 bg-warm-input mt-2.5 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${data.collectionEfficiency}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Health Overview Banner */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              Invoice Lifecycle Summary
            </h3>
            <p className="text-xs text-warm-textMuted mt-0.5">
              Real-time distribution of billing documents across operations
            </p>
          </div>

          <Link href="/invoices">
            <Button variant="secondary" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
              Invoices Manager
            </Button>
          </Link>
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-warm-input/40 border border-warm-border/50 text-center">
              <span className="text-[10px] uppercase font-bold text-warm-textSubtle block">Total</span>
              <span className="text-xl font-bold text-warm-text">{data.totalInvoices}</span>
            </div>
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Paid</span>
              <span className="text-xl font-bold text-emerald-900">{data.paidInvoices}</span>
            </div>
            <div className="p-3 bg-amber-50/50 border border-amber-200/60 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Unpaid</span>
              <span className="text-xl font-bold text-amber-900">{data.unpaidInvoices}</span>
            </div>
            <div className="p-3 bg-red-50/50 border border-red-200/60 text-center">
              <span className="text-[10px] uppercase font-bold text-red-800 block">Overdue</span>
              <span className="text-xl font-bold text-red-900">{data.overdueInvoices}</span>
            </div>
            <div className="p-3 bg-warm-input/40 border border-warm-border/50 text-center">
              <span className="text-[10px] uppercase font-bold text-warm-textSubtle block">Draft</span>
              <span className="text-xl font-bold text-warm-text">{data.draftInvoices}</span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-700 block">Cancelled</span>
              <span className="text-xl font-bold text-gray-800">{data.cancelledInvoices}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
