import { api } from './api';
import { ApiResponse, PaginationMeta } from '@/types/index';
import {
  Vendor,
  VendorPayload,
  VendorListParams,
  PurchaseBill,
  PurchaseBillPayload,
  PurchaseBillListParams,
  PurchaseDashboardMetrics,
  RecordPurchasePaymentPayload
} from '@/types/purchase';

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

export const vendorsApi = {
  async list(params: VendorListParams = {}): Promise<{ vendors: Vendor[]; meta: PaginationMeta }> {
    const { data } = await api.get<ApiResponse<Vendor[]>>('/vendors', {
      params: clean(params)
    });
    return {
      vendors: data.data ?? [],
      meta: (data.meta as PaginationMeta) ?? EMPTY_META
    };
  },

  async get(id: string): Promise<Vendor> {
    const { data } = await api.get<ApiResponse<Vendor>>(`/vendors/${id}`);
    if (!data.data) throw new Error('Vendor not found');
    return data.data;
  },

  async create(payload: VendorPayload): Promise<Vendor> {
    const { data } = await api.post<ApiResponse<Vendor>>('/vendors', payload);
    if (!data.data) throw new Error(data.message || 'Failed to create vendor');
    return data.data;
  },

  async update(id: string, payload: Partial<VendorPayload>): Promise<Vendor> {
    const { data } = await api.put<ApiResponse<Vendor>>(`/vendors/${id}`, payload);
    if (!data.data) throw new Error(data.message || 'Failed to update vendor');
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/vendors/${id}`);
  }
};

export const purchaseBillsApi = {
  async list(params: PurchaseBillListParams = {}): Promise<{ purchaseBills: PurchaseBill[]; meta: PaginationMeta }> {
    const { data } = await api.get<ApiResponse<PurchaseBill[]>>('/purchase-bills', {
      params: clean(params)
    });
    return {
      purchaseBills: data.data ?? [],
      meta: (data.meta as PaginationMeta) ?? EMPTY_META
    };
  },

  async get(id: string): Promise<PurchaseBill> {
    const { data } = await api.get<ApiResponse<PurchaseBill>>(`/purchase-bills/${id}`);
    if (!data.data) throw new Error('Purchase Bill not found');
    return data.data;
  },

  async create(payload: PurchaseBillPayload): Promise<PurchaseBill> {
    const { data } = await api.post<ApiResponse<PurchaseBill>>('/purchase-bills', payload);
    if (!data.data) throw new Error(data.message || 'Failed to create purchase bill');
    return data.data;
  },

  async update(id: string, payload: Partial<PurchaseBillPayload>): Promise<PurchaseBill> {
    const { data } = await api.put<ApiResponse<PurchaseBill>>(`/purchase-bills/${id}`, payload);
    if (!data.data) throw new Error(data.message || 'Failed to update purchase bill');
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/purchase-bills/${id}`);
  },

  async recordPayment(id: string, payload: RecordPurchasePaymentPayload): Promise<{ purchaseBill: PurchaseBill }> {
    const { data } = await api.post<ApiResponse<{ purchaseBill: PurchaseBill }>>(
      `/purchase-bills/${id}/payments`,
      payload
    );
    if (!data.data) throw new Error(data.message || 'Failed to record payment');
    return data.data;
  },

  async deletePayment(billId: string, paymentId: string): Promise<PurchaseBill> {
    const { data } = await api.delete<ApiResponse<PurchaseBill>>(`/purchase-bills/${billId}/payments/${paymentId}`);
    if (!data.data) throw new Error(data.message || 'Failed to delete payment');
    return data.data;
  },

  async dashboard(params: { financialYear?: string } = {}): Promise<PurchaseDashboardMetrics> {
    const { data } = await api.get<ApiResponse<PurchaseDashboardMetrics>>('/purchase-bills/dashboard', {
      params: clean(params)
    });
    if (!data.data) {
      return {
        totalPurchases: 0,
        totalPaid: 0,
        outstandingPayables: 0,
        overduePayables: 0,
        billCount: 0,
        itcSummary: {
          taxableTurnover: 0,
          totalItc: 0,
          cgst: 0,
          sgst: 0,
          igst: 0
        }
      };
    }
    return data.data;
  }
};
  