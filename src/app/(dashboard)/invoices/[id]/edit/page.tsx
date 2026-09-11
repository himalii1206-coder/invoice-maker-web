'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { invoicesApi } from '@/lib/invoices';
import { apiErrorMessage } from '@/lib/customers';
import { Invoice } from '@/types/invoice';
import { FileWarning } from 'lucide-react';

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params?.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await invoicesApi.getById(invoiceId);

        if (cancelled) return;

        // A cancelled invoice is a closed record; editing it is not offered.
        if (data.status === 'CANCELLED') {
          toast.info('Cancelled invoices cannot be edited');
          router.replace(`/invoices/${invoiceId}`);
          return;
        }

        setInvoice(data);
      } catch (error) {
        if (!cancelled) {
          toast.error(apiErrorMessage(error, 'Could not load the invoice'));
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, router]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="bg-warm-surface border border-warm-border/60 shadow-warm">
          <LoadingState message="Loading invoice..." />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !invoice) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Invoice not found"
          description="This invoice may have been deleted, or it belongs to another business."
          icon={<FileWarning className="w-6 h-6 text-warm-accent" />}
          actionLabel="Back to Invoices"
          onAction={() => router.push('/invoices')}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={`Edit ${invoice.invoiceNumber}`}
        description="Changes are re-priced and re-taxed the moment you save."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices', href: '/invoices' },
          { label: invoice.invoiceNumber, href: `/invoices/${invoice.id}` },
          { label: 'Edit' }
        ]}
        actions={<InvoiceStatusBadge status={invoice.status} size="md" />}
      />

      <InvoiceForm invoice={invoice} />
    </DashboardLayout>
  );
}
