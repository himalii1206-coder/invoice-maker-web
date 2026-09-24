'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { reportsApi, ComprehensiveAnalyticsPayload } from '@/lib/reports';
import { SalesAnalyticsTab } from '@/components/analytics/SalesAnalyticsTab';
import { QuotationAnalyticsTab } from '@/components/analytics/QuotationAnalyticsTab';
import { InvoiceAnalyticsTab } from '@/components/analytics/InvoiceAnalyticsTab';
import { PaymentAnalyticsTab } from '@/components/analytics/PaymentAnalyticsTab';
import { GstAnalyticsTab } from '@/components/analytics/GstAnalyticsTab';
import { CustomerAnalyticsTab } from '@/components/analytics/CustomerAnalyticsTab';
import { ProductAnalyticsTab } from '@/components/analytics/ProductAnalyticsTab';
import { ReceivablesAnalyticsTab } from '@/components/analytics/ReceivablesAnalyticsTab';
import {
  TrendingUp,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Percent,
  Users,
  Package,
  Clock,
  RefreshCw,
  BarChart3
} from 'lucide-react';

type AnalyticsTabType =
  | 'sales'
  | 'quotations'
  | 'invoices'
  | 'payments'
  | 'gst'
  | 'customers'
  | 'products'
  | 'receivables';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTabType>('sales');
  const [financialYear, setFinancialYear] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<ComprehensiveAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await reportsApi.getComprehensiveAnalytics({
        financialYear: financialYear || undefined
      });
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [financialYear]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const financialYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
      { value: '', label: 'All Financial Years' },
      {
        value: `${currentYear}-${String(currentYear + 1).slice(2)}`,
        label: `FY ${currentYear}-${String(currentYear + 1).slice(2)} (Current)`
      },
      {
        value: `${currentYear - 1}-${String(currentYear).slice(2)}`,
        label: `FY ${currentYear - 1}-${String(currentYear).slice(2)}`
      },
      {
        value: `${currentYear - 2}-${String(currentYear - 1).slice(2)}`,
        label: `FY ${currentYear - 2}-${String(currentYear - 1).slice(2)}`
      }
    ];
  }, []);

  const tabItems: Array<{ id: AnalyticsTabType; label: string; icon: React.ReactNode }> = [
    { id: 'sales', label: 'Sales Analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'quotations', label: 'Quotation Analytics', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoice Analytics', icon: <FileText className="w-4 h-4" /> },
    { id: 'payments', label: 'Payment Analytics', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'gst', label: 'GST & Tax Analytics', icon: <Percent className="w-4 h-4" /> },
    { id: 'customers', label: 'Customer Analytics', icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: 'Product Analytics', icon: <Package className="w-4 h-4" /> },
    { id: 'receivables', label: 'Receivables & Aging', icon: <Clock className="w-4 h-4" /> }
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Analytics & Business Intelligence"
        description="Comprehensive operational analytics, Indian GST statutory compliance, and revenue intelligence."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' }
        ]}
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
              onClick={() => fetchAnalytics(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Tab Navigation Strip */}
      <div className="border-b border-warm-border/70 overflow-x-auto mb-6 bg-warm-surface">
        <div className="flex space-x-1 min-w-max p-1">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  isActive
                    ? 'border-warm-accent text-warm-accent bg-warm-accentLight/40'
                    : 'border-transparent text-warm-textMuted hover:text-warm-text hover:bg-warm-input/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Body */}
      {isLoading && !analyticsData ? (
        <div className="py-16 bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Generating comprehensive business intelligence..." />
        </div>
      ) : !analyticsData ? (
        <EmptyState
          title="No analytics records found"
          description="Analytics will generate automatically as invoices and payments are logged."
          icon={<BarChart3 className="w-6 h-6 text-warm-accent" />}
        />
      ) : (
        <div>
          {activeTab === 'sales' && <SalesAnalyticsTab data={analyticsData.salesAnalytics} />}
          {activeTab === 'quotations' && (
            <QuotationAnalyticsTab data={analyticsData.quotationAnalytics} />
          )}
          {activeTab === 'invoices' && <InvoiceAnalyticsTab data={analyticsData.invoiceAnalytics} />}
          {activeTab === 'payments' && <PaymentAnalyticsTab data={analyticsData.paymentAnalytics} />}
          {activeTab === 'gst' && <GstAnalyticsTab data={analyticsData.gstAnalytics} />}
          {activeTab === 'customers' && <CustomerAnalyticsTab data={analyticsData.customerAnalytics} />}
          {activeTab === 'products' && <ProductAnalyticsTab data={analyticsData.productAnalytics} />}
          {activeTab === 'receivables' && (
            <ReceivablesAnalyticsTab data={analyticsData.receivablesAnalytics} />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
