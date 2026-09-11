import { api } from './api';
import { ApiResponse, PaginationMeta } from '@/types/index';
import {
  Invoice,
  InvoiceActivityEntry,
  InvoiceDashboard,
  InvoiceDefaults,
  InvoiceListParams,
  InvoiceListResult,
  InvoicePayload,
  InvoicePayment,
  InvoiceReferenceData,
  InvoiceSettings,
  InvoiceSettingsPayload,
  InvoiceStatus,
  PaymentPayload,
  SendInvoiceEmailPayload
} from '@/types/invoice';

/**
 * Strips empty strings and undefined values so we never send `?status=` or
 * `{ customerId: '' }` - the backend treats a present-but-empty filter as a
 * real one.
 */
const clean = <T extends Record<string, any>>(obj: T): Record<string, any> =>
  Object.entries(obj).reduce<Record<string, any>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') acc[key] = value;
    return acc;
  }, {});

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false
};

export const invoicesApi = {
  async list(params: InvoiceListParams): Promise<InvoiceListResult> {
    const { data } = await api.get<
      ApiResponse<{ invoices: Invoice[]; summary: InvoiceListResult['summary'] }>
    >('/invoices', { params: clean(params) });

    return {
      invoices: data.data?.invoices ?? [],
      summary: data.data?.summary ?? { totalAmount: 0, paidAmount: 0, outstandingAmount: 0 },
      meta: (data.meta as PaginationMeta) ?? EMPTY_META
    };
  },

  async dashboard(params: {
    financialYear?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<InvoiceDashboard> {
    const { data } = await api.get<ApiResponse<InvoiceDashboard>>('/invoices/dashboard', {
      params: clean(params)
    });
    return data.data as InvoiceDashboard;
  },

  async defaults(): Promise<InvoiceDefaults> {
    const { data } = await api.get<ApiResponse<InvoiceDefaults>>('/invoices/defaults');
    return data.data as InvoiceDefaults;
  },

  async getById(id: string): Promise<Invoice> {
    const { data } = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return data.data as Invoice;
  },

  async create(payload: InvoicePayload): Promise<Invoice> {
    const { data } = await api.post<ApiResponse<Invoice>>('/invoices', payload);
    return data.data as Invoice;
  },

  async update(id: string, payload: Partial<InvoicePayload>): Promise<Invoice> {
    const { data } = await api.put<ApiResponse<Invoice>>(`/invoices/${id}`, payload);
    return data.data as Invoice;
  },

  async setStatus(id: string, status: Extract<InvoiceStatus, 'DRAFT' | 'SENT'>): Promise<Invoice> {
    const { data } = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}/status`, { status });
    return data.data as Invoice;
  },

  async cancel(id: string, reason?: string): Promise<Invoice> {
    const { data } = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}/cancel`, {
      reason: reason || undefined
    });
    return data.data as Invoice;
  },

  async duplicate(id: string): Promise<Invoice> {
    const { data } = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/duplicate`);
    return data.data as Invoice;
  },

  async remove(id: string): Promise<void> {
    await api.delete<ApiResponse>(`/invoices/${id}`);
  },

  async activity(
    id: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{ activities: InvoiceActivityEntry[]; meta: PaginationMeta }> {
    const { data } = await api.get<ApiResponse<InvoiceActivityEntry[]>>(
      `/invoices/${id}/activity`,
      { params: clean(params) }
    );

    return {
      activities: data.data ?? [],
      meta: (data.meta as PaginationMeta) ?? EMPTY_META
    };
  },

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  async listPayments(invoiceId: string): Promise<InvoicePayment[]> {
    const { data } = await api.get<ApiResponse<InvoicePayment[]>>(
      `/invoices/${invoiceId}/payments`
    );
    return data.data ?? [];
  },

  async recordPayment(invoiceId: string, payload: PaymentPayload): Promise<InvoicePayment> {
    const { data } = await api.post<ApiResponse<InvoicePayment>>(
      `/invoices/${invoiceId}/payments`,
      clean(payload)
    );
    return data.data as InvoicePayment;
  },

  async updatePayment(paymentId: string, payload: Partial<PaymentPayload>): Promise<InvoicePayment> {
    const { data } = await api.put<ApiResponse<InvoicePayment>>(
      `/payments/${paymentId}`,
      clean(payload)
    );
    return data.data as InvoicePayment;
  },

  async deletePayment(paymentId: string): Promise<void> {
    await api.delete<ApiResponse>(`/payments/${paymentId}`);
  },

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------

  /**
   * Fetches the PDF through the API client so the auth header is attached -
   * a bare link to the endpoint would be unauthenticated and 401.
   */
  async fetchPdf(id: string, disposition: 'inline' | 'attachment' = 'attachment'): Promise<Blob> {
    const { data } = await api.get(`/invoices/${id}/pdf`, {
      params: { disposition },
      responseType: 'blob'
    });
    return data as Blob;
  },

  async email(id: string, payload: SendInvoiceEmailPayload = {}) {
    const { data } = await api.post<ApiResponse<{ sent: boolean; recipient: string }>>(
      `/invoices/${id}/email`,
      clean(payload)
    );
    return data.data;
  },

  async remind(id: string, payload: SendInvoiceEmailPayload = {}) {
    const { data } = await api.post<ApiResponse<{ sent: boolean; recipient: string }>>(
      `/invoices/${id}/remind`,
      clean(payload)
    );
    return data.data;
  },

  async emailStatus(): Promise<{ configured: boolean; appUrl: string }> {
    const { data } = await api.get<ApiResponse<{ configured: boolean; appUrl: string }>>(
      '/invoices/email-status'
    );
    return data.data ?? { configured: false, appUrl: '' };
  }
};

export const invoiceSettingsApi = {
  async get(): Promise<InvoiceSettings> {
    const { data } = await api.get<ApiResponse<InvoiceSettings>>('/invoice-settings');
    return data.data as InvoiceSettings;
  },

  async update(payload: InvoiceSettingsPayload): Promise<InvoiceSettings> {
    // A cleared text field must reach the API as '' so it can be blanked out;
    // only `undefined` is dropped here.
    const body = Object.entries(payload).reduce<Record<string, any>>((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {});

    const { data } = await api.put<ApiResponse<InvoiceSettings>>('/invoice-settings', body);
    return data.data as InvoiceSettings;
  },

  async referenceData(): Promise<InvoiceReferenceData> {
    const { data } = await api.get<ApiResponse<InvoiceReferenceData>>(
      '/invoice-settings/reference-data'
    );
    return data.data as InvoiceReferenceData;
  }
};

// ---------------------------------------------------------------------------
// Client-side helpers
// ---------------------------------------------------------------------------

/** Decimal columns arrive as strings; coerce before doing maths or formatting. */
export const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partially Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled'
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  OTHER: 'Other'
};

/** YYYY-MM-DD for a native date input, without timezone drift. */
export const toDateInput = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

/**
 * Opens a fetched PDF blob.
 *
 * `print` opens the browser's own viewer so the user gets the native print
 * dialog; `download` saves the file. Both revoke the object URL afterwards so
 * repeated use does not leak memory.
 */
export const openPdfBlob = (blob: Blob, fileName: string, mode: 'print' | 'download') => {
  const url = URL.createObjectURL(blob);

  if (mode === 'download') {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }

  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    // Pop-up blocked - fall back to a download so the action is not lost.
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return;
  }

  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  });

  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
