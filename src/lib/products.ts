import { api } from './api';
import {
  ApiResponse,
  PaginationMeta,
  Product,
  ProductListParams,
  ProductPayload
} from '@/types/index';

/**
 * Strips empty strings and undefined values so we never send `?customerId=` or
 * `{ sku: '' }` - the backend treats a present-but-empty filter as a real one.
 */
const clean = <T extends Record<string, any>>(obj: T): Record<string, any> =>
  Object.entries(obj).reduce<Record<string, any>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') acc[key] = value;
    return acc;
  }, {});

export interface ProductListResult {
  products: Product[];
  meta: PaginationMeta;
}

export const productsApi = {
  async list(params: ProductListParams): Promise<ProductListResult> {
    const { data } = await api.get<ApiResponse<Product[]>>('/products', {
      params: clean(params)
    });

    return {
      products: data.data ?? [],
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

  async getById(id: string): Promise<Product> {
    const { data } = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return data.data as Product;
  },

  async create(payload: ProductPayload): Promise<Product> {
    const { data } = await api.post<ApiResponse<Product>>('/products', clean(payload));
    return data.data as Product;
  },

  async update(id: string, payload: ProductPayload): Promise<Product> {
    // Unlike filters, a cleared text field must reach the API as '' so it can be
    // blanked out - only `undefined` is dropped here.
    const body = Object.entries(payload).reduce<Record<string, any>>((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {});

    const { data } = await api.put<ApiResponse<Product>>(`/products/${id}`, body);
    return data.data as Product;
  },

  async setStatus(id: string, isActive: boolean): Promise<Product> {
    const { data } = await api.patch<ApiResponse<Product>>(`/products/${id}/status`, {
      isActive
    });
    return data.data as Product;
  },

  async remove(id: string): Promise<void> {
    await api.delete<ApiResponse>(`/products/${id}`);
  }
};

/** Decimal columns arrive as strings; coerce before doing maths or formatting. */
export const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};
