/** Every capability the API gates, as returned by `/auth/me`. */
export type Permission =
  | 'invoice:read'
  | 'invoice:write'
  | 'invoice:delete'
  | 'payment:write'
  | 'customer:write'
  | 'product:write'
  | 'purchase:write'
  | 'report:read'
  | 'settings:read'
  | 'settings:write'
  | 'company:write'
  | 'team:read'
  | 'team:write';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'MEMBER';
  /**
   * Role within the business currently being worked in. An invited
   * collaborator's membership role, which can differ from `role`.
   */
  companyRole?: string;
  permissions?: Record<Permission, boolean>;
  twoFactorEnabled?: boolean;
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
  invoiceSettings?: any;
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
  factoryAddress?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  officeNo?: string | null;
  contactPerson?: string | null;
  accountGroup?: string | null;
  openingBalance?: Decimalish | null;
  openingBalanceDate?: string | null;
  balanceType?: string | null;
  partyCategory?: string | null;
  narration1?: string | null;
  narration2?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Only returned by the single-customer endpoint. */
  invoiceCount?: number;
  quotationCount?: number;
}

export interface CustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  type?: CustomerType;
  gstin?: string;
  address?: string;
  factoryAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  officeNo?: string;
  contactPerson?: string;
  accountGroup?: string;
  openingBalance?: number;
  openingBalanceDate?: string;
  balanceType?: string;
  partyCategory?: string;
  narration1?: string;
  narration2?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  isActive?: boolean;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: CustomerType | '';
  isActive?: 'true' | 'false' | '';
  accountGroup?: string;
  partyCategory?: string;
  city?: string;
  state?: string;
  sortBy?: 'name' | 'email' | 'city' | 'state' | 'accountGroup' | 'openingBalance' | 'createdAt' | 'updatedAt';
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
  type?: CustomerType;
  isActive: boolean;
}

export interface Product {
  id: string;
  category?: string | null;
  productCode?: string | null;
  name: string;
  description?: string | null;
  sku?: string | null;
  price: Decimalish;
  unit: string;
  taxRate?: Decimalish;
  hsnSacCode?: string | null;
  customerId?: string | null;
  customer?: ProductCustomerRef | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  category?: string;
  productCode?: string;
  name?: string;
  description?: string;
  sku?: string;
  price?: number;
  unit?: string;
  taxRate?: number;
  hsnSacCode?: string;
  customerId?: string;
  isActive?: boolean;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  customerId?: string;
  isActive?: 'true' | 'false' | '';
  minPrice?: number | '';
  maxPrice?: number | '';
  sortBy?: 'name' | 'price' | 'taxRate' | 'sku' | 'productCode' | 'category' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export * from './purchase';
export * from './quotation';

