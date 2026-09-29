'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { InvoiceTotals } from '@/components/invoices/InvoiceTotals';
import { InvoiceActivityFeed } from '@/components/invoices/InvoiceActivityFeed';
import { RecordPaymentModal } from '@/components/invoices/RecordPaymentModal';
import { SendInvoiceModal } from '@/components/invoices/SendInvoiceModal';
import { PdfPreviewModal } from '@/components/invoices/PdfPreviewModal';
import {
  invoicesApi,
  toNumber,
  openPdfBlob,
  PAYMENT_METHOD_LABELS
} from '@/lib/invoices';
import { computeTotals } from '@/lib/gst';
import { apiErrorMessage } from '@/lib/customers';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types/invoice';
import {
  FileWarning,
  Pencil,
  Copy,
  Download,
  Printer,
  Eye,
  Mail,
  BellRing,
  Ban,
  Send,
  Plus,
  Trash2,
  Building2,
  Receipt,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Truck,
  CreditCard,
  Clock,
  CheckCircle2,
  FileText,
  Phone,
  ChevronDown,
  Layers,
} from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = params?.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  // Tab state: 'overview' | 'payments' | 'activity'
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'activity'>('overview');

  // Actions & Modals state
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<'invoice' | 'reminder' | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  useEffect(() => {
    if (searchParams.get('preview') === 'true') {
      setIsPreviewOpen(true);
    }
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------

  const load = useCallback(async () => {
    if (!invoiceId) return;

    try {
      setInvoice(await invoicesApi.getById(invoiceId));
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not load the invoice'));
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    invoicesApi
      .emailStatus()
      .then((status) => setEmailConfigured(status.configured))
      .catch(() => setEmailConfigured(false));
  }, []);

  const refresh = useCallback(async () => {
    await load();
    setActivityKey((key) => key + 1);
  }, [load]);

  const totals = useMemo(() => {
    if (!invoice) return null;

    return computeTotals(
      invoice.items.map((item) => ({
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        discountPercent: toNumber(item.discountPercent),
        taxRate: toNumber(item.taxRate)
      })),
      {
        isIgst: invoice.isIgst,
        enableRoundOff: toNumber(invoice.roundOff) !== 0,
        extraCharges: toNumber(invoice.extraCharges),
        isReverseCharge: invoice.isReverseCharge
      }
    );
  }, [invoice]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  const handlePdf = (mode: 'print' | 'download') =>
    withBusy(mode, async () => {
      if (!invoice) return;
      try {
        const blob = await invoicesApi.fetchPdf(
          invoice.id,
          mode === 'print' ? 'inline' : 'attachment'
        );
        openPdfBlob(blob, `${invoice.invoiceNumber}.pdf`, mode);
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not generate the PDF'));
      }
    });

  const handleMarkSent = () =>
    withBusy('send', async () => {
      if (!invoice) return;
      try {
        await invoicesApi.setStatus(invoice.id, 'SENT');
        toast.success('Invoice marked as sent');
        await refresh();
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not update the invoice'));
      }
    });

  const handleDuplicate = () =>
    withBusy('duplicate', async () => {
      if (!invoice) return;
      try {
        const created = await invoicesApi.duplicate(invoice.id);
        toast.success(`Created ${created.invoiceNumber} as a draft copy`);
        router.push(`/invoices/${created.id}/edit`);
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not duplicate the invoice'));
      }
    });

  const handleCancel = () =>
    withBusy('cancel', async () => {
      if (!invoice) return;
      try {
        await invoicesApi.cancel(invoice.id);
        toast.success('Invoice cancelled');
        setIsCancelOpen(false);
        await refresh();
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not cancel the invoice'));
      }
    });

  const handleDeletePayment = () =>
    withBusy('deletePayment', async () => {
      if (!deletingPaymentId) return;
      try {
        await invoicesApi.deletePayment(deletingPaymentId);
        toast.success('Payment removed');
        setDeletingPaymentId(null);
        await refresh();
      } catch (error) {
        toast.error(apiErrorMessage(error, 'Could not remove the payment'));
      }
    });

  // ---------------------------------------------------------------------------
  // Render States
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-8">
          <LoadingState message="Loading invoice details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !invoice || !totals) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Invoice not found"
          description="This invoice may have been deleted, or it belongs to another business."
          icon={<FileWarning className="w-6 h-6 text-warm-accent" />}
          actionLabel="Back to Invoices"
          onAction={() => router.push('/invoices')}
        />
      </DashboardLayout>
    );
  }

  const grandTotal = toNumber(invoice.grandTotal);
  const amountPaid = toNumber(invoice.amountPaid);
  const balanceDue = toNumber(invoice.balanceDue);
  const isCancelled = invoice.status === 'CANCELLED';
  const isDraft = invoice.status === 'DRAFT';
  const isPaid = invoice.status === 'PAID' || (balanceDue === 0 && grandTotal > 0);
  const canReceivePayment = !isCancelled && !isDraft && balanceDue > 0;

  const hasDifferentConsignee = Boolean(
    invoice.consigneeCustomerId ||
      (invoice.shippingName &&
        (invoice.shippingName !== invoice.billingName ||
          invoice.shippingAddress !== invoice.billingAddress ||
          invoice.shippingGstin !== invoice.billingGstin))
  );

  const billingLines = [
    invoice.billingAddress,
    [invoice.billingCity, invoice.billingState, invoice.billingPostalCode]
      .filter(Boolean)
      .join(', '),
    invoice.billingCountry
  ].filter(Boolean) as string[];

  const shippingLines = [
    invoice.shippingAddress,
    [invoice.shippingCity, invoice.shippingState, invoice.shippingPostalCode]
      .filter(Boolean)
      .join(', '),
    invoice.shippingCountry
  ].filter(Boolean) as string[];

  // Populated logistics badges
  const referencePills = [
    invoice.poNumber && { label: 'PO / Order No', value: invoice.poNumber },
    invoice.orderDate && { label: 'Order Date', value: formatDate(invoice.orderDate) },
    invoice.challanNo && { label: 'Challan No', value: invoice.challanNo },
    invoice.challanDate && { label: 'Challan Date', value: formatDate(invoice.challanDate) },
    invoice.dcNo && { label: 'D.C. No', value: invoice.dcNo },
    invoice.dcDate && { label: 'D.C. Date', value: formatDate(invoice.dcDate) },
    invoice.modeOfDispatch && { label: 'Dispatch Via', value: invoice.modeOfDispatch },
    invoice.lhNo && { label: 'LH / LR No', value: invoice.lhNo },
    invoice.lhDate && { label: 'LR Date', value: formatDate(invoice.lhDate) },
    invoice.paymentTerms && { label: 'Terms', value: invoice.paymentTerms },
    invoice.reference && { label: 'Ref', value: invoice.reference }
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <DashboardLayout>
      {/* Top Header */}
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.billingName} · Issued on ${formatDate(invoice.issueDate)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices', href: '/invoices' },
          { label: invoice.invoiceNumber }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge invoice={invoice} direction="row" size="md" />

            {!isCancelled && (
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                  Edit
                </Button>
              </Link>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
              className="bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border-blue-200/80 font-medium"
            >
              Preview PDF
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePdf('download')}
              isLoading={busyAction === 'download'}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download
            </Button>

            {canReceivePayment && (
              <Button
                size="sm"
                onClick={() => setIsPaymentOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Record Payment
              </Button>
            )}

            {isDraft && (
              <Button
                size="sm"
                onClick={handleMarkSent}
                isLoading={busyAction === 'send'}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Mark Sent
              </Button>
            )}

            {/* More Actions Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoreActions((prev) => !prev)}
                rightIcon={<ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showMoreActions && "rotate-180")} />}
              >
                More
              </Button>

              {showMoreActions && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMoreActions(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-warm-surface border border-warm-border shadow-lg z-30 py-1 divide-y divide-warm-border/40 animate-in fade-in zoom-in-95">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowMoreActions(false);
                          handlePdf('print');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-warm-text hover:bg-warm-input flex items-center gap-2 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-warm-textMuted" />
                        <span>Print Invoice</span>
                      </button>

                      {!isCancelled && (
                        <button
                          onClick={() => {
                            setShowMoreActions(false);
                            setEmailMode('invoice');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-warm-text hover:bg-warm-input flex items-center gap-2 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5 text-warm-textMuted" />
                          <span>Email to Customer</span>
                        </button>
                      )}

                      {!isCancelled && !isDraft && balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setShowMoreActions(false);
                            setEmailMode('reminder');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-warm-text hover:bg-warm-input flex items-center gap-2 transition-colors"
                        >
                          <BellRing className="w-3.5 h-3.5 text-warm-textMuted" />
                          <span>Send Overdue Reminder</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowMoreActions(false);
                          handleDuplicate();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-warm-text hover:bg-warm-input flex items-center gap-2 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-warm-textMuted" />
                        <span>Duplicate Invoice</span>
                      </button>
                    </div>

                    {!isCancelled && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowMoreActions(false);
                            setIsCancelOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                        >
                          <Ban className="w-3.5 h-3.5 text-red-500" />
                          <span>Cancel Invoice</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      {/* Quotation Source Banner */}
      {invoice.quotations && invoice.quotations.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 mb-5 bg-purple-50/70 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-950">
                Generated from Quotation {invoice.quotations[0].quotationNumber}
              </p>
              <p className="text-[11px] text-purple-800">
                Converted from sales quotation
                {invoice.quotations[0].quotationDate ? ` dated ${formatDate(invoice.quotations[0].quotationDate)}` : ''}
                {invoice.quotations[0].subject ? ` • ${invoice.quotations[0].subject}` : ''}
              </p>
            </div>
          </div>
          <Link href={`/quotations/${invoice.quotations[0].id}`} className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-purple-700 border-purple-300 hover:bg-purple-100/60 text-xs font-semibold"
              rightIcon={<Eye className="w-3.5 h-3.5" />}
            >
              View Quotation
            </Button>
          </Link>
        </div>
      )}

      {/* Cancelled Alert Banner */}
      {isCancelled && (
        <div className="flex items-start gap-3 p-3.5 mb-5 bg-red-50 border border-red-200">
          <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-900">This invoice was cancelled</p>
            <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
              {invoice.cancelledReason
                ? `Reason: ${invoice.cancelledReason}`
                : 'It stays on record so its sequence number is never reused, but no longer counts towards receivables.'}
            </p>
          </div>
        </div>
      )}

      {/* Overdue Alert Banner */}
      {invoice.status === 'OVERDUE' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 mb-5 bg-red-50 border border-red-200">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-900">
                Payment overdue since {formatDate(invoice.dueDate)}
              </p>
              <p className="text-[11px] text-red-800 mt-0.5">
                {formatCurrency(balanceDue)} is still pending payment.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setEmailMode('reminder')}
            leftIcon={<BellRing className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            Send Reminder
          </Button>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Quick Glance Metric Summary Bar */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Total Amount
            </p>
            <Receipt className="w-4 h-4 text-warm-accent" />
          </div>
          <p className="text-lg font-bold text-warm-text mt-1 tabular-nums">
            {formatCurrency(grandTotal)}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            Taxable: {formatCurrency(toNumber(invoice.taxableAmount))}
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
            {invoice.payments.length} payment{invoice.payments.length === 1 ? '' : 's'} recorded
          </p>
        </div>

        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Balance Due
            </p>
            {isPaid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <p
            className={cn(
              "text-lg font-bold mt-1 tabular-nums",
              balanceDue > 0 ? "text-amber-800" : "text-emerald-700"
            )}
          >
            {formatCurrency(balanceDue)}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            {isPaid ? 'Fully settled' : `Due on ${formatDate(invoice.dueDate)}`}
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
            {invoice.isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5 truncate">
            POS: {invoice.placeOfSupply || invoice.billingState || '—'}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Main Content Tabs */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex items-center border-b border-warm-border/70 mb-5 gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
            activeTab === 'overview'
              ? 'border-warm-accent text-warm-accent bg-warm-accentLight/30'
              : 'border-transparent text-warm-textMuted hover:text-warm-text hover:bg-warm-input/40'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Invoice Details</span>
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
          <span>Payments ({invoice.payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={cn(
            'px-4 py-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-2',
            activeTab === 'activity'
              ? 'border-warm-accent text-warm-accent bg-warm-accentLight/30'
              : 'border-transparent text-warm-textMuted hover:text-warm-text hover:bg-warm-input/40'
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Activity Feed</span>
        </button>
      </div>

      {/* Tab 1: Overview & Items */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Parties: Buyer & Consignee */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div
                className={cn(
                  'grid divide-y sm:divide-y-0 divide-warm-border/50',
                  hasDifferentConsignee
                    ? 'grid-cols-1 sm:grid-cols-2 sm:divide-x'
                    : 'grid-cols-1'
                )}
              >
                {/* Bill To */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-warm-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                        Bill To (Buyer)
                      </span>
                    </div>
                    {invoice.customerId && (
                      <Link
                        href={`/customers`}
                        className="text-[10px] text-warm-accent hover:underline font-semibold"
                      >
                        View Profile ↗
                      </Link>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-warm-text">{invoice.billingName}</p>
                    {billingLines.map((line, idx) => (
                      <p key={idx} className="text-xs text-warm-textMuted leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {invoice.billingGstin && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-warm-input text-warm-text text-[10px] font-semibold border border-warm-border">
                        GST: {invoice.billingGstin}
                      </span>
                    )}
                    {invoice.billingPhone && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                        <Phone className="w-3 h-3" /> {invoice.billingPhone}
                      </span>
                    )}
                    {invoice.billingEmail && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                        <Mail className="w-3 h-3" /> {invoice.billingEmail}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ship To (Only if different consignee) */}
                {hasDifferentConsignee && (
                  <div className="p-4 space-y-2 bg-amber-50/15">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-700" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Ship To (Consignee)
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-warm-text">
                        {invoice.shippingName || invoice.billingName}
                      </p>
                      {shippingLines.map((line, idx) => (
                        <p key={idx} className="text-xs text-warm-textMuted leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {invoice.shippingGstin && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-amber-100/60 text-amber-900 text-[10px] font-semibold border border-amber-300">
                          GST: {invoice.shippingGstin}
                        </span>
                      )}
                      {invoice.shippingPhone && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                          <Phone className="w-3 h-3" /> {invoice.shippingPhone}
                        </span>
                      )}
                      {invoice.shippingEmail && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                          <Mail className="w-3 h-3" /> {invoice.shippingEmail}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Populated logistics & reference pills */}
              {referencePills.length > 0 && (
                <div className="px-4 py-2.5 border-t border-warm-border/50 bg-warm-input/20 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle mr-1">
                    Logistics:
                  </span>
                  {referencePills.map((pill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-warm-surface border border-warm-border text-[11px]"
                    >
                      <span className="text-warm-textMuted">{pill.label}:</span>
                      <span className="font-semibold text-warm-text">{pill.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div className="px-4 py-3 border-b border-warm-border/50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
                  Line Items ({invoice.items.length})
                </h3>
                <span className="text-[11px] text-warm-textMuted">
                  Amounts in {invoice.currency || 'INR'} (₹)
                </span>
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
                    {invoice.items.map((item, idx) => (
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
                          {toNumber(item.quantity)}
                        </td>
                        <td className="py-3 px-3 text-warm-text uppercase font-medium">
                          {item.unit || 'PCS'}
                        </td>
                        <td className="py-3 px-3 text-right text-warm-text tabular-nums">
                          {formatCurrency(toNumber(item.unitPrice))}
                          {toNumber(item.discountPercent) > 0 && (
                            <span className="block text-[10px] text-warm-accent">
                              -{toNumber(item.discountPercent)}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-warm-text tabular-nums">
                          {toNumber(item.taxRate)}%
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-warm-text tabular-nums">
                          {formatCurrency(toNumber(item.taxableAmount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes and Terms */}
            {(invoice.notes || invoice.terms || invoice.internalNotes) && (
              <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 space-y-3.5">
                {invoice.notes && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                      Notes
                    </p>
                    <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line bg-warm-input/20 p-2.5 border border-warm-border/40">
                      {invoice.notes}
                    </p>
                  </div>
                )}

                {invoice.terms && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                      Terms &amp; Conditions
                    </p>
                    <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line bg-warm-input/20 p-2.5 border border-warm-border/40">
                      {invoice.terms}
                    </p>
                  </div>
                )}

                {invoice.internalNotes && (
                  <div className="pt-2 border-t border-dashed border-warm-border">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle mb-1">
                      Internal Private Notes (Not Printed on PDF)
                    </p>
                    <p className="text-xs text-warm-textSubtle italic leading-relaxed">
                      {invoice.internalNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Financial Summary */}
          <div className="space-y-5">
            <InvoiceTotals
              totals={totals}
              isIgst={invoice.isIgst}
              isReverseCharge={invoice.isReverseCharge}
              amountPaid={amountPaid}
              creditNoteTotal={toNumber(invoice.creditNoteTotal)}
              debitNoteTotal={toNumber(invoice.debitNoteTotal)}
              balanceDue={balanceDue}
            />

            {/* Document Metadata Card */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent pb-1 border-b border-warm-border/40">
                Invoice Specifications
              </p>
              <dl className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Bill Type</dt>
                  <dd className="font-semibold text-warm-text">
                    {(invoice.billType || 'TAX_INVOICE').replace(/_/g, ' ')}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Issue Date</dt>
                  <dd className="font-semibold text-warm-text">{formatDate(invoice.issueDate)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Due Date</dt>
                  <dd className="font-semibold text-warm-text">{formatDate(invoice.dueDate)}</dd>
                </div>
                {invoice.financialYear && (
                  <div className="flex items-center justify-between">
                    <dt className="text-warm-textMuted text-[11px]">FY</dt>
                    <dd className="font-semibold text-warm-text">{invoice.financialYear}</dd>
                  </div>
                )}
                {invoice.isReverseCharge && (
                  <div className="flex items-center justify-between">
                    <dt className="text-warm-textMuted text-[11px]">Reverse Charge</dt>
                    <dd className="font-semibold text-amber-700">Applicable</dd>
                  </div>
                )}
              </dl>
            </div>

            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-textMuted hover:text-warm-accent transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Invoices list
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
                  Payment Transactions
                </h3>
                <p className="text-[11px] text-warm-textMuted mt-0.5">
                  Total {formatCurrency(amountPaid)} paid of {formatCurrency(grandTotal)}
                </p>
              </div>

              {canReceivePayment && (
                <Button
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Record Payment
                </Button>
              )}
            </div>

            {invoice.payments.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <CreditCard className="w-8 h-8 text-warm-textSubtle mx-auto" />
                <p className="text-xs font-medium text-warm-textMuted">
                  No payment transactions recorded for this invoice yet.
                </p>
                {canReceivePayment && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaymentOpen(true)}
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
                    {invoice.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-warm-input/20 transition-colors">
                        <td className="py-3 px-4 text-xs font-semibold text-warm-text">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                            {PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-warm-textMuted">
                          {p.referenceNumber && <span className="font-mono font-medium text-warm-text mr-2">Ref: {p.referenceNumber}</span>}
                          {p.notes && <span>{p.notes}</span>}
                          {!p.referenceNumber && !p.notes && <span className="text-warm-textSubtle">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(toNumber(p.amount))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!isCancelled && (
                            <button
                              title="Delete Payment"
                              onClick={() => setDeletingPaymentId(p.id)}
                              className="p-1 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Tab 3: Activity Feed */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          <InvoiceActivityFeed invoiceId={invoice.id} refreshKey={activityKey} />
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modals & Dialogs */}
      {/* ---------------------------------------------------------------------- */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        invoice={invoice}
      />

      <RecordPaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        invoice={invoice}
        onRecorded={refresh}
      />

      {emailMode && (
        <SendInvoiceModal
          isOpen
          mode={emailMode}
          invoice={invoice}
          emailConfigured={emailConfigured}
          onClose={() => setEmailMode(null)}
          onSent={refresh}
        />
      )}

      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onConfirm={handleCancel}
        isLoading={busyAction === 'cancel'}
        isDanger
        title={`Cancel invoice ${invoice.invoiceNumber}?`}
        message="The invoice stays on record with its number intact, but stops counting towards what your customers owe you. This cannot be undone."
        confirmLabel="Cancel Invoice"
        cancelLabel="Keep Invoice"
      />

      <ConfirmDialog
        isOpen={Boolean(deletingPaymentId)}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={handleDeletePayment}
        isLoading={busyAction === 'deletePayment'}
        isDanger
        title="Remove this payment?"
        message="The invoice balance and status will be recalculated without it."
        confirmLabel="Remove Payment"
      />
    </DashboardLayout>
  );
}
