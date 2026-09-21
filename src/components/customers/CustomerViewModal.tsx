'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { Customer } from '@/types/index';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Pencil,
  FileText,
  Building2,
  Phone,
  MapPin,
  Landmark,
  Layers
} from 'lucide-react';

export interface CustomerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onEdit: (customer: Customer) => void;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
        {label}
      </p>
      <p className="text-sm font-medium text-warm-text break-words">
        {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
      </p>
    </div>
  );
}

export function CustomerViewModal({
  isOpen,
  onClose,
  customerId,
  onEdit
}: CustomerViewModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !customerId) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await customersApi.getById(customerId);
        if (!cancelled) setCustomer(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(apiErrorMessage(error, 'Could not load customer'));
          onClose();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId, onClose]);

  useEffect(() => {
    if (!isOpen) setCustomer(null);
  }, [isOpen]);

  const billingAddressBlock = customer
    ? [
        customer.address,
        [customer.city, customer.state].filter(Boolean).join(', '),
        [customer.country, customer.postalCode].filter(Boolean).join(' — ')
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title="Customer Details"
      description="Full ledger, contact, tax, and address record for this client."
    >
      {isLoading || !customer ? (
        <LoadingState message="Loading customer details..." />
      ) : (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2">
          {/* Header Card */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-warm-border/60">
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-warm-text tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-warm-accent" />
                {customer.name}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={customer.type} />
                {customer.accountGroup && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60 rounded">
                    Group: {customer.accountGroup}
                  </span>
                )}
                {customer.partyCategory && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200/60 rounded">
                    {customer.partyCategory}
                  </span>
                )}
                <Badge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-warm-textMuted bg-warm-input px-3 py-2 border border-warm-border/60">
              <FileText className="w-4 h-4 text-warm-accent" />
              <span className="font-bold text-warm-text">{customer.invoiceCount ?? 0}</span>
              <span>invoice{(customer.invoiceCount ?? 0) === 1 ? '' : 's'} linked</span>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-warm-surface/70 border border-warm-border/60 p-4 space-y-3">
            <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warm-accent border-b border-warm-border/40 pb-2">
              <Phone className="w-3.5 h-3.5" />
              Contact Information
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Mob No." value={customer.phone} />
              <Field label="Email ID" value={customer.email} />
              <Field label="Contact Person" value={customer.contactPerson} />
              <Field label="Office No." value={customer.officeNo} />
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-warm-surface/70 border border-warm-border/60 p-4 space-y-3">
            <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warm-accent border-b border-warm-border/40 pb-2">
              <MapPin className="w-3.5 h-3.5" />
              Address Details
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                  Billing Address
                </p>
                <p className="text-sm text-warm-text whitespace-pre-line leading-relaxed font-medium">
                  {billingAddressBlock || '—'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
                  Factory Address
                </p>
                <p className="text-sm text-warm-text whitespace-pre-line leading-relaxed font-medium">
                  {customer.factoryAddress || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Opening Balance & Accounting */}
          <div className="bg-warm-surface/70 border border-warm-border/60 p-4 space-y-3">
            <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warm-accent border-b border-warm-border/40 pb-2">
              <Layers className="w-3.5 h-3.5" />
              Opening Balance & Ledger Info
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Opening Balance"
                value={
                  customer.openingBalance !== null && customer.openingBalance !== undefined
                    ? `${formatCurrency(Number(customer.openingBalance))} (${customer.balanceType || 'Dr.'})`
                    : '—'
                }
              />
              <Field
                label="Opening Date"
                value={customer.openingBalanceDate ? formatDate(customer.openingBalanceDate) : '—'}
              />
              <Field label="Dr. / Cr." value={customer.balanceType} />
              {customer.narration1 && (
                <div className="sm:col-span-3">
                  <Field label="Narration 1" value={customer.narration1} />
                </div>
              )}
              {customer.narration2 && (
                <div className="sm:col-span-3">
                  <Field label="Narration 2" value={customer.narration2} />
                </div>
              )}
            </div>
          </div>

          {/* Bank & Tax Information */}
          <div className="bg-warm-surface/70 border border-warm-border/60 p-4 space-y-3">
            <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warm-accent border-b border-warm-border/40 pb-2">
              <Landmark className="w-3.5 h-3.5" />
              Bank & Tax Information
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="GSTIN No" value={customer.gstin} />
              <Field label="Bank Name" value={customer.bankName} />
              <Field label="Acc No" value={customer.accountNumber} />
              <Field label="IFSC Code" value={customer.ifscCode} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-warm-textMuted pt-2">
            <div>Added on: {formatDate(customer.createdAt)}</div>
            <div className="sm:text-right">Last updated: {formatDate(customer.updatedAt)}</div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/50 sticky bottom-0 bg-warm-surface py-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button leftIcon={<Pencil className="w-4 h-4" />} onClick={() => onEdit(customer)}>
              Edit Customer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
