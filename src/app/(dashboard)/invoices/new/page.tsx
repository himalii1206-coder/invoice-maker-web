'use client';

import React, { Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';
import { LoadingState } from '@/components/ui/LoadingState';

export default function NewInvoicePage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Create Invoice"
        description="Pick a customer, add line items, and GST is calculated as you type."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices', href: '/invoices' },
          { label: 'New Invoice' }
        ]}
      />

      <Suspense
        fallback={
          <div className="bg-warm-surface border border-warm-border/60 shadow-warm p-8">
            <LoadingState message="Loading invoice form..." />
          </div>
        }
      >
        <InvoiceForm />
      </Suspense>
    </DashboardLayout>
  );
}
