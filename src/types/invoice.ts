import { Customer, CustomerType, Decimalish, PaginationMeta } from './index';

/**
 * Invoice module types.
 *
 * Money arrives from Prisma as strings, so every amount is `Decimalish` and
 * must go through `toNumber` before arithmetic or formatting. Treating them as
 * numbers here would be a lie that only shows up as "₹NaN" in production.
 */

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CARD' | 'OTHER';

export type NoteType = 'CREDIT' | 'DEBIT';
export type NoteStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';

export type NumberResetMode = 'NEVER' | 'YEARLY' | 'MONTHLY' | 'FINANCIAL_YEAR';

export type ActivityAction =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'SENT'
  | 'VIEWED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_DELETED'
  | 'CANCELLED'
  | 'DUPLICATED'
  | 'PDF_DOWNLOADED'
  | 'EMAIL_SENT'
  | 'REMINDER_SENT'
  | 'NOTE_LINKED'
  | 'DELETED';

export interface InvoiceCustomerRef {
  id: string;
  name: string;
  type: CustomerType;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  isActive: boolean;
}

export interface InvoiceItem {
  id: string;
  productId?: string | null;
  name: string;
  description?: string | null;
  hsnSacCode?: string | null;
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

export interface InvoicePayment {
  id: string;
  invoiceId?: string;
  amount: Decimalish;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    billingName: string;
    grandTotal: Decimalish;
    balanceDue: Decimalish;
    status: InvoiceStatus;
    currency: string;
    customerId: string;
  };
}

export interface LinkedNoteRef {
  id: string;
  noteType: NoteType;
  noteNumber: string;
  noteDate: string;
  status: NoteStatus;
  grandTotal: Decimalish;
  reason?: string | null;
}

/** Row shape returned by the list endpoint. */
export interface InvoiceListRow {
  id: string;
  invoiceNumber: string;
  billType?: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  poNumber?: string | null;
  orderDate?: string | null;
  challanNo?: string | null;
  challanDate?: string | null;
  modeOfDispatch?: string | null;
  lhNo?: string | null;
  lhDate?: string | null;
  dcNo?: string | null;
  dcDate?: string | null;
  paymentTerms?: string | null;
  financialYear: string;
  currency: string;
  billingName: string;
  billingState?: string | null;
  billingGstin?: string | null;
  placeOfSupply?: string | null;
  isIgst: boolean;
  subtotal: Decimalish;
  discountAmount: Decimalish;
  taxableAmount: Decimalish;
  taxAmount: Decimalish;
  cgstAmount: Decimalish;
  sgstAmount: Decimalish;
  igstAmount: Decimalish;
  extraCharges?: Decimalish;
  roundOff: Decimalish;
  grandTotal: Decimalish;
  amountPaid: Decimalish;
  creditNoteTotal: Decimalish;
  debitNoteTotal: Decimalish;
  balanceDue: Decimalish;
  sentAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customer: InvoiceCustomerRef;
  quotations?: Array<{
    id: string;
    quotationNumber: string;
    quotationDate?: string;
    status: string;
    subject?: string | null;
    inquiryNumber?: string | null;
    grandTotal?: Decimalish;
  }>;
  _count?: { payments: number };
}

/** Everything the detail view and the printed document need. */
export interface Invoice extends InvoiceListRow {
  sequenceNo: number;
  poNumber?: string | null;
  orderDate?: string | null;
  challanNo?: string | null;
  challanDate?: string | null;
  reference?: string | null;
  modeOfDispatch?: string | null;
  lhNo?: string | null;
  lhDate?: string | null;
  dcNo?: string | null;
  dcDate?: string | null;
  paymentTerms?: string | null;
  placeOfSupplyCode?: string | null;
  isReverseCharge: boolean;
  notes?: string | null;
  terms?: string | null;
  internalNotes?: string | null;
  cancelledReason?: string | null;
  viewedAt?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingCountry?: string | null;
  billingPostalCode?: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  notesDocs: LinkedNoteRef[];
}

export interface InvoiceItemPayload {
  productId?: string | null;
  name: string;
  description?: string;
  hsnSacCode?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxRate?: number;
}

