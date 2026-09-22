'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { computeTotals } from '@/lib/gst';
import { formatCurrency } from '@/lib/utils';
import { INDIAN_STATES } from '@/lib/geo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { VendorModal } from '@/components/vendors/VendorModal';
import { PurchaseItemsEditor, PurchaseEditorItem, createEmptyPurchaseItem } from './PurchaseItemsEditor';
import { vendorsApi, purchaseBillsApi } from '@/lib/purchases';
import { Vendor, PurchaseBill, PurchaseBillPayload, ItcEligibility, PurchaseBillStatus } from '@/types/purchase';
import { StateCityFields } from '@/components/common/StateCityFields';
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Plus,
  Truck,
  ShieldCheck,
  Receipt,
  RotateCcw,
  ArrowLeft,
  DollarSign
} from 'lucide-react';

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['PCS', 'KGS', 'MTR', 'BOX', 'NOS', 'LTR', 'SET', 'BAG', 'ROLL', 'SQFT', 'SQMT'];

const extractStateCode = (stateString?: string | null): string => {
  if (!stateString) return '';
  const match = stateString.match(/^(\d{2})/);
  if (match) return match[1];
  const found = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === stateString.trim().toLowerCase()
  );
  return found ? found.code : '';
};

interface PurchaseBillFormProps {
  initialBill?: PurchaseBill;
  isEditing?: boolean;
}

