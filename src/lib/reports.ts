import { api } from './api';
import { ApiResponse } from '@/types/index';

export interface SalesAnalyticsData {
  byDay: Array<{ label: string; invoiced: number; paid: number; count: number }>;
  byWeek: Array<{ label: string; invoiced: number; paid: number; count: number }>;
  byMonth: Array<{ month: string; invoiced: number; paid: number; count: number; tax: number }>;
  growthRatePercent: number;
  byStatus: Array<{ status: string; count: number; amount: number; percentage: number }>;
  byCustomer: Array<{
    customerId: string;
    name: string;
    gstin: string | null;
    invoiced: number;
    paid: number;
    outstanding: number;
    count: number;
  }>;
  companyOverview: {
    name: string;
    gstin: string;
    currency: string;
    state: string;
    totalTurnover: number;
  };
}

export interface InvoiceAnalyticsData {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  cancelledInvoices: number;
  draftInvoices: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  averagePaymentDays: number;
  collectionEfficiency: number;
}

export interface PaymentAnalyticsData {
  totalReceived: number;
  pendingPayments: number;
  overduePayments: number;
  byMethod: Array<{
    method: string;
    label: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  monthlyCollectionTrend: Array<{ month: string; collected: number }>;
}

export interface GstAnalyticsData {
  totalTaxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGstCollected: number;
  gstByMonth: Array<{ month: string; tax: number }>;
  taxRateBreakdown: Array<{
    rate: number;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    tax: number;
  }>;
  hsnBreakdown: Array<{
    hsn: string;
    rate: number;
    quantity: number;
    taxable: number;
    tax: number;
    total: number;
  }>;
  inwardItcAvailable: number;
  netGstPayable: number;
}

export interface CustomerAnalyticsData {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  topCustomersByRevenue: Array<{
    customerId: string;
    name: string;
    gstin: string | null;
    invoiced: number;
    paid: number;
    outstanding: number;
    count: number;
  }>;
  customerOutstanding: Array<{
    customerId: string;
    name: string;
    gstin: string | null;
    invoiced: number;
    paid: number;
    outstanding: number;
    count: number;
  }>;
  customerPaymentHistory: Array<{
    id: string;
    amount: number;
    date: string;
    method: string;
    invoiceNumber?: string;
    customerName?: string;
  }>;
}

export interface ProductAnalyticsData {
  topSelling: Array<{
    name: string;
    quantity: number;
    revenue: number;
    tax: number;
    invoiceCount: number;
    unit: string;
  }>;
  totalQuantitySold: number;
  totalProductRevenue: number;
  totalTaxGenerated: number;
  totalProductCount: number;
}

export interface ReceivablesAnalyticsData {
  totalOutstanding: number;
  currentReceivables: number;
  overdue1_30: number;
  overdue31_60: number;
  overdue61_90: number;
  overdue90Plus: number;
  buckets: Array<{ label: string; amount: number; count: number }>;
  agingList: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    issueDate: string;
    dueDate: string;
    grandTotal: number;
    balanceDue: number;
    overdueDays: number;
    bucket: string;
  }>;
}

export interface ComprehensiveAnalyticsPayload {
  periodLabel: string;
  salesAnalytics: SalesAnalyticsData;
  invoiceAnalytics: InvoiceAnalyticsData;
  paymentAnalytics: PaymentAnalyticsData;
  gstAnalytics: GstAnalyticsData;
  customerAnalytics: CustomerAnalyticsData;
  productAnalytics: ProductAnalyticsData;
  receivablesAnalytics: ReceivablesAnalyticsData;
}

const clean = <T extends Record<string, any>>(obj: T): Record<string, any> =>
  Object.entries(obj).reduce<Record<string, any>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') acc[key] = value;
    return acc;
  }, {});

export const reportsApi = {
  async getComprehensiveAnalytics(params: {
    financialYear?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<ComprehensiveAnalyticsPayload> {
    const { data } = await api.get<ApiResponse<ComprehensiveAnalyticsPayload>>(
      '/reports/comprehensive-analytics',
      { params: clean(params) }
    );
    return data.data!;
  },

  async getGstSummary(params: {
    financialYear?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const { data } = await api.get<ApiResponse<any>>('/reports/gst-summary', {
      params: clean(params)
    });
    return data.data;
  },

  async getAging(params: { financialYear?: string } = {}) {
    const { data } = await api.get<ApiResponse<any>>('/reports/aging', {
      params: clean(params)
    });
    return data.data;
  }
};

/**
 * Downloads a structured array as a CSV file in the browser
 */
export function exportToCsv(filename: string, rows: Array<Record<string, any>>) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          const stringified = String(val).replace(/"/g, '""');
          return `"${stringified}"`;
        })
        .join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
