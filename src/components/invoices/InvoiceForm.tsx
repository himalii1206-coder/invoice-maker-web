'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Save, Send, X, Info, MapPin, AlertTriangle } from 'lucide-react';

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
  issueDate: string;
  dueDate: string;
  poNumber: string;
  reference: string;
  placeOfSupply: string;
  isReverseCharge: boolean;
  notes: string;
  terms: string;
  internalNotes: string;
}

const EMPTY_FORM: FormState = {
  customerId: '',
  customerName: '',
  issueDate: '',
  dueDate: '',
  poNumber: '',
  reference: '',
  placeOfSupply: '',
  isReverseCharge: false,
  notes: '',
  terms: '',
  internalNotes: ''
};

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
            issueDate: toDateInput(invoice.issueDate),
            dueDate: toDateInput(invoice.dueDate),
            poNumber: invoice.poNumber ?? '',
            reference: invoice.reference ?? '',
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
          setItems([createEmptyItem(defaultsData.defaultTaxRate)]);
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
        { isIgst, enableRoundOff: defaults?.enableRoundOff ?? true }
      ),
    [items, isIgst, defaults]
  );

  const handleCustomerChange = useCallback(
    (customerId: string, customer: Customer | null) => {
      setSelectedCustomer(customer);
      setForm((prev) => ({
        ...prev,
        customerId,
        customerName: customer?.name ?? '',
        // An explicit override is cleared so the new customer's state applies.
        placeOfSupply: ''
      }));
      setFieldErrors((prev) => ({ ...prev, customerId: '' }));
    },
    []
  );

  /** Re-derives the due date when the issue date moves, if it was untouched. */
  const handleIssueDateChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, issueDate: value };

      if (!isEdit && defaults && value) {
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
    if (!form.issueDate) errors.issueDate = 'Issue date is required';
    if (!form.dueDate) errors.dueDate = 'Due date is required';

    if (form.issueDate && form.dueDate && new Date(form.dueDate) < new Date(form.issueDate)) {
      errors.dueDate = 'Due date cannot be earlier than the issue date';
    }

    items.forEach((item, index) => {
      if (!item.name.trim()) {
        rowErrors[index] = 'Item name is required';
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
    issueDate: form.issueDate,
    dueDate: form.dueDate,
    poNumber: form.poNumber.trim(),
    reference: form.reference.trim(),
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
              issueDate: payload.issueDate,
              dueDate: payload.dueDate,
              poNumber: payload.poNumber,
              reference: payload.reference,
              notes: payload.notes,
              terms: payload.terms,
              internalNotes: payload.internalNotes
            }
          : payload;

        await invoicesApi.update(invoice.id, body);
        toast.success('Invoice updated successfully');
        router.push(`/invoices/${invoice.id}`);
        return;
      }

      const created = await invoicesApi.create({ ...buildPayload(), status });
      toast.success(
        status === 'SENT' ? 'Invoice created and marked as sent' : 'Invoice saved as draft'
      );
      router.push(`/invoices/${created.id}`);
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
      className="space-y-5"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Customer + document meta */}
        <div className="lg:col-span-2 bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomerSelect
              label="Customer"
              required
              value={form.customerId}
              initialLabel={form.customerName}
              onChange={handleCustomerChange}
              disabled={isLocked}
              error={fieldErrors.customerId}
            />

            <Input
              label="Invoice Number"
              value={isEdit ? invoice?.invoiceNumber ?? '' : defaults?.invoiceNumber ?? ''}
              readOnly
              disabled
              helperText={
                isEdit
                  ? 'An issued number never changes.'
                  : 'Generated automatically when you save.'
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Issue Date"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="PO Number"
              value={form.poNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, poNumber: e.target.value }))}
              placeholder="Customer purchase order"
            />

            <Input
              label="Reference"
              value={form.reference}
              onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
              placeholder="Quote or project reference"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Place of Supply"
              options={stateOptions}
              value={form.placeOfSupply}
              disabled={isLocked}
              onChange={(e) => setForm((prev) => ({ ...prev, placeOfSupply: e.target.value }))}
              helperText="Overrides the customer's state for GST."
            />

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isReverseCharge}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isReverseCharge: e.target.checked }))
                  }
                  className="w-4 h-4 accent-warm-accent cursor-pointer"
                />
                <span className="text-xs font-medium text-warm-text">
                  Reverse charge applicable
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Supply context - explains the tax split before the user scrolls to it. */}
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-warm-text tracking-tight">Tax Treatment</h3>

          <div
            className={cn(
              'p-3 border',
              isIgst ? 'bg-blue-50 border-blue-200' : 'bg-warm-accentLight/50 border-warm-border'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin className={cn('w-3.5 h-3.5', isIgst ? 'text-blue-600' : 'text-warm-accent')} />
              <span
                className={cn(
                  'text-[11px] font-bold uppercase tracking-wider',
                  isIgst ? 'text-blue-700' : 'text-warm-accent'
                )}
              >
                {isIgst ? 'Inter-State' : 'Intra-State'}
              </span>
            </div>
            <p className="text-[11px] text-warm-textMuted leading-relaxed">
              {isIgst
                ? 'IGST is charged at the full rate on every line.'
                : 'GST is split equally into CGST and SGST on every line.'}
            </p>
          </div>

          <dl className="space-y-2 text-[11px]">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-warm-textMuted">Your State</dt>
              <dd className="font-semibold text-warm-text text-right">
                {sellerState || <span className="text-amber-700">Not set</span>}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-warm-textMuted">Place of Supply</dt>
              <dd className="font-semibold text-warm-text text-right">
                {buyerState ? stripStateCode(buyerState) : '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-warm-textMuted">Customer GSTIN</dt>
              <dd className="font-semibold text-warm-text text-right font-mono">
                {selectedCustomer?.gstin || invoice?.billingGstin || '—'}
              </dd>
            </div>
          </dl>

          {!sellerState && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-px" />
              <p className="text-[10px] text-amber-800 leading-relaxed">
                Set your business state in Company Profile so GST can be split correctly.
              </p>
            </div>
          )}
        </div>
      </div>

      <InvoiceItemsEditor
        items={items}
        onChange={setItems}
        isIgst={isIgst}
        customerId={form.customerId}
        defaultTaxRate={defaults?.defaultTaxRate ?? 18}
        gstRates={reference?.gstRates ?? [0, 5, 12, 18, 28]}
        units={reference?.units ?? ['PCS']}
        showHsn={defaults?.showHsnColumn ?? true}
        showDiscount={defaults?.showDiscount ?? true}
        disabled={isLocked}
        errors={itemErrors}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-4">
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Visible to the customer on the invoice"
            className="min-h-[70px]"
          />

          <Textarea
            label="Terms & Conditions"
            value={form.terms}
            onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.value }))}
            placeholder="Payment terms, late fees, warranty..."
            className="min-h-[70px]"
          />

          <Textarea
            label="Internal Notes"
            value={form.internalNotes}
            onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
            placeholder="Private — never shown to the customer or printed"
            className="min-h-[60px]"
            helperText="Only your team can see this."
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
