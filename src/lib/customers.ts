import { api } from './api';
import {
  ApiResponse,
  Customer,
  CustomerListParams,
  CustomerPayload,
  PaginationMeta
} from '@/types/index';

/**
 * Strips empty strings and undefined values so we never send `?type=` or
 * `{ city: '' }` - the backend treats a present-but-empty filter as a real one.
 */
const clean = <T extends Record<string, any>>(obj: T): Record<string, any> =>
  Object.entries(obj).reduce<Record<string, any>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') acc[key] = value;
    return acc;
  }, {});

export interface CustomerListResult {
  customers: Customer[];
  meta: PaginationMeta;
}

export const customersApi = {
  async list(params: CustomerListParams): Promise<CustomerListResult> {
    const { data } = await api.get<ApiResponse<Customer[]>>('/customers', {
      params: clean(params)
    });

    return {
      customers: data.data ?? [],
      meta: (data.meta as PaginationMeta) ?? {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  },

  async getById(id: string): Promise<Customer> {
    const { data } = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return data.data as Customer;
  },

  async create(payload: CustomerPayload): Promise<Customer> {
    const { data } = await api.post<ApiResponse<Customer>>('/customers', clean(payload));
    return data.data as Customer;
  },

  async update(id: string, payload: CustomerPayload): Promise<Customer> {
    // Unlike filters, a cleared field must reach the API as '' so it can be
    // blanked out - only `undefined` is dropped here.
    const body = Object.entries(payload).reduce<Record<string, any>>((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {});

    const { data } = await api.put<ApiResponse<Customer>>(`/customers/${id}`, body);
    return data.data as Customer;
  },

  async setStatus(id: string, isActive: boolean): Promise<Customer> {
    const { data } = await api.patch<ApiResponse<Customer>>(`/customers/${id}/status`, {
      isActive
    });
    return data.data as Customer;
  },

  async remove(id: string): Promise<void> {
    await api.delete<ApiResponse>(`/customers/${id}`);
  }
};

/** Pulls the most useful message out of an axios error, including field errors. */
export const apiErrorMessage = (error: any, fallback = 'Something went wrong'): string => {
  const res = error?.response?.data;
  if (res?.errors?.length) return res.errors[0].message;
  return res?.message || error?.message || fallback;
};
