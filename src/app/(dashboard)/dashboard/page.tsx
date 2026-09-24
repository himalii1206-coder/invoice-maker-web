'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { DonutChart, DonutSegment } from '@/components/analytics/charts/DonutChart';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { invoicesApi } from '@/lib/invoices';
import { InvoiceDashboard, InvoiceStatus } from '@/types/invoice';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  PieChart,
  RefreshCw,
  FileText,
  Users,
  Receipt
} from 'lucide-react';

export default function DashboardPage() {
  const { user, company } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentFY = `${currentYear}-${String(currentYear + 1).slice(2)}`;
  const [financialYear, setFinancialYear] = useState<string>(currentFY);
  const [dashboardData, setDashboardData] = useState<InvoiceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await invoicesApi.dashboard({
        financialYear: financialYear || undefined
      });
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [financialYear]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Financial Year Options
  const financialYearOptions = useMemo(() => {
    const year = new Date().getFullYear();
    return [
      { value: `${year}-${String(year + 1).slice(2)}`, label: `FY ${year}-${String(year + 1).slice(2)} (Current)` },
      { value: `${year - 1}-${String(year + 1).slice(2)}`, label: `FY ${year - 1}-${String(year).slice(2)}` },
      { value: `${year - 2}-${String(year - 1).slice(2)}`, label: `FY ${year - 2}-${String(year - 1).slice(2)}` },
      { value: '', label: 'All Financial Years' }
    ];
  }, []);

  // Collection efficiency rate
  const collectionRate = useMemo(() => {
    if (!dashboardData || dashboardData.totalAmount <= 0) return 0;
    return Math.min(100, Math.round((dashboardData.paidAmount / dashboardData.totalAmount) * 100));
  }, [dashboardData]);

  // Find maximum monthly invoice amount for chart bar scaling
  const maxMonthlyAmount = useMemo(() => {
    if (!dashboardData?.monthlyTrends || dashboardData.monthlyTrends.length === 0) return 1;
    const maxVal = Math.max(
      ...dashboardData.monthlyTrends.map((t) => Math.max(t.invoiced, t.collected))
    );
    return maxVal > 0 ? maxVal : 1;
  }, [dashboardData]);

  // Invoice status percentage segments for Donut chart
  const statusSegments: DonutSegment[] = useMemo(() => {
    if (!dashboardData?.byStatus || dashboardData.byStatus.length === 0) return [];

    const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
      PAID: { label: 'Paid', color: '#16a34a' },
      PARTIALLY_PAID: { label: 'Partially Paid', color: '#d97706' },
      SENT: { label: 'Sent', color: '#2563eb' },
      OVERDUE: { label: 'Overdue', color: '#dc2626' },
      DRAFT: { label: 'Draft', color: '#64748b' },
      CANCELLED: { label: 'Cancelled', color: '#9ca3af' }
    };

    return dashboardData.byStatus
      .filter((st) => st.count > 0)
      .map((st) => {
        const config = STATUS_CONFIG[st.status] || {
          label: st.status.replace(/_/g, ' '),
          color: '#8d6e63'
        };
        return {
          label: config.label,
          value: st.count,
          color: config.color,
          subText: formatCurrency(st.amount)
        };
      });
  }, [dashboardData?.byStatus]);

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'Business Owner'}!`}
        description={`Operations overview, live sales metrics, and invoice performance for ${company?.name || 'your business'}.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="w-48">
              <Select
                value={financialYear}
                options={financialYearOptions}
                onChange={(e) => setFinancialYear(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {isLoading && !dashboardData ? (
        <div className="py-12 bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading business analytics..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue Invoiced */}
            <Card className="hover:border-warm-accent/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-warm-textMuted mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                    Total Invoiced
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-warm-text tracking-tight">
                  {formatCurrency(dashboardData?.totalAmount ?? 0)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-warm-textMuted font-medium mt-2 pt-2 border-t border-warm-border/40">
                  <span>{dashboardData?.totalInvoices ?? 0} total invoices</span>
                  <span className="text-emerald-700 font-semibold">Tax: {formatCurrency(dashboardData?.totalTax ?? 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Collected Revenue */}
            <Card className="hover:border-warm-accent/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-warm-textMuted mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                    Collected Revenue
                  </span>
                  <div className="p-2 bg-blue-50 text-blue-700 border border-blue-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-warm-text tracking-tight">
                  {formatCurrency(dashboardData?.paidAmount ?? 0)}
                </p>
                <div className="space-y-1.5 mt-2 pt-2 border-t border-warm-border/40">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-warm-textMuted">{dashboardData?.paidInvoices ?? 0} fully settled</span>
                    <span className="font-semibold text-blue-700">{collectionRate}% collected</span>
                  </div>
                  <div className="w-full h-1.5 bg-warm-input overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Receivables */}
            <Card className="hover:border-warm-accent/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-warm-textMuted mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                    Outstanding Receivables
                  </span>
                  <div className="p-2 bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-900 tracking-tight">
                  {formatCurrency(dashboardData?.outstandingAmount ?? 0)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-warm-textMuted font-medium mt-2 pt-2 border-t border-warm-border/40">
                  <span>{dashboardData?.unpaidInvoices ?? 0} pending payment</span>
                  <span className="text-amber-800 font-semibold">Unpaid Bills</span>
                </div>
              </CardContent>
            </Card>

            {/* Overdue Receivables */}
            <Card className="hover:border-warm-accent/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-warm-textMuted mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-warm-textSubtle">
                    Overdue Invoices
                  </span>
                  <div className="p-2 bg-red-50 text-red-700 border border-red-200">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-900 tracking-tight">
                  {formatCurrency(dashboardData?.overdueAmount ?? 0)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-warm-textMuted font-medium mt-2 pt-2 border-t border-warm-border/40">
                  <span>{dashboardData?.overdueInvoices ?? 0} overdue bills</span>
                  <span className="text-red-700 font-semibold">Past Due</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Overview Bar Graph */}
            <Card className="lg:col-span-2">
              <div className="p-5 border-b border-warm-border/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                      Sales Overview
                    </h3>
                    <p className="text-xs text-warm-textMuted">Last 6 months sales volume vs money collected</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-warm-accent inline-block" />
                    <span className="text-warm-text">Invoiced</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-emerald-600 inline-block" />
                    <span className="text-warm-text">Collected</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                {dashboardData?.monthlyTrends && dashboardData.monthlyTrends.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-48 pt-4 border-b border-warm-border">
                      {dashboardData.monthlyTrends.map((trend, idx) => {
                        const invoicedHeight = Math.max(6, Math.round((trend.invoiced / maxMonthlyAmount) * 100));
                        const collectedHeight = Math.max(6, Math.round((trend.collected / maxMonthlyAmount) * 100));

                        return (
                          <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                            {/* Hover Tooltip */}
                            <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-warm-text text-warm-surface text-[10px] p-1.5 shadow-lg whitespace-nowrap z-20 pointer-events-none">
                              <p className="font-bold">{trend.month}</p>
                              <p>Invoiced: {formatCurrency(trend.invoiced)}</p>
                              <p>Collected: {formatCurrency(trend.collected)}</p>
                              <p>Invoices: {trend.count}</p>
                            </div>

                            {/* Dual Bars */}
                            <div className="flex items-end gap-1 sm:gap-2 w-full justify-center h-full pb-1">
                              <div
                                style={{ height: `${invoicedHeight}%` }}
                                className="w-3 sm:w-5 bg-warm-accent transition-all duration-500 hover:brightness-110"
                                title={`Invoiced: ${formatCurrency(trend.invoiced)}`}
                              />
                              <div
                                style={{ height: `${collectedHeight}%` }}
                                className="w-3 sm:w-5 bg-emerald-600 transition-all duration-500 hover:brightness-110"
                                title={`Collected: ${formatCurrency(trend.collected)}`}
                              />
                            </div>

                            <span className="text-[11px] font-semibold text-warm-textMuted mt-2 truncate w-full text-center">
                              {trend.month.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center pt-2">
                      <div className="p-3 bg-warm-input/40 border border-warm-border/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle block">
                          Avg. Monthly Sales
                        </span>
                        <span className="text-base font-bold text-warm-text">
                          {formatCurrency(
                            (dashboardData.monthlyTrends.reduce((acc, t) => acc + t.invoiced, 0) || 0) /
                              dashboardData.monthlyTrends.length
                          )}
                        </span>
                      </div>
                      <div className="p-3 bg-warm-input/40 border border-warm-border/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle block">
                          Avg. Monthly Collections
                        </span>
                        <span className="text-base font-bold text-emerald-800">
                          {formatCurrency(
                            (dashboardData.monthlyTrends.reduce((acc, t) => acc + t.collected, 0) || 0) /
                              dashboardData.monthlyTrends.length
                          )}
                        </span>
                      </div>
                      <div className="p-3 bg-warm-input/40 border border-warm-border/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle block">
                          Total Invoices In Period
                        </span>
                        <span className="text-base font-bold text-warm-text">
                          {dashboardData.monthlyTrends.reduce((acc, t) => acc + t.count, 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-warm-textMuted text-xs">
                    No sales trend data available for this financial period.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Status Distribution (% Graph) */}
            <Card>
              <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                      Invoice Status
                    </h3>
                    <p className="text-xs text-warm-textMuted">Status breakdown &amp; percentage share</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                {statusSegments.length > 0 ? (
                  <>
                    {/* Multi-color percentage progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-semibold text-warm-textMuted">
                        <span>Status Split</span>
                        <span>{dashboardData?.totalInvoices ?? 0} total invoices</span>
                      </div>
                      <div className="w-full h-2 bg-warm-input flex overflow-hidden">
                        {statusSegments.map((seg, idx) => {
                          const total = statusSegments.reduce((acc, s) => acc + s.value, 0);
                          const pct = total > 0 ? (seg.value / total) * 100 : 0;
                          return (
                            <div
                              key={idx}
                              style={{ width: `${pct}%`, backgroundColor: seg.color }}
                              title={`${seg.label}: ${seg.value} (${Math.round(pct)}%)`}
                              className="h-full transition-all duration-500"
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Donut Chart with percentage */}
                    <DonutChart
                      data={statusSegments}
                      centerLabel="Invoices"
                      centerValue={dashboardData?.totalInvoices ?? 0}
                      currencyFormat={false}
                      size={150}
                    />
                  </>
                ) : (
                  <div className="py-12 text-center text-warm-textMuted text-xs">
                    No invoice status data available for this period.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices & Top Customers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Recent Invoices Feed */}
            <Card className="lg:col-span-2">
              <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                      Recent Invoices
                    </h3>
                    <p className="text-xs text-warm-textMuted">Latest generated billing documents</p>
                  </div>
                </div>
                <Link href="/invoices">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
                    View All Invoices
                  </Button>
                </Link>
              </div>

              {dashboardData?.recentInvoices && dashboardData.recentInvoices.length > 0 ? (
                <div className="divide-y divide-warm-border/40 overflow-x-auto">
                  {dashboardData.recentInvoices.map((inv: any) => (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-warm-input/40 transition-colors block"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-warm-accent">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-warm-input text-warm-textSubtle">
                            {inv.billType ? inv.billType.replace(/_/g, ' ') : 'Tax Invoice'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-warm-text truncate">
                          {inv.customer?.name || inv.billingName || 'Unknown Customer'}
                        </p>
                        <p className="text-[11px] text-warm-textMuted">
                          Issued: {formatDate(inv.issueDate)} • Due: {formatDate(inv.dueDate)}
                        </p>
                      </div>

                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-sm font-bold text-warm-text">
                          {formatCurrency(inv.grandTotal)}
                        </p>
                        <InvoiceStatusBadge status={inv.status as InvoiceStatus} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8">
                  <EmptyState
                    title="No invoices found"
                    description="No invoices generated for this period."
                    icon={<FileText className="w-6 h-6 text-warm-accent" />}
                  />
                </div>
              )}
            </Card>

            {/* Top Customers Leaderboard */}
            <Card>
              <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                      Top Clients
                    </h3>
                    <p className="text-xs text-warm-textMuted">Highest billing volume partners</p>
                  </div>
                </div>
                <Link href="/customers">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
                    Customers
                  </Button>
                </Link>
              </div>

              <CardContent className="p-5 space-y-3">
                {dashboardData?.topCustomers && dashboardData.topCustomers.length > 0 ? (
                  dashboardData.topCustomers.map((cust, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-warm-input/40 border border-warm-border/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 bg-warm-surface border border-warm-border text-warm-accent flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-warm-text truncate">
                            {cust.name}
                          </p>
                          <p className="text-[11px] text-warm-textMuted">
                            {cust.count} {cust.count === 1 ? 'invoice' : 'invoices'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-warm-text">
                          {formatCurrency(cust.totalInvoiced)}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          Paid: {formatCurrency(cust.totalPaid)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-warm-textMuted text-xs">
                    No client revenue records for this period.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
