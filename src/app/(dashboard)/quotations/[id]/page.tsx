'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { QuotationStatusBadge } from '@/components/quotations/QuotationStatusBadge';
import { QuotationTotals } from '@/components/quotations/QuotationTotals';
import { QuotationPreviewModal } from '@/components/quotations/QuotationPreviewModal';
import { QuotationActivityFeed } from '@/components/quotations/QuotationActivityFeed';
import { quotationsApi } from '@/lib/quotations';
import { openPdfBlob } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Quotation } from '@/types/quotation';
import {
  FileSpreadsheet,
  ArrowLeft,
  Pencil,
  Download,
  Printer,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRightLeft,
  Copy,
  Trash2,
  Building2,
  Receipt,
  FileText,
  AlertTriangle,
  CreditCard,
  Truck,
  Calendar,
  Clock,
  ChevronDown,
  Layers,
  Phone,
  Mail,
  Check,
  Package
} from 'lucide-react';

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params?.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Tab state: 'overview' | 'activity'
  const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');

  // Modals & Action states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  const [showMoreActions, setShowMoreActions] = useState(false);

  const fetchQuotation = useCallback(async (showLoader = false) => {
    if (!quotationId) return;
    if (showLoader) setIsLoading(true);
    try {
      const data = await quotationsApi.getById(quotationId);
      setQuotation(data);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Failed to fetch quotation details'));
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    fetchQuotation(true);
  }, [fetchQuotation]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-8">
          <LoadingState message="Loading quotation details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !quotation) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={<FileSpreadsheet className="w-8 h-8 text-warm-accent" />}
          title="Quotation not found"
          description="The quotation you are looking for does not exist or has been deleted."
          actionLabel="Back to Quotations"
          onAction={() => router.push('/quotations')}
        />
      </DashboardLayout>
    );
  }

  const isDraft = quotation.status === 'DRAFT';
  const isSent = quotation.status === 'SENT';
  const isAccepted = quotation.status === 'ACCEPTED';
  const isConverted = quotation.status === 'CONVERTED';
  const isCancelled = quotation.status === 'CANCELLED';
  const isRejected = quotation.status === 'REJECTED';

  const grandTotal = Number(quotation.grandTotal) || 0;
  const taxableTotal = Number(quotation.subtotal) || 0;

  const billingLines = [
    quotation.billingAddress,
    [quotation.billingCity, quotation.billingState, quotation.billingPostalCode]
      .filter(Boolean)
      .join(', ')
  ].filter(Boolean);

  const handlePdf = async (mode: 'print' | 'download') => {
    setBusyAction(mode);
    try {
      const blob = await quotationsApi.fetchPdf(quotation.id);
      const cleanQNum = quotation.quotationNumber.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const cleanCust = (quotation.billingName || 'Quotation').replace(/[^a-zA-Z0-9._-]+/g, '-');
      openPdfBlob(blob, `${cleanQNum}-${cleanCust}.pdf`, mode);
      if (mode === 'download') {
        toast.success(`Downloaded Quotation ${quotation.quotationNumber}`);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not generate the PDF'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleSend = async () => {
    setBusyAction('send');
    try {
      const updated = await quotationsApi.send(quotation.id);
      toast.success(`Quotation ${quotation.quotationNumber} marked as Sent`);
      setQuotation((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              status: 'SENT',
              sentAt: updated?.sentAt || new Date().toISOString()
            }
          : updated
      );
      fetchQuotation(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to mark as sent'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAccept = async () => {
    setBusyAction('accept');
    try {
      const updated = await quotationsApi.accept(quotation.id);
      toast.success(`Quotation ${quotation.quotationNumber} marked as Accepted`);
      setQuotation((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              status: 'ACCEPTED',
              acceptedAt: updated?.acceptedAt || new Date().toISOString()
            }
          : updated
      );
      fetchQuotation(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to accept quotation'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleReject = async () => {
    setBusyAction('reject');
    try {
      const updated = await quotationsApi.reject(quotation.id, reasonInput);
      toast.success(`Quotation ${quotation.quotationNumber} marked as Rejected`);
      setRejectDialogOpen(false);
      setQuotation((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              status: 'REJECTED',
              rejectedAt: updated?.rejectedAt || new Date().toISOString(),
              rejectionReason: reasonInput
            }
          : updated
      );
      setReasonInput('');
      fetchQuotation(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reject quotation'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async () => {
    setBusyAction('cancel');
    try {
      const updated = await quotationsApi.cancel(quotation.id, reasonInput);
      toast.success(`Quotation ${quotation.quotationNumber} Cancelled`);
      setCancelDialogOpen(false);
      setQuotation((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              status: 'CANCELLED',
              cancelledAt: updated?.cancelledAt || new Date().toISOString(),
              cancellationReason: reasonInput
            }
          : updated
      );
      setReasonInput('');
      fetchQuotation(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to cancel quotation'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDuplicate = async () => {
    setBusyAction('duplicate');
    try {
      const copy = await quotationsApi.duplicate(quotation.id);
      toast.success(`Quotation duplicated as ${copy.quotationNumber}`);
      router.push(`/quotations/${copy.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to duplicate quotation'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleConvertToInvoice = async () => {
    setBusyAction('convert');
    try {
      const invoice = await quotationsApi.convertToInvoice(quotation.id);
      toast.success(`Quotation converted to Tax Invoice ${invoice.invoiceNumber}`);
      setConvertDialogOpen(false);
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to convert quotation to invoice'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    setBusyAction('delete');
    try {
      await quotationsApi.remove(quotation.id);
      toast.success(`Quotation ${quotation.quotationNumber} deleted`);
      setDeleteDialogOpen(false);
      router.push('/quotations');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete quotation'));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <DashboardLayout>
      {/* Top Header */}
      <PageHeader
        title={`Quotation ${quotation.quotationNumber}`}
        breadcrumbs={[
          { label: 'Sales', href: '/quotations' },
          { label: 'Quotations', href: '/quotations' },
          { label: quotation.quotationNumber }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <QuotationStatusBadge
              status={quotation.status}
              convertedInvoiceId={quotation.convertedInvoiceId}
              convertedInvoiceNumber={quotation.convertedInvoice?.invoiceNumber}
              size="md"
            />

            {isDraft && (
              <Link href={`/quotations/${quotation.id}/edit`}>
                <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                  Edit
                </Button>
              </Link>
            )}

            {/* Convert to Invoice */}
            {(isAccepted || (isSent && !quotation.isExpired)) && (
              <Button
                size="sm"
                onClick={() => setConvertDialogOpen(true)}
                isLoading={busyAction === 'convert'}
                leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
              >
                Convert to Invoice
              </Button>
            )}

            {/* Accept / Send direct action buttons */}
            {isDraft && (
              <Button
                size="sm"
                onClick={handleSend}
                isLoading={busyAction === 'send'}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Mark Sent
              </Button>
            )}

            {isSent && (
              <Button
                size="sm"
                onClick={handleAccept}
                isLoading={busyAction === 'accept'}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Accept
              </Button>
            )}

            {/* Preview PDF */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
              className="bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border-blue-200/80 font-medium"
            >
              Preview PDF
            </Button>

            {/* Download PDF */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePdf('download')}
              isLoading={busyAction === 'download'}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download
            </Button>

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
                        <span>Print Quotation</span>
                      </button>

                      {isDraft && (
                        <Link
                          href={`/quotations/${quotation.id}/edit`}
                          onClick={() => setShowMoreActions(false)}
                          className="w-full text-left px-3.5 py-2 text-xs text-warm-text hover:bg-warm-input flex items-center gap-2 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-warm-textMuted" />
                          <span>Edit Quotation</span>
                        </Link>
                      )}

                      {isSent && (
                        <button
                          onClick={() => {
                            setShowMoreActions(false);
                            setRejectDialogOpen(true);
                            setReasonInput('');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-warm-text hover:bg-warm-input flex items-center gap-2 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Reject Quotation</span>
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
                        <span>Duplicate Quotation</span>
                      </button>
                    </div>

                    {(isSent || isAccepted || quotation.status === 'EXPIRED') && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowMoreActions(false);
                            setCancelDialogOpen(true);
                            setReasonInput('');
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                        >
                          <Ban className="w-3.5 h-3.5 text-red-500" />
                          <span>Cancel Quotation</span>
                        </button>
                      </div>
                    )}

                    {isDraft && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowMoreActions(false);
                            setDeleteDialogOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Delete Draft</span>
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

      {/* Converted to Invoice Banner */}
      {isConverted && quotation.convertedInvoiceId && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 mb-5 bg-purple-50/80 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-950">
                Converted to Tax Invoice
                {quotation.convertedInvoice?.invoiceNumber
                  ? ` — ${quotation.convertedInvoice.invoiceNumber}`
                  : ''}
              </p>
              <p className="text-[11px] text-purple-800">
                This quotation has been officially converted into a GST Tax Invoice.
              </p>
            </div>
          </div>
          <Link href={`/invoices/${quotation.convertedInvoiceId}`}>
            <Button
              size="sm"
              className="bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs"
              rightIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
            >
              View Invoice
            </Button>
          </Link>
        </div>
      )}

      {/* Cancellation Banner */}
      {isCancelled && (
        <div className="flex items-start gap-3 p-3.5 mb-5 bg-red-50 border border-red-200">
          <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-900">This quotation was cancelled</p>
            <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
              {quotation.cancellationReason
                ? `Reason: ${quotation.cancellationReason}`
                : 'It remains preserved for audit history and sequence continuity.'}
            </p>
          </div>
        </div>
      )}

      {/* Rejection Banner */}
      {isRejected && (
        <div className="flex items-start gap-3 p-3.5 mb-5 bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-900">This quotation was rejected</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              {quotation.rejectionReason
                ? `Reason: ${quotation.rejectionReason}`
                : 'Client did not proceed with this estimate.'}
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Quick Glance Metric Summary Bar */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Quotation Total
            </p>
            <Receipt className="w-4 h-4 text-warm-accent" />
          </div>
          <p className="text-lg font-bold text-warm-text mt-1 tabular-nums">
            {formatCurrency(grandTotal)}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            Taxable: {formatCurrency(taxableTotal)}
          </p>
        </div>

        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle">
              Validity
            </p>
            <Calendar className="w-4 h-4 text-warm-accent" />
          </div>
          <p className="text-sm font-bold text-warm-text mt-1.5 truncate">
            {quotation.validUntil ? formatDate(quotation.validUntil) : 'No Expiry'}
          </p>
          <p className="text-[11px] text-warm-textMuted mt-0.5">
            Issued {formatDate(quotation.quotationDate)}
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
          <span>Quotation Details</span>
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
          <span>Activity Feed ({quotation.activities?.length || 0})</span>
        </button>
      </div>

      {/* Tab 1: Overview & Items */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Customer & Commercial Specs Card */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-warm-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                      Customer Details
                    </span>
                  </div>
                  {quotation.customerId && (
                    <Link
                      href={`/customers`}
                      className="text-[10px] text-warm-accent hover:underline font-semibold"
                    >
                      View Profile ↗
                    </Link>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-warm-text">{quotation.billingName}</p>
                  {billingLines.map((line, idx) => (
                    <p key={idx} className="text-xs text-warm-textMuted leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {quotation.billingGstin && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-warm-input text-warm-text text-[10px] font-semibold border border-warm-border">
                      GST: {quotation.billingGstin}
                    </span>
                  )}
                  {quotation.billingPhone && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                      <Phone className="w-3 h-3" /> {quotation.billingPhone}
                    </span>
                  )}
                  {quotation.billingEmail && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-warm-textMuted">
                      <Mail className="w-3 h-3" /> {quotation.billingEmail}
                    </span>
                  )}
                </div>
              </div>

              {/* Commercial & Reference Details */}
              {(quotation.inquiryNumber ||
                quotation.inquiryDate ||
                quotation.referenceNumber ||
                quotation.paymentTerms ||
                Number(quotation.forwardingPackagingAmount) > 0) && (
                <div className="border-t border-warm-border/60 bg-warm-input/15 px-4 py-3.5 sm:px-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-3.5 h-3.5 text-warm-accent" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-warm-text">
                      Inquiry &amp; Commercial Terms
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 pt-0.5 text-xs">
                    {quotation.inquiryNumber && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Inquiry No
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {quotation.inquiryNumber}
                          {quotation.inquiryDate && (
                            <span className="block text-[11px] font-normal text-warm-textMuted">
                              Dated {formatDate(quotation.inquiryDate)}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {quotation.referenceNumber && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Ref No
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {quotation.referenceNumber}
                        </p>
                      </div>
                    )}

                    {quotation.paymentTerms && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Payment Terms
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {quotation.paymentTerms}
                        </p>
                      </div>
                    )}

                    {Number(quotation.forwardingPackagingAmount) > 0 && (
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-warm-textMuted">
                          Pkg / Fwd Charges
                        </span>
                        <p className="font-semibold text-warm-text text-xs">
                          {formatCurrency(Number(quotation.forwardingPackagingAmount))}
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
                  Quotation Items ({quotation.items.length})
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
                    {quotation.items.map((item, idx) => {
                      const qty = Number(item.quantity) || 0;
                      const rate = Number(item.rate) || 0;
                      const discPct = Number(item.discountPercent) || 0;
                      const discAmt = Number(item.discountAmount) || (discPct > 0 ? (qty * rate * discPct) / 100 : 0);
                      const amount = Number(item.taxableAmount) || Math.max(0, qty * rate - discAmt);

                      return (
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
                            {qty}
                          </td>
                          <td className="py-3 px-3 text-warm-text uppercase font-medium">
                            {item.unit || 'PCS'}
                          </td>
                          <td className="py-3 px-3 text-right text-warm-text tabular-nums">
                            {formatCurrency(rate)}
                            {discPct > 0 && (
                              <span className="block text-[10px] text-warm-accent">
                                -{discPct}%
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-warm-text tabular-nums">
                            {Number(item.taxRate)}%
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-warm-text tabular-nums">
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms and Notes */}
            {(quotation.terms || quotation.termsAndConditions || quotation.notes) && (
              <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 space-y-3.5">
                {(quotation.terms || quotation.termsAndConditions) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                      Terms &amp; Conditions
                    </p>
                    <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line bg-warm-input/20 p-2.5 border border-warm-border/40">
                      {quotation.terms || quotation.termsAndConditions}
                    </p>
                  </div>
                )}

                {quotation.notes && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                      Notes
                    </p>
                    <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line bg-warm-input/20 p-2.5 border border-warm-border/40">
                      {quotation.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Financial Summary */}
          <div className="space-y-5">
            <QuotationTotals
              total={Number(quotation.subtotal)}
              cgstAmount={Number(quotation.cgstAmount)}
              sgstAmount={Number(quotation.sgstAmount)}
              igstAmount={Number(quotation.igstAmount)}
              forwardingPackagingAmount={Number(quotation.forwardingPackagingAmount)}
              secondTotal={Number(quotation.secondTotal)}
              roundOff={Number(quotation.roundOff)}
              grandTotal={Number(quotation.grandTotal)}
              isIgst={quotation.isIgst}
              taxRate={quotation.items?.[0] ? Number(quotation.items[0].taxRate) : 18}
              discountAmount={Number(quotation.discountAmount)}
            />

            {/* Document Metadata Card */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent pb-1 border-b border-warm-border/40">
                Quotation Specifications
              </p>
              <dl className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Quotation Date</dt>
                  <dd className="font-semibold text-warm-text">{formatDate(quotation.quotationDate)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Valid Until</dt>
                  <dd className="font-semibold text-warm-text">
                    {quotation.validUntil ? formatDate(quotation.validUntil) : '—'}
                  </dd>
                </div>
                {quotation.paymentTerms && (
                  <div className="flex items-center justify-between">
                    <dt className="text-warm-textMuted text-[11px]">Payment Terms</dt>
                    <dd className="font-semibold text-warm-text">{quotation.paymentTerms}</dd>
                  </div>
                )}
                {quotation.financialYear && (
                  <div className="flex items-center justify-between">
                    <dt className="text-warm-textMuted text-[11px]">FY</dt>
                    <dd className="font-semibold text-warm-text">{quotation.financialYear}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-warm-textMuted text-[11px]">Supply Mode</dt>
                  <dd className="font-semibold text-warm-text">
                    {quotation.isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href="/quotations"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-textMuted hover:text-warm-accent transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Quotations list
            </Link>
          </div>
        </div>
      )}

      {/* Tab 2: Activity Feed */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          <QuotationActivityFeed activities={quotation.activities || []} />
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modals & Dialogs */}
      {/* ---------------------------------------------------------------------- */}
      {previewOpen && (
        <QuotationPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          quotation={{
            id: quotation.id,
            quotationNumber: quotation.quotationNumber,
            billingName: quotation.billingName,
            customer: quotation.customer
          }}
        />
      )}

      {convertDialogOpen && (
        <ConfirmDialog
          isOpen={convertDialogOpen}
          onClose={() => setConvertDialogOpen(false)}
          onConfirm={handleConvertToInvoice}
          title="Convert Quotation to Tax Invoice"
          message={`Are you sure you want to convert Quotation ${quotation.quotationNumber} into a new Tax Invoice? This will generate a fresh invoice number, snapshot all customer & product lines atomically, and mark this quotation as CONVERTED.`}
          confirmLabel="Convert to Invoice"
          isDanger={false}
          isLoading={busyAction === 'convert'}
        />
      )}

      {rejectDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-warm-surface border border-warm-border p-6 max-w-md w-full shadow-warmLg space-y-4">
            <h3 className="text-base font-bold text-warm-text">
              Reject Quotation {quotation.quotationNumber}
            </h3>
            <p className="text-xs text-warm-textMuted">
              Provide an optional reason for the client rejection.
            </p>
            <Input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Reason for rejection (optional)"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={busyAction === 'reject'}
              >
                Reject Quotation
              </Button>
            </div>
          </div>
        </div>
      )}

      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-warm-surface border border-warm-border p-6 max-w-md w-full shadow-warmLg space-y-4">
            <h3 className="text-base font-bold text-warm-text">
              Cancel Quotation {quotation.quotationNumber}
            </h3>
            <p className="text-xs text-warm-textMuted">
              Provide an optional reason for cancelling this quotation.
            </p>
            <Input
              type="text"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Reason for cancellation (optional)"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCancelDialogOpen(false)}>
                Keep Quotation
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancel}
                disabled={busyAction === 'cancel'}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteDialogOpen && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title="Delete Draft Quotation"
          message={`Are you sure you want to permanently delete draft quotation ${quotation.quotationNumber}? This action cannot be undone.`}
          confirmLabel="Delete"
          isDanger={true}
          isLoading={busyAction === 'delete'}
        />
      )}
    </DashboardLayout>
  );
}