export interface InvoicePayload {
  customerId: string;
  quotationId?: string | null;
  invoiceNumber?: string;
  billType?: string;
  issueDate?: string;
  dueDate?: string;
  poNumber?: string;
  orderDate?: string;
  challanNo?: string;
  challanDate?: string;
  reference?: string;
  modeOfDispatch?: string;
  lhNo?: string;
  lhDate?: string;
  dcNo?: string;
  dcDate?: string;
  paymentTerms?: string;
  currency?: string;
  placeOfSupply?: string;
  isReverseCharge?: boolean;
  extraCharges?: number;
  notes?: string;
  terms?: string;
  internalNotes?: string;
  status?: 'DRAFT' | 'SENT';
  items: InvoiceItemPayload[];
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Comma separated list, e.g. "SENT,OVERDUE". */
  status?: string;
  billType?: string;
  customerId?: string;
  financialYear?: string;
  year?: number | '';
  month?: number | '';
  dateFrom?: string;
  dateTo?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number | '';
  maxAmount?: number | '';
  onlyOutstanding?: 'true' | 'false' | '';
  sortBy?:
    | 'invoiceNumber'
    | 'issueDate'
    | 'dueDate'
    | 'grandTotal'
    | 'balanceDue'
    | 'billingName'
    | 'status'
    | 'createdAt'
    | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceListSummary {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface InvoiceListResult {
  invoices: InvoiceListRow[];
  summary: InvoiceListSummary;
  meta: PaginationMeta;
}

export interface InvoiceStatusBucket {
  status: InvoiceStatus;
  count: number;
  amount: number;
  balanceDue: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  invoiced: number;
  collected: number;
  count: number;
}

export interface TopCustomer {
  customerId: string;
  name: string;
  totalInvoiced: number;
  totalPaid: number;
  count: number;
}

export interface GstSummary {
  cgst: number;
  sgst: number;
  igst: number;
  taxableAmount: number;
  totalTax: number;
}

export interface InvoiceDashboard {
  totalInvoices: number;
  totalAmount: number;
  totalTax: number;
  paidAmount: number;
  paidInvoices: number;
  fullyPaidAmount: number;
  unpaidAmount: number;
  unpaidInvoices: number;
  outstandingAmount: number;
  overdueAmount: number;
  overdueInvoices: number;
  draftAmount: number;
  draftInvoices: number;
  byStatus: InvoiceStatusBucket[];
  recentInvoices?: Invoice[];
  monthlyTrends?: MonthlyTrend[];
  topCustomers?: TopCustomer[];
  gstSummary?: GstSummary;
}

export interface InvoiceDefaults {
  invoiceNumber: string;
  sequenceNo: number;
  issueDate: string;
  dueDate: string;
  financialYear: string;
  currency: string;
  defaultTaxRate: number;
  defaultDueDays: number;
  notes?: string | null;
  terms?: string | null;
  enableRoundOff: boolean;
  showHsnColumn: boolean;
  showDiscount: boolean;
  gstEnabled: boolean;
  pricesIncludeTax: boolean;
  enableReverseCharge: boolean;
  defaultUnit: string;
  defaultDiscountMode: DiscountMode;
  sellerState?: string | null;
  sellerGstin?: string | null;
}

export interface InvoiceActivityEntry {
  id: string;
  invoiceId: string;
  action: ActivityAction;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface PaymentPayload {
  amount: number;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface SendInvoiceEmailPayload {
  to?: string;
  cc?: string;
  subject?: string;
  message?: string;
  attachPdf?: boolean;
  markAsSent?: boolean;
}

export interface IndianState {
  code: string;
  name: string;
  isUnionTerritory?: boolean;
}

export interface InvoiceReferenceData {
  states: IndianState[];
  gstRates: number[];
  units: string[];
  financialYears: string[];
  email: { configured: boolean; appUrl: string };
}

export type DiscountMode = 'PERCENT' | 'FIXED';

export type NotificationEvent =
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIVED'
  | 'CUSTOMER_ADDED'
  | 'NOTE_ISSUED';

export interface InvoiceSettings {
  id: string;
  companyId: string;
  invoicePrefix: string;
  invoiceSuffix?: string | null;
  creditNotePrefix: string;
  debitNotePrefix: string;
  numberSeparator: string;
  numberPadding: number;
  startNumber: number;
  resetMode: NumberResetMode;
  includeYearInNumber: boolean;
  defaultDueDays: number;
  defaultTaxRate: Decimalish;
  defaultCurrency: string;
  defaultTerms?: string | null;
  defaultNotes?: string | null;
  themeColor: string;
  template: string;
  fontFamily: string;
  tableStyle: string;
  signaturePosition: string;
  showHsnColumn: boolean;
  showDiscount: boolean;
  showBankDetails: boolean;
  showSignature: boolean;
  signatureUrl?: string | null;
  footerNote?: string | null;
  gstEnabled: boolean;
  pricesIncludeTax: boolean;
  enableReverseCharge: boolean;
  hsnRequiredOnProduct: boolean;
  customerCodePrefix: string;
  customerCreditDays: number;
  customerRequirePhone: boolean;
  customerRequireState: boolean;
  customerRequireGstin: boolean;
  productCodePrefix: string;
  defaultUnit: string;
  defaultDiscountMode: DiscountMode;
  notifyEvents: NotificationEvent[];
  notifyEmail: boolean;
  notifyInApp: boolean;
  notifyBrowser: boolean;
  enableRoundOff: boolean;
  autoMarkOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  /** Returned only by the update endpoint, so the UI can confirm the change. */
  nextNumberPreview?: string;
}

export type InvoiceSettingsPayload = Partial<
  Omit<InvoiceSettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'nextNumberPreview' | 'defaultTaxRate'>
> & { defaultTaxRate?: number };

/** Re-exported so invoice screens import customer types from one place. */
export type { Customer, PaginationMeta };
