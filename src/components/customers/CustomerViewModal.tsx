'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { customersApi, apiErrorMessage } from '@/lib/customers';
import { Customer } from '@/types/index';
import { formatDate } from '@/lib/utils';
import { Pencil, FileText } from 'lucide-react';

export interface CustomerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onEdit: (customer: Customer) => void;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted">
        {label}
      </p>
      <p className="text-sm text-warm-text break-words">{value || '—'}</p>
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
    // Guards against a stale response landing after the modal moved on.
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId, onClose]);

  // Drop the previous record so reopening never flashes the wrong customer.
  useEffect(() => {
    if (!isOpen) setCustomer(null);
  }, [isOpen]);

  const addressLines = customer
    ? [customer.address, [customer.city, customer.state].filter(Boolean).join(', '), [customer.country, customer.postalCode].filter(Boolean).join(' — ')]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title="Customer Details"
      description="Full contact, tax and address record for this client."
    >
      {isLoading || !customer ? (
        <LoadingState message="Loading customer..." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-warm-border/50">
            <div className="space-y-1.5">
              <h4 className="text-lg font-semibold text-warm-text tracking-tight">
                {customer.name}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={customer.type} />
                <Badge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-warm-textMuted bg-warm-input px-2.5 py-1.5 border border-warm-border/60">
              <FileText className="w-3.5 h-3.5 text-warm-accent" />
              <span className="font-semibold text-warm-text">{customer.invoiceCount ?? 0}</span>
              <span>invoice{(customer.invoiceCount ?? 0) === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Email" value={customer.email} />
            <Field label="Phone" value={customer.phone} />
            <Field label="GSTIN / Tax Number" value={customer.gstin} />
            <Field label="Customer Type" value={customer.type === 'BUSINESS' ? 'Business' : 'Individual'} />

            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-warm-textMuted mb-1">
                Address
              </p>
              <p className="text-sm text-warm-text whitespace-pre-line leading-relaxed">
                {addressLines || '—'}
              </p>
            </div>

            <Field label="Created On" value={formatDate(customer.createdAt)} />
            <Field label="Last Updated" value={formatDate(customer.updatedAt)} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border/50">
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
