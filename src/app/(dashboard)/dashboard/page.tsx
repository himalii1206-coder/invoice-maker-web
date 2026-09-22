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
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { invoicesApi } from '@/lib/invoices';
import { InvoiceDashboard, InvoiceStatus } from '@/types/invoice';
import { normalizeStateName } from '@/lib/geo';
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
  Building2,
  MapPin,
  ShieldCheck,
  Receipt,
  Percent,
  Layers
} from 'lucide-react';

export default function DashboardPage() {
  const { user, company } = useAuth();
  const [financialYear, setFinancialYear] = useState<string>('');
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
    const currentYear = new Date().getFullYear();
    return [
      { value: '', label: 'All Financial Years' },
      { value: `${currentYear}-${String(currentYear + 1).slice(2)}`, label: `FY ${currentYear}-${String(currentYear + 1).slice(2)} (Current)` },
      { value: `${currentYear - 1}-${String(currentYear).slice(2)}`, label: `FY ${currentYear - 1}-${String(currentYear).slice(2)}` },
      { value: `${currentYear - 2}-${String(currentYear - 1).slice(2)}`, label: `FY ${currentYear - 2}-${String(currentYear - 1).slice(2)}` }
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

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'Business Owner'}!`}
        description={`Operations overview, live revenue metrics, and GST analytics for ${company?.name || 'your business'}.`}
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
            {/* 6-Month Invoiced vs Collected Bar Graph */}
            <Card className="lg:col-span-2">
              <div className="p-5 border-b border-warm-border/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                      Revenue &amp; Collection Trend
                    </h3>
                    <p className="text-xs text-warm-textMuted">Last 6 months billing volume vs money collected</p>
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
                          Avg. Monthly Invoicing
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
                    No monthly trend data available for this financial period.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GST Tax Summary & Breakdown */}
            <Card>
              <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-warm-accentLight text-warm-accent">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                      GST &amp; Tax Summary
                    </h3>
                    <p className="text-xs text-warm-textMuted">Tax liability and output break-up</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                <div className="p-4 bg-warm-input/50 border border-warm-border/60 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-warm-textMuted font-medium">Taxable Turnover:</span>
                    <span className="font-bold text-warm-text">
                      {formatCurrency(dashboardData?.gstSummary?.taxableAmount ?? 0)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-warm-border/40 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-warm-textMuted flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-blue-600 inline-block" />
                        CGST (Central Tax):
                      </span>
                      <span className="font-semibold text-warm-text">
                        {formatCurrency(dashboardData?.gstSummary?.cgst ?? 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-warm-textMuted flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-600 inline-block" />
                        SGST (State Tax):
                      </span>
                      <span className="font-semibold text-warm-text">
                        {formatCurrency(dashboardData?.gstSummary?.sgst ?? 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-warm-textMuted flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-purple-600 inline-block" />
                        IGST (Integrated Tax):
                      </span>
                      <span className="font-semibold text-warm-text">
                        {formatCurrency(dashboardData?.gstSummary?.igst ?? 0)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-warm-border flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-warm-text">
                      Total Output GST:
                    </span>
                    <span className="text-sm font-bold text-warm-accent">
                      {formatCurrency(dashboardData?.gstSummary?.totalTax ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Seller State Jurisdiction Info */}
                <div className="p-3 bg-warm-surface border border-warm-border/50 text-[11px] text-warm-textMuted space-y-1.5">
                  <div className="flex items-center gap-1.5 text-warm-text font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-warm-accent" />
                    <span>Seller Jurisdiction: {normalizeStateName(company?.state || '') || 'Not configured'}</span>
                  </div>
                  <p className="text-warm-textSubtle leading-relaxed">
                    Same-state sales incur CGST + SGST (50/50 split); interstate sales incur IGST (100%).
                  </p>
                </div>
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
