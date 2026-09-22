'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { CompanyProfile, UpdateCompanyPayload, PaymentMethodCode } from '@/lib/company';
import { Landmark, Save, Smartphone, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';

import { getApiErrorMessage } from '@/lib/api';

interface PaymentSettingsSectionProps {
  company: CompanyProfile;
  onSave: (payload: UpdateCompanyPayload) => Promise<void>;
  isSaving: boolean;
  canEdit: boolean;
}

/** Labels for the methods the API accepts, in the order they are shown. */
const PAYMENT_METHODS: Array<{ value: PaymentMethodCode; label: string }> = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT/RTGS)' },
  { value: 'UPI', label: 'UPI / QR Code' },
  { value: 'CASH', label: 'Cash Payment' },
  { value: 'CHEQUE', label: 'Cheque / Demand Draft' },
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'OTHER', label: 'Other' }
];

export function PaymentSettingsSection({
  company,
  onSave,
  isSaving,
  canEdit
}: PaymentSettingsSectionProps) {
  const [bankName, setBankName] = useState(company.bankName || '');
  const [accountNumber, setAccountNumber] = useState(company.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(company.ifscCode || '');
  const [branch, setBranch] = useState(company.branch || '');
  const [accountHolder, setAccountHolder] = useState(company.accountHolder || company.name || '');
  const [upiId, setUpiId] = useState(company.upiId || '');
  const [paymentInstructions, setPaymentInstructions] = useState(company.paymentInstructions || '');

  const [acceptedMethods, setAcceptedMethods] = useState<PaymentMethodCode[]>(
    company.acceptedPaymentMethods ?? []
  );

  const toggleMethod = (method: PaymentMethodCode, enabled: boolean) => {
    setAcceptedMethods((previous) =>
      enabled
        ? Array.from(new Set([...previous, method]))
        : previous.filter((value) => value !== method)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        name: company.name,
        bankName: bankName.trim() || null,
        accountNumber: accountNumber.trim() || null,
        ifscCode: ifscCode.trim().toUpperCase() || null,
        branch: branch.trim() || null,
        accountHolder: accountHolder.trim() || null,
        upiId: upiId.trim() || null,
        paymentInstructions: paymentInstructions.trim() || null,
        acceptedPaymentMethods: acceptedMethods
      });
      toast.success('Payment & Banking details updated successfully');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update payment settings'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Primary Bank Account */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-warm-accentLight text-warm-accent">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
                Settlement Bank Account Details
              </h3>
              <p className="text-xs text-warm-textMuted">
                Printed on invoice PDFs for direct client RTGS / NEFT / IMPS wire transfers
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Account Holder Name / Beneficiary"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Enter account holder legal name"
              disabled={!canEdit}
            />

            <Input
              label="Bank Name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Enter bank name"
              disabled={!canEdit}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Bank Account Number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter bank account number"
              disabled={!canEdit}
            />

            <Input
              label="IFSC Code"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              placeholder="Enter 11-digit IFSC code"
              maxLength={11}
              disabled={!canEdit}
            />

            <Input
              label="Branch Name / Location"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Enter bank branch location"
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. UPI & Digital Collection */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
              UPI &amp; Digital QR Payments
            </h3>
            <p className="text-xs text-warm-textMuted">
              UPI handle for instant mobile payments via PhonePe, Google Pay, and Paytm
            </p>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          <Input
            label="Business UPI ID / VPA"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="business@okhdfcbank"
            disabled={!canEdit}
            helperText="Printed in the payment block on invoice PDFs"
          />

          <Textarea
            label="Standard Payment Instructions"
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="e.g. Quote the invoice number in the NEFT/RTGS remarks."
            rows={2}
            disabled={!canEdit}
            maxLength={500}
          />
        </CardContent>
      </Card>

      {/* 3. Accepted Payment Methods */}
      <Card className="border-warm-border/70">
        <div className="p-5 border-b border-warm-border/50 flex items-center gap-2.5">
          <div className="p-1.5 bg-warm-accentLight text-warm-accent">
            <CreditCard className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-warm-text uppercase tracking-wider">
            Accepted Payment Instruments
          </h3>
        </div>

        <CardContent className="p-5 space-y-3">
          <p className="text-[11px] text-warm-textMuted">
            Listed on the invoice PDF and used to limit the methods offered when recording a
            payment.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.value}
                className="p-3 bg-warm-input/40 border border-warm-border/60 flex items-center justify-between cursor-pointer gap-2"
              >
                <span className="text-xs font-bold text-warm-text">{method.label}</span>
                <input
                  type="checkbox"
                  checked={acceptedMethods.includes(method.value)}
                  onChange={(e) => toggleMethod(method.value, e.target.checked)}
                  disabled={!canEdit}
                  className="w-4 h-4 shrink-0 rounded-none border-warm-border text-warm-accent focus:ring-warm-accent"
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
            Save Payment Settings
          </Button>
        </div>
      )}
    </form>
  );
}
