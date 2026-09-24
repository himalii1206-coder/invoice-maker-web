'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { CustomerSelect } from '@/components/customers/CustomerSelect';
import {
  QuotationItemsEditor,
  QuotationEditorItem,
  createEmptyQuotationItem
} from './QuotationItemsEditor';
import { QuotationTotals } from './QuotationTotals';
import { QuotationPreviewModal } from './QuotationPreviewModal';
import { quotationsApi } from '@/lib/quotations';
import { invoiceSettingsApi, toDateInput } from '@/lib/invoices';
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { Customer } from '@/types/index';
import { Quotation, QuotationPayload } from '@/types/quotation';
import { INDIAN_STATES, normalizeStateName } from '@/lib/geo';
import { cn, formatGstin } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Save, Send, Eye, X, ArrowLeft, FileSpreadsheet } from 'lucide-react';

export interface QuotationFormProps {
  quotation?: Quotation;
}

const PAYMENT_TERMS_PRESETS = [
  '50% Advance',
  '100% Advance',
  '30% Advance',
  'Partial Advance',
  'Payment on Delivery',
  'Net 7 Days',
  'Net 15 Days',
  'Net 30 Days',
  'Custom'
];

interface FormState {
  customerId: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  inquiryNumber: string;
  inquiryDate: string;
  referenceNumber: string;
  subject: string;

  // Snapshot Address / Customer info
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  billingGstin: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  billingPostalCode: string;

  placeOfSupply: string;
  paymentTerms: string;
  customPaymentTerms: string;
  forwardingPackagingAmount: string;
  notes: string;
  termsAndConditions: string;
}

const defaultValidUntilDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

