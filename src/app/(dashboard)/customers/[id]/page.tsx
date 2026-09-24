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
import { InvoiceListRow } from '@/types/invoice';
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
  Eye
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

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params?.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'quotations' | 'invoices'>('profile');

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
      const [invoicesRes, quotationsRes] = await Promise.all([
        invoicesApi.list({ customerId, limit: 50 }).catch(() => ({ invoices: [] })),
        quotationsApi.list({ customerId, limit: 50 }).catch(() => ({ quotations: [] }))
      ]);
      setInvoices(invoicesRes.invoices || []);
      setQuotations(quotationsRes.quotations || []);
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

  return (
    <DashboardLayout>
      <PageHeader
        title={customer.name}
        description="Comprehensive customer profile, billing address, quotations, invoices, and accounting history."
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
                <span>Added on {formatDate(customer.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('quotations')}
              className="flex items-center gap-2 text-xs font-semibold text-warm-text bg-warm-input hover:bg-warm-input/80 px-3 py-2 border border-warm-border/60 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-warm-accent" />
              <span>{customer.quotationCount ?? quotations.length}</span>
              <span className="text-warm-textMuted">quotations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className="flex items-center gap-2 text-xs font-semibold text-warm-text bg-warm-input hover:bg-warm-input/80 px-3 py-2 border border-warm-border/60 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-warm-accent" />
              <span>{customer.invoiceCount ?? invoices.length}</span>
              <span className="text-warm-textMuted">invoices</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-warm-border/70 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer',
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
              'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer',
              activeTab === 'quotations'
                ? 'border-warm-accent text-warm-accent bg-warm-surface'
                : 'border-transparent text-warm-textMuted hover:text-warm-text'
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Quotations ({quotations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={cn(
              'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer',
              activeTab === 'invoices'
                ? 'border-warm-accent text-warm-accent bg-warm-surface'
                : 'border-transparent text-warm-textMuted hover:text-warm-text'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices ({invoices.length})</span>
          </button>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Subject / Inquiry</TableHead>
                    <TableHead>Date &amp; Validity</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Link
                          href={`/quotations/${q.id}`}
                          className="font-bold text-warm-text hover:text-warm-accent transition-colors"
                        >
                          {q.quotationNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-warm-text truncate max-w-[220px]">
                          {q.subject || '—'}
                        </p>
                        {q.inquiryNumber && (
                          <p className="text-[10px] text-warm-textMuted font-medium">
                            Inq: {q.inquiryNumber}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold text-warm-text">
                          {formatDate(q.quotationDate)}
                        </p>
                        <p className="text-[11px] text-warm-textMuted">
                          {q.validUntil ? `Valid: ${formatDate(q.validUntil)}` : 'No expiry'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-warm-text tabular-nums">
                          {formatCurrency(Number(q.grandTotal))}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <QuotationStatusBadge status={q.status} />
                      </TableCell>
                      <TableCell className="text-right">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Issue &amp; Due Date</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
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
                      <TableCell>
                        <p className="text-xs font-semibold text-warm-text">
                          {formatDate(inv.issueDate)}
                        </p>
                        <p className="text-[11px] text-warm-textMuted">
                          Due: {formatDate(inv.dueDate)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-warm-text tabular-nums">
                          {formatCurrency(toNumber(inv.grandTotal))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.status === 'CANCELLED' ? (
                          <span className="text-warm-textSubtle text-xs font-normal">
                            —
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'font-semibold tabular-nums text-xs',
                              toNumber(inv.balanceDue) > 0 ? 'text-red-700' : 'text-emerald-700'
                            )}
                          >
                            {formatCurrency(toNumber(inv.balanceDue))}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <InvoiceStatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-warm-text bg-warm-input/50 hover:bg-warm-accent hover:text-white border border-warm-border/60 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
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
