import { CustomerType, Decimalish, PaginationMeta } from './index';

export type PurchaseBillStatus =
  | 'DRAFT'
  | 'RECEIVED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type ItcEligibility = 'INPUTS' | 'CAPITAL_GOODS' | 'INPUT_SERVICES' | 'INELIGIBLE';

export type ItemCategory = 'GOODS' | 'SERVICE' | 'RAW_MATERIAL' | 'CAPITAL_ASSET' | 'EXPENSE';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CARD' | 'OTHER';

export interface Vendor {
  id: string;
  name: string;
  tradeName?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  type: CustomerType;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branch?: string | null;
  openingBalance?: Decimalish | null;
  openingBalanceDate?: string | null;
  balanceType?: string | null;
  paymentTerms?: string | null;
  partyCategory?: string | null;
  narration?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    purchaseBills: number;
  };
}

export interface VendorPayload {
  name: string;
  tradeName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  type?: CustomerType;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  openingBalance?: number;
  openingBalanceDate?: string;
  balanceType?: string;
  paymentTerms?: string;
  partyCategory?: string;
  narration?: string;
  isActive?: boolean;
}

export interface VendorListParams {
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

export interface PurchaseBillItem {
  id: string;
  productId?: string | null;
  name: string;
  description?: string | null;
  hsnSacCode?: string | null;
  category: ItemCategory;
  unit: string;
  sortOrder: number;
  quantity: Decimalish;
  unitPrice: Decimalish;
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
}

export interface PurchaseBillItemPayload {
  id?: string;
  productId?: string | null;
  name: string;
  description?: string;
  hsnSacCode?: string;
  category?: ItemCategory;
  unit?: string;
  sortOrder?: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxRate?: number;
}

export interface PurchasePayment {
  id: string;
  purchaseBillId: string;
  amount: Decimalish;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface PurchaseBill {
  id: string;
  companyId: string;
  vendorId?: string | null;
  billNumber: string;
  vendorInvoiceNumber?: string | null;
  sequenceNo: number;
  financialYear: string;
  status: PurchaseBillStatus;
  billDate: string;
  dueDate?: string | null;
  paymentTerms?: string | null;
  currency: string;

  // Logistics
  poNumber?: string | null;
  poDate?: string | null;
  grnNumber?: string | null;
  grnDate?: string | null;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  lrNumber?: string | null;
  lrDate?: string | null;

  // Vendor snapshot
  vendorName: string;
  vendorGstin?: string | null;
  vendorPhone?: string | null;
  vendorEmail?: string | null;
  vendorAddress?: string | null;
  vendorCity?: string | null;
  vendorState?: string | null;
  vendorCountry?: string | null;
  vendorPostalCode?: string | null;

  // Tax
  placeOfSupply?: string | null;
  placeOfSupplyCode?: string | null;
  isIgst: boolean;
  isReverseCharge: boolean;
  itcEligibility: ItcEligibility;

  subtotal: Decimalish;
  discountAmount: Decimalish;
  taxableAmount: Decimalish;
  cgstAmount: Decimalish;
  sgstAmount: Decimalish;
  igstAmount: Decimalish;
  taxAmount: Decimalish;
  otherCharges: Decimalish;
  roundOff: Decimalish;
  grandTotal: Decimalish;
  amountPaid: Decimalish;
  balanceDue: Decimalish;

  notes?: string | null;
  terms?: string | null;
  internalNotes?: string | null;
  attachmentUrl?: string | null;

  createdAt: string;
  updatedAt: string;

  vendor?: {
    id: string;
    name: string;
    tradeName?: string | null;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;

  items: PurchaseBillItem[];
  payments: PurchasePayment[];
}

export interface PurchaseBillPayload {
  vendorId?: string | null;
  billNumber?: string;
  vendorInvoiceNumber: string;
  status?: PurchaseBillStatus;
  billDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  currency?: string;

  poNumber?: string;
  poDate?: string;
  grnNumber?: string;
  grnDate?: string;
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  lrDate?: string;

  vendorName: string;
  vendorGstin?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendorAddress?: string;
  vendorCity?: string;
  vendorState?: string;
  vendorCountry?: string;
  vendorPostalCode?: string;

  placeOfSupply?: string;
  placeOfSupplyCode?: string;
  isIgst?: boolean;
  isReverseCharge?: boolean;
  itcEligibility?: ItcEligibility;

  otherCharges?: number;
  roundOff?: number;

  notes?: string;
  terms?: string;
  internalNotes?: string;
  attachmentUrl?: string;

  items: PurchaseBillItemPayload[];
}

export interface PurchaseBillListParams {
  page?: number;
  limit?: number;
  search?: string;
  vendorId?: string;
  status?: PurchaseBillStatus | '';
  financialYear?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'billDate' | 'dueDate' | 'grandTotal' | 'balanceDue' | 'billNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseDashboardMetrics {
  totalPurchases: number;
  totalPaid: number;
  outstandingPayables: number;
  overduePayables: number;
  billCount: number;
  itcSummary: {
    taxableTurnover: number;
    totalItc: number;
    cgst: number;
    sgst: number;
    igst: number;
  };
}

export interface RecordPurchasePaymentPayload {
  amount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}
