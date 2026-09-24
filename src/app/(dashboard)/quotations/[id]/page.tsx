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
  Truck
} from 'lucide-react';

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params?.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Modals & Action states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reasonInput, setReasonInput] = useState('');

  const fetchQuotation = useCallback(async () => {
    if (!quotationId) return;
    setIsLoading(true);
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
    fetchQuotation();
  }, [fetchQuotation]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
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
      await quotationsApi.send(quotation.id);
      toast.success(`Quotation ${quotation.quotationNumber} marked as Sent`);
      fetchQuotation();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to mark as sent'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleAccept = async () => {
    setBusyAction('accept');
    try {
      await quotationsApi.accept(quotation.id);
      toast.success(`Quotation ${quotation.quotationNumber} marked as Accepted`);
      fetchQuotation();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to accept quotation'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleReject = async () => {
    setBusyAction('reject');
    try {
      await quotationsApi.reject(quotation.id, reasonInput);
      toast.success(`Quotation ${quotation.quotationNumber} marked as Rejected`);
      setRejectDialogOpen(false);
      setReasonInput('');
      fetchQuotation();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reject quotation'));
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancel = async () => {
    setBusyAction('cancel');
    try {
      await quotationsApi.cancel(quotation.id, reasonInput);
      toast.success(`Quotation ${quotation.quotationNumber} Cancelled`);
      setCancelDialogOpen(false);
      setReasonInput('');
      fetchQuotation();
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
      <div className="space-y-5 pb-16">
        {/* Page Header with Breadcrumbs & Top Status / Quick Edit */}
        <PageHeader
          title={`Quotation ${quotation.quotationNumber}`}
          description={`Created on ${formatDate(quotation.quotationDate)} for ${quotation.billingName}`}
          breadcrumbs={[
            { label: 'Sales', href: '/quotations' },
            { label: 'Quotations', href: '/quotations' },
            { label: quotation.quotationNumber }
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <QuotationStatusBadge status={quotation.status} size="md" />
              {isDraft && (
                <Link href={`/quotations/${quotation.id}/edit`}>
                  <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          }
        />

        {/* Converted to Invoice Banner */}
        {isConverted && quotation.convertedInvoiceId && (
          <div className="flex items-center justify-between gap-4 p-4 bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-none bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950">
                  Converted to Tax Invoice
                  {quotation.convertedInvoice?.invoiceNumber
                    ? ` — ${quotation.convertedInvoice.invoiceNumber}`
                    : ''}
                </p>
                <p className="text-[11px] text-purple-800 mt-0.5">
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
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200">
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
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-900">This quotation was rejected by client</p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                {quotation.rejectionReason
                  ? `Reason: ${quotation.rejectionReason}`
                  : 'Client did not proceed with this estimate.'}
              </p>
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Send */}
          {isDraft && (
            <Button
              size="sm"
              onClick={handleSend}
              isLoading={busyAction === 'send'}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="bg-warm-accent hover:bg-warm-accent-hover text-white font-semibold shadow-xs"
            >
              Mark as Sent
            </Button>
          )}

          {/* Accept */}
          {isSent && (
            <Button
              size="sm"
              onClick={handleAccept}
              isLoading={busyAction === 'accept'}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              Accept Quotation
            </Button>
          )}

          {/* Reject */}
          {isSent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectDialogOpen(true);
                setReasonInput('');
              }}
              leftIcon={<XCircle className="w-3.5 h-3.5 text-red-600" />}
              className="bg-warm-surface border-red-200 text-red-700 hover:bg-red-50"
            >
              Reject
            </Button>
          )}

          {/* Convert to Invoice */}
          {isAccepted && (
            <Button
              size="sm"
              onClick={() => setConvertDialogOpen(true)}
              isLoading={busyAction === 'convert'}
              leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
              className="bg-purple-700 hover:bg-purple-800 text-white font-semibold shadow-xs"
            >
              Convert to Invoice
            </Button>
          )}

          {/* Preview PDF */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
            className="bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 border-blue-200/80 font-medium shadow-2xs"
          >
            Preview PDF
          </Button>

          {/* Print */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePdf('print')}
            isLoading={busyAction === 'print'}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print
          </Button>

          {/* Download PDF */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePdf('download')}
            isLoading={busyAction === 'download'}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download PDF
          </Button>

          {/* Duplicate */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            isLoading={busyAction === 'duplicate'}
            leftIcon={<Copy className="w-3.5 h-3.5" />}
          >
            Duplicate
          </Button>

          {/* Cancel */}
          {(isDraft || isSent || isAccepted) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCancelDialogOpen(true);
                setReasonInput('');
              }}
              leftIcon={<Ban className="w-3.5 h-3.5" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Cancel Quotation
            </Button>
          )}

          {/* Delete (Draft only) */}
          {isDraft && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
            >
              Delete Draft
            </Button>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left 2 Cols: Party Snapshot, Documents, Line Items & Terms */}
          <div className="lg:col-span-2 space-y-5">
            {/* Parties + Document References Card */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-warm-border/50">
                {/* Bill To Customer */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 className="w-3.5 h-3.5 text-warm-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                      Customer (M/S) Snapshot
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-warm-text">
                    {quotation.billingName}
                  </p>

                  <div className="mt-1.5 space-y-0.5">
                    {billingLines.map((line, index) => (
                      <p key={index} className="text-[11px] text-warm-textMuted leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>

                  {quotation.billingGstin && (
                    <p className="text-[11px] font-semibold text-warm-text mt-2 font-mono">
                      GSTIN: {quotation.billingGstin}
                    </p>
                  )}

                  {(quotation.billingPhone || quotation.billingEmail) && (
                    <div className="mt-2 text-[11px] text-warm-textSubtle space-y-0.5">
                      {quotation.billingPhone && <p>Phone: {quotation.billingPhone}</p>}
                      {quotation.billingEmail && <p>Email: {quotation.billingEmail}</p>}
                    </div>
                  )}
                </div>

                {/* Document & Tax Details */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Receipt className="w-3.5 h-3.5 text-warm-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                      Document &amp; Quotation Details
                    </span>
                  </div>

                  <dl className="space-y-1.5">
                    {[
                      ['Quotation No.', quotation.quotationNumber],
                      ['Quotation Date', formatDate(quotation.quotationDate)],
                      ['Valid Until', quotation.validUntil ? formatDate(quotation.validUntil) : '—'],
                      ...(quotation.inquiryNumber ? [['Inquiry No.', quotation.inquiryNumber]] : []),
                      ...(quotation.inquiryDate ? [['Inquiry Date', formatDate(quotation.inquiryDate)]] : []),
                      ...(quotation.referenceNumber ? [['Ref. No.', quotation.referenceNumber]] : []),
                      ['Place of Supply', quotation.placeOfSupply || '—'],
                      ['Supply Type', quotation.isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'],
                      ['Financial Year', quotation.financialYear || '—']
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex items-start justify-between gap-3">
                        <dt className="text-[11px] text-warm-textMuted">{label as string}</dt>
                        <dd className="text-[11px] font-semibold text-warm-text text-right">
                          {value as string}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              {/* Subject & Payment Terms Strip */}
              {(quotation.subject || quotation.paymentTerms || Number(quotation.forwardingPackagingAmount) > 0) && (
                <div className="border-t border-warm-border/50 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-warm-border/50 bg-warm-input/30">
                  {/* Subject */}
                  <div className="p-4 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle mb-1">
                      Subject / Scope
                    </p>
                    <p className="text-[11px] font-medium text-warm-text leading-relaxed">
                      {quotation.subject || '—'}
                    </p>
                  </div>

                  {/* Payment & Logistics Terms */}
                  <div className="p-4 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle mb-1">
                      Commercial Terms
                    </p>
                    <div className="space-y-1 text-[11px]">
                      {quotation.paymentTerms && (
                        <div className="flex items-center justify-between">
                          <span className="text-warm-textMuted">Payment Terms:</span>
                          <span className="font-semibold text-warm-accent">{quotation.paymentTerms}</span>
                        </div>
                      )}
                      {Number(quotation.forwardingPackagingAmount) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-warm-textMuted">Forwarding &amp; Packaging:</span>
                          <span className="font-semibold text-warm-text">
                            {formatCurrency(Number(quotation.forwardingPackagingAmount))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Line items Table */}
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
              <div className="px-4 py-3 border-b border-warm-border/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-warm-text tracking-tight">
                  Line Items
                  <span className="ml-2 text-[11px] font-normal text-warm-textMuted">
                    {quotation.items.length} item{quotation.items.length === 1 ? '' : 's'}
                  </span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left border-collapse">
                  <thead className="bg-warm-input/70 border-b border-warm-border/80">
                    <tr className="text-[10px] font-semibold uppercase tracking-wider text-warm-textMuted">
                      <th className="py-2.5 px-4 w-8">#</th>
                      <th className="py-2.5 px-3">Item &amp; Description</th>
                      <th className="py-2.5 px-3 w-24">HSN/SAC</th>
                      <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                      <th className="py-2.5 px-3 w-20">Unit</th>
                      <th className="py-2.5 px-3 w-28 text-right">Rate</th>
                      <th className="py-2.5 px-3 w-20 text-right">GST %</th>
                      <th className="py-2.5 px-4 w-28 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-border/40 text-xs">
                    {quotation.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-warm-input/20">
                        <td className="py-2.5 px-4 text-warm-textMuted">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-warm-text">{item.name}</p>
                          {item.description && (
                            <p className="text-[11px] text-warm-textMuted mt-0.5 leading-snug">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-warm-textMuted">{item.hsnSacCode || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-warm-text tabular-nums">
                          {Number(item.quantity)}
                        </td>
                        <td className="py-2.5 px-3 text-warm-textMuted">{item.unit}</td>
                        <td className="py-2.5 px-3 text-right text-warm-text tabular-nums">
                          {formatCurrency(Number(item.rate))}
                        </td>
                        <td className="py-2.5 px-3 text-right text-warm-textMuted">
                          {Number(item.taxRate)}%
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-warm-text tabular-nums">
                          {formatCurrency(Number(item.quantity) * Number(item.rate))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms & Conditions & Notes */}
            {(quotation.termsAndConditions || quotation.notes) && (
              <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
                {quotation.termsAndConditions && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1.5">
                      Terms &amp; Conditions
                    </h4>
                    <p className="text-xs text-warm-textSubtle whitespace-pre-line leading-relaxed">
                      {quotation.termsAndConditions}
                    </p>
                  </div>
                )}

                {quotation.notes && (
                  <div className={cn(quotation.termsAndConditions && 'pt-3 border-t border-warm-border/50')}>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1.5">
                      Notes
                    </h4>
                    <p className="text-xs text-warm-textSubtle whitespace-pre-line leading-relaxed">
                      {quotation.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right 1 Col: Summary Totals & Activity Audit Timeline */}
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

            {/* Activity History Feed */}
            <QuotationActivityFeed activities={quotation.activities || []} />
          </div>
        </div>
      </div>

      {/* Preview PDF Modal */}
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

      {/* Convert to Invoice Confirmation Dialog */}
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

      {/* Reject Modal */}
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
              placeholder="e.g. Price negotiation or budget constraints..."
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

      {/* Cancel Modal */}
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
              placeholder="e.g. Cancelled by customer request..."
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

      {/* Delete Confirmation */}
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