export function QuotationForm({ quotation }: QuotationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { company } = useAuth();
  const isEdit = Boolean(quotation);

  const [form, setForm] = useState<FormState>(() => {
    if (quotation) {
      const isPreset = PAYMENT_TERMS_PRESETS.includes(quotation.paymentTerms || '');
      return {
        customerId: quotation.customerId || '',
        quotationNumber: quotation.quotationNumber,
        quotationDate: toDateInput(quotation.quotationDate),
        validUntil: toDateInput(quotation.validUntil),
        inquiryNumber: quotation.inquiryNumber || '',
        inquiryDate: toDateInput(quotation.inquiryDate),
        referenceNumber: quotation.referenceNumber || '',
        subject: quotation.subject || '',

        billingName: quotation.billingName || '',
        billingEmail: quotation.billingEmail || '',
        billingPhone: quotation.billingPhone || '',
        billingGstin: formatGstin(quotation.billingGstin || ''),
        billingAddress: quotation.billingAddress || '',
        billingCity: quotation.billingCity || '',
        billingState: quotation.billingState || '',
        billingCountry: quotation.billingCountry || 'India',
        billingPostalCode: quotation.billingPostalCode || '',

        placeOfSupply: quotation.placeOfSupply || quotation.billingState || '',
        paymentTerms: isPreset ? quotation.paymentTerms || '50% Advance' : 'Custom',
        customPaymentTerms: isPreset ? '' : quotation.paymentTerms || '',
        forwardingPackagingAmount: String(quotation.forwardingPackagingAmount ?? 0),
        notes: quotation.notes || '',
        termsAndConditions: quotation.termsAndConditions || ''
      };
    }

    return {
      customerId: '',
      quotationNumber: '',
      quotationDate: new Date().toISOString().slice(0, 10),
      validUntil: defaultValidUntilDate(),
      inquiryNumber: '',
      inquiryDate: '',
      referenceNumber: '',
      subject: '',

      billingName: '',
      billingEmail: '',
      billingPhone: '',
      billingGstin: '',
      billingAddress: '',
      billingCity: '',
      billingState: '',
      billingCountry: 'India',
      billingPostalCode: '',

      placeOfSupply: company?.state || '',
      paymentTerms: '50% Advance',
      customPaymentTerms: '',
      forwardingPackagingAmount: '0',
      notes: '',
      termsAndConditions: ''
    };
  });

  const [items, setItems] = useState<QuotationEditorItem[]>(() => {
    if (quotation && quotation.items?.length > 0) {
      return quotation.items.map((item, idx) => ({
        key: `qitem-${idx}-${item.id}`,
        productId: item.productId ?? null,
        name: item.name,
        description: item.description || '',
        hsnSacCode: item.hsnSacCode || '',
        unit: item.unit || 'PCS',
        quantity: String(item.quantity ?? 1),
        rate: String(item.rate ?? 0),
        discountPercent: item.discountPercent ? String(item.discountPercent) : '',
        taxRate: String(item.taxRate ?? 18)
      }));
    }
    return [createEmptyQuotationItem(18, 'PCS')];
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(quotation?.customer ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<Quotation | null>(quotation ?? null);
  const [nextNumberPreview, setNextNumberPreview] = useState<string>('');
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(!isEdit);

  // Load next quotation number on creation
  useEffect(() => {
    if (!isEdit) {
      quotationsApi
        .nextNumber()
        .then((nextNum) => {
          if (nextNum?.number) {
            setNextNumberPreview(nextNum.number);
            setForm((prev) => ({ ...prev, quotationNumber: nextNum.number }));
          }
        })
        .catch(() => null)
        .finally(() => {
          setIsLoadingDefaults(false);
        });
    }
  }, [isEdit]);

  // Handle customer selection and address snapshot autofill
  const handleCustomerChange = (customerId: string, customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (!customer) {
      setForm((prev) => ({
        ...prev,
        customerId: '',
        billingName: '',
        billingEmail: '',
        billingPhone: '',
        billingGstin: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingPostalCode: ''
      }));
      return;
    }

    const fullAddr = [customer.address, customer.factoryAddress].filter(Boolean).join('\n');
    setForm((prev) => ({
      ...prev,
      customerId: customer.id,
      billingName: customer.name,
      billingEmail: customer.email || '',
      billingPhone: customer.phone || '',
      billingGstin: formatGstin(customer.gstin || ''),
      billingAddress: fullAddr || customer.address || '',
      billingCity: customer.city || '',
      billingState: customer.state || '',
      billingPostalCode: customer.postalCode || '',
      placeOfSupply: customer.state || prev.placeOfSupply || company?.state || ''
    }));
  };

  // Preload customer if customerId query param is present on creation
  useEffect(() => {
    const cid = searchParams.get('customerId');
    if (cid && !isEdit && !selectedCustomer) {
      customersApi
        .getById(cid)
        .then((cust) => {
          if (cust) {
            handleCustomerChange(cust.id, cust);
          }
        })
        .catch(() => {
          // Silent fallback if customer could not be found
        });
    }
  }, [searchParams, isEdit]);

  // Determine supply type (intra vs inter-state)
  const isIgst = useMemo(() => {
    const sellerState = normalizeStateName(company?.state || '');
    const buyerState = normalizeStateName(form.placeOfSupply || form.billingState || '');
    if (!sellerState || !buyerState) return false;
    return sellerState !== buyerState;
  }, [company?.state, form.placeOfSupply, form.billingState]);

  // Calculate live preview totals
  const liveTotals = useMemo(() => {
    let subtotalPaise = 0;
    let totalDiscountPaise = 0;
    let taxablePaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;
    let effectiveTaxRate = 18;

    items.forEach((it) => {
      const q = parseFloat(it.quantity) || 0;
      const r = parseFloat(it.rate) || 0;
      const d = parseFloat(it.discountPercent) || 0;
      const taxRate = parseFloat(it.taxRate) || 0;
      effectiveTaxRate = taxRate;

      const lineSubtotal = Math.round(q * r * 100);
      const lineDisc = d > 0 ? Math.round((lineSubtotal * d) / 100) : 0;
      const lineTaxable = Math.max(0, lineSubtotal - lineDisc);

      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (taxRate > 0) {
        const totalLineTax = Math.round((lineTaxable * taxRate) / 100);
        if (isIgst) {
          lineIgst = totalLineTax;
        } else {
          lineCgst = Math.floor(totalLineTax / 2);
          lineSgst = totalLineTax - lineCgst;
        }
      }

      subtotalPaise += lineSubtotal;
      totalDiscountPaise += lineDisc;
      taxablePaise += lineTaxable;
      cgstPaise += lineCgst;
      sgstPaise += lineSgst;
      igstPaise += lineIgst;
    });

    const forwardingPaise = Math.round((parseFloat(form.forwardingPackagingAmount) || 0) * 100);
    const taxPaise = cgstPaise + sgstPaise + igstPaise;
    const secondTotalPaise = taxablePaise + taxPaise + forwardingPaise;
    const grandTotalPaise = secondTotalPaise;

    return {
      total: subtotalPaise / 100,
      discountAmount: totalDiscountPaise / 100,
      taxableAmount: taxablePaise / 100,
      cgstAmount: cgstPaise / 100,
      sgstAmount: sgstPaise / 100,
      igstAmount: igstPaise / 100,
      forwardingPackagingAmount: forwardingPaise / 100,
      secondTotal: secondTotalPaise / 100,
      grandTotal: grandTotalPaise / 100,
      taxRate: effectiveTaxRate
    };
  }, [items, isIgst, form.forwardingPackagingAmount]);

  const resolvePaymentTerms = (): string => {
    if (form.paymentTerms === 'Custom') {
      return form.customPaymentTerms.trim();
    }
    return form.paymentTerms;
  };

  const handleSubmit = async (submitStatus: 'DRAFT' | 'SENT') => {
    if (!form.billingName.trim() && !form.customerId) {
      toast.error('Please select or specify a Customer (M/S)');
      return;
    }

    const validItems = items.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one line item with a valid name');
      return;
    }

    for (let i = 0; i < validItems.length; i++) {
      const it = validItems[i];
      const q = parseFloat(it.quantity);
      const r = parseFloat(it.rate);
      if (Number.isNaN(q) || q <= 0) {
        toast.error(`Item "${it.name}" must have a quantity greater than 0`);
        return;
      }
      if (Number.isNaN(r) || r < 0) {
        toast.error(`Item "${it.name}" must have a valid non-negative rate`);
        return;
      }
    }

    const payload: QuotationPayload = {
      customerId: form.customerId || null,
      quotationNumber: form.quotationNumber?.trim() || undefined,
      quotationDate: form.quotationDate,
      validUntil: form.validUntil || null,
      inquiryNumber: form.inquiryNumber?.trim() || null,
      inquiryDate: form.inquiryDate || null,
      referenceNumber: form.referenceNumber?.trim() || null,
      subject: form.subject?.trim() || null,

      billingName: form.billingName.trim() || undefined,
      billingEmail: form.billingEmail.trim() || null,
      billingPhone: form.billingPhone.trim() || null,
      billingGstin: form.billingGstin.trim() || null,
      billingAddress: form.billingAddress.trim() || null,
      billingCity: form.billingCity.trim() || null,
      billingState: form.billingState.trim() || null,
      billingCountry: form.billingCountry.trim() || 'India',
      billingPostalCode: form.billingPostalCode.trim() || null,

      placeOfSupply: form.placeOfSupply.trim() || null,
      paymentTerms: resolvePaymentTerms() || null,
      forwardingPackagingAmount: parseFloat(form.forwardingPackagingAmount) || 0,
      notes: form.notes.trim() || null,
      termsAndConditions: form.termsAndConditions.trim() || null,
      status: isEdit && quotation && submitStatus === 'DRAFT' ? quotation.status : submitStatus,

      items: validItems.map((it) => ({
        productId: it.productId,
        name: it.name.trim(),
        description: it.description?.trim() || null,
        hsnSacCode: it.hsnSacCode?.trim() || null,
        unit: it.unit || 'PCS',
        quantity: parseFloat(it.quantity) || 1,
        rate: parseFloat(it.rate) || 0,
        discountPercent: parseFloat(it.discountPercent) || 0,
        taxRate: parseFloat(it.taxRate) || 0
      }))
    };

    setIsSubmitting(true);
    try {
      if (isEdit && quotation) {
        const updated = await quotationsApi.update(quotation.id, payload);
        toast.success(`Quotation ${updated.quotationNumber} updated successfully`);
        router.push(`/quotations/${updated.id}`);
      } else {
        const created = await quotationsApi.create(payload);
        toast.success(`Quotation ${created.quotationNumber} created successfully`);
        router.push(`/quotations/${created.id}`);
      }
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Failed to save quotation');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDefaults) {
    return <LoadingState message="Loading quotation form..." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-2 bg-warm-surface border border-warm-border/70 hover:bg-warm-input text-warm-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-warm-text tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-warm-accent" />
              {isEdit ? `Edit Quotation: ${quotation?.quotationNumber}` : 'Create New Quotation'}
            </h1>
            <p className="text-xs text-warm-textMuted mt-0.5">
              Draft or send quotation estimates to customers with automated GST calculations
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/quotations')}
            disabled={isSubmitting}
            className="bg-warm-surface border-warm-border text-warm-text hover:bg-warm-input"
          >
            Cancel
          </Button>

          {isEdit && quotation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              leftIcon={<Eye className="w-4 h-4 text-warm-accent" />}
              className="bg-warm-surface border-warm-border text-warm-text hover:bg-warm-accent-light hover:text-warm-accent"
            >
              Preview PDF
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSubmit('SENT')}
            disabled={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
            className="bg-warm-surface border-warm-border text-warm-text hover:bg-warm-input"
          >
            {isEdit ? 'Save & Mark Sent' : 'Create & Mark Sent'}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
            className="bg-warm-accent hover:bg-warm-accent-hover text-white shadow-xs font-semibold"
          >
            {isEdit ? 'Save Changes' : 'Create Quotation'}
          </Button>
        </div>
      </div>

      {/* Section 1: Customer (M/S) Details & Address Snapshot */}
      <div className="bg-warm-surface border border-warm-border/70 p-5 shadow-warm space-y-4">
        <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider text-warm-accent flex items-center justify-between border-b border-warm-border/40 pb-2">
          <span>1. Customer Details (M/S)</span>
          <span className="text-[11px] font-normal text-warm-textMuted normal-case">
            Auto-fills and stores historical address snapshot
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <CustomerSelect
              value={form.customerId}
              onChange={handleCustomerChange}
              initialLabel={form.billingName}
              label="M/S (Customer Name)"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Billing / Party Name
            </label>
            <Input
              type="text"
              value={form.billingName}
              onChange={(e) => setForm((prev) => ({ ...prev, billingName: e.target.value }))}
              placeholder="Company / Client Name"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-warm-text mb-1">
              GSTIN (Optional)
            </label>
            <Input
              type="text"
              value={form.billingGstin}
              onChange={(e) => setForm((prev) => ({ ...prev, billingGstin: e.target.value }))}
              placeholder="24AAAAA0000A1Z5"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Customer Address (Snapshot)
            </label>
            <Textarea
              value={form.billingAddress}
              onChange={(e) => setForm((prev) => ({ ...prev, billingAddress: e.target.value }))}
              rows={2}
              placeholder="Factory / Office Street Address"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">City</label>
            <Input
              type="text"
              value={form.billingCity}
              onChange={(e) => setForm((prev) => ({ ...prev, billingCity: e.target.value }))}
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">State</label>
            <Select
              value={form.billingState}
              onChange={(e) => {
                const st = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  billingState: st,
                  placeOfSupply: prev.placeOfSupply || st
                }));
              }}
              options={[
                { value: '', label: 'Select State' },
                ...INDIAN_STATES.map((s) => ({ value: s.name, label: `${s.code} - ${s.name}` }))
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">Phone</label>
            <Input
              type="text"
              value={form.billingPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, billingPhone: e.target.value }))}
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">Email</label>
            <Input
              type="email"
              value={form.billingEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, billingEmail: e.target.value }))}
              placeholder="client@company.com"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Quotation Header & References */}
      <div className="bg-warm-surface border border-warm-border/70 p-5 shadow-warm space-y-4">
        <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider text-warm-accent border-b border-warm-border/40 pb-2">
          2. Quotation Header &amp; References
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Q. No. (Quotation Number)
            </label>
            <Input
              type="text"
              value={form.quotationNumber || nextNumberPreview || 'QT-00001'}
              disabled
              readOnly
              helperText={
                isEdit
                  ? 'An issued quotation number cannot be changed.'
                  : 'Auto-allocated upon save.'
              }
              className="bg-warm-input/60 cursor-not-allowed text-warm-text"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Q. Date (Quotation Date) *
            </label>
            <Input
              type="date"
              value={form.quotationDate}
              onChange={(e) => setForm((prev) => ({ ...prev, quotationDate: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Valid Until *
            </label>
            <Input
              type="date"
              value={form.validUntil}
              min={form.quotationDate || undefined}
              onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Place of Supply (GST)
            </label>
            <Select
              value={form.placeOfSupply}
              onChange={(e) => setForm((prev) => ({ ...prev, placeOfSupply: e.target.value }))}
              options={[
                { value: '', label: form.billingState ? `Auto (${form.billingState})` : 'Select Supply State' },
                ...INDIAN_STATES.map((s) => ({ value: s.name, label: `${s.code} - ${s.name}` }))
              ]}
              helperText={
                isIgst
                  ? '⚡ Inter-State: Charging IGST'
                  : '⚡ Intra-State: Charging CGST + SGST'
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Inquiry No.
            </label>
            <Input
              type="text"
              value={form.inquiryNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, inquiryNumber: e.target.value }))}
              placeholder="INQ-2026-081"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Inquiry Date
            </label>
            <Input
              type="date"
              value={form.inquiryDate}
              onChange={(e) => setForm((prev) => ({ ...prev, inquiryDate: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Ref. No. / Customer RFQ
            </label>
            <Input
              type="text"
              value={form.referenceNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
              placeholder="RFQ / Email Reference"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-semibold text-warm-text mb-1">
              Subject / Description
            </label>
            <Input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Quotation for Supply and Installation of Products / Machinery"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Quotation Items Table (Full Width) */}
      <div className="bg-warm-surface border border-warm-border/70 p-5 shadow-warm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-warm-border/40 pb-2">
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider text-warm-accent">
              3. Quotation Items &amp; Product Pricing
            </h3>
            <p className="text-xs text-warm-textMuted mt-0.5">
              Add products or services with quantity, units, rates, discounts and GST rates
            </p>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-semibold uppercase border tracking-wider self-start sm:self-auto',
              isIgst
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            )}
          >
            {isIgst ? 'IGST Applicable (Inter-State)' : 'CGST + SGST (Intra-State)'}
          </span>
        </div>

        <QuotationItemsEditor
          items={items}
          onChange={setItems}
          isIgst={isIgst}
          customerId={form.customerId}
          disabled={isSubmitting}
        />
      </div>

      {/* Section 4: Terms, Notes & Summary Calculations (Directly below items) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Payment Terms, Forwarding/Packaging & Notes */}
        <div className="bg-warm-surface border border-warm-border/70 p-5 shadow-warm space-y-4">
          <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider text-warm-accent border-b border-warm-border/40 pb-2">
            4. Payment Terms &amp; Extra Charges
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-warm-text mb-1">
                Payment Terms
              </label>
              <Select
                value={form.paymentTerms}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                options={PAYMENT_TERMS_PRESETS.map((p) => ({ value: p, label: p }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-warm-text mb-1">
                Forwarding &amp; Packaging (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                value={form.forwardingPackagingAmount}
                onChange={(e) => setForm((prev) => ({ ...prev, forwardingPackagingAmount: e.target.value }))}
                placeholder="0.00"
                helperText="Extra packaging & freight fee"
              />
            </div>

            {form.paymentTerms === 'Custom' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-warm-text mb-1">
                  Custom Payment Terms Text
                </label>
                <Input
                  type="text"
                  value={form.customPaymentTerms}
                  onChange={(e) => setForm((prev) => ({ ...prev, customPaymentTerms: e.target.value }))}
                  placeholder="e.g. 50% Advance balance before dispatch"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-warm-text mb-1">
                Terms &amp; Conditions
              </label>
              <Textarea
                value={form.termsAndConditions}
                onChange={(e) => setForm((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
                rows={3}
                placeholder="1. Delivery within 2 weeks of purchase order. 2. Prices are ex-works..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-warm-text mb-1">
                Notes / Customer Remarks
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Thank you for your business inquiry..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Quotation Summary Totals Card */}
        <div className="space-y-4">
          <QuotationTotals
            total={liveTotals.total}
            cgstAmount={liveTotals.cgstAmount}
            sgstAmount={liveTotals.sgstAmount}
            igstAmount={liveTotals.igstAmount}
            forwardingPackagingAmount={liveTotals.forwardingPackagingAmount}
            secondTotal={liveTotals.secondTotal}
            grandTotal={liveTotals.grandTotal}
            isIgst={isIgst}
            taxRate={liveTotals.taxRate}
            discountAmount={liveTotals.discountAmount}
          />
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/quotations')}
          disabled={isSubmitting}
          leftIcon={<X className="w-4 h-4" />}
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => handleSubmit('SENT')}
          disabled={isSubmitting}
          leftIcon={<Send className="w-4 h-4" />}
        >
          {isEdit ? 'Save & Mark Sent' : 'Create & Mark Sent'}
        </Button>

        <Button
          type="button"
          onClick={() => handleSubmit('DRAFT')}
          disabled={isSubmitting}
          leftIcon={<Save className="w-4 h-4" />}
          className="bg-warm-accent hover:bg-warm-accent-hover text-white shadow-xs font-semibold"
        >
          {isEdit ? 'Save Changes' : 'Create Quotation'}
        </Button>
      </div>

      {/* PDF Preview Modal if open */}
      {previewOpen && previewTarget && (
        <QuotationPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          quotation={{
            id: previewTarget.id,
            quotationNumber: previewTarget.quotationNumber,
            billingName: previewTarget.billingName,
            customer: previewTarget.customer
          }}
        />
      )}
    </div>
  );
}
