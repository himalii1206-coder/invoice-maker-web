'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CustomerAnalyticsData, exportToCsv } from '@/lib/reports';
import { DonutChart, DonutSegment } from './charts/DonutChart';
import { HorizontalBarChart, HorizontalBarItem } from './charts/HorizontalBarChart';
import {
  Users,
  UserPlus,
  UserCheck,
  Download,
  Clock,
  ArrowUpRight,
  Receipt,
  PieChart,
  BarChart3
} from 'lucide-react';

interface CustomerAnalyticsTabProps {
  data: CustomerAnalyticsData;
}

export function CustomerAnalyticsTab({ data }: CustomerAnalyticsTabProps) {
  const customerTypeDonutSegments: DonutSegment[] = useMemo(() => {
    return [
      { label: 'Repeat Customers', value: data.repeatCustomers, color: '#16a34a' },
      {
        label: 'Single / New Customers',
        value: Math.max(0, data.totalCustomers - data.repeatCustomers),
        color: '#2563eb'
      }
    ].filter((s) => s.value > 0);
  }, [data.totalCustomers, data.repeatCustomers]);

  const topCustomersBarData: HorizontalBarItem[] = useMemo(() => {
    return data.topCustomersByRevenue.slice(0, 6).map((c) => ({
      label: c.name,
      subLabel: `${c.count} bills • Paid: ${formatCurrency(c.paid)}`,
      value: c.invoiced
    }));
  }, [data.topCustomersByRevenue]);

  const outstandingBarData: HorizontalBarItem[] = useMemo(() => {
    return data.customerOutstanding.slice(0, 6).map((c) => ({
      label: c.name,
      subLabel: `Total Sales: ${formatCurrency(c.invoiced)}`,
      value: c.outstanding,
      colorClassName: 'bg-amber-600'
    }));
  }, [data.customerOutstanding]);

  const handleExportCustomers = () => {
    const rows = data.topCustomersByRevenue.map((c, i) => ({
      Rank: i + 1,
      Customer: c.name,
      GSTIN: c.gstin || 'Unregistered',
      'Invoiced Amount': c.invoiced,
      'Paid Amount': c.paid,
      'Outstanding Dues': c.outstanding,
      'Invoice Count': c.count
    }));
    exportToCsv('Customer_Revenue_Analysis', rows);
  };

  const handleExportOutstanding = () => {
    const rows = data.customerOutstanding.map((c) => ({
      Customer: c.name,
      GSTIN: c.gstin || 'Unregistered',
      'Outstanding Balance': c.outstanding,
      'Total Invoiced': c.invoiced,
      'Total Paid': c.paid
    }));
    exportToCsv('Customer_Outstanding_Balances', rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Customer KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Customers */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Total Customers
              </span>
              <div className="p-2 bg-warm-input text-warm-text">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-warm-text tracking-tight">
              {data.totalCustomers}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Active registered buyer accounts
            </p>
          </CardContent>
        </Card>

        {/* New Customers */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                New Customers (Recent)
              </span>
              <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-800 tracking-tight">
              {data.newCustomers}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Onboarded in the last 6 months
            </p>
          </CardContent>
        </Card>

        {/* Repeat Customers */}
        <Card className="border-warm-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-warm-textMuted mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                Repeat Customers
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-800 tracking-tight">
              {data.repeatCustomers}
            </p>
            <p className="text-xs text-warm-textMuted mt-2 pt-2 border-t border-warm-border/50">
              Multiple invoice order partners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Graphs Grid: Repeat vs New Donut & Top Customers Horizontal Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Customer Retention Donut */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Customer Retention Graph
              </h3>
            </div>
          </div>

          <CardContent className="p-5">
            <DonutChart
              data={customerTypeDonutSegments}
              centerLabel="Clients"
              centerValue={data.totalCustomers}
              currencyFormat={false}
              size={180}
            />
          </CardContent>
        </Card>

        {/* Top Customers Revenue Bar Graph */}
        <Card className="border-warm-border/70">
          <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                  Top Revenue Customers Graph
                </h3>
                <p className="text-xs text-warm-textMuted">Highest billing volume clients</p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCustomers}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export
            </Button>
          </div>

          <CardContent className="p-5">
            <HorizontalBarChart data={topCustomersBarData} maxItems={6} />
          </CardContent>
        </Card>
      </div>

      {/* Customer Outstanding Balances Graph */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Pending Customer Balances Graph
              </h3>
              <p className="text-xs text-warm-textMuted">Clients with largest open accounts receivable</p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportOutstanding}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export
          </Button>
        </div>

        <CardContent className="p-5">
          <HorizontalBarChart data={outstandingBarData} maxItems={6} />
        </CardContent>
      </Card>

      {/* Customer Payment History Feed */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Recent Customer Receipts &amp; Payment History
              </h3>
              <p className="text-xs text-warm-textMuted">Latest verified customer payment settlements</p>
            </div>
          </div>

          <Link href="/customers">
            <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
              View All Customers
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-warm-input text-warm-text font-bold uppercase tracking-wider border-b border-warm-border/60">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/40">
              {data.customerPaymentHistory.length > 0 ? (
                data.customerPaymentHistory.map((p, idx) => (
                  <tr key={idx} className="hover:bg-warm-input/30 transition-colors">
                    <td className="py-3 px-4 text-warm-textMuted">{formatDate(p.date)}</td>
                    <td className="py-3 px-4 font-bold text-warm-text">
                      {p.customerName || 'Direct Customer'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-warm-accent">
                      {p.invoiceNumber || 'Payment'}
                    </td>
                    <td className="py-3 px-4 text-warm-text">
                      <span className="px-2 py-0.5 bg-warm-input border border-warm-border text-[11px] font-medium">
                        {p.method.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-800">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-warm-textMuted">
                    No recent payment history records.
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
