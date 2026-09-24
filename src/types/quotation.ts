import { Customer, Decimalish, PaginationMeta, User } from './index';
import { Invoice } from './invoice';

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED'
  | 'CANCELLED';

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId?: string | null;
  name: string;
  description?: string | null;
  hsnSacCode?: string | null;
  unit: string;
  sortOrder: number;
  quantity: Decimalish;
  rate: Decimalish;
  discountPercent: Decimalish;
  discountAmount: Decimalish;
  taxRate: Decimalish;
  subtotal: Decimalish;
  taxableAmount: Decimalish;
  cgstRate: Decimalish;
  cgstAmount: Decimalish;
  sgstRate: Decimalish;
  sgstAmount: Decimalish;
  igstRate: Decimalish;
  igstAmount: Decimalish;
  taxAmount: Decimalish;
  total: Decimalish;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationActivityEntry {
  id: string;
  quotationId: string;
  action: string;
  description?: string | null;
  details?: string | null;
  metadata?: any;
  userId?: string | null;
  user?: {
    firstName: string;
    lastName?: string | null;
    email?: string | null;
  } | null;
  createdById?: string | null;
  createdBy?: User | null;
  createdAt: string;
}

export interface Quotation {
  id: string;
  companyId: string;
  customerId?: string | null;
  quotationNumber: string;
  sequenceNo: number;
  financialYear: string;
  status: QuotationStatus;
  quotationDate: string;
  validUntil?: string | null;
  inquiryNumber?: string | null;
  inquiryDate?: string | null;
  referenceNumber?: string | null;
  subject?: string | null;

  // Snapshot details
  billingName: string;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingGstin?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingCountry?: string | null;
  billingPostalCode?: string | null;

  placeOfSupply?: string | null;
  placeOfSupplyCode?: string | null;
  isIgst: boolean;

  paymentTerms?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;

  // Financials
  subtotal: Decimalish;
  discountAmount: Decimalish;
  taxableAmount: Decimalish;
  cgstAmount: Decimalish;
  sgstAmount: Decimalish;
  igstAmount: Decimalish;
  taxAmount: Decimalish;
  forwardingPackagingAmount: Decimalish;
  secondTotal: Decimalish;
  roundOff: Decimalish;
  grandTotal: Decimalish;

  convertedInvoiceId?: string | null;
  convertedAt?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;

  createdById?: string | null;
  createdBy?: User | null;
  createdAt: string;
  updatedAt: string;

  isExpired?: boolean;
  customer?: Customer | null;
  items: QuotationItem[];
  activities?: QuotationActivityEntry[];
  convertedInvoice?: Invoice | null;
}

export interface QuotationItemPayload {
  productId?: string | null;
  name: string;
  description?: string | null;
  hsnSacCode?: string | null;
  quantity: number;
  unit?: string;
  rate: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface QuotationPayload {
  customerId?: string | null;
  quotationNumber?: string;
  quotationDate: string;
  validUntil?: string | null;
  inquiryNumber?: string | null;
  inquiryDate?: string | null;
  referenceNumber?: string | null;
  subject?: string | null;

  billingName?: string;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingGstin?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingCountry?: string | null;
  billingPostalCode?: string | null;

  placeOfSupply?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;

  forwardingPackagingAmount?: number;
  items: QuotationItemPayload[];
  status?: QuotationStatus;
}

export interface QuotationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: QuotationStatus | '';
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'quotationDate' | 'quotationNumber' | 'grandTotal' | 'createdAt' | 'status' | 'validUntil';
  sortOrder?: 'asc' | 'desc';
}

export interface QuotationSummary {
  totalCount: number;
  totalQuotations?: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  convertedCount: number;
  expiredCount: number;
  rejectedCount: number;
  cancelledCount: number;
  totalValue: number;
  convertedValue: number;
}

export interface QuotationListResult {
  quotations: Quotation[];
  summary: QuotationSummary;
  meta: PaginationMeta;
}
