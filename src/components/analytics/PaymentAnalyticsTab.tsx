'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { PaymentAnalyticsData, exportToCsv } from '@/lib/reports';
import { DonutChart, DonutSegment } from './charts/DonutChart';
import { HorizontalBarChart, HorizontalBarItem } from './charts/HorizontalBarChart';
import { BarChart } from './charts/BarChart';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Landmark,
  Smartphone,
  Banknote,
  Receipt,
  PieChart,
  BarChart3,
  Layers
} from 'lucide-react';

interface PaymentAnalyticsTabProps {
  data: PaymentAnalyticsData;
}

const METHOD_COLORS: Record<string, string> = {
  BANK_TRANSFER: '#2563eb', // Blue 600
  UPI: '#16a34a', // Emerald 600
  CASH: '#d97706', // Amber 600
  CARD: '#9333ea', // Purple 600
  CHEQUE: '#0d9488', // Teal 600
  OTHER: '#64748b' // Slate 500
};

export function PaymentAnalyticsTab({ data }: PaymentAnalyticsTabProps) {
  const methodDonutSegments: DonutSegment[] = useMemo(() => {
    return data.byMethod
      .filter((m) => m.amount > 0)
      .map((m) => ({
        label: m.label,
        value: m.amount,
        color: METHOD_COLORS[m.method] || '#8d6e63'
      }));
  }, [data.byMethod]);

  const methodBarData: HorizontalBarItem[] = useMemo(() => {
    return data.byMethod
      .filter((m) => m.amount > 0)
      .map((m) => ({
        label: m.label,
        subLabel: `${m.count} ${m.count === 1 ? 'transaction' : 'transactions'}`,
        value: m.amount,
        percentage: m.percentage
      }));
  }, [data.byMethod]);

  const collectionBarSeries = useMemo(() => {
    return data.monthlyCollectionTrend.map((t) => ({
      label: t.month.split(' ')[0],
      invoiced: t.collected
    }));
  }, [data.monthlyCollectionTrend]);

  const handleExportPayments = () => {
    const rows = data.byMethod.map((m) => ({
      'Payment Method': m.label,
      'Total Amount Collected': m.amount,
      'Transactions Count': m.count,
      'Percentage Share': `${m.percentage}%`
    }));
    exportToCsv('Payment_Methods_Report', rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Level Payment KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Received */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Total Received Collections
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-800 tracking-tight">
              {formatCurrency(data.totalReceived)}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Total cleared customer receipts
            </p>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Pending Receivables
              </span>
              <div className="p-2 bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-900 tracking-tight">
              {formatCurrency(data.pendingPayments)}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Open balances awaiting payment
            </p>
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Overdue Payments
              </span>
              <div className="p-2 bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-900 tracking-tight">
              {formatCurrency(data.overduePayments)}
            </p>
            <p className="text-xs text-red-700 font-medium mt-2 pt-2 border-t border-warm-border/50">
              Payments past due date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Collection Trend Bar Chart */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Monthly Payment Collection Inflow Graph
              </h3>
              <p className="text-xs text-warm-textMuted">Cash inflow trajectory across periods</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <BarChart data={collectionBarSeries} height={200} showPaidBar={false} />
        </CardContent>
      </Card>

      {/* Payment Method Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Payment Method Donut Chart */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Payment Method Share Graph
              </h3>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPayments}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export
            </Button>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={methodDonutSegments}
              centerLabel="Total Inflow"
              centerValue={formatCurrency(data.totalReceived)}
              size={180}
            />
          </CardContent>
        </Card>

        {/* Method Volume Comparison Horizontal Bar Chart */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Payment Channels Ranking
                </h3>
                <p className="text-xs text-warm-textMuted">Volume comparison by payment instrument</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5">
            <HorizontalBarChart data={methodBarData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
