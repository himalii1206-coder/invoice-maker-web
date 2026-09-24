import { api } from './api';
import { ApiResponse, PaginationMeta } from '@/types/index';
import {
  Quotation,
  QuotationListParams,
  QuotationListResult,
  QuotationPayload,
  QuotationSummary
} from '@/types/quotation';
import { Invoice } from '@/types/invoice';

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

const EMPTY_SUMMARY: QuotationSummary = {
  totalCount: 0,
  draftCount: 0,
  sentCount: 0,
  acceptedCount: 0,
  convertedCount: 0,
  expiredCount: 0,
  rejectedCount: 0,
  cancelledCount: 0,
  totalValue: 0,
  convertedValue: 0
};

export const quotationsApi = {
  async list(params: QuotationListParams): Promise<QuotationListResult> {
    const { data } = await api.get<
      ApiResponse<Quotation[]> & { pagination?: PaginationMeta; summary?: QuotationSummary }
    >('/quotations', { params: clean(params) });

    const rawSummary = (data as any).summary || {};
    const summary: QuotationSummary = {
      totalCount: Number(rawSummary.totalCount ?? rawSummary.totalQuotations ?? 0),
      totalQuotations: Number(rawSummary.totalQuotations ?? rawSummary.totalCount ?? 0),
      draftCount: Number(rawSummary.draftCount ?? 0),
      sentCount: Number(rawSummary.sentCount ?? 0),
      acceptedCount: Number(rawSummary.acceptedCount ?? 0),
      convertedCount: Number(rawSummary.convertedCount ?? 0),
      expiredCount: Number(rawSummary.expiredCount ?? 0),
      rejectedCount: Number(rawSummary.rejectedCount ?? 0),
      cancelledCount: Number(rawSummary.cancelledCount ?? 0),
      totalValue: Number(rawSummary.totalValue ?? 0),
      convertedValue: Number(rawSummary.convertedValue ?? 0)
    };

    return {
      quotations: (data.data as Quotation[]) ?? [],
      summary,
      meta: (data as any).pagination ?? (data.meta as PaginationMeta) ?? EMPTY_META
    };
  },

  async nextNumber(): Promise<{ number: string; sequenceNo: number; financialYear: string }> {
    const { data } = await api.get<ApiResponse<{ number: string; sequenceNo: number; financialYear: string }>>(
      '/quotations/next-number'
    );
    return data.data as { number: string; sequenceNo: number; financialYear: string };
  },

  async getById(id: string): Promise<Quotation> {
    const { data } = await api.get<ApiResponse<Quotation>>(`/quotations/${id}`);
    return data.data as Quotation;
  },

  async create(payload: QuotationPayload): Promise<Quotation> {
    const { data } = await api.post<ApiResponse<Quotation>>('/quotations', clean(payload));
    return data.data as Quotation;
  },

  async update(id: string, payload: Partial<QuotationPayload>): Promise<Quotation> {
    const { data } = await api.patch<ApiResponse<Quotation>>(`/quotations/${id}`, clean(payload));
    return data.data as Quotation;
  },

  async remove(id: string): Promise<void> {
    await api.delete<ApiResponse>(`/quotations/${id}`);
  },

  async send(id: string): Promise<Quotation> {
    const { data } = await api.post<ApiResponse<Quotation>>(`/quotations/${id}/send`);
    return data.data as Quotation;
  },

  async accept(id: string): Promise<Quotation> {
    const { data } = await api.post<ApiResponse<Quotation>>(`/quotations/${id}/accept`);
    return data.data as Quotation;
  },

  async reject(id: string, reason?: string): Promise<Quotation> {
    const { data } = await api.post<ApiResponse<Quotation>>(`/quotations/${id}/reject`, {
      reason: reason || undefined
    });
    return data.data as Quotation;
  },

  async cancel(id: string, reason?: string): Promise<Quotation> {
    const { data } = await api.post<ApiResponse<Quotation>>(`/quotations/${id}/cancel`, {
      reason: reason || undefined
    });
    return data.data as Quotation;
  },

  async duplicate(id: string): Promise<Quotation> {
    const { data } = await api.post<ApiResponse<Quotation>>(`/quotations/${id}/duplicate`);
    return data.data as Quotation;
  },

  async convertToInvoice(id: string): Promise<Invoice> {
    const { data } = await api.post<ApiResponse<Invoice>>(`/quotations/${id}/convert-to-invoice`);
    return data.data as Invoice;
  },

  async fetchPdf(id: string): Promise<Blob> {
    const { data } = await api.get(`/quotations/${id}/pdf`, {
      responseType: 'blob'
    });
    return data as Blob;
  }
};
