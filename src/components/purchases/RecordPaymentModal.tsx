'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { purchaseBillsApi } from '@/lib/purchases';
import { PurchaseBill, PaymentMethod } from '@/types/purchase';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Calendar, Landmark, Hash, FileText } from 'lucide-react';

const paymentSchema = z.object({
  amount: z.coerce
    .number({ required_error: 'Payment amount is required' })
    .positive('Payment amount must be greater than zero'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER']).default('BANK_TRANSFER'),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal(''))
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseBill: PurchaseBill;
  onSuccess: (updatedBill: PurchaseBill) => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  purchaseBill,
  onSuccess
}: RecordPaymentModalProps) {
  const balanceDue = Number(purchaseBill.balanceDue) || 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: balanceDue,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      notes: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        amount: balanceDue,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: '',
        notes: ''
      });
    }
  }, [isOpen, balanceDue, reset]);

  const onSubmit = async (data: PaymentFormData) => {
    if (data.amount > balanceDue) {
      toast.error(`Payment amount (${formatCurrency(data.amount)}) cannot exceed balance due (${formatCurrency(balanceDue)})`);
      return;
    }

    try {
      const result = await purchaseBillsApi.recordPayment(purchaseBill.id, {
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod as PaymentMethod,
        referenceNumber: data.referenceNumber || undefined,
        notes: data.notes || undefined
      });
      toast.success('Vendor payment recorded successfully');
      onSuccess(result.purchaseBill);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to record payment');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Vendor Payment"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Bill Summary Banner */}
        <div className="p-3 bg-warm-input/50 border border-warm-border/60 rounded-none space-y-1">
          <div className="flex justify-between text-xs text-warm-textMuted">
            <span>Purchase Bill:</span>
            <span className="font-bold text-warm-text">{purchaseBill.billNumber}</span>
          </div>
          <div className="flex justify-between text-xs text-warm-textMuted">
            <span>Supplier / Vendor:</span>
            <span className="font-semibold text-warm-text">{purchaseBill.vendorName}</span>
          </div>
          <div className="flex justify-between text-xs text-warm-textMuted">
            <span>Total Bill Amount:</span>
            <span className="font-semibold text-warm-text">{formatCurrency(purchaseBill.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-warm-accent pt-1 border-t border-warm-border/40">
            <span>Outstanding Balance Due:</span>
            <span>{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            label="Payment Amount (₹) *"
            type="number"
            step="0.01"
            max={balanceDue}
            leftIcon={<DollarSign className="w-4 h-4" />}
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input
            label="Payment Date *"
            type="date"
            leftIcon={<Calendar className="w-4 h-4" />}
            error={errors.paymentDate?.message}
            {...register('paymentDate')}
          />

          <Select
            label="Payment Method *"
            options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT / RTGS / IMPS' },
              { value: 'UPI', label: 'UPI / QR Code' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'CASH', label: 'Cash' },
              { value: 'CARD', label: 'Debit / Credit Card' },
              { value: 'OTHER', label: 'Other Mode' }
            ]}
            error={errors.paymentMethod?.message}
            {...register('paymentMethod')}
          />

          <Input
            label="UTR / Cheque / Transaction Ref No"
            placeholder="Enter UTR, cheque, or transaction reference"
            leftIcon={<Hash className="w-4 h-4" />}
            error={errors.referenceNumber?.message}
            {...register('referenceNumber')}
          />

          <Textarea
            label="Payment Notes / Remarks"
            placeholder="Enter payment notes, bank account remarks or confirmation details..."
            rows={2}
            error={errors.notes?.message}
            {...register('notes')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/60">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
