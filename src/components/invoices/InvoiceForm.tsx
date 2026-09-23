'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { CustomerSelect } from '@/components/customers/CustomerSelect';
import { InvoiceItemsEditor, EditorItem, createEmptyItem, itemsFromInvoice } from './InvoiceItemsEditor';
import { InvoiceTotals } from './InvoiceTotals';
import { computeTotals, isInterState, stripStateCode } from '@/lib/gst';
import { invoicesApi, invoiceSettingsApi, toDateInput } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { Customer } from '@/types/index';
import { Invoice, InvoiceDefaults, InvoiceReferenceData } from '@/types/invoice';
import { cn } from '@/lib/utils';
import { INDIAN_STATES, normalizeStateName } from '@/lib/geo';
import { Save, Send, X, AlertTriangle, MapPin } from 'lucide-react';

/**
 * Create / edit form for an invoice.
 *
 * One component serves both so the two screens cannot drift apart - the only
 * differences are which endpoint it calls and whether line items are locked,
 * both derived from the `invoice` prop rather than duplicated.
 */

export interface InvoiceFormProps {
  /** Present when editing; omitted when creating. */
  invoice?: Invoice;
}

interface FormState {
  customerId: string;
  customerName: string;
  billType: string;
  issueDate: string;
  dueDate: string;
  poNumber: string;
  orderDate: string;
  challanNo: string;
  challanDate: string;
  reference: string;
  modeOfDispatch: string;
  lhNo: string;
  lhDate: string;
  dcNo: string;
  dcDate: string;
  paymentTerms: string;
  placeOfSupply: string;
  isReverseCharge: boolean;
  notes: string;
  terms: string;
  internalNotes: string;
}

const EMPTY_FORM: FormState = {
  customerId: '',
  customerName: '',
  billType: 'TAX_INVOICE',
  issueDate: '',
  dueDate: '',
  poNumber: '',
  orderDate: '',
  challanNo: '',
  challanDate: '',
  reference: '',
  modeOfDispatch: '',
  lhNo: '',
  lhDate: '',
  dcNo: '',
  dcDate: '',
  paymentTerms: '',
  placeOfSupply: '',
  isReverseCharge: false,
  notes: '',
  terms: '',
  internalNotes: ''
};

const BILL_TYPES = [
  { value: 'TAX_INVOICE', label: 'Tax Invoice' },
  { value: 'BILL_OF_SUPPLY', label: 'Bill of Supply' },
  { value: 'DELIVERY_CHALLAN', label: 'Delivery Challan' },
  { value: 'PROFORMA_INVOICE', label: 'Proforma Invoice' }
];

const DISPATCH_MODES = [
  'Road Transport',
  'Courier',
  'Hand Delivery',
  'Air Cargo',
  'Train / Railway',
  'Sea Freight',
  'Customer Pick-Up'
];

const PAYMENT_TERMS_PRESETS = [
  'Immediate',
  'Net 15 Days',
  'Net 30 Days',
  'Net 45 Days',
  'Against Delivery',
  'Advance Payment'
];

