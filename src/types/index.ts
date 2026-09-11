export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstin?: string;
  pan?: string;
  logoUrl?: string;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  defaultTaxRate?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
}

export interface AuthState {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: CustomerType;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Only returned by the single-customer endpoint. */
  invoiceCount?: number;
}

export interface CustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  type?: CustomerType;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isActive?: boolean;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: CustomerType | '';
  isActive?: 'true' | 'false' | '';
  city?: string;
  state?: string;
  sortBy?: 'name' | 'email' | 'city' | 'state' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Prisma serialises Decimal columns as strings, so numeric fields arrive as text. */
export type Decimalish = string | number;

export interface ProductCustomerRef {
  id: string;
  name: string;
  type: CustomerType;
  isActive: boolean;
}

export interface Product {
  id: string;
  customerId: string;
  customer: ProductCustomerRef;
  name: string;
  description?: string | null;
  sku?: string | null;
  price: Decimalish;
  unit: string;
  taxRate: Decimalish;
  hsnSacCode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  customerId?: string;
  name?: string;
  description?: string;
  sku?: string;
  price?: number;
  unit?: string;
  taxRate?: number;
  hsnSacCode?: string;
  isActive?: boolean;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  isActive?: 'true' | 'false' | '';
  minPrice?: number | '';
  maxPrice?: number | '';
  sortBy?: 'name' | 'price' | 'taxRate' | 'sku' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