export function PurchaseBillForm({ initialBill, isEditing = false }: PurchaseBillFormProps) {
  const router = useRouter();
  const { company } = useAuth();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(initialBill?.vendorId ?? '');
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bill metadata
  const [billNumber, setBillNumber] = useState(initialBill?.billNumber ?? '');
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState(initialBill?.vendorInvoiceNumber ?? '');
  const [billDate, setBillDate] = useState(initialBill?.billDate ? initialBill.billDate.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialBill?.dueDate ? initialBill.dueDate.split('T')[0] : '');
  const [paymentTerms, setPaymentTerms] = useState(initialBill?.paymentTerms ?? 'Net 30 Days');
  const [status, setStatus] = useState<PurchaseBillStatus>(initialBill?.status ?? 'RECEIVED');

  // Logistics
  const [poNumber, setPoNumber] = useState(initialBill?.poNumber ?? '');
  const [poDate, setPoDate] = useState(initialBill?.poDate ? initialBill.poDate.split('T')[0] : '');
  const [grnNumber, setGrnNumber] = useState(initialBill?.grnNumber ?? '');
  const [grnDate, setGrnDate] = useState(initialBill?.grnDate ? initialBill.grnDate.split('T')[0] : '');
  const [transporterName, setTransporterName] = useState(initialBill?.transporterName ?? '');
  const [vehicleNumber, setVehicleNumber] = useState(initialBill?.vehicleNumber ?? '');
  const [lrNumber, setLrNumber] = useState(initialBill?.lrNumber ?? '');
  const [lrDate, setLrDate] = useState(initialBill?.lrDate ? initialBill.lrDate.split('T')[0] : '');

  // Vendor snapshot fields
  const [vendorName, setVendorName] = useState(initialBill?.vendorName ?? '');
  const [vendorGstin, setVendorGstin] = useState(initialBill?.vendorGstin ?? '');
  const [vendorPhone, setVendorPhone] = useState(initialBill?.vendorPhone ?? '');
  const [vendorEmail, setVendorEmail] = useState(initialBill?.vendorEmail ?? '');
  const [vendorAddress, setVendorAddress] = useState(initialBill?.vendorAddress ?? '');
  const [vendorCity, setVendorCity] = useState(initialBill?.vendorCity ?? '');
  const [vendorState, setVendorState] = useState(initialBill?.vendorState ?? '24-Gujarat');
  const [vendorPostalCode, setVendorPostalCode] = useState(initialBill?.vendorPostalCode ?? '');

  // GST & ITC
  const [placeOfSupply, setPlaceOfSupply] = useState(initialBill?.placeOfSupply ?? company?.state ?? '24-Gujarat');
  const [isReverseCharge, setIsReverseCharge] = useState(initialBill?.isReverseCharge ?? false);
  const [itcEligibility, setItcEligibility] = useState<ItcEligibility>(initialBill?.itcEligibility ?? 'INPUTS');

  // Additional charges
  const [otherCharges, setOtherCharges] = useState<string>(initialBill?.otherCharges ? String(initialBill.otherCharges) : '0');

  // Notes
  const [notes, setNotes] = useState(initialBill?.notes ?? '');
  const [terms, setTerms] = useState(initialBill?.terms ?? '');
  const [internalNotes, setInternalNotes] = useState(initialBill?.internalNotes ?? '');

  // Items
  const [items, setItems] = useState<PurchaseEditorItem[]>(() => {
    if (initialBill?.items && initialBill.items.length > 0) {
      return initialBill.items.map((i) => ({
        key: `item-${i.id}`,
        productId: i.productId ?? null,
        name: i.name,
        description: i.description ?? '',
        hsnSacCode: i.hsnSacCode ?? '',
        category: i.category,
        unit: i.unit,
        quantity: String(i.quantity),
        unitPrice: String(i.unitPrice),
        discountPercent: String(i.discountPercent),
        taxRate: String(i.taxRate)
      }));
    }
    return [createEmptyPurchaseItem(18)];
  });

  // Fetch vendors list
  useEffect(() => {
    vendorsApi.list({ limit: 100 }).then((res) => {
      setVendors(res.vendors);
    }).catch(() => {
      toast.error('Failed to load vendors');
    });
  }, []);

  // Compute GST interstate status automatically
  const isIgst = useMemo(() => {
    const compCode = extractStateCode(company?.state ?? '24-Gujarat');
    const venCode = extractStateCode(vendorState || placeOfSupply);
    return Boolean(compCode && venCode && compCode !== venCode);
  }, [company?.state, vendorState, placeOfSupply]);

  // Compute live document totals
  const totals = useMemo(() => {
    const numericOtherCharges = Number(otherCharges) || 0;
    const doc = computeTotals(
      items.map((i) => ({
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
        taxRate: i.taxRate
      })),
      { isIgst, enableRoundOff: true }
    );

    const grandTotal = Math.round((doc.taxableAmount + doc.taxAmount + numericOtherCharges + doc.roundOff) * 100) / 100;

    return {
      subtotal: doc.subtotal,
      discountAmount: doc.discountAmount,
      taxableAmount: doc.taxableAmount,
      cgstAmount: doc.cgstAmount,
      sgstAmount: doc.sgstAmount,
      igstAmount: doc.igstAmount,
      taxAmount: doc.taxAmount,
      otherCharges: numericOtherCharges,
      roundOff: doc.roundOff,
      grandTotal
    };
  }, [items, isIgst, otherCharges]);

  // Handle vendor selection from dropdown
  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    if (!vendorId) return;

    const v = vendors.find((vend) => vend.id === vendorId);
    if (v) {
      setVendorName(v.name);
      setVendorGstin(v.gstin ?? '');
      setVendorPhone(v.phone ?? '');
      setVendorEmail(v.email ?? '');
      setVendorAddress(v.address ?? '');
      setVendorCity(v.city ?? '');
      setVendorState(v.state ?? '24-Gujarat');
      setVendorPostalCode(v.postalCode ?? '');
      if (v.paymentTerms) setPaymentTerms(v.paymentTerms);
    }
  };

  const handleVendorCreated = (newVendor: Vendor) => {
    setVendors((prev) => [newVendor, ...prev]);
    handleVendorSelect(newVendor.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorInvoiceNumber.trim()) {
      toast.error('Vendor Invoice / Bill No is required as printed on paper bill');
      return;
    }

    if (!vendorName.trim()) {
      toast.error('Vendor / Supplier Name is required');
      return;
    }

    if (items.length === 0 || !items.some((i) => i.name.trim())) {
      toast.error('At least one valid item is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: PurchaseBillPayload = {
        vendorId: selectedVendorId || null,
        billNumber: billNumber.trim() || undefined,
        vendorInvoiceNumber: vendorInvoiceNumber.trim(),
        status,
        billDate,
        dueDate: dueDate || undefined,
        paymentTerms,
        currency: 'INR',

        poNumber: poNumber.trim() || undefined,
        poDate: poDate || undefined,
        grnNumber: grnNumber.trim() || undefined,
        grnDate: grnDate || undefined,
        transporterName: transporterName.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        lrNumber: lrNumber.trim() || undefined,
        lrDate: lrDate || undefined,

        vendorName: vendorName.trim(),
        vendorGstin: vendorGstin.trim() || undefined,
        vendorPhone: vendorPhone.trim() || undefined,
        vendorEmail: vendorEmail.trim() || undefined,
        vendorAddress: vendorAddress.trim() || undefined,
        vendorCity: vendorCity.trim() || undefined,
        vendorState: vendorState.trim() || undefined,
        vendorCountry: 'India',
        vendorPostalCode: vendorPostalCode.trim() || undefined,

        placeOfSupply,
        isIgst,
        isReverseCharge,
        itcEligibility,

        otherCharges: Number(otherCharges) || 0,
        roundOff: totals.roundOff,

        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,

        items: items.map((i, idx) => ({
          productId: i.productId || null,
          name: i.name.trim(),
          description: i.description.trim() || undefined,
          hsnSacCode: i.hsnSacCode.trim() || undefined,
          category: i.category,
          unit: i.unit,
          sortOrder: idx,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          discountPercent: Number(i.discountPercent) || 0,
          taxRate: Number(i.taxRate) || 0
        }))
      };

      if (isEditing && initialBill) {
        await purchaseBillsApi.update(initialBill.id, payload);
        toast.success('Purchase bill updated successfully');
        router.push(`/purchases/${initialBill.id}`);
      } else {
        const created = await purchaseBillsApi.create(payload);
        toast.success('Purchase bill created successfully');
        router.push(`/purchases/${created.id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save purchase bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <h2 className="text-base font-bold text-warm-text">
              {isEditing ? `Edit Purchase Bill: ${initialBill?.billNumber}` : 'New Inward Purchase Bill'}
            </h2>
            <span className="text-[11px] text-warm-textMuted">
              Record supplier inward invoices with GST Input Tax Credit (ITC) allocation.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push('/purchases')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Receipt className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Save Purchase Bill'}
          </Button>
        </div>
      </div>

      {/* 1. Vendor Selection & Snapshot */}
      <div className="p-5 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-warm-border/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-warm-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
              1. Supplier / Vendor Details
            </h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsVendorModalOpen(true)}
          >
            + Add New Vendor
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-warm-textMuted block mb-1">
              Select Existing Vendor
            </label>
            <Select
              value={selectedVendorId}
              onChange={(e) => handleVendorSelect(e.target.value)}
              options={[
                { value: '', label: '— Select or Enter Manual Vendor —' },
                ...vendors.map((v) => ({
                  value: v.id,
                  label: `${v.name} ${v.gstin ? `(${v.gstin})` : ''} - ${v.city || v.state || ''}`
                }))
              ]}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              label="Vendor / Legal Business Name *"
              placeholder="Enter vendor or business name"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
            />
          </div>

          <Input
            label="Vendor GSTIN (15 Digits)"
            placeholder="Enter 15-digit GSTIN"
            maxLength={15}
            value={vendorGstin}
            onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
          />

          <Input
            label="Vendor Phone"
            placeholder="Enter phone number"
            value={vendorPhone}
            onChange={(e) => setVendorPhone(e.target.value)}
          />

          <Input
            label="Vendor Email"
            type="email"
            placeholder="Enter email address"
            value={vendorEmail}
            onChange={(e) => setVendorEmail(e.target.value)}
          />

          <Input
            label="PIN Code"
            placeholder="Enter 6-digit PIN code"
            maxLength={6}
            value={vendorPostalCode}
            onChange={(e) => setVendorPostalCode(e.target.value)}
          />

          <div className="sm:col-span-2">
            <Input
              label="Vendor Address"
              placeholder="Enter factory, warehouse or office street address"
              value={vendorAddress}
              onChange={(e) => setVendorAddress(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <StateCityFields
              stateValue={vendorState}
              cityValue={vendorCity}
              onStateChange={(st) => setVendorState(st)}
              onCityChange={(ct) => setVendorCity(ct)}
              includePincode={false}
            />
          </div>
        </div>
      </div>

      {/* 2. Bill Identifiers, Dates & Inward Documentation */}
      <div className="p-5 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-warm-border/60">
          <Calendar className="w-4 h-4 text-warm-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
            2. Bill Numbering, Dates & Inward Documentation
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Vendor Invoice / Bill No *"
            placeholder="Enter supplier invoice number"
            value={vendorInvoiceNumber}
            onChange={(e) => setVendorInvoiceNumber(e.target.value)}
            required
          />

          <Input
            label="Internal PB Voucher No (Auto)"
            placeholder="Auto-generated"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
          />

          <Input
            label="Bill / Invoice Date *"
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            required
          />

          <Input
            label="Payment Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <Select
            label="Payment Terms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            options={[
              { value: 'Immediate', label: 'Immediate / Due on Receipt' },
              { value: 'Net 15 Days', label: 'Net 15 Days' },
              { value: 'Net 30 Days', label: 'Net 30 Days' },
              { value: 'Net 45 Days', label: 'Net 45 Days' },
              { value: 'Net 60 Days', label: 'Net 60 Days' },
              { value: 'Net 90 Days', label: 'Net 90 Days' }
            ]}
          />

          <Select
            label="Bill Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PurchaseBillStatus)}
            options={[
              { value: 'RECEIVED', label: 'Received (Pending Payment)' },
              { value: 'DRAFT', label: 'Draft Voucher' },
              { value: 'PAID', label: 'Fully Paid' },
              { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
          />

          <Input
            label="Purchase Order (PO) No"
            placeholder="Enter PO number"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
          />

          <Input
            label="PO Date"
            type="date"
            value={poDate}
            onChange={(e) => setPoDate(e.target.value)}
          />

          <Input
            label="GRN / Inward Challan No"
            placeholder="Enter GRN / Challan number"
            value={grnNumber}
            onChange={(e) => setGrnNumber(e.target.value)}
          />

          <Input
            label="GRN Date"
            type="date"
            value={grnDate}
            onChange={(e) => setGrnDate(e.target.value)}
          />

          <Input
            label="Transporter Name"
            placeholder="Enter transporter name"
            value={transporterName}
            onChange={(e) => setTransporterName(e.target.value)}
          />

          <Input
            label="Vehicle Number"
            placeholder="Enter vehicle number"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
          />

          <Input
            label="LR / Bilty Number"
            placeholder="Enter LR / Bilty number"
            value={lrNumber}
            onChange={(e) => setLrNumber(e.target.value)}
          />

          <Input
            label="LR Date"
            type="date"
            value={lrDate}
            onChange={(e) => setLrDate(e.target.value)}
          />
        </div>
      </div>

      {/* 3. GST & Tax Determination */}
      <div className="p-5 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-warm-border/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-warm-accent" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
              3. GST Compliance & Input Tax Credit (ITC)
            </h3>
          </div>
          <Badge variant={isIgst ? 'pending' : 'paid'} className="text-xs font-bold">
            {isIgst ? 'Interstate (IGST 100%)' : 'Intrastate (CGST 50% + SGST 50%)'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          <Select
            label="Input Tax Credit (ITC) Eligibility *"
            value={itcEligibility}
            onChange={(e) => setItcEligibility(e.target.value as ItcEligibility)}
            options={[
              { value: 'INPUTS', label: 'Eligible for ITC - Raw Materials / Inputs' },
              { value: 'CAPITAL_GOODS', label: 'Eligible for ITC - Capital Goods / Machinery' },
              { value: 'INPUT_SERVICES', label: 'Eligible for ITC - Input Services' },
              { value: 'INELIGIBLE', label: 'Ineligible for ITC (Blocked Credit Sec 17(5))' }
            ]}
          />

          <div className="flex items-center gap-3 pt-4">
            <input
              type="checkbox"
              id="rcm-toggle"
              checked={isReverseCharge}
              onChange={(e) => setIsReverseCharge(e.target.checked)}
              className="w-4 h-4 text-warm-accent rounded-none border-warm-border focus:ring-warm-accent"
            />
            <label htmlFor="rcm-toggle" className="text-xs font-semibold text-warm-text cursor-pointer">
              Reverse Charge Mechanism (RCM Applicable)
            </label>
          </div>
        </div>
      </div>

      {/* 4. Line Items Table */}
      <div className="p-5 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm">
        <PurchaseItemsEditor
          items={items}
          onChange={setItems}
          isIgst={isIgst}
          defaultTaxRate={18}
          gstRates={GST_RATES}
          units={UNITS}
        />
      </div>

      {/* 5. Summary, Inward Freight & Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Narration & Terms */}
        <div className="lg:col-span-7 space-y-4 p-5 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm">
          <Textarea
            label="Payment & Delivery Terms"
            placeholder="Enter payment and delivery terms"
            rows={2}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          />

          <Textarea
            label="Internal Narration / Accounting Notes"
            placeholder="Enter internal narration or accounting notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Calculation Summary Card */}
        <div className="lg:col-span-5 p-5 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-warm-text pb-2 border-b border-warm-border/60">
            Bill Financial Summary
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-warm-textMuted">
              <span>Gross Item Subtotal:</span>
              <span className="font-semibold text-warm-text">{formatCurrency(totals.subtotal)}</span>
            </div>

            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Total Item Discounts:</span>
                <span>-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between font-semibold text-warm-text">
              <span>Taxable Turnover:</span>
              <span>{formatCurrency(totals.taxableAmount)}</span>
            </div>

            <div className="pt-2 border-t border-warm-border/40 space-y-1 text-warm-textMuted">
              {isIgst ? (
                <div className="flex justify-between">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-semibold text-warm-text">{formatCurrency(totals.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Central Tax (CGST):</span>
                    <span className="font-semibold text-warm-text">{formatCurrency(totals.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State Tax (SGST):</span>
                    <span className="font-semibold text-warm-text">{formatCurrency(totals.sgstAmount)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-warm-border/40 flex items-center justify-between gap-3">
              <label className="text-xs text-warm-textMuted shrink-0">
                Inward Freight / Packing (₹):
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={otherCharges}
                onChange={(e) => setOtherCharges(e.target.value)}
                className="w-32 h-7 px-2 bg-warm-input border border-warm-border text-xs text-right text-warm-text rounded-none focus:outline-none focus:ring-1 focus:ring-warm-accent font-semibold"
              />
            </div>

            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-warm-textSubtle font-medium">
                <span>Round Off Adjustment:</span>
                <span>{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
              </div>
            )}

            <div className="pt-3 border-t-2 border-warm-border flex justify-between items-center text-sm font-bold text-warm-text bg-warm-accentLight/30 p-2.5">
              <span>Total Payable Amount:</span>
              <span className="text-base text-warm-accent font-bold">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              leftIcon={<Receipt className="w-4 h-4" />}
            >
              {isEditing ? 'Save Changes' : 'Confirm & Save Purchase Bill'}
            </Button>
          </div>
        </div>
      </div>

      {/* New Vendor Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onSuccess={handleVendorCreated}
      />
    </form>
  );
}
