'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { CustomerSelect } from '@/components/customers/CustomerSelect';
import { QuotationSelect } from '@/components/quotations/QuotationSelect';
import { InvoiceItemsEditor, EditorItem, createEmptyItem, itemsFromInvoice } from './InvoiceItemsEditor';
import { InvoiceTotals } from './InvoiceTotals';
import { computeTotals, isInterState, stripStateCode } from '@/lib/gst';
import { invoicesApi, invoiceSettingsApi, toDateInput } from '@/lib/invoices';
import { quotationsApi } from '@/lib/quotations';
import { toNumber } from '@/lib/products';
import { apiErrorMessage, customersApi } from '@/lib/customers';
import { Customer } from '@/types/index';
import { Invoice, InvoiceDefaults, InvoiceReferenceData, InvoicePayload } from '@/types/invoice';
import { Quotation } from '@/types/quotation';
import { cn, formatCurrency, formatGstin, formatDate } from '@/lib/utils';
import { normalizeStateName, INDIAN_STATES } from '@/lib/geo';
import { Save, Send, X, AlertTriangle, MapPin, FileSpreadsheet, Check, Truck } from 'lucide-react';

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
  hasDifferentConsignee: boolean;
  consigneeCustomerId: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingGstin: string;
  shippingPhone: string;
  shippingEmail: string;
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
  extraCharges: string;
  notes: string;
  terms: string;
  internalNotes: string;
}