export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = Boolean(invoice);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [items, setItems] = useState<EditorItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [defaults, setDefaults] = useState<InvoiceDefaults | null>(null);
  const [reference, setReference] = useState<InvoiceReferenceData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});

  /**
   * Line items are frozen once money has been received: the server rejects the
   * change, so the UI must not invite it.
   */
  const isLocked = isEdit && Number(invoice?.amountPaid ?? 0) > 0;

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const [defaultsData, referenceData] = await Promise.all([
          invoicesApi.defaults(),
          invoiceSettingsApi.referenceData()
        ]);

        if (cancelled) return;

        setDefaults(defaultsData);
        setReference(referenceData);

        if (invoice) {
          setForm({
            customerId: invoice.customerId,
            customerName: invoice.customer?.name ?? invoice.billingName,
            billType: invoice.billType ?? 'TAX_INVOICE',
            issueDate: toDateInput(invoice.issueDate),
            dueDate: toDateInput(invoice.dueDate),
            poNumber: invoice.poNumber ?? '',
            orderDate: toDateInput(invoice.orderDate),
            challanNo: invoice.challanNo ?? '',
            challanDate: toDateInput(invoice.challanDate),
            reference: invoice.reference ?? '',
            modeOfDispatch: invoice.modeOfDispatch ?? '',
            lhNo: invoice.lhNo ?? '',
            lhDate: toDateInput(invoice.lhDate),
            dcNo: invoice.dcNo ?? '',
            dcDate: toDateInput(invoice.dcDate),
            paymentTerms: invoice.paymentTerms ?? '',
            placeOfSupply: invoice.placeOfSupply ?? '',
            isReverseCharge: invoice.isReverseCharge,
            notes: invoice.notes ?? '',
            terms: invoice.terms ?? '',
            internalNotes: invoice.internalNotes ?? ''
          });
          setItems(itemsFromInvoice(invoice.items));
        } else {
          setForm({
            ...EMPTY_FORM,
            issueDate: toDateInput(defaultsData.issueDate),
            dueDate: toDateInput(defaultsData.dueDate),
            notes: defaultsData.notes ?? '',
            terms: defaultsData.terms ?? ''
          });
          setItems([createEmptyItem(defaultsData.defaultTaxRate, defaultsData.defaultUnit)]);
        }
      } catch (error) {
        if (!cancelled) toast.error(apiErrorMessage(error, 'Could not load the invoice form'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const sellerState = defaults?.sellerState ?? null;

  /**
   * The buyer's state: an explicit place of supply wins, otherwise the
   * customer's own state. Mirrors the server so the preview cannot disagree.
   */
  const buyerState = useMemo(() => {
    if (form.placeOfSupply) return stripStateCode(form.placeOfSupply);
    if (selectedCustomer?.state) return selectedCustomer.state;
    if (isEdit && invoice?.billingState) return invoice.billingState;
    return null;
  }, [form.placeOfSupply, selectedCustomer, isEdit, invoice]);

  const isIgst = useMemo(
    () => isInterState(sellerState, buyerState),
    [sellerState, buyerState]
  );

  const totals = useMemo(
    () =>
      computeTotals(
        items.map((item) => ({
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxRate: item.taxRate
        })),
        {
          isIgst,
          enableRoundOff: defaults?.enableRoundOff ?? true,
          gstEnabled: defaults?.gstEnabled ?? true,
          pricesIncludeTax: defaults?.pricesIncludeTax ?? false
        }
      ),
    [items, isIgst, defaults]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCustomerChange = (customerIdOrCustomer: string | Customer | null, maybeCustomer?: Customer | null) => {
    const customer = typeof customerIdOrCustomer === 'string' ? maybeCustomer : customerIdOrCustomer;
    const customerId = typeof customerIdOrCustomer === 'string' ? customerIdOrCustomer : customer?.id ?? '';
    setSelectedCustomer(customer ?? null);
    setForm((prev) => ({
      ...prev,
      customerId,
      customerName: customer?.name ?? '',
      placeOfSupply: customer?.state ? `${customer.state}` : ''
    }));
    if (customerId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.customerId;
        return next;
      });
    }
  };

  /**
   * Updating the issue date slides the due date forward by the company's
   * default terms window, unless the due date was already customised.
   */
  const handleIssueDateChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, issueDate: value };

      if (defaults?.defaultDueDays && value) {
        const issue = new Date(value);
        if (!Number.isNaN(issue.getTime())) {
          issue.setDate(issue.getDate() + defaults.defaultDueDays);
          next.dueDate = issue.toISOString().slice(0, 10);
        }
      }

      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Validation + submit
  // ---------------------------------------------------------------------------

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const rowErrors: Record<number, string> = {};

    if (!form.customerId) errors.customerId = 'Select a customer for this invoice';
    if (!form.issueDate) errors.issueDate = 'Bill date is required';
    if (!form.dueDate) errors.dueDate = 'Due date is required';

    if (form.issueDate && form.dueDate && new Date(form.dueDate) < new Date(form.issueDate)) {
      errors.dueDate = 'Due date cannot be earlier than the bill date';
    }

    items.forEach((item, index) => {
      if (!item.name.trim()) {
        rowErrors[index] = 'Material / Item name is required';
        return;
      }
      if (!(Number(item.quantity) > 0)) {
        rowErrors[index] = 'Quantity must be greater than zero';
        return;
      }
      if (item.unitPrice === '' || Number(item.unitPrice) < 0) {
        rowErrors[index] = 'Enter a valid rate';
        return;
      }
      if (item.hsnSacCode && !/^\d{4,8}$/.test(item.hsnSacCode)) {
        rowErrors[index] = 'HSN/SAC must be 4 to 8 digits';
      }
    });

    setFieldErrors(errors);
    setItemErrors(rowErrors);

    const ok = Object.keys(errors).length === 0 && Object.keys(rowErrors).length === 0;
    if (!ok) toast.error('Please fix the highlighted fields before saving');

    return ok;
  };

  const buildPayload = () => ({
    customerId: form.customerId,
    billType: form.billType,
    issueDate: form.issueDate,
    dueDate: form.dueDate,
    poNumber: form.poNumber.trim(),
    orderDate: form.orderDate || undefined,
    challanNo: form.challanNo.trim(),
    challanDate: form.challanDate || undefined,
    reference: form.reference.trim(),
    modeOfDispatch: form.modeOfDispatch.trim(),
    lhNo: form.lhNo.trim(),
    lhDate: form.lhDate || undefined,
    dcNo: form.dcNo.trim(),
    dcDate: form.dcDate || undefined,
    paymentTerms: form.paymentTerms.trim(),
    placeOfSupply: form.placeOfSupply.trim(),
    isReverseCharge: form.isReverseCharge,
    notes: form.notes.trim(),
    terms: form.terms.trim(),
    internalNotes: form.internalNotes.trim(),
    items: items.map((item) => ({
      productId: item.productId,
      name: item.name.trim(),
      description: item.description.trim(),
      hsnSacCode: item.hsnSacCode.trim(),
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: item.discountPercent ? Number(item.discountPercent) : 0,
      taxRate: item.taxRate ? Number(item.taxRate) : 0
    }))
  });

  const submit = async (status: 'DRAFT' | 'SENT') => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (isEdit && invoice) {
        const payload = buildPayload();

        // A locked invoice may only change its surrounding detail, so the
        // pricing keys are withheld rather than sent and rejected.
        const body = isLocked
          ? {
              billType: payload.billType,
              issueDate: payload.issueDate,
              dueDate: payload.dueDate,
              poNumber: payload.poNumber,
              orderDate: payload.orderDate,
              challanNo: payload.challanNo,
              challanDate: payload.challanDate,
              reference: payload.reference,
              modeOfDispatch: payload.modeOfDispatch,
              lhNo: payload.lhNo,
              lhDate: payload.lhDate,
              dcNo: payload.dcNo,
              dcDate: payload.dcDate,
              paymentTerms: payload.paymentTerms,
              notes: payload.notes,
              terms: payload.terms,
              internalNotes: payload.internalNotes
            }
          : payload;

        await invoicesApi.update(invoice.id, body);
        toast.success('Invoice updated successfully');
        router.push(`/invoices/${invoice.id}?preview=true`);
        return;
      }

      const created = await invoicesApi.create({ ...buildPayload(), status });
      toast.success(
        status === 'SENT' ? 'Invoice created and marked as sent' : 'Invoice saved as draft'
      );
      router.push(`/invoices/${created.id}?preview=true`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save the invoice'));
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
        <LoadingState message="Preparing invoice form..." />
      </div>
    );
  }

  const stateOptions = [
    { value: '', label: buyerState ? `Auto (${stripStateCode(buyerState)})` : 'Auto from customer' },
    ...(reference?.states ?? []).map((state) => ({
      value: `${state.code}-${state.name}`,
      label: `${state.code} — ${state.name}`
    }))
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(isEdit ? 'DRAFT' : 'DRAFT');
      }}
      className="space-y-6"
    >
      {isLocked && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-900">
              This invoice has recorded payments
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Line items and the customer are locked so the reconciled figures stay intact. Delete
              the payments first if you need to re-price it, or issue a credit note instead.
            </p>
          </div>
        </div>
      )}

      {/* 1. Header & General Document Settings */}
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-warm-border/40 pb-3">
          <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            1. Document &amp; Customer Information
          </h2>
          <span className="text-[11px] font-semibold text-warm-accent px-2 py-0.5 bg-warm-accentLight">
            {form.billType.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Bill Type"
            value={form.billType}
            options={BILL_TYPES}
            onChange={(e) => setForm((prev) => ({ ...prev, billType: e.target.value }))}
            helperText="Document classification"
          />

          <Input
            label="Bill No. (Auto Generated)"
            value={isEdit ? invoice?.invoiceNumber ?? '' : defaults?.invoiceNumber ?? ''}
            readOnly
            disabled
            helperText={
              isEdit
                ? 'An issued number never changes.'
                : 'Generated automatically upon save.'
            }
          />

          <Input
            label="Bill Date"
            type="date"
            required
            value={form.issueDate}
            onChange={(e) => handleIssueDateChange(e.target.value)}
            error={fieldErrors.issueDate}
          />

          <Input
            label="Due Date"
            type="date"
            required
            value={form.dueDate}
            min={form.issueDate || undefined}
            onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            error={fieldErrors.dueDate}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          <div className="lg:col-span-2">
            <CustomerSelect
              label="Customer Name / Party"
              required
              value={form.customerId}
              initialLabel={form.customerName}
              onChange={handleCustomerChange}
              disabled={isLocked}
              error={fieldErrors.customerId}
            />
          </div>

          <Select
            label="Place of Supply (State)"
            options={stateOptions}
            value={form.placeOfSupply}
            disabled={isLocked}
            onChange={(e) => setForm((prev) => ({ ...prev, placeOfSupply: e.target.value }))}
            helperText="Overrides destination state for GST calculation."
          />

          {(selectedCustomer || invoice) && (
            <div className="lg:col-span-3 p-3 bg-warm-input/40 border border-warm-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-warm-text font-medium">
                <MapPin className="w-3.5 h-3.5 text-warm-accent shrink-0" />
                <span>
                  <strong>{selectedCustomer?.city || invoice?.billingCity || 'City not set'}</strong>
                  {(selectedCustomer?.state || invoice?.billingState) && (
                    <span className="text-warm-textMuted">, {normalizeStateName(selectedCustomer?.state || invoice?.billingState || '')}</span>
                  )}
                </span>
                {(selectedCustomer?.postalCode || invoice?.billingPostalCode) && (
                  <span className="text-warm-textSubtle text-[11px]">
                    (PIN: {selectedCustomer?.postalCode || invoice?.billingPostalCode})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                {selectedCustomer?.gstin || invoice?.billingGstin ? (
                  <span className="bg-warm-surface px-2 py-0.5 border border-warm-border text-warm-text font-semibold">
                    GSTIN: {selectedCustomer?.gstin || invoice?.billingGstin}
                  </span>
                ) : (
                  <span className="text-warm-textSubtle">Unregistered Buyer</span>
                )}

                {(selectedCustomer?.address || invoice?.billingAddress) && (
                  <span className="text-warm-textMuted truncate max-w-sm">
                    {selectedCustomer?.address || invoice?.billingAddress}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* GST Determination & Seller State Rule */}
          <div className="lg:col-span-3">
            {!sellerState ? (
              <div className="p-3 bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Business State Not Set:</strong> Please configure your home state in Company Settings so the system can determine whether CGST+SGST or IGST applies.
                  </span>
                </div>
                <Link
                  href="/company"
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors shrink-0 shadow-xs"
                >
                  Set Business State
                </Link>
              </div>
            ) : (
              <div className="p-2.5 bg-warm-input/60 border border-warm-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-warm-textMuted">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-warm-text">Seller State:</span>
                  <span className="px-1.5 py-0.5 bg-warm-surface border border-warm-border text-warm-accent font-medium text-[10px]">
                    {normalizeStateName(sellerState)}
                  </span>
                  <span className="text-warm-textSubtle">➔</span>
                  <span className="font-semibold text-warm-text">Place of Supply:</span>
                  <span className="px-1.5 py-0.5 bg-warm-surface border border-warm-border text-warm-text font-medium text-[10px]">
                    {normalizeStateName(buyerState || sellerState)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-warm-textSubtle uppercase text-[10px]">Tax Mode:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 border text-[10px] ${
                      isIgst
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isIgst ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Order, Challan & Dispatch Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Order & Delivery Challan */}
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
          <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider border-b border-warm-border/40 pb-2">
            2. Order &amp; Delivery Challan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Order No. / PO Number"
              value={form.poNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, poNumber: e.target.value }))}
              placeholder="Enter PO number"
            />

            <Input
              label="Order Date"
              type="date"
              value={form.orderDate}
              onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Challan No."
              value={form.challanNo}
              onChange={(e) => setForm((prev) => ({ ...prev, challanNo: e.target.value }))}
              placeholder="Enter Challan number"
            />

            <Input
              label="Challan Date"
              type="date"
              value={form.challanDate}
              onChange={(e) => setForm((prev) => ({ ...prev, challanDate: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Your D.C. No."
              value={form.dcNo}
              onChange={(e) => setForm((prev) => ({ ...prev, dcNo: e.target.value }))}
              placeholder="Enter delivery challan number"
            />

            <Input
              label="Your D.C. Date"
              type="date"
              value={form.dcDate}
              onChange={(e) => setForm((prev) => ({ ...prev, dcDate: e.target.value }))}
            />
          </div>

          <Input
            label="Internal / Quote Reference"
            value={form.reference}
            onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
            placeholder="Enter quote or internal reference"
          />
        </div>

        {/* Dispatch & Logistics */}
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
          <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider border-b border-warm-border/40 pb-2">
            3. Dispatch &amp; Logistics
          </h2>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1.5 uppercase tracking-wide">
              Mode of Dispatch
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={form.modeOfDispatch}
                onChange={(e) => setForm((prev) => ({ ...prev, modeOfDispatch: e.target.value }))}
                placeholder="Enter mode of dispatch"
                className="w-full px-3 py-2 bg-warm-input border border-warm-border text-warm-text text-sm rounded-none focus:outline-none focus:border-warm-accent"
              />
              <div className="flex flex-wrap gap-1.5">
                {DISPATCH_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, modeOfDispatch: mode }))}
                    className={cn(
                      'px-2 py-0.5 text-[11px] border transition-colors',
                      form.modeOfDispatch === mode
                        ? 'bg-warm-accent text-white border-warm-accent font-medium'
                        : 'bg-warm-surface text-warm-textMuted border-warm-border hover:border-warm-accent/50'
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="L.H. / L.R. No."
              value={form.lhNo}
              onChange={(e) => setForm((prev) => ({ ...prev, lhNo: e.target.value }))}
              placeholder="Enter LR or transporter receipt number"
            />

            <Input
              label="L.H. Date"
              type="date"
              value={form.lhDate}
              onChange={(e) => setForm((prev) => ({ ...prev, lhDate: e.target.value }))}
            />
          </div>

          {(defaults?.enableReverseCharge ?? true) && (defaults?.gstEnabled ?? true) && (
            <div className="pt-2 border-t border-warm-border/40">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isReverseCharge}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isReverseCharge: e.target.checked }))
                  }
                  className="w-4 h-4 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                />
                <span className="text-xs font-medium text-warm-text">
                  Tax Payable on Reverse Charge (RCM)
                </span>
              </label>
              <p className="text-[11px] text-warm-textSubtle ml-6 mt-0.5">
                Check if the recipient is liable to pay tax under GST reverse charge mechanism.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Material & Service Items */}
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-warm-border/40 pb-3">
          <div>
            <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              4. Material Description &amp; Line Items
            </h2>
            <p className="text-xs text-warm-textMuted mt-0.5">
              Material description, HSN / SAC code, quantity, units, rate, discount and GST %
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-semibold uppercase border tracking-wider',
                isIgst
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              )}
            >
              {isIgst ? 'IGST Applicable (Inter-State)' : 'CGST + SGST (Intra-State)'}
            </span>
          </div>
        </div>

        <InvoiceItemsEditor
          items={items}
          onChange={setItems}
          isIgst={isIgst}
          defaultTaxRate={defaults?.defaultTaxRate ?? 18}
          gstRates={reference?.gstRates ?? [0, 5, 12, 18, 28]}
          units={reference?.units ?? ['PCS', 'BOX', 'KGS', 'MTR', 'NOS', 'SET', 'UNIT', 'BAG']}
          showHsn={defaults?.showHsnColumn ?? true}
          showDiscount={defaults?.showDiscount ?? true}
          pricesIncludeTax={defaults?.pricesIncludeTax ?? false}
          disabled={isLocked}
          errors={itemErrors}
        />
      </div>

      {/* 5. Payment Terms, Notes & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
          <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider border-b border-warm-border/40 pb-2">
            5. Payment Terms &amp; Notes
          </h2>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1.5 uppercase tracking-wide">
              Payment Terms
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={form.paymentTerms}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="Enter payment terms"
                className="w-full px-3 py-2 bg-warm-input border border-warm-border text-warm-text text-sm rounded-none focus:outline-none focus:border-warm-accent"
              />
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_TERMS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, paymentTerms: preset }))}
                    className={cn(
                      'px-2 py-0.5 text-[11px] border transition-colors',
                      form.paymentTerms === preset
                        ? 'bg-warm-accent text-white border-warm-accent font-medium'
                        : 'bg-warm-surface text-warm-textMuted border-warm-border hover:border-warm-accent/50'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Textarea
            label="Terms & Conditions"
            value={form.terms}
            onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.value }))}
            placeholder="Enter terms and conditions"
            className="min-h-[70px]"
          />

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Enter invoice notes for customer"
            className="min-h-[60px]"
          />

          <Textarea
            label="Internal Notes (Private)"
            value={form.internalNotes}
            onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
            placeholder="Enter private internal notes"
            className="min-h-[50px]"
            helperText="Will not be printed on invoice or seen by customer."
          />
        </div>

        <InvoiceTotals totals={totals} isIgst={isIgst} className="h-fit" />
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pb-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSaving}
          leftIcon={<X className="w-4 h-4" />}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => submit('DRAFT')}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          {isEdit ? 'Save Changes' : 'Save as Draft'}
        </Button>

        {!isEdit && (
          <Button
            type="button"
            onClick={() => submit('SENT')}
            isLoading={isSaving}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Save &amp; Mark Sent
          </Button>
        )}
      </div>
    </form>
  );
}
