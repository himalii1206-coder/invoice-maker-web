'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { formatCurrency } from '@/lib/utils';
import { invoicesApi, toNumber, PAYMENT_METHOD_LABELS } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { Invoice, PaymentMethod } from '@/types/invoice';
import { IndianRupee } from 'lucide-react';

/**
 * Records a payment against an invoice.
 *
 * The outstanding balance is the hard ceiling here, matching the server rule -
 * an amount above it is rejected rather than absorbed, because it is almost
 * always a typo and silently accepting it would corrupt the receivable.
 */

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onRecorded: () => void;
}

const todayInput = () => new Date().toISOString().slice(0, 10);

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoice,
  onRecorded
}: RecordPaymentModalProps) {
  const balanceDue = toNumber(invoice.balanceDue);

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayInput());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reopening should offer the full balance again, not the last typed value.
  useEffect(() => {
    if (!isOpen) return;
    setAmount(balanceDue > 0 ? String(balanceDue) : '');
    setPaymentDate(todayInput());
    setPaymentMethod('BANK_TRANSFER');
    setReferenceNumber('');
    setNotes('');
    setError('');
  }, [isOpen, balanceDue]);

  const submit = async () => {
    const value = Number(amount);

    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError('Enter a payment amount greater than zero');
      return;
    }

    if (value > balanceDue + 0.001) {
      setError(`Amount cannot exceed the outstanding balance of ${formatCurrency(balanceDue)}`);
      return;
    }

    if (new Date(paymentDate) > new Date(todayInput())) {
      setError('Payment date cannot be in the future');
      return;
    }

    setIsSaving(true);
    try {
      await invoicesApi.recordPayment(invoice.id, {
        amount: value,
        paymentDate,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined
      });

      toast.success(`Payment of ${formatCurrency(value)} recorded`);
      onRecorded();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not record the payment'));
    } finally {
      setIsSaving(false);
    }
  };

  const parsed = Number(amount);
  const remaining =
    Number.isFinite(parsed) && parsed > 0 ? Math.max(0, balanceDue - parsed) : balanceDue;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      description={`Invoice ${invoice.invoiceNumber} · ${invoice.billingName}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 p-3 bg-warm-accentLight/40 border border-warm-border/60">
          {[
            ['Invoice Total', toNumber(invoice.grandTotal)],
            ['Already Paid', toNumber(invoice.amountPaid)],
            ['Balance Due', balanceDue]
          ].map(([label, value], index) => (
            <div key={label as string}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-textSubtle">
                {label as string}
              </p>
              <p
                className={`text-sm font-bold tabular-nums mt-0.5 ${
                  index === 2 ? 'text-red-700' : 'text-warm-text'
                }`}
              >
                {formatCurrency(value as number)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Amount Received"
            required
            inputMode="decimal"
            value={amount}
            leftIcon={<IndianRupee className="w-4 h-4" />}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^\d.]/g, ''));
              setError('');
            }}
            error={error}
            helperText={
              !error && parsed > 0
                ? `${formatCurrency(remaining)} will remain outstanding`
                : undefined
            }
          />

          <Input
            label="Payment Date"
            type="date"
            required
            max={todayInput()}
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment Method"
            options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
              value,
              label
            }))}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          />

          <Input
            label="Reference Number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="UTR, cheque no, txn id"
          />
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering about this payment"
          className="min-h-[60px]"
        />

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} isLoading={isSaving}>
            Record Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
