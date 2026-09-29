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
import { vendorsApi, purchaseBillsApi } from '@/lib/purchases';
import { Vendor, PurchaseBill } from '@/types/purchase';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  Truck,
  Building2,
  Mail,
  Phone,
  MapPin,
  Landmark,
  Layers,
  Pencil,
  Trash2,
  Receipt,
  Plus,
  ArrowLeft,
  Eye,
  CheckCircle2,
  CreditCard,
  FileText
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

const STATUS_VARIANTS: Record<string, 'paid' | 'pending' | 'draft' | 'overdue' | 'neutral'> = {
  RECEIVED: 'pending',
  PARTIALLY_PAID: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'draft',
  DRAFT: 'draft'
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft'
};

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const vendorId = params?.id;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'bills'>('profile');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);

  const fetchVendor = async () => {
    if (!vendorId) return;
    setIsLoading(true);
    try {
      const data = await vendorsApi.get(vendorId);
      setVendor(data);
    } catch {
      toast.error('Could not load vendor details');
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBills = async () => {
    if (!vendorId) return;
    setIsLoadingBills(true);
    try {
      const res = await purchaseBillsApi.list({ vendorId, limit: 100 });
      setBills(res.purchaseBills || []);
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingBills(false);
    }
  };

  useEffect(() => {
    fetchVendor();
    fetchBills();
  }, [vendorId]);

  const handleDelete = async () => {
    if (!vendor) return;
    setIsDeletingBusy(true);
    try {
      await vendorsApi.delete(vendor.id);
      toast.success('Vendor deleted successfully');
      router.push('/vendors');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Could not delete vendor');
      setIsDeleting(false);
    } finally {
      setIsDeletingBusy(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading vendor details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !vendor) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Vendor not found"
          description="This vendor may have been deleted, or belongs to another business."
          icon={<Truck className="w-6 h-6 text-warm-accent" />}
          actionLabel="Back to Vendors"
          onAction={() => router.push('/vendors')}
        />
      </DashboardLayout>
    );
  }

  const addressBlock = [
    vendor.address,
    [vendor.city, vendor.state].filter(Boolean).join(', '),
    [vendor.country, vendor.postalCode].filter(Boolean).join(' — ')
  ]
    .filter(Boolean)
    .join('\n');

  // Calculations
  const totalBilled = bills
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + Number(b.grandTotal || 0), 0);

  const totalPaid = bills
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + Number(b.amountPaid || 0), 0);

  const totalBillBalance = bills
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + Number(b.balanceDue || 0), 0);

  const openingBal = vendor.openingBalance ? Number(vendor.openingBalance) : 0;
  const isCredit = !vendor.balanceType || (
    vendor.balanceType.toUpperCase().startsWith('CR') ||
    vendor.balanceType.toLowerCase() === 'credit' ||
    vendor.balanceType.toLowerCase() === 'payable'
  );
  const netPayable = isCredit
    ? totalBillBalance + openingBal
    : totalBillBalance - openingBal;

  return (
    <DashboardLayout>
      <PageHeader
        title={vendor.name}
        description="Vendor profile, inward purchase bills history, tax information, and ledger balance."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Vendors', href: '/vendors' },
          { label: vendor.name }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/purchases/new?vendorId=${vendor.id}`}>
              <Button size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>
                New Purchase Bill
              </Button>
            </Link>

            <Link href={`/vendors/${vendor.id}/edit`}>
              <Button size="sm" leftIcon={<Pencil className="w-4 h-4" />}>
                Edit Vendor
              </Button>
            </Link>

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
              <Truck className="w-6 h-6 text-warm-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl font-bold text-warm-text">{vendor.name}</h3>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-warm-input text-warm-text border border-warm-border/60">
                  {vendor.type === 'INDIVIDUAL' ? 'Individual' : 'Business'}
                </span>
                {!vendor.isActive && (
                  <Badge status="INACTIVE" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-warm-textMuted mt-1 flex-wrap">
                {vendor.tradeName && (
                  <span className="font-semibold text-warm-text bg-warm-input px-2 py-0.5 border border-warm-border/60">
                    Trade: {vendor.tradeName}
                  </span>
                )}
                {vendor.partyCategory && (
                  <span className="font-medium bg-warm-surface text-warm-text px-2 py-0.5 border border-warm-border">
                    {vendor.partyCategory}
                  </span>
                )}
                {vendor.gstin ? (
                  <span className="font-mono font-medium text-warm-text bg-warm-surface px-2 py-0.5 border border-warm-border">
                    GST: {vendor.gstin}
                  </span>
                ) : (
                  <span className="text-warm-textSubtle uppercase text-[10px]">Unregistered</span>
                )}
                <span>Added on {formatDate(vendor.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className={cn(
                'flex items-center gap-2 text-xs font-semibold px-3 py-2 border transition-colors cursor-pointer',
                activeTab === 'bills'
                  ? 'bg-warm-accent text-white border-warm-accent'
                  : 'text-warm-text bg-warm-input hover:bg-warm-input/80 border-warm-border/60'
              )}
            >
              <Receipt className="w-4 h-4" />
              <span>{bills.length}</span>
              <span className={activeTab === 'bills' ? 'text-white/80' : 'text-warm-textMuted'}>purchase bills</span>
            </button>
          </div>
        </div>

        {/* Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-warm-surface border border-warm-border/60 p-4 shadow-warm flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                Total Billed
              </p>
              <p className="mt-1 text-xl font-bold text-warm-text tabular-nums">
                {formatCurrency(totalBilled)}
              </p>
              <p className="mt-0.5 text-[11px] text-warm-textMuted">
                Across {bills.filter((b) => b.status !== 'CANCELLED').length} active purchase bills
              </p>
            </div>
            <div className="p-2.5 bg-warm-input border border-warm-border/60 text-warm-textMuted">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-warm-surface border border-warm-border/60 p-4 shadow-warm flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                Total Paid
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">
                {formatCurrency(totalPaid)}
              </p>
              <p className="mt-0.5 text-[11px] text-warm-textMuted">
                Settled to vendor
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
                {vendor.openingBalance ? `${formatCurrency(openingBal)} ${vendor.balanceType || 'CR'}` : '₹0.00'}
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
                Current Balance
              </p>
              <p
                className={cn(
                  'mt-1 text-xl font-bold tabular-nums',
                  netPayable > 0 ? 'text-blue-700' : 'text-emerald-700'
                )}
              >
                {formatCurrency(Math.abs(netPayable))}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-warm-textMuted">
                {netPayable >= 0 ? 'Payable (to vendor)' : 'Advance / Receivable'}
              </p>
            </div>
            <div
              className={cn(
                'p-2.5 border',
                netPayable > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              )}
            >
              <CreditCard className="w-5 h-5" />
            </div>
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
              onClick={() => setActiveTab('bills')}
              className={cn(
                'px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0',
                activeTab === 'bills'
                  ? 'border-warm-accent text-warm-accent bg-warm-surface'
                  : 'border-transparent text-warm-textMuted hover:text-warm-text'
              )}
            >
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Bills ({bills.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Profile & Details */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <Phone className="w-4 h-4" />
                <span>Contact Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DetailItem label="Contact Person" value={vendor.contactPerson} />
                <DetailItem label="Mobile / Phone" value={vendor.phone} />
                <DetailItem label="Email ID" value={vendor.email} />
                <DetailItem label="Trade Name" value={vendor.tradeName} />
              </div>
            </div>

            {/* Address Details */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <MapPin className="w-4 h-4" />
                <span>Dispatch &amp; Billing Address</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1 bg-warm-input/40 p-4 border border-warm-border/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                    Address
                  </p>
                  <p className="text-sm font-medium text-warm-text whitespace-pre-line leading-relaxed">
                    {addressBlock || '—'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-warm-input/40 p-4 border border-warm-border/50">
                  <DetailItem label="City" value={vendor.city} />
                  <DetailItem label="State" value={vendor.state} />
                  <DetailItem label="Country" value={vendor.country || 'India'} />
                  <DetailItem label="PIN Code" value={vendor.postalCode} />
                </div>
              </div>
            </div>

            {/* Commercial Terms & Balance */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <Layers className="w-4 h-4" />
                <span>Commercial Terms &amp; Opening Balance</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <DetailItem
                  label="Payment Terms"
                  value={vendor.paymentTerms || 'Net 30 Days'}
                />
                <DetailItem
                  label="Opening Balance"
                  value={
                    vendor.openingBalance !== null && vendor.openingBalance !== undefined
                      ? `${formatCurrency(Number(vendor.openingBalance))} (${vendor.balanceType || 'CR'})`
                      : '—'
                  }
                />
                <DetailItem
                  label="Opening Date"
                  value={vendor.openingBalanceDate ? formatDate(vendor.openingBalanceDate) : '—'}
                />

                {vendor.narration && (
                  <div className="sm:col-span-3">
                    <DetailItem label="Internal Remarks / Notes" value={vendor.narration} />
                  </div>
                )}
              </div>
            </div>

            {/* Bank & Tax Information */}
            <div className="bg-warm-surface border border-warm-border/70 p-6 shadow-warm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-warm-border/50 text-xs font-bold uppercase tracking-wider text-warm-accent">
                <Landmark className="w-4 h-4" />
                <span>Bank &amp; Statutory Tax Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <DetailItem label="GSTIN No" value={vendor.gstin} />
                <DetailItem label="PAN No" value={vendor.pan} />
                <DetailItem label="Bank Name" value={vendor.bankName} />
                <DetailItem label="Account Number" value={vendor.accountNumber} />
                <DetailItem label="IFSC Code" value={vendor.ifscCode} />
                <DetailItem label="Branch" value={vendor.branch} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Purchase Bills */}
        {activeTab === 'bills' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-bold text-warm-text">
                Purchase Bills from {vendor.name}
              </h4>
              <Link href={`/purchases/new?vendorId=${vendor.id}`}>
                <Button size="sm" variant="secondary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  New Purchase Bill
                </Button>
              </Link>
            </div>

            {isLoadingBills ? (
              <div className="bg-warm-surface border border-warm-border/60 p-8">
                <LoadingState message="Loading purchase bills..." />
              </div>
            ) : bills.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-6 h-6" />}
                title="No purchase bills found"
                description={`No purchase bills have been recorded for ${vendor.name} yet.`}
                actionLabel="Create First Purchase Bill"
                onAction={() => router.push(`/purchases/new?vendorId=${vendor.id}`)}
              />
            ) : (
              <div className="bg-warm-surface border border-warm-border/70 shadow-warm rounded-none overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Bill #</TableHead>
                      <TableHead className="min-w-[150px]">Vendor Invoice #</TableHead>
                      <TableHead className="min-w-[130px]">Bill &amp; Due Date</TableHead>
                      <TableHead className="min-w-[120px] text-right">Grand Total</TableHead>
                      <TableHead className="min-w-[120px] text-right">Amount Due</TableHead>
                      <TableHead className="min-w-[100px] text-center">Status</TableHead>
                      <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((b) => {
                      const balanceDueNum = Number(b.balanceDue || 0);
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="min-w-[140px]">
                            <Link
                              href={`/purchases/${b.id}`}
                              className="font-bold text-warm-text hover:text-warm-accent transition-colors"
                            >
                              {b.billNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="min-w-[150px]">
                            <span className="text-xs text-warm-text font-mono">
                              {b.vendorInvoiceNumber || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[130px]">
                            <p className="text-xs font-semibold text-warm-text">
                              {formatDate(b.billDate)}
                            </p>
                            {b.dueDate && (
                              <p className="text-[11px] text-warm-textMuted">
                                Due: {formatDate(b.dueDate)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[120px] text-right">
                            <span className="font-semibold text-warm-text tabular-nums text-xs">
                              {formatCurrency(Number(b.grandTotal || 0))}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[120px] text-right">
                            <span
                              className={cn(
                                'font-semibold tabular-nums text-xs',
                                balanceDueNum > 0 ? 'text-amber-800' : 'text-emerald-700'
                              )}
                            >
                              {formatCurrency(balanceDueNum)}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[100px] text-center">
                            <Badge variant={STATUS_VARIANTS[b.status] || 'neutral'}>
                              {STATUS_LABELS[b.status] || b.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[100px] text-right">
                            <Link
                              href={`/purchases/${b.id}`}
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
              </div>
            )}
          </div>
        )}

        {/* Bottom Back Button */}
        <div className="pt-2">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-2 text-sm text-warm-textMuted hover:text-warm-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Vendors &amp; Suppliers Directory</span>
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        isLoading={isDeletingBusy}
        isDanger
        title="Delete this vendor?"
        message={`"${vendor.name}" will be permanently removed. Vendors with existing purchase bills cannot be deleted.`}
        confirmLabel="Delete Vendor"
      />
    </DashboardLayout>
  );
}