const EMPTY_FORM: FormState = {
  customerId: '',
  customerName: '',
  hasDifferentConsignee: false,
  consigneeCustomerId: '',
  shippingName: '',
  shippingAddress: '',
  shippingCity: '',
  shippingState: '',
  shippingPostalCode: '',
  shippingGstin: '',
  shippingPhone: '',
  shippingEmail: '',
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
  extraCharges: '0',
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
  const searchParams = useSearchParams();
  const isEdit = Boolean(invoice);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [items, setItems] = useState<EditorItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedConsigneeCustomer, setSelectedConsigneeCustomer] = useState<Customer | null>(null);
  const [importFromQuotation, setImportFromQuotation] = useState<boolean>(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const hasAutoLoadedRef = useRef(false);

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
          const hasDiff = Boolean(
            invoice.consigneeCustomerId ||
            (invoice.shippingName && invoice.shippingName !== invoice.billingName) ||
            (invoice.shippingAddress && invoice.shippingAddress !== invoice.billingAddress)
          );

          setForm({
            customerId: invoice.customerId,
            customerName: invoice.customer?.name ?? invoice.billingName,
            hasDifferentConsignee: hasDiff,
            consigneeCustomerId: invoice.consigneeCustomerId ?? '',
            shippingName: invoice.shippingName ?? '',
            shippingAddress: invoice.shippingAddress ?? '',
            shippingCity: invoice.shippingCity ?? '',
            shippingState: invoice.shippingState ?? '',
            shippingPostalCode: invoice.shippingPostalCode ?? '',
            shippingGstin: invoice.shippingGstin ?? '',
            shippingPhone: invoice.shippingPhone ?? '',
            shippingEmail: invoice.shippingEmail ?? '',
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
            extraCharges: invoice.extraCharges ? String(invoice.extraCharges) : '0',
            notes: invoice.notes ?? '',
            terms: invoice.terms ?? '',
            internalNotes: invoice.internalNotes ?? ''
          });
          setItems(itemsFromInvoice(invoice.items));
        } else {
          setForm((prev) => ({
            ...EMPTY_FORM,
            ...prev,
            issueDate: prev.issueDate || toDateInput(defaultsData.issueDate),
            dueDate: prev.dueDate || toDateInput(defaultsData.dueDate),
            notes: prev.notes || defaultsData.notes || '',
            terms: prev.terms || defaultsData.terms || ''
          }));
          setItems((prev) => (prev.length > 0 ? prev : [createEmptyItem(defaultsData.defaultTaxRate, defaultsData.defaultUnit)]));
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
    if (form.placeOfSupply) return normalizeStateName(form.placeOfSupply);
    if (form.hasDifferentConsignee && form.shippingState) return normalizeStateName(form.shippingState);
    if (selectedCustomer?.state) return normalizeStateName(selectedCustomer.state);
    if (isEdit && invoice?.billingState) return normalizeStateName(invoice.billingState);
    return null;
  }, [form.placeOfSupply, form.hasDifferentConsignee, form.shippingState, selectedCustomer, isEdit, invoice]);

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
          pricesIncludeTax: defaults?.pricesIncludeTax ?? false,
          extraCharges: parseFloat(form.extraCharges) || 0,
          isReverseCharge: form.isReverseCharge
        }
      ),
    [items, isIgst, defaults, form.extraCharges, form.isReverseCharge]
  );

  // Handle auto-load from URL query (?quotationId=...)
  useEffect(() => {
    const qId = searchParams.get('quotationId');
    if (qId && !isEdit && !hasAutoLoadedRef.current) {
      hasAutoLoadedRef.current = true;
      setImportFromQuotation(true);
      handleQuotationChange(qId, null);
    }
  }, [searchParams, isEdit]);

  // Handle auto-load from URL query (?customerId=...)
  useEffect(() => {
    const cId = searchParams.get('customerId');
    const qId = searchParams.get('quotationId');
    if (cId && !qId && !isEdit && !selectedCustomer) {
      customersApi
        .getById(cId)
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

  const handleQuotationChange = async (quotationId: string, quotation: Quotation | null) => {
    setSelectedQuotationId(quotationId);

    if (!quotationId) {
      setSelectedQuotation(null);
      setSelectedCustomer(null);
      setSelectedConsigneeCustomer(null);
      setForm((prev) => ({
        ...prev,
        customerId: '',
        customerName: '',
        hasDifferentConsignee: false,
        consigneeCustomerId: '',
        shippingName: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingPostalCode: '',
        shippingGstin: '',
        shippingPhone: '',
        shippingEmail: '',
        placeOfSupply: '',
        reference: '',
        poNumber: '',
        orderDate: '',
        paymentTerms: defaults?.defaultDueDays ? `Net ${defaults.defaultDueDays} Days` : '',
        extraCharges: '0',
        notes: defaults?.notes ?? '',
        terms: defaults?.terms ?? ''
      }));
      setItems([createEmptyItem(defaults?.defaultTaxRate ?? 18, defaults?.defaultUnit ?? 'PCS')]);
      setFieldErrors({});
      setItemErrors({});
      return;
    }

    let targetQuotation: Quotation = quotation!;

    // If quotation object was not provided or lacks items, fetch full details
    if (!targetQuotation || !targetQuotation.items || targetQuotation.items.length === 0) {
      try {
        targetQuotation = await quotationsApi.getById(quotationId);
      } catch (err) {
        toast.error('Failed to load full quotation details');
        return;
      }
    }

    setSelectedQuotation(targetQuotation);

    // Populate customer
    let customerObj: Customer | null = targetQuotation.customer ?? null;
    if (!customerObj && targetQuotation.customerId) {
      try {
        customerObj = await customersApi.getById(targetQuotation.customerId);
      } catch {
        // Fallback snapshot object
        customerObj = {
          id: targetQuotation.customerId,
          name: targetQuotation.billingName,
          type: 'BUSINESS',
          gstin: targetQuotation.billingGstin,
          address: targetQuotation.billingAddress,
          city: targetQuotation.billingCity,
          state: targetQuotation.billingState,
          country: targetQuotation.billingCountry,
          postalCode: targetQuotation.billingPostalCode,
          phone: targetQuotation.billingPhone,
          email: targetQuotation.billingEmail,
          isActive: true,
          createdAt: '',
          updatedAt: ''
        } as Customer;
      }
    } else if (!customerObj && targetQuotation.billingName) {
      customerObj = {
        id: '',
        name: targetQuotation.billingName,
        type: 'BUSINESS',
        gstin: targetQuotation.billingGstin,
        address: targetQuotation.billingAddress,
        city: targetQuotation.billingCity,
        state: targetQuotation.billingState,
        country: targetQuotation.billingCountry,
        postalCode: targetQuotation.billingPostalCode,
        phone: targetQuotation.billingPhone,
        email: targetQuotation.billingEmail,
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } as Customer;
    }

    setSelectedCustomer(customerObj);

    setForm((prev) => ({
      ...prev,
      customerId: targetQuotation.customerId || '',
      customerName: targetQuotation.billingName || targetQuotation.customer?.name || '',
      placeOfSupply: targetQuotation.placeOfSupply || targetQuotation.billingState || customerObj?.state || prev.placeOfSupply,
      reference: targetQuotation.quotationNumber
        ? `Quotation: ${targetQuotation.quotationNumber}${targetQuotation.subject ? ` — ${targetQuotation.subject}` : ''}`
        : prev.reference,
      poNumber: targetQuotation.inquiryNumber || targetQuotation.referenceNumber || prev.poNumber,
      orderDate: targetQuotation.inquiryDate ? toDateInput(targetQuotation.inquiryDate) : prev.orderDate,
      paymentTerms: targetQuotation.paymentTerms || prev.paymentTerms,
      extraCharges: targetQuotation.forwardingPackagingAmount ? String(targetQuotation.forwardingPackagingAmount) : prev.extraCharges,
      notes: targetQuotation.notes || defaults?.notes || prev.notes || '',
      terms: targetQuotation.terms || targetQuotation.termsAndConditions || defaults?.terms || prev.terms || ''
    }));

    if (targetQuotation.customerId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.customerId;
        return next;
      });
    }

    // Populate line items with product snapshots from quotation
    if (targetQuotation.items && targetQuotation.items.length > 0) {
      setItems(
        targetQuotation.items.map((it, idx) => ({
          key: `quote-item-${idx}-${Date.now()}`,
          productId: it.productId ?? null,
          name: it.name,
          description: it.description || '',
          hsnSacCode: it.hsnSacCode || '',
          unit: it.unit || 'PCS',
          quantity: String(toNumber(it.quantity) || 1),
          unitPrice: String(toNumber(it.rate)),
          discountPercent: toNumber(it.discountPercent) ? String(toNumber(it.discountPercent)) : '',
          taxRate: String(toNumber(it.taxRate ?? defaults?.defaultTaxRate ?? 18))
        }))
      );
    }
  };

  const handleCustomerChange = (customerIdOrCustomer: string | Customer | null, maybeCustomer?: Customer | null) => {
    const customer = typeof customerIdOrCustomer === 'string' ? maybeCustomer : customerIdOrCustomer;
    const customerId = typeof customerIdOrCustomer === 'string' ? customerIdOrCustomer : customer?.id ?? '';
    setSelectedCustomer(customer ?? null);

    if (form.consigneeCustomerId && form.consigneeCustomerId === customerId) {
      setSelectedConsigneeCustomer(null);
    }

    setForm((prev) => {
      const isConsigneeSame = prev.consigneeCustomerId && prev.consigneeCustomerId === customerId;
      return {
        ...prev,
        customerId,
        customerName: customer?.name ?? '',
        placeOfSupply: customer?.state ? normalizeStateName(customer.state) : prev.placeOfSupply,
        ...(isConsigneeSame
          ? {
              consigneeCustomerId: '',
              shippingName: '',
              shippingAddress: '',
              shippingCity: '',
              shippingState: '',
              shippingPostalCode: '',
              shippingGstin: '',
              shippingPhone: '',
              shippingEmail: ''
            }
          : {})
      };
    });
    if (customerId) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.customerId;
        return next;
      });
    }
  };

  const handleConsigneeToggle = (checked: boolean) => {
    setForm((prev) => {
      if (checked) {
        return {
          ...prev,
          hasDifferentConsignee: true
        };
      } else {
        setSelectedConsigneeCustomer(null);
        return {
          ...prev,
          hasDifferentConsignee: false,
          consigneeCustomerId: '',
          shippingName: '',
          shippingAddress: '',
          shippingCity: '',
          shippingState: '',
          shippingPostalCode: '',
          shippingGstin: '',
          shippingPhone: '',
          shippingEmail: ''
        };
      }
    });

    if (!checked) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.shippingName;
        delete next.shippingAddress;
        delete next.shippingState;
        return next;
      });
    }
  };

  const handleConsigneeCustomerChange = (
    customerIdOrCustomer: string | Customer | null,
    maybeCustomer?: Customer | null
  ) => {
    const customer = typeof customerIdOrCustomer === 'string' ? maybeCustomer : customerIdOrCustomer;
    const customerId = typeof customerIdOrCustomer === 'string' ? customerIdOrCustomer : customer?.id ?? '';
    setSelectedConsigneeCustomer(customer ?? null);
    if (customer) {
      setForm((prev) => ({
        ...prev,
        consigneeCustomerId: customerId,
        shippingName: customer.name,
        shippingAddress: customer.address || customer.factoryAddress || '',
        shippingCity: customer.city || '',
        shippingState: normalizeStateName(customer.state || ''),
        shippingPostalCode: customer.postalCode || '',
        shippingGstin: customer.gstin || '',
        shippingPhone: customer.phone || '',
        shippingEmail: customer.email || ''
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.shippingName;
        delete next.shippingAddress;
        delete next.shippingState;
        return next;
      });
    } else {
      setForm((prev) => ({
        ...prev,
        consigneeCustomerId: ''
      }));
    }
  };

  /**
   * Updating the bill date preserves an already selected due date if it is valid
   * (i.e. not empty and not before the new bill date).
   * If due date is not yet chosen or falls before the new bill date, it is adjusted.
   */
  const handleIssueDateChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, issueDate: value };

      if (!value) {
        return next;
      }

      // If dueDate is not chosen or is earlier than the new bill date, adjust it
      if (!prev.dueDate || prev.dueDate < value) {
        if (defaults?.defaultDueDays) {
          const issue = new Date(value);
          if (!Number.isNaN(issue.getTime())) {
            issue.setDate(issue.getDate() + defaults.defaultDueDays);
            next.dueDate = issue.toISOString().slice(0, 10);
          } else {
            next.dueDate = value;
          }
        } else {
          next.dueDate = value;
        }
      }

      return next;
    });

    if (fieldErrors.issueDate) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.issueDate;
        return next;
      });
    }
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

    if (form.hasDifferentConsignee) {
      if (!form.shippingName.trim()) {
        errors.shippingName = 'Consignee Name is required';
      }
      if (!form.shippingAddress.trim()) {
        errors.shippingAddress = 'Delivery Address is required';
      }
      if (!form.shippingState.trim()) {
        errors.shippingState = 'Delivery State is required';
      }
    }

    setFieldErrors(errors);
    setItemErrors(rowErrors);

    const ok = Object.keys(errors).length === 0 && Object.keys(rowErrors).length === 0;
    if (!ok) toast.error('Please fix the highlighted fields before saving');

    return ok;
  };

  const buildPayload = (): InvoicePayload => {
    const payload: InvoicePayload = {
      customerId: form.customerId,
      quotationId: selectedQuotationId || undefined,
      billType: form.billType,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      poNumber: form.poNumber.trim() || undefined,
      orderDate: form.orderDate || undefined,
      challanNo: form.challanNo.trim() || undefined,
      challanDate: form.challanDate || undefined,
      reference: form.reference.trim() || undefined,
      modeOfDispatch: form.modeOfDispatch.trim() || undefined,
      lhNo: form.lhNo.trim() || undefined,
      lhDate: form.lhDate || undefined,
      dcNo: form.dcNo.trim() || undefined,
      dcDate: form.dcDate || undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      placeOfSupply: form.placeOfSupply.trim() || undefined,
      isReverseCharge: form.isReverseCharge,
      extraCharges: parseFloat(form.extraCharges) || 0,
      notes: form.notes.trim() || undefined,
      terms: form.terms.trim() || undefined,
      internalNotes: form.internalNotes.trim() || undefined,
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
    };

    if (form.hasDifferentConsignee) {
      payload.consigneeCustomerId = form.consigneeCustomerId || null;
      payload.shippingName = form.shippingName.trim() || undefined;
      payload.shippingAddress = form.shippingAddress.trim() || undefined;
      payload.shippingCity = form.shippingCity.trim() || undefined;
      payload.shippingState = form.shippingState.trim() || undefined;
      payload.shippingPostalCode = form.shippingPostalCode.trim() || undefined;
      payload.shippingGstin = form.shippingGstin.trim() || undefined;
      payload.shippingPhone = form.shippingPhone.trim() || undefined;
      payload.shippingEmail = form.shippingEmail.trim() || undefined;
    } else {
      payload.consigneeCustomerId = null;
      payload.shippingName = undefined;
      payload.shippingAddress = undefined;
      payload.shippingCity = undefined;
      payload.shippingState = undefined;
      payload.shippingPostalCode = undefined;
      payload.shippingGstin = undefined;
      payload.shippingPhone = undefined;
      payload.shippingEmail = undefined;
    }

    return payload;
  };

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

  const shippingStateOptions = [
    { value: '', label: 'Select Delivery State' },
    ...INDIAN_STATES.map((s) => ({
      value: s.name,
      label: `${s.code} — ${s.name}`
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

      {/* Quotation Import / Conversion Card */}
      {!isEdit && (
        <div className="bg-warm-surface border border-warm-border/80 shadow-warm p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-warm-accentLight border border-warm-accent/30 text-warm-accent flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-warm-accent" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-warm-text uppercase tracking-wider">
                  Create invoice from an existing quotation?
                </h3>
                <p className="text-xs text-warm-textMuted mt-0.5">
                  Select &quot;Yes&quot; to auto-fill customer, line items, rates, discounts, and terms from a quotation.
                </p>
              </div>
            </div>

            {/* Yes / No Toggle buttons */}
            <div className="flex items-center bg-warm-input border border-warm-border/80 p-0.5 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (importFromQuotation) {
                    setImportFromQuotation(false);
                    if (selectedQuotationId) {
                      handleQuotationChange('', null);
                    }
                  }
                }}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                  !importFromQuotation
                    ? 'bg-warm-surface text-warm-text shadow-sm border border-warm-border/60'
                    : 'text-warm-textMuted hover:text-warm-text'
                )}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setImportFromQuotation(true)}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  importFromQuotation
                    ? 'bg-warm-accent text-white shadow-sm'
                    : 'text-warm-textMuted hover:text-warm-text'
                )}
              >
                Yes
              </button>
            </div>
          </div>

          {/* Shown only if user selected Yes */}
          {importFromQuotation && (
            <div className="pt-3 border-t border-warm-border/50 space-y-3 animate-in fade-in duration-150">
              <QuotationSelect
                value={selectedQuotationId}
                label="Select Quotation / Estimate"
                initialLabel={
                  selectedQuotation
                    ? `${selectedQuotation.quotationNumber} — ${selectedQuotation.billingName} (${formatCurrency(Number(selectedQuotation.grandTotal))})`
                    : ''
                }
                onChange={handleQuotationChange}
                placeholder="Search quotation by number (e.g. QT-0001), customer name, or subject..."
              />

              {selectedQuotation && (
                <div className="p-3.5 bg-warm-accentLight/40 border border-warm-accent/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-warm-text">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-warm-textMuted uppercase font-semibold">Quotation:</span>
                      <span className="font-bold text-warm-accent font-mono text-sm">{selectedQuotation.quotationNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-warm-textMuted uppercase font-semibold">Customer:</span>
                      <span className="font-semibold text-warm-text">{selectedQuotation.billingName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-warm-textMuted uppercase font-semibold">Total:</span>
                      <span className="font-bold text-warm-text font-mono">{formatCurrency(Number(selectedQuotation.grandTotal))}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-warm-textMuted">
                      <span>({selectedQuotation.items?.length ?? 0} item{(selectedQuotation.items?.length ?? 0) === 1 ? '' : 's'} loaded)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>Quotation loaded</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuotationChange('', null)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200 px-2.5 py-1 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Clear selected quotation"
                    >
                      <X className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1. Buyer & Consignee Information */}
      <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-warm-border/40 pb-3">
          <h2 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            1. Buyer &amp; Consignee Information
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
          />

          <Input
            label="Bill No."
            value={isEdit ? invoice?.invoiceNumber ?? '' : defaults?.invoiceNumber ?? ''}
            readOnly
            disabled
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
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, dueDate: val }));
              if (fieldErrors.dueDate) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.dueDate;
                  return next;
                });
              }
            }}
            error={fieldErrors.dueDate}
          />
        </div>

        {/* Buyer / Bill To Area */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <CustomerSelect
                label="Customer"
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
            />
          </div>

          {(selectedCustomer || invoice) && (
            <div className="p-3 bg-warm-input/40 border border-warm-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-warm-text font-medium">
                <MapPin className="w-3.5 h-3.5 text-warm-accent shrink-0" />
                <span>
                  <strong>{selectedCustomer?.city || invoice?.billingCity || 'City not set'}</strong>
                  {(selectedCustomer?.state || invoice?.billingState) && (
                    <span className="text-warm-textMuted">
                      , {normalizeStateName(selectedCustomer?.state || invoice?.billingState || '')}
                    </span>
                  )}
                </span>
                {(selectedCustomer?.postalCode || invoice?.billingPostalCode) && (
                  <span className="text-warm-textSubtle text-[11px]">
                    (PIN: {selectedCustomer?.postalCode || invoice?.billingPostalCode})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                {formatGstin(selectedCustomer?.gstin || invoice?.billingGstin) ? (
                  <span className="bg-warm-surface px-2 py-0.5 border border-warm-border text-warm-text font-semibold">
                    GSTIN: {formatGstin(selectedCustomer?.gstin || invoice?.billingGstin)}
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
        </div>

        {/* Consignee / Ship To Toggle & Section */}
        <div className="pt-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-warm-input/30 border border-warm-border/50">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.hasDifferentConsignee}
                onChange={(e) => handleConsigneeToggle(e.target.checked)}
                disabled={isLocked}
                className="w-4 h-4 rounded-none text-warm-accent border-warm-border focus:ring-warm-accent cursor-pointer"
              />
              <span className="text-xs font-bold text-warm-text uppercase tracking-wider">
                Delivery to a different consignee (Ship To)
              </span>
            </label>
            <span className="text-[11px] text-warm-textMuted">
              {form.hasDifferentConsignee
                ? 'Consignee delivery details are active below'
                : 'Using Buyer details as the delivery address (Default)'}
            </span>
          </div>

          {form.hasDifferentConsignee && (
            <div className="p-4 sm:p-5 bg-warm-surface border border-warm-border/80 shadow-warm space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-warm-border/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-warm-accent shrink-0" />
                  <h3 className="text-xs font-bold text-warm-text uppercase tracking-wider">
                    Consignee / Ship To Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleConsigneeToggle(false)}
                  disabled={isLocked}
                  className="text-[11px] text-warm-accent hover:underline cursor-pointer font-medium"
                >
                  Reset / Same as Buyer
                </button>
              </div>

              {/* Fast lookup from customer directory */}
              <div>
                <CustomerSelect
                  label="Select Existing Customer as Consignee (Optional)"
                  placeholder="Choose an existing customer or branch to auto-fill consignee fields..."
                  value={form.consigneeCustomerId}
                  initialLabel={selectedConsigneeCustomer?.name || form.shippingName}
                  onChange={handleConsigneeCustomerChange}
                  excludeId={form.customerId}
                  disabled={isLocked}
                />
              </div>

              {/* Editable Consignee Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Consignee Name"
                  required
                  placeholder="e.g. ABC Manufacturing Ltd. / Site Office"
                  value={form.shippingName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({ ...prev, shippingName: val }));
                    if (val.trim()) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.shippingName;
                        return next;
                      });
                    }
                  }}
                  disabled={isLocked}
                  error={fieldErrors.shippingName}
                />

                <Input
                  label="Contact Person / Phone"
                  placeholder="e.g. 9876543210"
                  value={form.shippingPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, shippingPhone: e.target.value }))}
                  disabled={isLocked}
                />

                <Input
                  label="Consignee GSTIN (Optional)"
                  placeholder="e.g. 24AAACA1234F1Z2"
                  value={form.shippingGstin}
                  onChange={(e) => setForm((prev) => ({ ...prev, shippingGstin: e.target.value.toUpperCase() }))}
                  disabled={isLocked}
                />

                <div className="sm:col-span-2 lg:col-span-3">
                  <Input
                    label="Delivery Address"
                    required
                    placeholder="Plot No., Industrial Area, Street Address..."
                    value={form.shippingAddress}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({ ...prev, shippingAddress: val }));
                      if (val.trim()) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.shippingAddress;
                          return next;
                        });
                      }
                    }}
                    disabled={isLocked}
                    error={fieldErrors.shippingAddress}
                  />
                </div>

                <Input
                  label="City"
                  placeholder="e.g. Surat"
                  value={form.shippingCity}
                  onChange={(e) => setForm((prev) => ({ ...prev, shippingCity: e.target.value }))}
                  disabled={isLocked}
                />

                <Select
                  label="State"
                  required
                  options={shippingStateOptions}
                  value={normalizeStateName(form.shippingState)}
                  onChange={(e) => {
                    const val = normalizeStateName(e.target.value);
                    setForm((prev) => ({ ...prev, shippingState: val }));
                    if (val.trim()) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.shippingState;
                        return next;
                      });
                    }
                  }}
                  disabled={isLocked}
                  error={fieldErrors.shippingState}
                />

                <Input
                  label="PIN Code"
                  placeholder="e.g. 395001"
                  value={form.shippingPostalCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, shippingPostalCode: e.target.value }))}
                  disabled={isLocked}
                />
              </div>
            </div>
          )}
        </div>

        {/* GST Determination & Seller State Rule */}
        <div className="pt-2">
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
            null
          )}
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
            <h2 className="text-sm font-bold text-warm-accent uppercase tracking-wider">
              4. Invoice Items
            </h2>
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
          isReverseCharge={form.isReverseCharge}
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

          <div>
            <label className="block text-xs font-semibold text-warm-text mb-1.5 uppercase tracking-wide">
              Extra Charges (₹)
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.extraCharges}
              onChange={(e) => setForm((prev) => ({ ...prev, extraCharges: e.target.value }))}
              placeholder="0.00"
              helperText="Additional freight, delivery, packaging or handling charges"
            />
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

        <InvoiceTotals totals={totals} isIgst={isIgst} isReverseCharge={form.isReverseCharge} className="h-fit" />
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
