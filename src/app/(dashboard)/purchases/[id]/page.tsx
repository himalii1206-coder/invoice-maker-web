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
import { RecordPaymentModal } from '@/components/purchases/RecordPaymentModal';
import { purchaseBillsApi } from '@/lib/purchases';
import { PurchaseBill, PurchaseBillStatus } from '@/types/purchase';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  IndianRupee,
  Building2,
  Calendar,
  Truck,
  ShieldCheck,
  Receipt,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  FileText,
  Plus,
  Layers,
  CreditCard,
  ChevronDown
} from 'lucide-react';

const STATUS_VARIANTS: Record<PurchaseBillStatus, 'draft' | 'pending' | 'paid' | 'overdue' | 'neutral'> = {
  DRAFT: 'draft',
  RECEIVED: 'pending',
  PARTIALLY_PAID: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'neutral'
};

const STATUS_LABELS: Record<PurchaseBillStatus, string> = {
  DRAFT: 'Draft Voucher',
  RECEIVED: 'Pending Payment',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid in Full',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled'
};

export default function PurchaseBillDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { company } = useAuth();

  const [bill, setBill] = useState<PurchaseBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'payments'>('details');

  // Modals & Action states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);

  const fetchBill = async () => {
    if (!id) return;
    try {
      const data = await purchaseBillsApi.get(id);
      setBill(data);
    } catch (err: any) {
      toast.error('Failed to load purchase bill');
      router.push('/purchases');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  const handleDelete = async () => {
    if (!bill) return;
    setIsDeleting(true);
    try {
      await purchaseBillsApi.delete(bill.id);
      toast.success('Purchase bill deleted successfully');
      router.push('/purchases');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete purchase bill');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!bill || !deletingPaymentId) return;
    setIsDeletingPayment(true);
    try {
      const updated = await purchaseBillsApi.deletePayment(bill.id, deletingPaymentId);
      setBill(updated);
      toast.success('Payment removed successfully');
      setDeletingPaymentId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to remove payment');
    } finally {
      setIsDeletingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-8">
          <LoadingState message="Loading purchase bill details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!bill) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Purchase Bill not found"
          description="This purchase bill voucher does not exist or has been removed."
          icon={<Receipt className="w-8 h-8 text-warm-accent" />}
          actionLabel="Back to Purchase Bills"
          onAction={() => router.push('/purchases')}
        />
      </DashboardLayout>
    );
  }

  const balanceDue = Number(bill.balanceDue) || 0;
  const amountPaid = Number(bill.amountPaid) || 0;
  const grandTotal = Number(bill.grandTotal) || 0;
  const taxableAmount = Number(bill.taxableAmount) || 0;
  const isPaid = bill.status === 'PAID' || (balanceDue === 0 && grandTotal > 0);
  const isCancelled = bill.status === 'CANCELLED';

  return (
    <DashboardLayout>
      {/* Top Header */}
      <PageHeader
        title={`Purchase Bill ${bill.billNumber}`}
        description={`Inward from ${bill.vendorName} · Invoice Date: ${formatDate(bill.billDate)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Bills', href: '/purchases' },
          { label: bill.billNumber }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANTS[bill.status]}>
              {STATUS_LABELS[bill.status]}
            </Badge>

            {balanceDue > 0 && !isCancelled && (
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Record Payment
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>

            <Link href={`/purchases/${bill.id}/edit`}>
              <Button variant="outline" size="sm" leftIcon={<Pencil className="w-4 h-4" />}>
                Edit
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Quick Glance Metric Summary Bar */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Total Bill Amount
            </p>
            <Receipt className="w-4 h-4 text-warm-accent" />
          </div>
          <p className="text-lg font-bold text-warm-text mt-1 tabular-nums">
            {formatCurrency(grandTotal)}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            Taxable: {formatCurrency(taxableAmount)}
          </p>
        </div>

        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Amount Paid
            </p>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
            {formatCurrency(amountPaid)}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            {bill.payments.length} disbursement{bill.payments.length === 1 ? '' : 's'} recorded
          </p>
        </div>

        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Balance Payable
            </p>
            {isPaid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <p
            className={cn(
              'text-lg font-bold mt-1 tabular-nums',
              balanceDue > 0 ? 'text-amber-800' : 'text-emerald-700'
            )}
          >
            {formatCurrency(balanceDue)}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            {isPaid ? 'Fully settled' : bill.dueDate ? `Due on ${formatDate(bill.dueDate)}` : 'Payable'}
          </p>
        </div>

        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Tax Regime
            </p>
            <Layers className="w-4 h-4 text-warm-accent" />
          </div>
          <p className="text-xs font-bold text-warm-text mt-1.5 truncate">
            {bill.isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5 truncate">
            POS: {bill.placeOfSupply || bill.vendorState || '—'}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Main Content Tabs */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex items-center border-b border-warm-border/70 mb-5 gap-1">
        <button
          onClick={() => setActiveTab('details')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
            activeTab === 'details'
              ? 'border-warm-accent text-warm-accent bg-warm-accentLight/30'
              : 'border-transparent text-warm-textMuted hover:text-warm-text hover:bg-warm-input/40'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bill Details</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
            activeTab === 'payments'
              ? 'border-warm-accent text-warm-accent bg-warm-accentLight/30'
              : 'border-transparent text-warm-textMuted hover:text-warm-text hover:bg-warm-input/40'
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Disbursements &amp; Payments ({bill.payments.length})</span>
        </button>
      </div>

      {/* Tab 1: Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Supplier & Organization Details */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-warm-border/50">
                {/* Supplier */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-warm-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                        Supplier (Inward From)
                      </span>
                    </div>
                    {bill.vendorId && (
                      <Link
                        href={`/vendors/${bill.vendorId}`}
                        className="text-[10px] text-warm-accent hover:underline font-semibold"
                      >
                        View Vendor ↗
                      </Link>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-warm-text">{bill.vendorName}</p>
                    {bill.vendorAddress && (
                      <p className="text-xs text-warm-textMuted leading-relaxed">
                        {bill.vendorAddress}
                      </p>
                    )}
                    <p className="text-xs text-warm-textMuted leading-relaxed">
                      {[bill.vendorCity, bill.vendorState, bill.vendorPostalCode].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {bill.vendorGstin && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-warm-input text-warm-text text-[10px] font-semibold border border-warm-border">
                        GST: {bill.vendorGstin}
                      </span>
                    )}
                    {bill.vendorPhone && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                        <Phone className="w-3 h-3" /> {bill.vendorPhone}
                      </span>
                    )}
                    {bill.vendorEmail && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                        <Mail className="w-3 h-3" /> {bill.vendorEmail}
                      </span>
                    )}
                  </div>
                </div>

                {/* Buyer / Inward To */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-warm-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                      Billed To / Received By
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-warm-text">{company?.name || 'My Business'}</p>
                    {company?.address && (
                      <p className="text-xs text-warm-textMuted leading-relaxed">{company.address}</p>
                    )}
                    <p className="text-xs text-warm-textMuted leading-relaxed">
                      {[company?.city, company?.state, company?.postalCode].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {company?.gstin && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-warm-input text-warm-text text-[10px] font-semibold border border-warm-border">
                        GST: {company.gstin}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Logistics & Reference Details */}
              {(bill.vendorInvoiceNumber ||
                bill.poNumber ||
                bill.poDate ||
                bill.grnNumber ||
                bill.grnDate ||
                bill.transporterName ||
                bill.vehicleNumber ||
                bill.lrNumber ||
                bill.lrDate ||
                bill.paymentTerms) && (
                <div className="border-t border-warm-border/60 bg-warm-input/15 px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-3.5 h-3.5 text-warm-accent" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-warm-text">
                      Inward, Transport &amp; Reference Details
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 pt-0.5 text-xs">
                    {bill.vendorInvoiceNumber && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Supplier Inv No
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {bill.vendorInvoiceNumber}
                        </p>
                      </div>
                    )}

                    {bill.poNumber && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          PO No
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {bill.poNumber}
                          {bill.poDate && (
                            <span className="block text-[11px] font-normal text-warm-textMuted">
                              Dated {formatDate(bill.poDate)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {bill.grnNumber && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          GRN No
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {bill.grnNumber}
                          {bill.grnDate && (
                            <span className="block text-[11px] font-normal text-warm-textMuted">
                              Dated {formatDate(bill.grnDate)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {bill.lrNumber && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          LR / Bilty No
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {bill.lrNumber}
                          {bill.lrDate && (
                            <span className="block text-[11px] font-normal text-warm-textMuted">
                              Dated {formatDate(bill.lrDate)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {bill.transporterName && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Transporter
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {bill.transporterName}
                        </p>
                      </div>
                    )}

                    {bill.vehicleNumber && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Vehicle No
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {bill.vehicleNumber}
                        </p>
                      </div>
                    )}

                    {bill.paymentTerms && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Payment Terms
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {bill.paymentTerms}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div className="px-4 py-3 border-b border-warm-border/50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
                  Purchased Items ({bill.items.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead className="bg-warm-input/40 border-b border-warm-border/60">
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
                      <th className="py-2.5 px-4 w-10">#</th>
                      <th className="py-2.5 px-3">Item &amp; Description</th>
                      <th className="py-2.5 px-3">HSN/SAC</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-warm-border/30 text-xs">
                    {bill.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-warm-input/20 transition-colors">
                        <td className="py-3 px-4 text-warm-textMuted font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-warm-text">{item.name}</p>
                          {item.description && (
                            <p className="text-[11px] text-warm-textMuted mt-0.5 max-w-sm line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-warm-text">
                          {item.hsnSacCode || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-warm-text tabular-nums">
                          {Number(item.quantity)}
                        </td>
                        <td className="py-3 px-3 text-warm-text uppercase font-medium">
                          {item.unit || 'PCS'}
                        </td>
                        <td className="py-3 px-3 text-right text-warm-text tabular-nums">
                          {formatCurrency(Number(item.unitPrice))}
                          {Number(item.discountPercent) > 0 && (
                            <span className="block text-[10px] text-warm-accent">
                              -{Number(item.discountPercent)}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-warm-text tabular-nums">
                          {Number(item.taxRate)}%
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-warm-text tabular-nums">
                          {formatCurrency(Number(item.taxableAmount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compliance & Notes */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 space-y-3.5">
              <div className="p-3 bg-warm-input/30 border border-warm-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-warm-accent" />
                  <span className="font-bold text-warm-text">ITC Eligibility:</span>
                  <span className="font-semibold text-warm-accent">{bill.itcEligibility}</span>
                </div>
                {bill.isReverseCharge && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-semibold text-[10px] border border-amber-300">
                    Reverse Charge (RCM) Applicable
                  </span>
                )}
              </div>

              {bill.terms && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                    Terms &amp; Conditions
                  </p>
                  <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line bg-warm-input/20 p-2.5 border border-warm-border/40">
                    {bill.terms}
                  </p>
                </div>
              )}

              {bill.notes && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                    Internal Notes / Remarks
                  </p>
                  <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line bg-warm-input/20 p-2.5 border border-warm-border/40">
                    {bill.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Financial Summary */}
          <div className="space-y-5">
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div className="px-4 py-3 border-b border-warm-border/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-warm-text tracking-tight">Summary</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                  {bill.isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                </span>
              </div>

              <div className="p-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-warm-textMuted">
                  <span>Gross Subtotal:</span>
                  <span className="font-semibold text-warm-text">{formatCurrency(Number(bill.subtotal))}</span>
                </div>

                {Number(bill.discountAmount) > 0 && (
                  <div className="flex justify-between text-warm-accent">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(Number(bill.discountAmount))}</span>
                  </div>
                )}

                <div className="flex justify-between text-warm-textMuted">
                  <span>Taxable Value:</span>
                  <span className="font-semibold text-warm-text">{formatCurrency(taxableAmount)}</span>
                </div>

                {/* Show IGST or CGST+SGST only */}
                {bill.isIgst ? (
                  <div className="flex justify-between text-warm-textMuted">
                    <span>Integrated Tax (IGST):</span>
                    <span className="font-semibold text-warm-text">{formatCurrency(Number(bill.igstAmount))}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-warm-textMuted">
                      <span>Central Tax (CGST):</span>
                      <span className="font-semibold text-warm-text">{formatCurrency(Number(bill.cgstAmount))}</span>
                    </div>
                    <div className="flex justify-between text-warm-textMuted">
                      <span>State Tax (SGST):</span>
                      <span className="font-semibold text-warm-text">{formatCurrency(Number(bill.sgstAmount))}</span>
                    </div>
                  </>
                )}

                {bill.isReverseCharge && Number(bill.taxAmount) > 0 && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 leading-snug">
                    <span className="font-bold">Reverse Charge (₹{formatCurrency(Number(bill.taxAmount)).replace('₹', '')}):</span> Payable directly to Govt under RCM. Excluded from vendor total.
                  </div>
                )}

                {Number(bill.otherCharges) > 0 && (
                  <div className="flex justify-between text-warm-textMuted">
                    <span>Inward Freight &amp; Charges:</span>
                    <span className="font-semibold text-warm-text">{formatCurrency(Number(bill.otherCharges))}</span>
                  </div>
                )}

                {Number(bill.roundOff) !== 0 && (
                  <div className="flex justify-between text-warm-textSubtle">
                    <span>Round Off:</span>
                    <span>{Number(bill.roundOff) > 0 ? `+${bill.roundOff}` : bill.roundOff}</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-warm-border flex items-center justify-between gap-4 bg-warm-accentLight/50 -mx-4 px-4 py-2.5">
                  <span className="text-sm font-bold text-warm-text">Total Bill Amount</span>
                  <span className="text-base font-extrabold text-warm-accent tabular-nums">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                <div className="pt-2 border-t border-warm-border/50 space-y-1.5">
                  <div className="flex justify-between text-warm-textMuted">
                    <span>Total Paid to Vendor:</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(amountPaid)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-warm-border/40">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-warm-text">
                      Outstanding Balance
                    </span>
                    <span
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        balanceDue > 0 ? 'text-amber-800' : 'text-emerald-700'
                      )}
                    >
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Metadata Card */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent pb-1 border-b border-warm-border/40">
                Voucher Specifications
              </p>
              <dl className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Invoice Date</dt>
                  <dd className="font-semibold text-warm-text">{formatDate(bill.billDate)}</dd>
                </div>
                {bill.dueDate && (
                  <div className="flex items-center justify-between">
                    <dt className="text-warm-textMuted text-[11px]">Due Date</dt>
                    <dd className="font-semibold text-warm-text">{formatDate(bill.dueDate)}</dd>
                  </div>
                )}
                {bill.financialYear && (
                  <div className="flex items-center justify-between">
                    <dt className="text-warm-textMuted text-[11px]">FY</dt>
                    <dd className="font-semibold text-warm-text">{bill.financialYear}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Supply Mode</dt>
                  <dd className="font-semibold text-warm-text">
                    {bill.isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href="/purchases"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-textMuted hover:text-warm-accent transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Purchase Bills list
            </Link>
          </div>
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-5">
          <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-warm-border/50">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
                  Disbursements &amp; Vendor Payments
                </h3>
                <p className="text-[11px] text-warm-textMuted mt-0.5">
                  Total {formatCurrency(amountPaid)} paid of {formatCurrency(grandTotal)}
                </p>
              </div>

              {balanceDue > 0 && !isCancelled && (
                <Button
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Record Payment
                </Button>
              )}
            </div>

            {bill.payments.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CreditCard className="w-8 h-8 text-warm-textSubtle mx-auto" />
                <p className="text-xs font-medium text-warm-textMuted">
                  No disbursement payments recorded for this bill yet.
                </p>
                {balanceDue > 0 && !isCancelled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaymentModalOpen(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Record First Payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-warm-input/50 border-b border-warm-border/60">
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-warm-textMuted">
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Reference / Notes</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-border/30">
                    {bill.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-warm-input/20 transition-colors">
                        <td className="py-3 px-4 text-xs font-semibold text-warm-text">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-warm-textMuted">
                          {p.referenceNumber && (
                            <span className="font-mono font-medium text-warm-text mr-2">
                              Ref: {p.referenceNumber}
                            </span>
                          )}
                          {p.notes && <span>{p.notes}</span>}
                          {!p.referenceNumber && !p.notes && (
                            <span className="text-warm-textSubtle">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(Number(p.amount))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            title="Delete Payment"
                            onClick={() => setDeletingPaymentId(p.id)}
                            className="p-1 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={(updated) => setBill(updated)}
          purchaseBill={bill}
        />
      )}

      {/* Delete Bill Dialog */}
      {deleteModalOpen && (
        <ConfirmDialog
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Purchase Bill"
          message={`Are you sure you want to permanently delete purchase bill ${bill.billNumber}? This action cannot be undone.`}
          confirmLabel="Delete Bill"
          isDanger={true}
          isLoading={isDeleting}
        />
      )}

      {/* Delete Payment Dialog */}
      {Boolean(deletingPaymentId) && (
        <ConfirmDialog
          isOpen={Boolean(deletingPaymentId)}
          onClose={() => setDeletingPaymentId(null)}
          onConfirm={handleConfirmDeletePayment}
          title="Remove Payment"
          message="Are you sure you want to remove this vendor disbursement? The bill balance and status will be recalculated."
          confirmLabel="Remove Payment"
          isDanger={true}
          isLoading={isDeletingPayment}
        />
      )}
    </DashboardLayout>
  );
}
