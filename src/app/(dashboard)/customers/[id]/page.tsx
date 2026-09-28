'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/Table';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { invoicesApi, toNumber } from '@/lib/invoices';
import { quotationsApi } from '@/lib/quotations';
import { Customer } from '@/types/index';
import { InvoiceListRow, InvoicePayment } from '@/types/invoice';
import { Quotation } from '@/types/quotation';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Landmark,
  Layers,
  Pencil,
  Trash2,
  Ban,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  Plus,
  Users,
  ArrowLeft,
  ArrowRightLeft,
  Eye,
  Receipt,
  CreditCard,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-warm-textSubtle">
        {label}
      </p>
      <p className="text-sm font-semibold text-warm-text break-words">
        {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
      </p>
    </div>
  );
}

function formatPaymentMethod(method?: string) {
  switch (method) {
    case 'BANK_TRANSFER':
      return 'Bank Transfer / NEFT';
    case 'UPI':
      return 'UPI / QR';
    case 'CHEQUE':
      return 'Cheque';
    case 'CASH':
      return 'Cash';
    case 'CARD':
      return 'Credit / Debit Card';
    default:
      return method || 'Payment';
  }
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params?.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'quotations' | 'invoices' | 'transactions'>('profile');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const fetchCustomer = async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const data = await customersApi.getById(customerId);
      setCustomer(data);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load customer details'));
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelations = async () => {
    if (!customerId) return;
    setIsLoadingRelations(true);
    try {
      const [invoicesRes, quotationsRes, paymentsRes] = await Promise.all([
        invoicesApi.list({ customerId, limit: 100 }).catch(() => ({ invoices: [] })),
        quotationsApi.list({ customerId, limit: 100 }).catch(() => ({ quotations: [] })),
        invoicesApi.listAllPayments({ customerId, limit: 100 }).catch(() => ({ payments: [] }))
      ]);
      setInvoices(invoicesRes.invoices || []);
      setQuotations(quotationsRes.quotations || []);
      setPayments(paymentsRes.payments || []);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingRelations(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    fetchRelations();
  }, [customerId]);

  const handleToggleStatus = async () => {
    if (!customer) return;
    setIsTogglingStatus(true);
    try {
      const updated = await customersApi.setStatus(customer.id, !customer.isActive);
      setCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success(customer.isActive ? 'Customer deactivated' : 'Customer activated');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not update status'));
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setIsDeletingBusy(true);
    try {
      await customersApi.remove(customer.id);
      toast.success('Customer deleted successfully');
      router.push('/customers');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not delete customer'));
      setIsDeleting(false);
    } finally {
      setIsDeletingBusy(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading customer details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !customer) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Customer not found"
          description="This customer may have been deleted, or belongs to another business."
          icon={<Users className="w-6 h-6 text-warm-accent" />}
          actionLabel="Back to Customers"
          onAction={() => router.push('/customers')}
        />
      </DashboardLayout>
    );
  }

  const billingAddressBlock = [
    customer.address,
    [customer.city, customer.state].filter(Boolean).join(', '),
    [customer.country, customer.postalCode].filter(Boolean).join(' — ')
  ]
    .filter(Boolean)
    .join('\n');

  // Financial and ledger calculations
  const totalInvoiced = invoices
    .filter((inv) => inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + toNumber(inv.grandTotal), 0);

  const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);

  const totalInvoiceBalance = invoices
    .filter((inv) => inv.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + toNumber(inv.balanceDue), 0);

  const openingBal = customer.openingBalance ? toNumber(customer.openingBalance) : 0;
  const isOpeningDebit = (customer.balanceType || 'Dr.') === 'Dr.';
  const netOutstanding = isOpeningDebit
    ? totalInvoiceBalance + openingBal
    : totalInvoiceBalance - openingBal;

  return (
    <DashboardLayout>
      <PageHeader
        title={customer.name}
        description="Comprehensive customer profile, quotations history, tax invoices, and payment transactions ledger."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/customers' },
          { label: customer.name }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/quotations/new?customerId=${customer.id}`}>
              <Button size="sm" variant="outline" leftIcon={<FileSpreadsheet className="w-4 h-4 text-warm-accent" />}>
                New Quotation
              </Button>
            </Link>

            <Link href={`/invoices/new?customerId=${customer.id}`}>
              <Button size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>
                New Invoice
              </Button>
            </Link>

            <Link href={`/customers/${customer.id}/edit`}>
              <Button size="sm" leftIcon={<Pencil className="w-4 h-4" />}>
                Edit Customer
              </Button>
            </Link>

            <Button
              size="sm"
              variant="outline"
              disabled={isTogglingStatus}
              onClick={handleToggleStatus}
              leftIcon={customer.isActive ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
            >
              {customer.isActive ? 'Deactivate' : 'Activate'}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setIsDeleting(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Top Summary Banner */}
        <div className="bg-warm-surface border border-warm-border/70 p-5 shadow-warm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 bg-warm-accentLight/60 border border-warm-accent/20">
              <Building2 className="w-6 h-6 text-warm-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-bold text-warm-text">{customer.name}</h3>
                <Badge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className="flex items-center gap-3 text-xs text-warm-textMuted mt-1 flex-wrap">
                {customer.customerCode && (
                  <span className="font-mono font-semibold bg-warm-input px-2 py-0.5 border border-warm-border/60 text-warm-text">
                    {customer.customerCode}
                  </span>
                )}
                {customer.accountGroup && (
                  <span className="font-bold text-warm-text uppercase tracking-wider bg-warm-surface px-2 py-0.5 border border-warm-border">
                    {customer.accountGroup.toUpperCase()}
                  </span>
                )}
                {customer.partyCategory && (
                  <span className="font-medium bg-warm-surface text-warm-text px-2 py-0.5 border border-warm-border">
                    {customer.partyCategory}
                  </span>
                )}
                {customer.openingBalance !== null && customer.openingBalance !== undefined && Number(customer.openingBalance) > 0 && (
                  <span className="font-semibold bg-warm-surface text-warm-text px-2 py-0.5 border border-warm-border">
                    Opening Bal: {formatCurrency(Number(customer.openingBalance))} ({customer.balanceType || 'Dr.'})
                  </span>
                )}
                <span>Added on {formatDate(customer.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('quotations')}
              className={cn(
                'flex items-center gap-2 text-xs font-semibold px-3 py-2 border transition-colors cursor-pointer',
                activeTab === 'quotations'
                  ? 'bg-warm-accent text-white border-warm-accent'
                  : 'text-warm-text bg-warm-input hover:bg-warm-input/80 border-warm-border/60'
              )}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{quotations.length}</span>
              <span className={activeTab === 'quotations' ? 'text-white/80' : 'text-warm-textMuted'}>quotations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={cn(
                'flex items-center gap-2 text-xs font-semibold px-3 py-2 border transition-colors cursor-pointer',
                activeTab === 'invoices'
                  ? 'bg-warm-accent text-white border-warm-accent'
                  : 'text-warm-text bg-warm-input hover:bg-warm-input/80 border-warm-border/60'
              )}
            >
              <FileText className="w-4 h-4" />
              <span>{invoices.length}</span>
              <span className={activeTab === 'invoices' ? 'text-white/80' : 'text-warm-textMuted'}>invoices</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'flex items-center gap-2 text-xs font-semibold px-3 py-2 border transition-colors cursor-pointer',
                activeTab === 'transactions'
                  ? 'bg-warm-accent text-white border-warm-accent'
                  : 'text-warm-text bg-warm-input hover:bg-warm-input/80 border-warm-border/60'
              )}
            >
              <Receipt className="w-4 h-4" />
              <span>{payments.length}</span>
              <span className={activeTab === 'transactions' ? 'text-white/80' : 'text-warm-textMuted'}>transactions</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-warm-border/70 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max pb-px">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={cn(
                'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'profile'
                  ? 'border-warm-accent text-warm-accent bg-warm-surface'
                  : 'border-transparent text-warm-textMuted hover:text-warm-text'
              )}
            >
              Profile &amp; Details
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quotations')}
              className={cn(
                'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'quotations'
                  ? 'border-warm-accent text-warm-accent bg-warm-surface'
                  : 'border-transparent text-warm-textMuted hover:text-warm-text'
              )}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Quotations ({quotations.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={cn(
                'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'invoices'
                  ? 'border-warm-accent text-warm-accent bg-warm-surface'
                  : 'border-transparent text-warm-textMuted hover:text-warm-text'
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Invoices ({invoices.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={cn(
                'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'transactions'
                  ? 'border-warm-accent text-warm-accent bg-warm-surface'
                  : 'border-transparent text-warm-textMuted hover:text-warm-text'
              )}
            >
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Transactions &amp; Ledger ({payments.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Profile & Details */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Section 1: Contact Information */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <Phone className="w-4 h-4" />
                <span>Contact Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DetailItem label="Mob No." value={customer.phone} />
                <DetailItem label="Email ID" value={customer.email} />
                <DetailItem label="Contact Person" value={customer.contactPerson} />
                <DetailItem label="Office No." value={customer.officeNo} />
              </div>
            </div>

            {/* Section 2: Address Details */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <MapPin className="w-4 h-4" />
                <span>Address Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1 bg-warm-input/40 p-4 border border-warm-border/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                    Billing Address
                  </p>
                  <p className="text-sm font-medium text-warm-text whitespace-pre-line leading-relaxed">
                    {billingAddressBlock || '—'}
                  </p>
                </div>

                <div className="space-y-1 bg-warm-input/40 p-4 border border-warm-border/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                    Factory Address
                  </p>
                  <p className="text-sm font-medium text-warm-text whitespace-pre-line leading-relaxed">
                    {customer.factoryAddress || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Opening Balance & Accounting */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <Layers className="w-4 h-4" />
                <span>Opening Balance &amp; Ledger Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <DetailItem
                  label="Opening Balance"
                  value={
                    customer.openingBalance !== null && customer.openingBalance !== undefined
                      ? `${formatCurrency(Number(customer.openingBalance))} (${customer.balanceType || 'Dr.'})`
                      : '—'
                  }
                />
                <DetailItem
                  label="Opening Date"
                  value={customer.openingBalanceDate ? formatDate(customer.openingBalanceDate) : '—'}
                />
                <DetailItem label="Dr. / Cr." value={customer.balanceType} />

                {customer.narration1 && (
                  <div className="sm:col-span-3">
                    <DetailItem label="Narration 1" value={customer.narration1} />
                  </div>
                )}

                {customer.narration2 && (
                  <div className="sm:col-span-3">
                    <DetailItem label="Narration 2" value={customer.narration2} />
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Bank & Tax Information */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <Landmark className="w-4 h-4" />
                <span>Bank &amp; Tax Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DetailItem label="GSTIN No" value={customer.gstin} />
                <DetailItem label="Bank Name" value={customer.bankName} />
                <DetailItem label="Acc No" value={customer.accountNumber} />
                <DetailItem label="IFSC Code" value={customer.ifscCode} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Quotations History */}
        {activeTab === 'quotations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-bold text-warm-text">
                Quotations for {customer.name}
              </h4>
              <Link href={`/quotations/new?customerId=${customer.id}`}>
                <Button size="sm" variant="secondary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create Quotation
                </Button>
              </Link>
            </div>

            {isLoadingRelations ? (
              <div className="bg-warm-surface border border-warm-border/60 p-8">
                <LoadingState message="Loading customer quotations..." />
              </div>
            ) : quotations.length === 0 ? (
              <EmptyState
                icon={<FileSpreadsheet className="w-6 h-6" />}
                title="No quotations found"
                description={`No quotations have been generated for ${customer.name} yet.`}
                actionLabel="Create First Quotation"
                onAction={() => router.push(`/quotations/new?customerId=${customer.id}`)}
              />
            ) : (
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Quotation #</TableHead>
                    <TableHead className="min-w-[180px]">Subject / Inquiry</TableHead>
                    <TableHead className="min-w-[130px]">Date &amp; Validity</TableHead>
                    <TableHead className="min-w-[120px] text-right">Grand Total</TableHead>
                    <TableHead className="min-w-[100px] text-center">Status</TableHead>
                    <TableHead className="min-w-[130px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="min-w-[140px]">
                        <Link
                          href={`/quotations/${q.id}`}
                          className="font-bold text-warm-text hover:text-warm-accent transition-colors"
                        >
                          {q.quotationNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <p className="text-xs text-warm-text truncate max-w-[220px]">
                          {q.subject || '—'}
                        </p>
                        {q.inquiryNumber && (
                          <p className="text-[10px] text-warm-textMuted font-medium">
                            Inq: {q.inquiryNumber}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[130px]">
                        <p className="text-xs font-semibold text-warm-text">
                          {formatDate(q.quotationDate)}
                        </p>
                        <p className="text-[11px] text-warm-textMuted">
                          {q.validUntil ? `Valid: ${formatDate(q.validUntil)}` : 'No expiry'}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-[120px] text-right">
                        <span className="font-semibold text-warm-text tabular-nums">
                          {formatCurrency(Number(q.grandTotal))}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px] text-center">
                        <QuotationStatusBadge
                          status={q.status}
                          convertedInvoiceId={q.convertedInvoice?.id || q.convertedInvoiceId}
                          convertedInvoiceNumber={q.convertedInvoice?.invoiceNumber}
                        />
                      </TableCell>
                      <TableCell className="min-w-[130px] text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            href={`/quotations/${q.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-warm-text bg-warm-input/50 hover:bg-warm-accent hover:text-white border border-warm-border/60 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>
                          {q.status === 'ACCEPTED' && (
                            <Link
                              href={`/invoices/new?quotationId=${q.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200 transition-colors"
                              title="Convert to Invoice"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>Convert</span>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 3: Invoices History */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-bold text-warm-text">
                Invoices for {customer.name}
              </h4>
              <Link href={`/invoices/new?customerId=${customer.id}`}>
                <Button size="sm" variant="secondary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Create Invoice
                </Button>
              </Link>
            </div>

            {isLoadingRelations ? (
              <div className="bg-warm-surface border border-warm-border/60 p-8">
                <LoadingState message="Loading customer invoices..." />
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="No invoices found"
                description={`No tax invoices have been issued to ${customer.name} yet.`}
                actionLabel="Create First Invoice"
                onAction={() => router.push(`/invoices/new?customerId=${customer.id}`)}
              />
            ) : (
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Invoice #</TableHead>
                    <TableHead className="min-w-[130px]">Issue &amp; Due Date</TableHead>
                    <TableHead className="min-w-[120px] text-right">Grand Total</TableHead>
                    <TableHead className="min-w-[120px] text-right">Amount Due</TableHead>
                    <TableHead className="min-w-[100px] text-center">Status</TableHead>
                    <TableHead className="min-w-[110px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const invBalance = toNumber(inv.balanceDue);
                    const isOverdue =
                      inv.status !== 'PAID' &&
                      inv.status !== 'CANCELLED' &&
                      inv.status !== 'DRAFT' &&
                      invBalance > 0 &&
                      (inv.dueDate
                        ? new Date(inv.dueDate).setHours(0, 0, 0, 0) <
                          new Date().setHours(0, 0, 0, 0)
                        : false);

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="min-w-[140px]">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-bold text-warm-text hover:text-warm-accent transition-colors"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          {inv.quotations && inv.quotations.length > 0 && (
                            <span className="block text-[10px] text-purple-700 font-medium">
                              From {inv.quotations[0].quotationNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[130px]">
                          <p className="text-xs font-semibold text-warm-text">
                            {formatDate(inv.issueDate)}
                          </p>
                          {isOverdue ? (
                            <p className="text-[11px] font-semibold text-red-600 inline-flex items-center gap-1 mt-0.5">
                              <span>Due: {formatDate(inv.dueDate)}</span>
                              <span>·</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1 py-0.2">
                                Overdue
                              </span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-warm-textMuted mt-0.5">
                              Due: {formatDate(inv.dueDate)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[120px] text-right">
                          <span className="font-semibold text-warm-text tabular-nums">
                            {formatCurrency(toNumber(inv.grandTotal))}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[120px] text-right">
                          {inv.status === 'CANCELLED' ? (
                            <span className="text-warm-textSubtle text-xs font-normal">
                              —
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'font-semibold tabular-nums text-xs',
                                invBalance > 0 ? 'text-red-700' : 'text-emerald-700'
                              )}
                            >
                              {formatCurrency(invBalance)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[100px] text-center">
                          <InvoiceStatusBadge invoice={inv} />
                        </TableCell>
                        <TableCell className="min-w-[110px] text-right">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-warm-text bg-warm-input/50 hover:bg-warm-accent hover:text-white border border-warm-border/60 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Tab 4: Transactions & Ledger History */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Financial Ledger Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-warm-surface border border-warm-border/60 p-4 shadow-warm flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                    Total Invoiced
                  </p>
                  <p className="mt-1 text-xl font-bold text-warm-text tabular-nums">
                    {formatCurrency(totalInvoiced)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-warm-textMuted">
                    Across {invoices.filter((i) => i.status !== 'CANCELLED').length} active invoices
                  </p>
                </div>
                <div className="p-2.5 bg-warm-input border border-warm-border/60 text-warm-textMuted">
                  <FileText className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-warm-surface border border-warm-border/60 p-4 shadow-warm flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                    Total Paid / Collected
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(totalPaid)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-warm-textMuted">
                    Across {payments.length} payment receipts
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-warm-surface border border-warm-border/60 p-4 shadow-warm flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                    Opening Balance
                  </p>
                  <p className="mt-1 text-xl font-bold text-warm-text tabular-nums">
                    {customer.openingBalance ? `${formatCurrency(openingBal)} ${customer.balanceType || 'Dr.'}` : '₹0.00'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-warm-textMuted">
                    Initial balance on record
                  </p>
                </div>
                <div className="p-2.5 bg-warm-input border border-warm-border/60 text-warm-textMuted">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-warm-surface border border-warm-border/60 p-4 shadow-warm flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                    Net Outstanding
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-xl font-bold tabular-nums',
                      netOutstanding > 0 ? 'text-red-700' : 'text-emerald-700'
                    )}
                  >
                    {formatCurrency(Math.max(0, netOutstanding))}
                  </p>
                  <p className="mt-0.5 text-[11px] text-warm-textMuted">
                    {netOutstanding > 0 ? 'Pending collection' : 'Fully settled'}
                  </p>
                </div>
                <div
                  className={cn(
                    'p-2.5 border',
                    netOutstanding > 0
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  )}
                >
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Transactions Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-warm-text">
                  Payment &amp; Transaction History for {customer.name}
                </h4>
              </div>
            </div>

            {/* Transactions Table / Empty State */}
            {isLoadingRelations ? (
              <div className="bg-warm-surface border border-warm-border/60 p-8">
                <LoadingState message="Loading payment transactions..." />
              </div>
            ) : payments.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No payment transactions found"
                description={`No payment transactions have been recorded for ${customer.name} yet.`}
                actionLabel="View Customer Invoices"
                onAction={() => setActiveTab('invoices')}
              />
            ) : (
              <Table className="min-w-[850px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Payment Date</TableHead>
                    <TableHead className="min-w-[140px]">Payment Method</TableHead>
                    <TableHead className="min-w-[150px]">Invoice Reference</TableHead>
                    <TableHead className="min-w-[140px]">Txn / Ref #</TableHead>
                    <TableHead className="min-w-[180px]">Narration / Notes</TableHead>
                    <TableHead className="min-w-[130px] text-right">Amount Received</TableHead>
                    <TableHead className="min-w-[90px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="min-w-[120px]">
                        <p className="text-xs font-semibold text-warm-text">
                          {formatDate(p.paymentDate)}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-warm-input border border-warm-border/60 text-warm-text">
                          <CreditCard className="w-3 h-3 text-warm-accent" />
                          {formatPaymentMethod(p.paymentMethod)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        {p.invoice ? (
                          <div>
                            <Link
                              href={`/invoices/${p.invoice.id}`}
                              className="font-bold text-xs text-warm-text hover:text-warm-accent transition-colors block"
                            >
                              {p.invoice.invoiceNumber}
                            </Link>
                            <span className="text-[10px] text-warm-textMuted">
                              Total: {formatCurrency(toNumber(p.invoice.grandTotal))}
                            </span>
                          </div>
                        ) : p.invoiceId ? (
                          <Link
                            href={`/invoices/${p.invoiceId}`}
                            className="font-bold text-xs text-warm-text hover:text-warm-accent transition-colors"
                          >
                            View Invoice
                          </Link>
                        ) : (
                          <span className="text-warm-textSubtle text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <span className="text-xs font-mono text-warm-text break-all">
                          {p.referenceNumber || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <p className="text-xs text-warm-textMuted line-clamp-2" title={p.notes || ''}>
                          {p.notes || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-[130px] text-right">
                        <span className="font-bold text-xs text-emerald-700 tabular-nums">
                          +{formatCurrency(toNumber(p.amount))}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[90px] text-right">
                        {p.invoice?.id || p.invoiceId ? (
                          <Link
                            href={`/invoices/${p.invoice?.id || p.invoiceId}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-warm-text bg-warm-input/50 hover:bg-warm-accent hover:text-white border border-warm-border/60 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </Link>
                        ) : (
                          <span className="text-warm-textSubtle text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* Bottom Back Button */}
        <div className="pt-2">
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 text-sm text-warm-textMuted hover:text-warm-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customers Directory</span>
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        isLoading={isDeletingBusy}
        isDanger
        title="Delete this customer?"
        message={`"${customer.name}" will be permanently removed. Customers with existing invoices or quotations cannot be deleted — deactivate them instead.`}
        confirmLabel="Delete Customer"
      />
    </DashboardLayout>
  );
}
