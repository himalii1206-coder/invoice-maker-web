'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { InvoiceTotals } from '@/components/invoices/InvoiceTotals';
import { InvoiceActivityFeed } from '@/components/invoices/InvoiceActivityFeed';
import { RecordPaymentModal } from '@/components/invoices/RecordPaymentModal';
import { SendInvoiceModal } from '@/components/invoices/SendInvoiceModal';
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
  Mail,
  BellRing,
  Ban,
  Send,
  Plus,
  Trash2,
  Building2,
  Receipt,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params?.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<'invoice' | 'reminder' | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data
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

  /** Refreshes the record and the trail together after any action. */
  const refresh = useCallback(async () => {
    await load();
    setActivityKey((key) => key + 1);
  }, [load]);

  // Totals are rebuilt from the saved line items, so the detail view uses the
  // same summary component - and the same arithmetic - as the form.
  const totals = useMemo(() => {
    if (!invoice) return null;

    return computeTotals(
      invoice.items.map((item) => ({
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        discountPercent: toNumber(item.discountPercent),
        taxRate: toNumber(item.taxRate)
      })),
      { isIgst: invoice.isIgst, enableRoundOff: toNumber(invoice.roundOff) !== 0 }
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
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading invoice..." />
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

  const balanceDue = toNumber(invoice.balanceDue);
  const isCancelled = invoice.status === 'CANCELLED';
  const isDraft = invoice.status === 'DRAFT';
  const canReceivePayment = !isCancelled && !isDraft && balanceDue > 0;

  const billingLines = [
    invoice.billingAddress,
    [invoice.billingCity, invoice.billingState, invoice.billingPostalCode]
      .filter(Boolean)
      .join(', '),
    invoice.billingCountry,
    invoice.billingPhone,
    invoice.billingEmail
  ].filter(Boolean) as string[];

  return (
    <DashboardLayout>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.billingName} · Issued ${formatDate(invoice.issueDate)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices', href: '/invoices' },
          { label: invoice.invoiceNumber }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} size="md" />
            {!isCancelled && (
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-3.5 h-3.5" />}>
                  Edit
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {isCancelled && (
        <div className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-200">
          <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-900">This invoice was cancelled</p>
            <p className="text-[11px] text-red-800 mt-0.5 leading-relaxed">
              {invoice.cancelledReason
                ? `Reason: ${invoice.cancelledReason}`
                : 'It stays on record so its number is never reused, but no longer counts towards receivables.'}
            </p>
          </div>
        </div>
      )}

      {invoice.status === 'OVERDUE' && (
        <div className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-900">
              Payment overdue since {formatDate(invoice.dueDate)}
            </p>
            <p className="text-[11px] text-red-800 mt-0.5">
              {formatCurrency(balanceDue)} is still outstanding.
            </p>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setEmailMode('reminder')}
            leftIcon={<BellRing className="w-3.5 h-3.5" />}
          >
            Send Reminder
          </Button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {isDraft && (
          <Button
            size="sm"
            onClick={handleMarkSent}
            isLoading={busyAction === 'send'}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Mark as Sent
          </Button>
        )}

        {canReceivePayment && (
          <Button
            size="sm"
            onClick={() => setIsPaymentOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Record Payment
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => handlePdf('print')}
          isLoading={busyAction === 'print'}
          leftIcon={<Printer className="w-3.5 h-3.5" />}
        >
          Print
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => handlePdf('download')}
          isLoading={busyAction === 'download'}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Download PDF
        </Button>

        {!isCancelled && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEmailMode('invoice')}
            leftIcon={<Mail className="w-3.5 h-3.5" />}
          >
            Email
          </Button>
        )}

        {!isCancelled && !isDraft && balanceDue > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEmailMode('reminder')}
            leftIcon={<BellRing className="w-3.5 h-3.5" />}
          >
            Remind
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleDuplicate}
          isLoading={busyAction === 'duplicate'}
          leftIcon={<Copy className="w-3.5 h-3.5" />}
        >
          Duplicate
        </Button>

        {!isCancelled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCancelOpen(true)}
            leftIcon={<Ban className="w-3.5 h-3.5" />}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Cancel Invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Parties + supply + dispatch */}
          <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-warm-border/50">
              <div className="p-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 className="w-3.5 h-3.5 text-warm-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                    Bill To (Customer)
                  </span>
                </div>

                <Link
                  href={`/customers`}
                  className="text-sm font-semibold text-warm-text hover:text-warm-accent transition-colors"
                >
                  {invoice.billingName}
                </Link>

                <div className="mt-1.5 space-y-0.5">
                  {billingLines.map((line, index) => (
                    <p key={index} className="text-[11px] text-warm-textMuted leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
                {invoice.billingGstin && (
                  <p className="text-[11px] font-semibold text-warm-text mt-2">
                    GSTIN: {invoice.billingGstin}
                  </p>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Receipt className="w-3.5 h-3.5 text-warm-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent">
                    Document &amp; Tax Details
                  </span>
                </div>

                <dl className="space-y-1.5">
                  {[
                    ['Bill Type', (invoice.billType || 'TAX_INVOICE').replace(/_/g, ' ')],
                    ['Bill Date', formatDate(invoice.issueDate)],
                    ['Due Date', formatDate(invoice.dueDate)],
                    ['Place of Supply', invoice.placeOfSupply || '—'],
                    [
                      'Supply Type',
                      invoice.isIgst ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'
                    ],
                    ['Financial Year', invoice.financialYear || '—'],
                    ...(invoice.isReverseCharge ? [['Reverse Charge', 'Applicable']] : [])
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

            {/* Additional Order, DC & Dispatch details row */}
            {(invoice.poNumber ||
              invoice.orderDate ||
              invoice.challanNo ||
              invoice.challanDate ||
              invoice.dcNo ||
              invoice.dcDate ||
              invoice.modeOfDispatch ||
              invoice.lhNo ||
              invoice.lhDate ||
              invoice.paymentTerms) && (
              <div className="border-t border-warm-border/50 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-warm-border/50 bg-warm-input/30">
                <div className="p-4 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle mb-2">
                    Order &amp; Delivery Challan
                  </p>
                  <div className="space-y-1">
                    {invoice.poNumber && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Order / PO No:</span>
                        <span className="font-semibold text-warm-text">{invoice.poNumber}</span>
                      </div>
                    )}
                    {invoice.orderDate && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Order Date:</span>
                        <span className="font-semibold text-warm-text">
                          {formatDate(invoice.orderDate)}
                        </span>
                      </div>
                    )}
                    {invoice.challanNo && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Challan No:</span>
                        <span className="font-semibold text-warm-text">{invoice.challanNo}</span>
                      </div>
                    )}
                    {invoice.challanDate && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Challan Date:</span>
                        <span className="font-semibold text-warm-text">
                          {formatDate(invoice.challanDate)}
                        </span>
                      </div>
                    )}
                    {invoice.dcNo && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Your D.C. No:</span>
                        <span className="font-semibold text-warm-text">{invoice.dcNo}</span>
                      </div>
                    )}
                    {invoice.dcDate && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Your D.C. Date:</span>
                        <span className="font-semibold text-warm-text">
                          {formatDate(invoice.dcDate)}
                        </span>
                      </div>
                    )}
                    {invoice.reference && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Reference:</span>
                        <span className="text-warm-text">{invoice.reference}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle mb-2">
                    Dispatch &amp; Payment Terms
                  </p>
                  <div className="space-y-1">
                    {invoice.modeOfDispatch && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Mode of Dispatch:</span>
                        <span className="font-semibold text-warm-text">
                          {invoice.modeOfDispatch}
                        </span>
                      </div>
                    )}
                    {invoice.lhNo && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">LH No (LR No):</span>
                        <span className="font-semibold text-warm-text">{invoice.lhNo}</span>
                      </div>
                    )}
                    {invoice.lhDate && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">LH Date:</span>
                        <span className="font-semibold text-warm-text">
                          {formatDate(invoice.lhDate)}
                        </span>
                      </div>
                    )}
                    {invoice.paymentTerms && (
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="text-warm-textMuted">Payment Terms:</span>
                        <span className="font-semibold text-warm-accent">
                          {invoice.paymentTerms}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
            <div className="px-4 py-3 border-b border-warm-border/50">
              <h3 className="text-sm font-semibold text-warm-text tracking-tight">
                Line Items
                <span className="ml-2 text-[11px] font-normal text-warm-textMuted">
                  {invoice.items.length} item{invoice.items.length === 1 ? '' : 's'}
                </span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead className="bg-warm-input/70 border-b border-warm-border/80">
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-warm-textMuted">
                    <th className="py-2.5 px-4">Item</th>
                    <th className="py-2.5 px-3">HSN/SAC</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Taxable</th>
                    <th className="py-2.5 px-3 text-right">GST</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-warm-border/40">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-warm-text">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-warm-textSubtle mt-0.5 max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-warm-textMuted">
                          {item.hsnSacCode || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-xs text-warm-text tabular-nums">
                          {toNumber(item.quantity)}
                        </span>
                        <span className="block text-[10px] text-warm-textSubtle">{item.unit}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-xs text-warm-text tabular-nums">
                          {formatCurrency(toNumber(item.unitPrice))}
                        </span>
                        {toNumber(item.discountPercent) > 0 && (
                          <span className="block text-[10px] text-warm-textSubtle">
                            -{toNumber(item.discountPercent)}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-xs text-warm-text tabular-nums">
                          {formatCurrency(toNumber(item.taxableAmount))}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-xs text-warm-text tabular-nums">
                          {formatCurrency(toNumber(item.taxAmount))}
                        </span>
                        <span className="block text-[10px] text-warm-textSubtle">
                          @ {toNumber(item.taxRate)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs font-semibold text-warm-text tabular-nums">
                          {formatCurrency(toNumber(item.total))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments */}
          <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-warm-border/50">
              <h3 className="text-sm font-semibold text-warm-text tracking-tight">
                Payments
                <span className="ml-2 text-[11px] font-normal text-warm-textMuted">
                  {formatCurrency(toNumber(invoice.amountPaid))} received
                </span>
              </h3>

              {canReceivePayment && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add
                </Button>
              )}
            </div>

            {invoice.payments.length === 0 ? (
              <p className="text-xs text-warm-textMuted text-center py-8">
                No payments recorded against this invoice yet.
              </p>
            ) : (
              <ul className="divide-y divide-warm-border/40">
                {invoice.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-warm-text">
                        {formatCurrency(toNumber(payment.amount))}
                        <span className="ml-2 font-normal text-warm-textMuted">
                          via {PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                        </span>
                      </p>
                      <p className="text-[11px] text-warm-textSubtle mt-0.5 truncate">
                        {formatDate(payment.paymentDate)}
                        {payment.referenceNumber && ` · Ref ${payment.referenceNumber}`}
                        {payment.notes && ` · ${payment.notes}`}
                      </p>
                    </div>

                    {!isCancelled && (
                      <button
                        title="Remove payment"
                        onClick={() => setDeletingPaymentId(payment.id)}
                        className="p-1.5 shrink-0 text-warm-textMuted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Notes and terms */}
          {(invoice.notes || invoice.terms || invoice.internalNotes) && (
            <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
              {invoice.notes && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                    Notes
                  </p>
                  <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              )}

              {invoice.terms && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-accent mb-1">
                    Terms &amp; Conditions
                  </p>
                  <p className="text-xs text-warm-textMuted leading-relaxed whitespace-pre-line">
                    {invoice.terms}
                  </p>
                </div>
              )}

              {invoice.internalNotes && (
                <div className="pt-3 border-t border-dashed border-warm-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-warm-textSubtle mb-1">
                    Internal Notes · not printed
                  </p>
                  <p className="text-xs text-warm-textSubtle leading-relaxed whitespace-pre-line">
                    {invoice.internalNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <InvoiceTotals
            totals={totals}
            isIgst={invoice.isIgst}
            amountPaid={toNumber(invoice.amountPaid)}
            creditNoteTotal={toNumber(invoice.creditNoteTotal)}
            debitNoteTotal={toNumber(invoice.debitNoteTotal)}
            balanceDue={balanceDue}
          />

          <InvoiceActivityFeed invoiceId={invoice.id} refreshKey={activityKey} />

          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-textMuted hover:text-warm-accent transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to all invoices
          </Link>
        </div>
      </div>

      {/* Modals */}
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
