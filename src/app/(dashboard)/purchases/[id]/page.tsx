'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RecordPaymentModal } from '@/components/purchases/RecordPaymentModal';
import { purchaseBillsApi } from '@/lib/purchases';
import { PurchaseBill, PurchaseBillStatus } from '@/types/purchase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  DollarSign,
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
  Plus
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
  RECEIVED: 'Received (Unpaid)',
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
        <LoadingState message="Loading purchase bill details..." />
      </DashboardLayout>
    );
  }

  if (!bill) return null;

  const balanceDue = Number(bill.balanceDue) || 0;
  const amountPaid = Number(bill.amountPaid) || 0;
  const grandTotal = Number(bill.grandTotal) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-warm-surface border border-warm-border/70 rounded-none shadow-warm print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/purchases')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Bills
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-warm-text">
                  {bill.billNumber}
                </h2>
                <Badge variant={STATUS_VARIANTS[bill.status]}>
                  {STATUS_LABELS[bill.status]}
                </Badge>
              </div>
              <span className="text-xs text-warm-textMuted">
                Supplier Invoice No: <strong className="text-warm-text">{bill.vendorInvoiceNumber || '—'}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {balanceDue > 0 && bill.status !== 'CANCELLED' && (
              <Button
                size="sm"
                leftIcon={<DollarSign className="w-4 h-4" />}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Record Payment
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print Voucher
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
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Purchase Voucher Card */}
        <div className="bg-warm-surface border border-warm-border/80 shadow-warm p-6 sm:p-8 rounded-none space-y-6">
          {/* Voucher Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-warm-border/70 pb-6 gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-warm-accent block mb-1">
                INWARD PURCHASE BILL / GOODS INWARD VOUCHER
              </span>
              <h1 className="text-2xl font-black text-warm-text">
                {bill.billNumber}
              </h1>
              <p className="text-xs text-warm-textMuted mt-1">
                FY: <span className="font-semibold text-warm-text">{bill.financialYear}</span> | Created on {formatDate(bill.createdAt)}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-xs">
                <span className="text-warm-textMuted">Vendor Invoice Date: </span>
                <strong className="text-warm-text">{formatDate(bill.billDate)}</strong>
              </div>
              {bill.dueDate && (
                <div className="text-xs">
                  <span className="text-warm-textMuted">Payment Due: </span>
                  <strong className="text-amber-800">{formatDate(bill.dueDate)}</strong>
                </div>
              )}
              {bill.paymentTerms && (
                <div className="text-xs text-warm-textMuted">
                  Terms: <span className="font-medium text-warm-text">{bill.paymentTerms}</span>
                </div>
              )}
            </div>
          </div>

          {/* Supplier & Organization Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-warm-input/20 border border-warm-border/50">
            {/* Supplier / Vendor */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-warm-accent font-bold uppercase text-[10px] tracking-wider mb-1">
                <Truck className="w-3.5 h-3.5" />
                <span>Supplier / Inward From:</span>
              </div>
              <h3 className="font-bold text-sm text-warm-text">{bill.vendorName}</h3>
              {bill.vendorGstin && (
                <p className="text-warm-text">
                  GSTIN: <span className="font-bold">{bill.vendorGstin}</span>
                </p>
              )}
              {bill.vendorAddress && <p className="text-warm-textMuted">{bill.vendorAddress}</p>}
              <p className="text-warm-textMuted">
                {bill.vendorCity ? `${bill.vendorCity}, ` : ''}{bill.vendorState || 'India'}
                {bill.vendorPostalCode ? ` - ${bill.vendorPostalCode}` : ''}
              </p>
              {bill.vendorPhone && (
                <p className="text-warm-textMuted">Phone: {bill.vendorPhone}</p>
              )}
            </div>

            {/* Buyer Company */}
            <div className="space-y-1.5 text-xs sm:border-l sm:border-warm-border/50 sm:pl-6">
              <div className="flex items-center gap-1.5 text-warm-accent font-bold uppercase text-[10px] tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Billed To / Received By:</span>
              </div>
              <h3 className="font-bold text-sm text-warm-text">{company?.name}</h3>
              {company?.gstin && (
                <p className="text-warm-text">
                  GSTIN: <span className="font-bold">{company.gstin}</span>
                </p>
              )}
              {company?.address && <p className="text-warm-textMuted">{company.address}</p>}
              <p className="text-warm-textMuted">
                {company?.city ? `${company.city}, ` : ''}{company?.state || 'India'}
              </p>
              <div className="pt-1">
                <Badge variant={bill.isIgst ? 'pending' : 'paid'} className="text-[10px]">
                  {bill.isIgst ? 'Interstate Supply (IGST)' : 'Intrastate Supply (CGST + SGST)'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Logistics & Inward References Strip */}
          {(bill.poNumber || bill.grnNumber || bill.transporterName || bill.vehicleNumber || bill.lrNumber) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-warm-input/40 border border-warm-border/50 text-xs">
              {bill.poNumber && (
                <div>
                  <span className="text-[10px] text-warm-textSubtle block uppercase">Purchase Order (PO)</span>
                  <span className="font-bold text-warm-text">{bill.poNumber}</span>
                  {bill.poDate && <span className="text-[10px] text-warm-textMuted block">{formatDate(bill.poDate)}</span>}
                </div>
              )}
              {bill.grnNumber && (
                <div>
                  <span className="text-[10px] text-warm-textSubtle block uppercase">GRN / Inward Challan</span>
                  <span className="font-bold text-warm-text">{bill.grnNumber}</span>
                  {bill.grnDate && <span className="text-[10px] text-warm-textMuted block">{formatDate(bill.grnDate)}</span>}
                </div>
              )}
              {(bill.transporterName || bill.vehicleNumber) && (
                <div>
                  <span className="text-[10px] text-warm-textSubtle block uppercase">Transporter & Vehicle</span>
                  <span className="font-semibold text-warm-text">{bill.transporterName || '—'}</span>
                  {bill.vehicleNumber && <span className="text-[10px] text-warm-accent font-semibold block">{bill.vehicleNumber}</span>}
                </div>
              )}
              {bill.lrNumber && (
                <div>
                  <span className="text-[10px] text-warm-textSubtle block uppercase">LR / Bilty Details</span>
                  <span className="font-bold text-warm-text">{bill.lrNumber}</span>
                  {bill.lrDate && <span className="text-[10px] text-warm-textMuted block">{formatDate(bill.lrDate)}</span>}
                </div>
              )}
            </div>
          )}

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-warm-border/70">
            <table className="w-full text-xs text-left">
              <thead className="bg-warm-input/70 border-b border-warm-border/70 text-warm-text uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">Item Description & HSN</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Unit Rate</th>
                  <th className="p-2.5 text-right">Disc %</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">GST Rate</th>
                  <th className="p-2.5 text-right">GST Amount</th>
                  <th className="p-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border/50">
                {bill.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-warm-input/20">
                    <td className="p-2.5 text-center text-warm-textSubtle">{idx + 1}</td>
                    <td className="p-2.5">
                      <span className="font-bold text-warm-text block">{item.name}</span>
                      {item.hsnSacCode && (
                        <span className="text-[10px] text-warm-textSubtle">
                          HSN: {item.hsnSacCode}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <span className="text-[11px] text-warm-textMuted">{item.category}</span>
                    </td>
                    <td className="p-2.5 text-right font-semibold">
                      {Number(item.quantity)} {item.unit}
                    </td>
                    <td className="p-2.5 text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="p-2.5 text-right text-warm-textMuted">
                      {Number(item.discountPercent)}%
                    </td>
                    <td className="p-2.5 text-right font-semibold">
                      {formatCurrency(item.taxableAmount)}
                    </td>
                    <td className="p-2.5 text-right">
                      {Number(item.taxRate)}%
                    </td>
                    <td className="p-2.5 text-right text-warm-text">
                      {formatCurrency(item.taxAmount)}
                    </td>
                    <td className="p-2.5 text-right font-bold text-warm-text">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown & Financial Totals */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            <div className="lg:col-span-6 space-y-3 text-xs">
              <div className="p-3.5 bg-warm-input/30 border border-warm-border/60 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-warm-accent block">
                  Statutory ITC & Compliance Details
                </span>
                <div className="flex justify-between text-warm-textMuted">
                  <span>ITC Eligibility:</span>
                  <span className="font-semibold text-warm-text">{bill.itcEligibility}</span>
                </div>
                <div className="flex justify-between text-warm-textMuted">
                  <span>Reverse Charge (RCM):</span>
                  <span className="font-semibold text-warm-text">{bill.isReverseCharge ? 'Yes' : 'No'}</span>
                </div>
                {bill.notes && (
                  <div className="pt-2 border-t border-warm-border/40">
                    <span className="text-[10px] text-warm-textSubtle block font-semibold">Remarks:</span>
                    <p className="text-warm-text italic">{bill.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-2 text-xs">
              <div className="flex justify-between text-warm-textMuted">
                <span>Taxable Amount:</span>
                <span className="font-semibold text-warm-text">{formatCurrency(bill.taxableAmount)}</span>
              </div>

              {bill.isIgst ? (
                <div className="flex justify-between text-warm-textMuted">
                  <span>Integrated Tax (IGST):</span>
                  <span className="font-semibold text-warm-text">{formatCurrency(bill.igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-warm-textMuted">
                    <span>Central Tax (CGST):</span>
                    <span className="font-semibold text-warm-text">{formatCurrency(bill.cgstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-warm-textMuted">
                    <span>State Tax (SGST):</span>
                    <span className="font-semibold text-warm-text">{formatCurrency(bill.sgstAmount)}</span>
                  </div>
                </>
              )}

              {Number(bill.otherCharges) > 0 && (
                <div className="flex justify-between text-warm-textMuted">
                  <span>Inward Freight & Charges:</span>
                  <span className="font-semibold text-warm-text">{formatCurrency(bill.otherCharges)}</span>
                </div>
              )}

              {Number(bill.roundOff) !== 0 && (
                <div className="flex justify-between text-warm-textSubtle">
                  <span>Round Off:</span>
                  <span>{Number(bill.roundOff) > 0 ? `+${bill.roundOff}` : bill.roundOff}</span>
                </div>
              )}

              <div className="pt-3 border-t-2 border-warm-border flex justify-between items-center text-sm font-bold text-warm-text bg-warm-accentLight/40 p-3">
                <span>Total Bill Amount:</span>
                <span className="text-lg text-warm-accent font-bold">{formatCurrency(bill.grandTotal)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 text-xs">
                <span className="text-emerald-700 font-semibold">Total Paid to Vendor:</span>
                <span className="text-emerald-700 font-bold">{formatCurrency(amountPaid)}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-800 font-semibold">Outstanding Balance:</span>
                <span className="text-amber-800 font-bold text-sm">{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History / Disbursements Ledger */}
        <div className="bg-warm-surface border border-warm-border/70 shadow-warm p-6 rounded-none space-y-4 print:hidden">
          <div className="flex items-center justify-between pb-2 border-b border-warm-border/60">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-warm-accent" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text">
                Vendor Payments Recorded ({bill.payments.length})
              </h3>
            </div>
            {balanceDue > 0 && bill.status !== 'CANCELLED' && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                + Record Payment
              </Button>
            )}
          </div>

          {bill.payments.length === 0 ? (
            <p className="text-xs text-warm-textMuted py-4 text-center">
              No payments recorded yet for this purchase bill.
            </p>
          ) : (
            <div className="divide-y divide-warm-border/50">
              {bill.payments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-warm-text">
                        {formatCurrency(p.amount)}
                      </span>
                      <Badge variant="paid" className="text-[10px]">
                        {p.paymentMethod}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-warm-textMuted">
                      Paid on {formatDate(p.paymentDate)}
                      {p.referenceNumber && ` | Ref: ${p.referenceNumber}`}
                      {p.notes && ` | "${p.notes}"`}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 text-xs"
                    onClick={() => setDeletingPaymentId(p.id)}
                    title="Delete payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          purchaseBill={bill}
          onSuccess={(updated) => setBill(updated)}
        />
      )}

      {/* Delete Bill Modal */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        title="Delete Purchase Bill"
        message={`Are you sure you want to delete purchase voucher "${bill.billNumber}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDanger
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteModalOpen(false)}
      />

      {/* Delete Payment Modal */}
      <ConfirmDialog
        isOpen={Boolean(deletingPaymentId)}
        title="Remove this payment?"
        message="The purchase bill balance and status will be recalculated without this payment."
        confirmLabel="Remove Payment"
        isDanger
        isLoading={isDeletingPayment}
        onConfirm={handleConfirmDeletePayment}
        onClose={() => setDeletingPaymentId(null)}
      />
    </DashboardLayout>
  );
}
